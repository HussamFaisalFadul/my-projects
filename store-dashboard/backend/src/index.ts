import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  getProducts, addProduct, updateProduct, deleteProduct,
  getOrders, addOrder, updateOrderStatus,
  getStats, getNotifications, addNotification
} from './db/queries';
import { analyzeInventory, generateDailyReport } from './ai';
import { ServerToClientEvents, ClientToServerEvents, Product, Order } from './types';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// ===== واجهة برمجة التطبيقات =====

app.get('/api/products', async (_, res) => {
  try { res.json(await getProducts()); }
  catch (err) { res.status(500).json({ error: 'خطأ في جلب المنتجات' }); }
});

app.get('/api/orders', async (_, res) => {
  try { res.json(await getOrders()); }
  catch (err) { res.status(500).json({ error: 'خطأ في جلب الطلبات' }); }
});

app.get('/api/stats', async (_, res) => {
  try { res.json(await getStats()); }
  catch (err) { res.status(500).json({ error: 'خطأ في جلب الإحصائيات' }); }
});

app.get('/api/notifications', async (_, res) => {
  try { res.json(await getNotifications()); }
  catch (err) { res.status(500).json({ error: 'خطأ في جلب التنبيهات' }); }
});

app.get('/api/report', async (_, res) => {
  try {
    const orders = await getOrders();
    const products = await getProducts();
    res.json({ report: generateDailyReport(orders, products) });
  } catch (err) { res.status(500).json({ error: 'خطأ في التقرير' }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = await addProduct(req.body);
    io.emit('product_added', product);
    io.emit('stats_updated', await getStats());
    const notification = await addNotification('معلومة', `تمت إضافة منتج جديد: ${product.name}`, { productId: product.id });
    io.emit('notification', notification);
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: 'خطأ في إضافة المنتج' }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updated = await updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'المنتج غير موجود' });
    io.emit('product_updated', updated);
    io.emit('stats_updated', await getStats());
    const aiMessage = analyzeInventory(updated);
    if (aiMessage) {
      const notification = await addNotification('تحذير_مخزون', aiMessage, { productId: updated.id });
      io.emit('notification', notification);
    }
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'خطأ في تحديث المنتج' }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'المنتج غير موجود' });
    io.emit('product_deleted', req.params.id);
    io.emit('stats_updated', await getStats());
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'خطأ في حذف المنتج' }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = await addOrder(req.body);
    io.emit('order_added', order);
    io.emit('stats_updated', await getStats());
    const notification = await addNotification(
      'طلب_جديد',
      `طلب جديد من ${order.customerName} عبر ${order.source} — ${order.totalPrice} ريال`,
      { orderId: order.id }
    );
    io.emit('notification', notification);

    const products = await getProducts();
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        io.emit('product_updated', product);
        const aiMessage = analyzeInventory(product);
        if (aiMessage) {
          const n = await addNotification('تحذير_مخزون', aiMessage, { productId: product.id });
          io.emit('notification', n);
        }
      }
    }
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: 'خطأ في إضافة الطلب' }); }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    io.emit('order_updated', order);
    if (order.status === 'مكتمل') {
      const n = await addNotification('طلب_مكتمل', `اكتمل طلب ${order.customerName} — ${order.totalPrice} ريال 🎉`, { orderId: order.id });
      io.emit('notification', n);
    }
    io.emit('stats_updated', await getStats());
    res.json(order);
  } catch (err) { res.status(500).json({ error: 'خطأ في تحديث الطلب' }); }
});

// ===== نقطة تشغيل المايغريشن =====

app.post('/api/migrate', async (_, res) => {
  try {
    const { default: pool } = await import('./db/connection');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL, price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0, category VARCHAR(100) NOT NULL,
        min_quantity INTEGER NOT NULL DEFAULT 5, image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL, customer_phone VARCHAR(20) NOT NULL,
        source VARCHAR(20) NOT NULL, total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'جديد', notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(255) NOT NULL, quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(30) NOT NULL, message TEXT NOT NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const existing = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(existing.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (name, price, quantity, category, min_quantity) VALUES
        ('عباية سوداء فاخرة', 250, 15, 'عبايات', 5),
        ('شيلة بيضاء', 85, 3, 'شيلات', 5),
        ('عطر ورد الطائف', 320, 8, 'عطور', 3),
        ('كيس هدايا مطرز', 45, 2, 'إكسسوارات', 10);
      `);
    }
    res.json({ success: true, message: 'تم إنشاء الجداول بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ويب سوكيتس =====

let connectedUsers = 0;
io.on('connection', async (socket) => {
  connectedUsers++;
  io.emit('users_count', connectedUsers);
  try { socket.emit('stats_updated', await getStats()); } catch {}
  socket.on('disconnect', () => {
    connectedUsers--;
    io.emit('users_count', connectedUsers);
  });
});

// ===== تشغيل الخادم =====

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📡 ويب سوكيتس جاهز`);
  console.log(`🗄️ PostgreSQL على نيون`);
});
