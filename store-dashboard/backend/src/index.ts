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

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(passport.initialize());

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

// ===== API المنتجات =====
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

// ===== مسار تعديل المنتج (مع تسجيل حركة المخزون عند تغيير الكمية) =====
app.put('/api/products/:id', authMiddleware, requireStore, async (req: any, res) => {
  try {
    // نجلب المنتج قبل التعديل لمعرفة الكمية القديمة
    const before = await getProductById(req.params.id);
    if (!before) return res.status(404).json({ error: 'المنتج غير موجود' });

    const updated = await updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'المنتج غير موجود' });

    // إذا تغيرت الكمية → سجل حركة adjustment
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
    const movement = await addStockMovement({
      productId: req.params.id,
      storeId: req.storeId,
      type: req.body.type,
      quantityChange: req.body.quantityChange,
      unitPrice: req.body.unitPrice,
      note: req.body.note,
      createdBy: req.user.id,
    });
    const product = await getProductById(req.params.id);
    if (product) {
      io.to(req.storeId).emit('product_updated', product);
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

    const products = await getProducts(req.storeId);
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const quantityBefore = product.quantity + item.quantity;
        await addStockMovement({
          productId: item.productId,
          storeId: req.storeId,
          type: 'sale',
          quantityChange: -item.quantity,
          quantityBefore: quantityBefore,
          quantityAfter: product.quantity,
          unitPrice: item.price,
          note: `طلب #${order.id.slice(0, 8)}`,
          createdBy: req.user.id,
        });
        io.to(req.storeId).emit('product_updated', product);
        const aiMsg = analyzeInventory(product);
        if (aiMsg) {
          const an = await addNotification(req.storeId, 'تحذير_مخزون', aiMsg);
          io.to(req.storeId).emit('notification', an);
        }
      }
    }

    res.status(201).json(order);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
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

// ===== ويب سوكيتس — غرف المتاجر =====
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
