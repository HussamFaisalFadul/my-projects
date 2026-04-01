import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db, calculateStats, createNotification } from './database';
import { analyzeInventory } from './ai';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  Product,
  Order,
} from './types';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ========== واجهة برمجة التطبيقات ==========

// جلب كل المنتجات
app.get('/api/products', (_, res) => {
  res.json(db.products);
});

// جلب كل الطلبات
app.get('/api/orders', (_, res) => {
  res.json(db.orders);
});

// جلب الإحصائيات
app.get('/api/stats', (_, res) => {
  res.json(calculateStats());
});

// جلب التنبيهات
app.get('/api/notifications', (_, res) => {
  res.json(db.notifications);
});

// جلب تقرير اليوم
app.get('/api/report', (_, res) => {
  const { generateDailyReport } = require('./ai');
  res.json({ report: generateDailyReport() });
});

// إضافة منتج جديد
app.post('/api/products', (req, res) => {
  const product: Product = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  db.products.push(product);

  // إرسال فوري لجميع المتصلين
  io.emit('product_added', product);
  io.emit('stats_updated', calculateStats());

  const notification = createNotification(
    'معلومة',
    `تمت إضافة منتج جديد: ${product.name}`,
    { productId: product.id }
  );
  io.emit('notification', notification);

  res.status(201).json(product);
});

// تحديث منتج
app.put('/api/products/:id', (req, res) => {
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'المنتج غير موجود' });

  db.products[index] = {
    ...db.products[index],
    ...req.body,
    updatedAt: new Date(),
  };

  const updated = db.products[index];

  // إرسال التحديث فورياً
  io.emit('product_updated', updated);
  io.emit('stats_updated', calculateStats());

  // تحليل الذكاء الاصطناعي للمخزون
  const aiMessage = analyzeInventory(updated);
  if (aiMessage) {
    const notification = createNotification('تحذير_مخزون', aiMessage, {
      productId: updated.id,
    });
    io.emit('notification', notification);
  }

  res.json(updated);
});

// حذف منتج
app.delete('/api/products/:id', (req, res) => {
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'المنتج غير موجود' });

  db.products.splice(index, 1);

  io.emit('product_deleted', req.params.id);
  io.emit('stats_updated', calculateStats());

  res.json({ success: true });
});

// إضافة طلب جديد
app.post('/api/orders', (req, res) => {
  const order: Order = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  db.orders.unshift(order);

  // تحديث المخزون تلقائياً
  order.items.forEach((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      product.quantity = Math.max(0, product.quantity - item.quantity);
      product.updatedAt = new Date();
      db.soldCounts[product.id] =
        (db.soldCounts[product.id] || 0) + item.quantity;

      io.emit('product_updated', product);

      const aiMessage = analyzeInventory(product);
      if (aiMessage) {
        const notification = createNotification('تحذير_مخزون', aiMessage, {
          productId: product.id,
        });
        io.emit('notification', notification);
      }
    }
  });

  io.emit('order_added', order);
  io.emit('stats_updated', calculateStats());

  const notification = createNotification(
    'طلب_جديد',
    `طلب جديد من ${order.customerName} عبر ${order.source} — ${order.totalPrice} ريال`,
    { orderId: order.id }
  );
  io.emit('notification', notification);

  res.status(201).json(order);
});

// تحديث حالة الطلب
app.put('/api/orders/:id/status', (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  order.status = req.body.status;
  order.updatedAt = new Date();

  io.emit('order_updated', order);

  if (order.status === 'مكتمل') {
    const notification = createNotification(
      'طلب_مكتمل',
      `اكتمل طلب ${order.customerName} — ${order.totalPrice} ريال 🎉`,
      { orderId: order.id }
    );
    io.emit('notification', notification);
  }

  io.emit('stats_updated', calculateStats());
  res.json(order);
});

// ========== ويب سوكيتس ==========

let connectedUsers = 0;

io.on('connection', (socket) => {
  connectedUsers++;
  io.emit('users_count', connectedUsers);

  console.log(`مستخدم جديد متصل — إجمالي المتصلين: ${connectedUsers}`);

  // إرسال البيانات الأولية
  socket.emit('stats_updated', calculateStats());

  socket.on('disconnect', () => {
    connectedUsers--;
    io.emit('users_count', connectedUsers);
    console.log(`مستخدم قطع الاتصال — إجمالي المتصلين: ${connectedUsers}`);
  });
});

// ========== تشغيل الخادم ==========

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📡 ويب سوكيتس جاهز للاتصالات الفورية`);
});
