export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  minQuantity: number; // الحد الأدنى قبل التنبيه
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
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
  type: 'تحذير_مخزون' | 'طلب_جديد' | 'طلب_مكتمل' | 'معلومة';
  message: string;
  productId?: string;
  orderId?: string;
  createdAt: Date;
  read: boolean;
}

// أحداث الوقت الحقيقي
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
  update_product: (product: Partial<Product> & { id: string }) => void;
  add_order: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  update_order_status: (data: { orderId: string; status: Order['status'] }) => void;
}
