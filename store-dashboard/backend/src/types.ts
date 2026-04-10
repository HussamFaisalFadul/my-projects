import { Pool } from 'pg';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  ownerPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreMember {
  id: string;
  storeId: string;
  userId: string;
  role: 'مالك' | 'مدير' | 'موظف';
  invitedBy?: string;
  joinedAt: Date;
  user?: User;
}

export interface Invitation {
  id: string;
  storeId: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  acceptedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
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
  createdAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  storeId: string;
  variantId?: string;
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPrice: number;
  note?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  reservedQuantity: number;
  category: string;
  minQuantity: number;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  costPrice?: number;
  salePrice?: number;
  saleStart?: Date;
  saleEnd?: Date;
  weightKg?: number;
  taxRate?: number;
  unit?: string;
  isActive?: boolean;
  tags?: string[];
  status?: string;
  discountType?: string;
  discountValue?: number;
  images?: ProductImage[];
  variants?: ProductVariant[];
  stockMovements?: StockMovement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  source: 'واتساب' | 'انستغرام' | 'مباشر' | 'متجر إلكتروني';
  items: OrderItem[];
  totalPrice: number;
  status: 'جديد' | 'قيد التنفيذ' | 'مكتمل' | 'ملغي';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  isReservation?: boolean;
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
  productId?: string;
  orderId?: string;
  createdAt: Date;
  read: boolean;
}

export interface ServerToClientEvents {
  product_updated: (product: Product) => void;
  product_added: (product: Product) => void;
  product_deleted: (productId: string) => void;
  order_updated: (order: Order) => void;
  order_added: (order: Order) => void;
  notification: (notification: Notification) => void;
  stats_updated: (stats: StoreStats) => void;
  users_count: (count: number) => void;
}

export interface ClientToServerEvents {
  join_store: (storeId: string) => void;
  leave_store: (storeId: string) => void;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ متصل بقاعدة البيانات PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ خطأ في قاعدة البيانات:', err.message);
});

export default pool;
