// backend/src/public/routes.ts
import { Router } from 'express';
import pool from '../db/connection';
import { addNotification } from '../db/queries';

const router = Router();

// جلب متجر بواسطة slug مع منتجاته النشطة (مع حساب الكمية المتاحة = quantity - reserved_quantity)
router.get('/stores/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const storeResult = await pool.query(
      `SELECT id, name, description, logo_url, owner_id 
       FROM stores 
       WHERE slug = $1`,
      [slug]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: 'المتجر غير موجود' });
    }
    const store = storeResult.rows[0];

    // جلب المنتجات النشطة مع الكمية الفعلية والمحجوزة
    const productsResult = await pool.query(
      `SELECT id, name, price, quantity, reserved_quantity, image_url, description, category
       FROM products 
       WHERE store_id = $1 AND is_active = true AND (quantity - COALESCE(reserved_quantity,0)) > 0
       ORDER BY created_at DESC`,
      [store.id]
    );
    // تحويل البيانات: إضافة حقل availableQuantity
    store.products = productsResult.rows.map(p => ({
      ...p,
      availableQuantity: Math.max(0, p.quantity - (p.reserved_quantity || 0)),
    }));
    res.json(store);
  } catch (err) {
    console.error('❌ خطأ في جلب المتجر العام:', err);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// إنشاء طلب جديد من العميل (يدعم الحجوزات)
router.post('/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { storeId, customerName, customerPhone, items, totalPrice, notes } = req.body;
    if (!storeId || !items || !items.length) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
    }

    // إدراج الطلب
    const orderResult = await client.query(
      `INSERT INTO orders (store_id, customer_name, customer_phone, source, total_price, status, notes)
       VALUES ($1, $2, $3, 'متجر إلكتروني', $4, 'جديد', $5) RETURNING *`,
      [storeId, customerName, customerPhone, totalPrice, notes]
    );
    const order = orderResult.rows[0];

    // معالجة كل عنصر في الطلب
    for (const item of items) {
      const isReservation = item.isReservation === true;
      const productId = item.productId;

      // إدراج عنصر الطلب مع حقل is_reservation
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, is_reservation, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, productId, item.productName, item.quantity, item.price, isReservation, isReservation ? 'حجز' : '']
      );

      if (isReservation) {
        // حجز: نزيد reserved_quantity فقط، لا نغير المخزون الفعلي
        await client.query(
          `UPDATE products 
           SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
           WHERE id = $2`,
          [item.quantity, productId]
        );
      } else {
        // بيع عادي: نخفض المخزون الفعلي
        const current = await client.query(
          'SELECT quantity FROM products WHERE id = $1 FOR UPDATE',
          [productId]
        );
        const before = current.rows[0]?.quantity ?? 0;
        const after = Math.max(0, before - item.quantity);
        await client.query(
          'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [after, productId]
        );
        // تسجيل حركة المخزون (sale)
        await client.query(
          `INSERT INTO stock_movements (product_id, store_id, type, quantity_change, quantity_before, quantity_after, unit_price, note)
           VALUES ($1, $2, 'sale', $3, $4, $5, $6, $7)`,
          [productId, storeId, -item.quantity, before, after, item.price, `طلب #${order.id.slice(0, 8)}`]
        );
      }
    }

    await client.query('COMMIT');

    // إشعار فوري لصاحب المتجر (عبر WebSocket)
    const io = req.app.get('io');
    if (io) {
      io.to(storeId).emit('order_added', order);
      io.to(storeId).emit('notification', {
        message: `طلب جديد من ${customerName} بقيمة ${totalPrice} ريال`,
        type: 'طلب_جديد',
        createdAt: new Date(),
      });
    }

    // إضافة إشعار في قاعدة البيانات
    await addNotification(
      storeId,
      'طلب_جديد',
      `طلب جديد من ${customerName} — ${totalPrice} ريال`,
      { orderId: order.id }
    );

    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الطلب العام:', err);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  } finally {
    client.release();
  }
});

export default router;
