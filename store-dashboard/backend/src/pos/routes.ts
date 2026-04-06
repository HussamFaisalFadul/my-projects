import { Router, Response } from 'express';
import { authMiddleware } from '../auth/auth';
import { getMemberRole } from '../stores/queries';
import pool from '../db/connection';

const router = Router();
router.use(authMiddleware);

async function requireStore(req: any, res: Response, next: any) {
  const storeId = req.headers['x-store-id'] as string;
  if (!storeId) return res.status(400).json({ error: 'معرف المتجر مطلوب' });
  const role = await getMemberRole(storeId, req.user.id);
  if (!role) return res.status(403).json({ error: 'غير مصرح' });
  req.storeId = storeId;
  next();
}

// ===== الجلسات =====

// فتح جلسة جديدة
router.post('/sessions', requireStore, async (req: any, res: Response) => {
  try {
    const { openingCash = 0 } = req.body;

    // تحقق من عدم وجود جلسة مفتوحة
    const existing = await pool.query(
      `SELECT id FROM pos_sessions WHERE store_id = $1 AND status = 'open'`,
      [req.storeId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'يوجد جلسة مفتوحة بالفعل', sessionId: existing.rows[0].id });
    }

    const result = await pool.query(
      `INSERT INTO pos_sessions (store_id, opened_by, opening_cash)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.storeId, req.user.id, openingCash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// جلب الجلسة المفتوحة
router.get('/sessions/current', requireStore, async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as opened_by_name
       FROM pos_sessions s
       JOIN users u ON s.opened_by = u.id
       WHERE s.store_id = $1 AND s.status = 'open'
       ORDER BY s.opened_at DESC LIMIT 1`,
      [req.storeId]
    );
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// إغلاق جلسة
router.put('/sessions/:id/close', requireStore, async (req: any, res: Response) => {
  try {
    const { closingCash } = req.body;
    const result = await pool.query(
      `UPDATE pos_sessions
       SET status = 'closed', closing_cash = $1, closed_at = NOW()
       WHERE id = $2 AND store_id = $3 RETURNING *`,
      [closingCash, req.params.id, req.storeId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ملخص الجلسة
router.get('/sessions/:id/summary', requireStore, async (req: any, res: Response) => {
  try {
    const [session, invoices] = await Promise.all([
      pool.query(`SELECT * FROM pos_sessions WHERE id = $1`, [req.params.id]),
      pool.query(
        `SELECT
           COUNT(*) as total_invoices,
           COALESCE(SUM(total), 0) as total_sales,
           COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_sales,
           COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_sales,
           COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer_sales,
           COALESCE(SUM(discount_amount), 0) as total_discounts,
           COALESCE(SUM(tax_amount), 0) as total_tax
         FROM pos_invoices
         WHERE session_id = $1 AND status = 'paid'`,
        [req.params.id]
      )
    ]);
    res.json({ session: session.rows[0], summary: invoices.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== الفواتير =====

// إنشاء فاتورة جديدة (مع تسجيل حركات المخزون)
router.post('/invoices', requireStore, async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      sessionId, customerName, customerPhone,
      items, subtotal, discountType, discountValue = 0,
      discountAmount = 0, taxRate = 0, taxAmount = 0,
      total, paidAmount, changeAmount = 0,
      paymentMethod = 'cash', notes
    } = req.body;

    // إنشاء الفاتورة
    const invoiceResult = await client.query(
      `INSERT INTO pos_invoices (
        store_id, session_id, customer_name, customer_phone,
        subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, total, paid_amount, change_amount,
        payment_method, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        req.storeId, sessionId || null, customerName || null, customerPhone || null,
        subtotal, discountType || null, discountValue, discountAmount,
        taxRate, taxAmount, total, paidAmount, changeAmount,
        paymentMethod, notes || null
      ]
    );
    const invoice = invoiceResult.rows[0];

    // ===== الكود الجديد — يسجل حركة بيع لكل منتج =====
    for (const item of items) {
      await client.query(
        `INSERT INTO pos_invoice_items
         (invoice_id, product_id, product_name, barcode, unit_price, quantity, discount, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          invoice.id, item.productId || null, item.productName,
          item.barcode || null, item.unitPrice, item.quantity,
          item.discount || 0, item.total
        ]
      );

      if (item.productId) {
        // نجلب الكمية الحالية قبل النقص
        const before = await client.query(
          `SELECT quantity FROM products WHERE id = $1 FOR UPDATE`,
          [item.productId]
        );
        const quantityBefore = before.rows[0]?.quantity ?? 0;
        const quantityAfter = Math.max(0, quantityBefore - item.quantity);

        // نقص المخزون
        await client.query(
          `UPDATE products SET quantity = $1 WHERE id = $2`,
          [quantityAfter, item.productId]
        );

        // تسجيل حركة البيع
        await client.query(
          `INSERT INTO stock_movements
            (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note, created_by)
           VALUES ($1, $2, 'sale', $3, $4, $5, $6, $7, $8)`,
          [
            item.productId,
            req.storeId,
            -item.quantity,
            quantityBefore,
            quantityAfter,
            item.unitPrice,
            `فاتورة كاشير #${invoice.id.slice(0, 8)}`,
            req.user.id,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // جلب الفاتورة كاملة مع العناصر
    const fullInvoice = await pool.query(
      `SELECT i.*, array_agg(
        json_build_object(
          'id', ii.id, 'productName', ii.product_name,
          'unitPrice', ii.unit_price, 'quantity', ii.quantity,
          'discount', ii.discount, 'total', ii.total,
          'barcode', ii.barcode
        )
      ) as items
      FROM pos_invoices i
      LEFT JOIN pos_invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = $1
      GROUP BY i.id`,
      [invoice.id]
    );

    res.status(201).json(fullInvoice.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// جلب فواتير الجلسة
router.get('/sessions/:id/invoices', requireStore, async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT i.*, array_agg(
        json_build_object(
          'productName', ii.product_name,
          'quantity', ii.quantity,
          'unitPrice', ii.unit_price,
          'total', ii.total
        )
      ) as items
      FROM pos_invoices i
      LEFT JOIN pos_invoice_items ii ON i.id = ii.invoice_id
      WHERE i.session_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// إلغاء فاتورة وإرجاع المخزون (مع تسجيل حركة استرداد)
router.put('/invoices/:id/refund', requireStore, async (req: any, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invoice = await client.query(
      `UPDATE pos_invoices SET status = 'refunded'
       WHERE id = $1 AND store_id = $2 RETURNING *`,
      [req.params.id, req.storeId]
    );
    if (!invoice.rows[0]) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    // جلب عناصر الفاتورة
    const items = await client.query(
      `SELECT * FROM pos_invoice_items WHERE invoice_id = $1`,
      [req.params.id]
    );

    // ===== الكود الجديد — يسجل حركة استرداد =====
    for (const item of items.rows) {
      if (item.product_id) {
        const before = await client.query(
          `SELECT quantity FROM products WHERE id = $1 FOR UPDATE`,
          [item.product_id]
        );
        const quantityBefore = before.rows[0]?.quantity ?? 0;
        const quantityAfter = quantityBefore + item.quantity;

        await client.query(
          `UPDATE products SET quantity = $1 WHERE id = $2`,
          [quantityAfter, item.product_id]
        );

        await client.query(
          `INSERT INTO stock_movements
            (product_id, store_id, type, quantity_change, quantity_before, quantity_after, note, created_by)
           VALUES ($1, $2, 'return', $3, $4, $5, $6, $7)`,
          [
            item.product_id,
            req.storeId,
            item.quantity,
            quantityBefore,
            quantityAfter,
            `استرداد فاتورة #${req.params.id.slice(0, 8)}`,
            req.user.id,
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// البحث عن منتج بالباركود أو الاسم
router.get('/products/search', requireStore, async (req: any, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const result = await pool.query(
      `SELECT * FROM products
       WHERE store_id = $1
       AND (
         LOWER(name) LIKE LOWER($2)
         OR barcode = $3
       )
       AND quantity > 0
       ORDER BY name ASC
       LIMIT 10`,
      [req.storeId, `%${q}%`, q]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
