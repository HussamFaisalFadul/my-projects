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
  req.memberRole = role;
  next();
}

// جلب كل الموردين
router.get('/', requireStore, async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        COUNT(DISTINCT p.id) as products_count,
        COALESCE(SUM(p.quantity * p.cost_price), 0) as total_stock_value
       FROM suppliers s
       LEFT JOIN products p ON p.supplier_id = s.id
       WHERE s.store_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.storeId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// جلب مورد واحد مع منتجاته
router.get('/:id', requireStore, async (req: any, res: Response) => {
  try {
    const [supplier, products] = await Promise.all([
      pool.query(
        `SELECT * FROM suppliers WHERE id = $1 AND store_id = $2`,
        [req.params.id, req.storeId]
      ),
      pool.query(
        `SELECT id, name, price, cost_price, quantity, category, barcode, sku, is_active
         FROM products WHERE supplier_id = $1
         ORDER BY name ASC`,
        [req.params.id]
      )
    ]);

    if (!supplier.rows[0]) return res.status(404).json({ error: 'المورد غير موجود' });
    res.json({ ...supplier.rows[0], products: products.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// إضافة مورد
router.post('/', requireStore, async (req: any, res: Response) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'اسم المورد مطلوب' });

    const result = await pool.query(
      `INSERT INTO suppliers (store_id, name, phone, email, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.storeId, name.trim(), phone || null, email || null, address || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// تعديل مورد
router.put('/:id', requireStore, async (req: any, res: Response) => {
  try {
    const { name, phone, email, address, notes, balance } = req.body;
    const result = await pool.query(
      `UPDATE suppliers SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        address = COALESCE($4, address),
        notes = COALESCE($5, notes),
        balance = COALESCE($6, balance),
        updated_at = NOW()
       WHERE id = $7 AND store_id = $8 RETURNING *`,
      [name || null, phone || null, email || null, address || null,
       notes || null, balance ?? null, req.params.id, req.storeId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'المورد غير موجود' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// حذف مورد
router.delete('/:id', requireStore, async (req: any, res: Response) => {
  try {
    // فك ربط المنتجات أولاً
    await pool.query(
      `UPDATE products SET supplier_id = NULL WHERE supplier_id = $1`,
      [req.params.id]
    );
    const result = await pool.query(
      `DELETE FROM suppliers WHERE id = $1 AND store_id = $2`,
      [req.params.id, req.storeId]
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ error: 'المورد غير موجود' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ربط منتج بمورد
router.post('/:id/products/:productId', requireStore, async (req: any, res: Response) => {
  try {
    await pool.query(
      `UPDATE products SET supplier_id = $1 WHERE id = $2 AND store_id = $3`,
      [req.params.id, req.params.productId, req.storeId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// فك ربط منتج من مورد
router.delete('/:id/products/:productId', requireStore, async (req: any, res: Response) => {
  try {
    await pool.query(
      `UPDATE products SET supplier_id = NULL WHERE id = $1 AND store_id = $2`,
      [req.params.productId, req.storeId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
