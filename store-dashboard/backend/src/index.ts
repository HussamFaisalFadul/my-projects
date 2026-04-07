import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import passport from 'passport';
import authRouter from './auth/routes';
import storesRouter from './stores/routes';
import posRouter from './pos/routes';
import suppliersRouter from './suppliers/routes';
import { authMiddleware } from './auth/auth';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  addOrder,
  updateOrderStatus,
  getStats,
  getNotifications,
  addNotification,
  getStockMovements,
  addStockMovement,
  getProductById,
  addProductImage,
  getProductImages,
  deleteProductImage,
  addProductVariant,
  getProductVariants,
  deleteProductVariant,
} from './db/queries';
import { getMemberRole } from './stores/queries';
import { analyzeInventory, generateDailyReport } from './ai';
import { ServerToClientEvents, ClientToServerEvents } from './types';
import pool from './db/connection'; // استيراد pool بشكل ثابت

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(passport.initialize());

// ===== مسارات API العامة (بدون توكن) =====
// جلب متجر بواسطة slug
app.get('/api/public/stores/:slug', async (req, res) => {
  console.log('📢 GET /api/public/stores/:slug', req.params.slug);
  try {
    const { slug } = req.params;
    const storeResult = await pool.query(
      `SELECT id, name, description, logo_url, owner_id FROM stores WHERE slug = $1`,
      [slug]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: 'المتجر غير موجود' });
    }
    const store = storeResult.rows[0];
    const productsResult = await pool.query(
      `SELECT id, name, price, quantity, image_url, description, category 
       FROM products 
       WHERE store_id = $1 AND is_active = true AND quantity > 0
       ORDER BY created_at DESC`,
      [store.id]
    );
    store.products = productsResult.rows;
    res.json(store);
  } catch (err: any) {
    console.error('❌ خطأ في جلب المتجر العام:', err);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// إنشاء طلب جديد (بدون توكن)
app.post('/api/public/orders', async (req, res) => {
  console.log('📢 POST /api/public/orders');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { storeId, customerName, customerPhone, items, totalPrice, notes } = req.body;
    if (!storeId || !items || !items.length) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (store_id, customer_name, customer_phone, source, total_price, status, notes)
       VALUES ($1, $2, $3, 'متجر إلكتروني', $4, 'جديد', $5) RETURNING *`,
      [storeId, customerName, customerPhone, totalPrice, notes]
    );
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.productName, item.quantity, item.price]
      );
      await client.query(
        `UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');

    // إشعار WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(storeId).emit('order_added', order);
      io.to(storeId).emit('notification', {
        message: `طلب جديد من ${customerName} بقيمة ${totalPrice} ريال`,
        type: 'طلب_جديد',
        createdAt: new Date(),
      });
    }

    await addNotification(
      storeId,
      'طلب_جديد',
      `طلب جديد من ${customerName} — ${totalPrice} ريال`,
      { orderId: order.id }
    );

    res.status(201).json({ success: true, orderId: order.id });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الطلب العام:', err);
    res.status(500).json({ error: 'فشل إنشاء الطلب' });
  } finally {
    client.release();
  }
});

// ===== باقي المسارات (تحتاج توكن) =====
// ... (باقي الكود كما هو، بدءاً من app.use('/auth', authRouter) إلخ)
// تأكد من عدم وجود تعارض في المسارات.

// ===== المصادقة والمتاجر =====
app.use('/auth', authRouter);
app.use('/stores', storesRouter);
app.use('/pos', posRouter);
app.use('/suppliers', suppliersRouter);

// ===== ميدلوير التحقق من المتجر =====
async function requireStore(req: any, res: any, next: any) {
  const storeId = req.headers['x-store-id'] as string;
  if (!storeId) return res.status(400).json({ error: 'معرف المتجر مطلوب' });
  const role = await getMemberRole(storeId, req.user.id);
  if (!role) return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذا المتجر' });
  req.storeId = storeId;
  req.memberRole = role;
  next();
}

// ===== API المنتجات (تتطلب توكن ومتجر) =====
app.get('/api/products', authMiddleware, requireStore, async (req: any, res) => {
  try { res.json(await getProducts(req.storeId)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const product = await addProduct({ ...req.body, storeId: req.storeId });
    io.to(req.storeId).emit('product_added', product);
    io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    const n = await addNotification(req.storeId, 'معلومة', `تمت إضافة منتج: ${product.name}`);
    io.to(req.storeId).emit('notification', n);
    res.status(201).json(product);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const before = await getProductById(req.params.id);
    if (!before) return res.status(404).json({ error: 'المنتج غير موجود' });

    const updated = await updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'المنتج غير موجود' });

    if (req.body.quantity !== undefined && req.body.quantity !== before.quantity) {
      const diff = updated.quantity - before.quantity;
      await addStockMovement({
        productId: updated.id,
        storeId: req.storeId,
        type: 'adjustment',
        quantityChange: diff,
        quantityBefore: before.quantity,
        quantityAfter: updated.quantity,
        note: req.body.movementNote || 'تعديل يدوي',
        createdBy: req.user.id,
      });
    }

    io.to(req.storeId).emit('product_updated', updated);
    io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    const aiMsg = analyzeInventory(updated);
    if (aiMsg) {
      const n = await addNotification(req.storeId, 'تحذير_مخزون', aiMsg);
      io.to(req.storeId).emit('notification', n);
    }
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'المنتج غير موجود' });
    io.to(req.storeId).emit('product_deleted', req.params.id);
    io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ===== صور المنتج =====
