import { io, Socket } from 'socket.io-client';

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  costPrice: number;
  quantity: number;
  sku?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  storeId: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPrice: number;
  note?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  minQuantity: number;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  costPrice?: number;
  salePrice?: number;
  saleStart?: string;
  saleEnd?: string;
  weightKg?: number;
  taxRate?: number;
  unit?: string;
  isActive?: boolean;
  tags?: string[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  stockMovements?: StockMovement[];
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
  // ===== المنتجات =====
  getProducts: (): Promise<Product[]> =>
    fetch(`${BACKEND_URL}/api/products`, { headers: authHeaders() }).then(r => r.json()),

  getProductById: (id: string): Promise<Product> =>
    fetch(`${BACKEND_URL}/api/products/${id}`, { headers: authHeaders() }).then(r => r.json()),

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> =>
    fetch(`${BACKEND_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(product),
    }).then(r => r.json()),

  updateProduct: (id: string, data: Partial<Product>): Promise<Product> =>
    fetch(`${BACKEND_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteProduct: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BACKEND_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.json()),

  // ===== حركة المخزون =====
  getStockMovements: (productId: string): Promise<StockMovement[]> =>
    fetch(`${BACKEND_URL}/api/products/${productId}/movements`, { headers: authHeaders() }).then(r => r.json()),

  addStockMovement: (productId: string, data: {
    type: StockMovement['type'];
    quantityChange: number;
    unitPrice?: number;
    note?: string;
  }): Promise<StockMovement> =>
    fetch(`${BACKEND_URL}/api/products/${productId}/movements`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // ===== الطلبات =====
  getOrders: (): Promise<Order[]> =>
    fetch(`${BACKEND_URL}/api/orders`, { headers: authHeaders() }).then(r => r.json()),

  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> =>
    fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(order),
    }).then(r => r.json()),

  updateOrderStatus: (id: string, status: Order['status']): Promise<Order> =>
    fetch(`${BACKEND_URL}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    }).then(r => r.json()),

  // ===== إحصائيات وتنبيهات =====
  getStats: (): Promise<StoreStats> =>
    fetch(`${BACKEND_URL}/api/stats`, { headers: authHeaders() }).then(r => r.json()),

  getNotifications: (): Promise<Notification[]> =>
    fetch(`${BACKEND_URL}/api/notifications`, { headers: authHeaders() }).then(r => r.json()),

  getReport: (): Promise<{ report: string }> =>
    fetch(`${BACKEND_URL}/api/report`, { headers: authHeaders() }).then(r => r.json()),

  // ===== المتاجر =====
  getMyStores: (): Promise<any[]> =>
    fetch(`${BACKEND_URL}/stores`, { headers: authHeaders() }).then(r => r.json()),

  createStore: (data: { name: string; description?: string }): Promise<any> =>
    fetch(`${BACKEND_URL}/stores`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
