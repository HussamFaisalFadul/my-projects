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
  description?: string;
  logoUrl?: string;
  ownerId: string;
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

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  minQuantity: number;
  imageUrl?: string;
  // الحقول الجديدة
  sku?: string;
  barcode?: string;
  costPrice?: number;
  discountType?: string;
  discountValue?: number;
  tags?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