app.post('/api/products/:id/images', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const { url, isPrimary, sortOrder } = req.body;
    const image = await addProductImage(req.params.id, url, isPrimary, sortOrder);
    res.json(image);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id/images', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const images = await getProductImages(req.params.id);
    res.json(images);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id/images/:imageId', authMiddleware, requireStore, async (req: any, res) => {
  try {
    await deleteProductImage(req.params.imageId);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ===== متغيرات المنتج =====
app.post('/api/products/:id/variants', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const { title, attributes, price, costPrice, quantity, sku, imageUrl, isActive, sortOrder } = req.body;
    const variant = await addProductVariant(
      req.params.id, title, attributes, price, costPrice, quantity, sku, imageUrl, isActive, sortOrder
    );
    res.json(variant);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id/variants', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const variants = await getProductVariants(req.params.id);
    res.json(variants);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id/variants/:variantId', authMiddleware, requireStore, async (req: any, res) => {
  try {
    await deleteProductVariant(req.params.variantId);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ===== مسارات حركات المخزون =====
app.get('/api/products/:id/movements', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const movements = await getStockMovements(req.params.id);
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/movements', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    const quantityBefore = product.quantity;
    const quantityAfter = Math.max(0, quantityBefore + (req.body.quantityChange || 0));

    const movement = await addStockMovement({
      productId: req.params.id,
      storeId: req.storeId,
      type: req.body.type,
      quantityChange: req.body.quantityChange,
      quantityBefore: quantityBefore,
      quantityAfter: quantityAfter,
      unitPrice: req.body.unitPrice,
      note: req.body.note,
      createdBy: req.user.id,
    });

    const updatedProduct = await getProductById(req.params.id);
    if (updatedProduct) {
      io.to(req.storeId).emit('product_updated', updatedProduct);
      io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    }

    res.status(201).json(movement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API الطلبات =====
app.get('/api/orders', authMiddleware, requireStore, async (req: any, res) => {
  try { res.json(await getOrders(req.storeId)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const order = await addOrder({ ...req.body, storeId: req.storeId });
    io.to(req.storeId).emit('order_added', order);
    io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    const n = await addNotification(req.storeId, 'طلب_جديد', `طلب جديد من ${order.customerName} — ${order.totalPrice} ريال`);
    io.to(req.storeId).emit('notification', n);

    // إشعارات تحذير المخزون المنخفض (بدون تسجيل حركة مكررة)
    for (const item of order.items) {
      const product = await getProductById(item.productId);
      if (product) {
        io.to(req.storeId).emit('product_updated', product);
        const aiMsg = analyzeInventory(product);
        if (aiMsg) {
          const an = await addNotification(req.storeId, 'تحذير_مخزون', aiMsg);
          io.to(req.storeId).emit('notification', an);
        }
      }
    }

    res.status(201).json(order);
  } catch (err: any) {
    console.error('❌ خطأ في إضافة الطلب:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/status', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const order = await updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    io.to(req.storeId).emit('order_updated', order);
    if (order.status === 'مكتمل') {
      const n = await addNotification(req.storeId, 'طلب_مكتمل', `اكتمل طلب ${order.customerName} 🎉`);
      io.to(req.storeId).emit('notification', n);
    }
    io.to(req.storeId).emit('stats_updated', await getStats(req.storeId));
    res.json(order);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ===== API الإحصائيات والتقارير =====
app.get('/api/stats', authMiddleware, requireStore, async (req: any, res) => {
  try { res.json(await getStats(req.storeId)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notifications', authMiddleware, requireStore, async (req: any, res) => {
  try { res.json(await getNotifications(req.storeId)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/report', authMiddleware, requireStore, async (req: any, res) => {
  try {
    const [orders, products] = await Promise.all([
      getOrders(req.storeId),
      getProducts(req.storeId)
    ]);
    res.json({ report: generateDailyReport(orders, products) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ===== ويب سوكيتس =====
io.on('connection', (socket) => {
  socket.on('join_store', (storeId: string) => {
    socket.join(storeId);
  });
  socket.on('leave_store', (storeId: string) => {
    socket.leave(storeId);
  });
});

// ===== تشغيل الخادم =====
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📡 ويب سوكيتس جاهز`);
  console.log(`🗄️ PostgreSQL على نيون`);
  console.log(`🏪 نظام المتاجر المتعددة جاهز`);
});
