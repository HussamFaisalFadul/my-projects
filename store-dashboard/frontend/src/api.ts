import { io, Socket } from 'socket.io-client';

// ===== واجهة Store المحدثة =====
export interface Store {
  id: string;
  name: string;
  slug: string;          
  description?: string;
  logoUrl?: string;
  ownerId: string;
  owner_phone?: string;   // حل مشكلة Storefront.tsx
  error?: string;         // حل مشكلة App.tsx
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
  isActive?: boolean;
  balance?: number;
  products_count?: number;
  total_stock_value?: number;
  createdAt?: string;
  updatedAt?: string;
}

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
  supplierId?: string;
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

// استخدام متغير البيئة مع fallback للإنتاج
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://store-dashboard-backend.onrender.com';

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

const CLOUDINARY_CLOUD_NAME = 'dkcuv2stk';
const CLOUDINARY_UPLOAD_PRESET = 'store-dashboard';

export async function uploadImageToCloudinary(
  file: File,
  storeId: string,
  folder: 'products' | 'logo' = 'products'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `store-dashboard/stores/${storeId}/${folder}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('فشل رفع الصورة');
  const data = await response.json();
  return data.secure_url;
}

export const api = {
  getMyStores: (): Promise<Store[]> =>
    fetch(`${BACKEND_URL}/stores`, { headers: authHeaders() }).then(r => r.json()),

  getStoreById: (id: string): Promise<Store> =>
    fetch(`${BACKEND_URL}/stores/${id}`, { headers: authHeaders() }).then(r => r.json()),

  createStore: (data: { name: string; description?: string }): Promise<Store> =>
    fetch(`${BACKEND_URL}/stores`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

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

  getStats: (): Promise<StoreStats> =>
    fetch(`${BACKEND_URL}/api/stats`, { headers: authHeaders() }).then(r => r.json()),

  getNotifications: (): Promise<Notification[]> =>
    fetch(`${BACKEND_URL}/api/notifications`, { headers: authHeaders() }).then(r => r.json()),

  getReport: (): Promise<{ report: string }> =>
    fetch(`${BACKEND_URL}/api/report`, { headers: authHeaders() }).then(r => r.json()),

  getSuppliers: (): Promise<Supplier[]> =>
    fetch(`${BACKEND_URL}/suppliers`, { headers: authHeaders() }).then(r => r.json()),

  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> =>
    fetch(`${BACKEND_URL}/suppliers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

  updateSupplier: (id: string, data: Partial<Supplier>): Promise<Supplier> =>
    fetch(`${BACKEND_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteSupplier: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BACKEND_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(r => r.json()),
};