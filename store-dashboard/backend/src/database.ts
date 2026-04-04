import { Product, Order, Notification } from './types';
import { v4 as uuidv4 } from 'uuid';

const DEMO_STORE_ID = 'demo-store-id';

export const db = {
  products: [
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      name: 'عباية سوداء فاخرة',
      price: 250,
      quantity: 15,
      category: 'عبايات',
      minQuantity: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      name: 'شيلة بيضاء',
      price: 85,
      quantity: 3,
      category: 'شيلات',
      minQuantity: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      name: 'عطر ورد الطائف',
      price: 320,
      quantity: 8,
      category: 'عطور',
      minQuantity: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      name: 'كيس هدايا مطرز',
      price: 45,
      quantity: 2,
      category: 'إكسسوارات',
      minQuantity: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as Product[],
  orders: [
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      customerName: 'أم محمد',
      customerPhone: '0501234567',
      source: 'واتساب' as const,
      items: [],
      totalPrice: 335,
      status: 'جديد' as const,
      notes: 'توصيل سريع من فضلك',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      storeId: DEMO_STORE_ID,
      customerName: 'سارة الأحمد',
      customerPhone: '0557654321',
      source: 'انستغرام' as const,
      items: [],
      totalPrice: 250,
      status: 'قيد التنفيذ' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as Order[],
  notifications: [] as Notification[],
  soldCounts: {} as Record<string, number>,
};

export function calculateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = db.orders.filter((o) => new Date(o.createdAt) >= today);
  const lowStockProducts = db.products.filter((p) => p.quantity <= p.minQuantity);
  const topProducts = db.products
    .map((p) => ({ product: p, soldCount: db.soldCounts[p.id] || 0 }))
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 5);
  return {
    totalProducts: db.products.length,
    totalOrders: db.orders.length,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, o) => sum + o.totalPrice, 0),
    lowStockProducts,
    topProducts,
  };
}

export function createNotification(
  type: Notification['type'],
  message: string,
  extra?: { productId?: string; orderId?: string }
): Notification {
  const notification: Notification = {
    id: uuidv4(),
    type,
    message,
    createdAt: new Date(),
    read: false,
    ...extra,
  };
  db.notifications.unshift(notification);
  if (db.notifications.length > 50) db.notifications.pop();
  return notification;
}
