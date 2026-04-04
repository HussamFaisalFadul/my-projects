import { io, Socket } from 'socket.io-client';

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  minQuantity: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  source: 'واتساب' | 'انستغرام' | 'مباشر';
  items: OrderItem[];
  totalPrice: number;
  status: 'جديد' | 'قيد التنفيذ' | 'مكتمل' | 'ملغي';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface StoreStats {
  totalProducts: number;
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  lowStockProducts: Product[];
  topProducts: { product: Product; soldCount: number }[];
}

export interface Notification {
  id: string;
  storeId?: string;
  type: 'تحذير_مخزون' | 'طلب_جديد' | 'طلب_مكتمل' | 'معلومة';
  message: string;
  createdAt: string;
  read: boolean;
}

const BACKEND_URL = 'https://store-dashboard-backend.onrender.com';

// ===== هيلبر يجلب التوكن و storeId تلقائياً =====
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('store_token');
  const storeId = localStorage.getItem('store_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(storeId ? { 'x-store-id': storeId } : {}),
  };
}

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
});

export const api = {
  getProducts: () =>
    fetch(`${BACKEND_URL}/api/products`, { headers: authHeaders() }).then(r => r.json()),

  getOrders: () =>
    fetch(`${BACKEND_URL}/api/orders`, { headers: authHeaders() }).then(r => r.json()),

  getStats: () =>
    fetch(`${BACKEND_URL}/api/stats`, { headers: authHeaders() }).then(r => r.json()),

  getNotifications: () =>
    fetch(`${BACKEND_URL}/api/notifications`, { headers: authHeaders() }).then(r => r.json()),

  getReport: () =>
    fetch(`${BACKEND_URL}/api/report`, { headers: authHeaders() }).then(r => r.json()),

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetch(`${BACKEND_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(product),
    }).then(r => r.json()),

  updateProduct: (id: string, data: Partial<Product>) =>
    fetch(`${BACKEND_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteProduct: (id: string) =>
    fetch(`${BACKEND_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.json()),

  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(order),
    }).then(r => r.json()),

  updateOrderStatus: (id: string, status: Order['status']) =>
    fetch(`${BACKEND_URL}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    }).then(r => r.json()),

  // ===== المتاجر =====
  getMyStores: () =>
    fetch(`${BACKEND_URL}/stores/my`, { headers: authHeaders() }).then(r => r.json()),

  createStore: (data: { name: string; description?: string }) =>
    fetch(`${BACKEND_URL}/stores`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
