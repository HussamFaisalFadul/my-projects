// backend/src/public/routes.ts
import { Router } from 'express';
import pool from '../db/connection';
import { addNotification } from '../db/queries';

const router = Router();

// جلب متجر بواسطة slug مع منتجاته النشطة
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

    // جلب المنتجات النشطة والتي لها كمية > 0
    const productsResult = await pool.query(
      `SELECT id, name, price, quantity, image_url, description, category
       FROM products 
       WHERE store_id = $1 AND is_active = true AND quantity > 0
       ORDER BY created_at DESC`,
      [store.id]
    );
    store.products = productsResult.rows;
    res.json(store);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// إنشاء طلب جديد من العميل (بدون تسجيل دخول)
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

    // إدراج عناصر الطلب وتحديث المخزون
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.productName, item.quantity, item.price]
      );
      // تنزيل الكمية من المنتج
      await client.query(
        `UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');

    // إشعار فوري لصاحب المتجر (عبر WebSocket)
    const io = req.app.get('io'); // نحتاج تمرير io إلى الميدلوير
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
    console.error(err);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  } finally {
    client.release();
  }
});

export default router;
