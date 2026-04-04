import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import { useState, useEffect, useCallback } from 'react';
import { socket, api, Product, Order, StoreStats, Notification } from './api';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import './App.css';

type Page = 'dashboard' | 'products' | 'orders';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('store_token')
  );
  const [currentUser, setCurrentUser] = useState<any>(
    JSON.parse(localStorage.getItem('store_user') || 'null')
  );

  const handleLogin = (newToken: string, user: any) => {
    localStorage.setItem('store_token', newToken);
    localStorage.setItem('store_user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('store_token');
    localStorage.removeItem('store_user');
    setToken(null);
    setCurrentUser(null);
  };

  // معالجة مسار العودة من المصادقة
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback onLogin={handleLogin} />;
  }

  // التحقق من المصادقة قبل تحميل البيانات
  if (!token || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // تحميل البيانات الأولية
  useEffect(() => {
    Promise.all([
      api.getProducts(),
      api.getOrders(),
      api.getStats(),
      api.getNotifications(),
    ]).then(([p, o, s, n]) => {
      setProducts(p);
      setOrders(o);
      setStats(s);
      setNotifications(n);
      setLoading(false);
    });
  }, []);

  // الاستماع لأحداث الوقت الحقيقي
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('product_added', (product) => {
      setProducts((prev) => [...prev, product]);
    });

    socket.on('product_updated', (product) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
    });

    socket.on('product_deleted', (id) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });

    socket.on('order_added', (order) => {
      setOrders((prev) => [order, ...prev]);
    });

    socket.on('order_updated', (order) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? order : o))
      );
    });

    socket.on('stats_updated', (s) => setStats(s));

    socket.on('notification', (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    });

    socket.on('users_count', (count) => setConnectedUsers(count));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('product_added');
      socket.off('product_updated');
      socket.off('product_deleted');
      socket.off('order_added');
      socket.off('order_updated');
      socket.off('stats_updated');
      socket.off('notification');
      socket.off('users_count');
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div className="app" dir="rtl">
      {/* الشريط العلوي */}
      <header className="header">
        <div className="header-right">
          <div className="logo">🏪 متجري</div>
          <nav className="nav">
            <button
              className={page === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setPage('dashboard')}
            >
              الرئيسية
            </button>
            <button
              className={page === 'products' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setPage('products')}
            >
              المنتجات
            </button>
            <button
              className={page === 'orders' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setPage('orders')}
            >
              الطلبات
            </button>
          </nav>
        </div>

        <div className="header-left">
          {/* مؤشر المتصلين */}
          <div className="connected-users">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{connectedUsers} متصل الآن</span>
          </div>

          {/* التنبيهات */}
          <div className="notif-wrapper">
            <button
              className="notif-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllRead();
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notif-panel">
                <div className="notif-header">التنبيهات</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">لا توجد تنبيهات</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.type === 'تحذير_مخزون' ? 'warning' : n.type === 'طلب_جديد' ? 'info' : 'success'}`}
                    >
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">
                        {new Date(n.createdAt).toLocaleTimeString('ar-SA')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="main">
        {page === 'dashboard' && (
          <Dashboard stats={stats} notifications={notifications} orders={orders} products={products} />
        )}
        {page === 'products' && (
          <Products products={products} />
        )}
        {page === 'orders' && (
          <Orders orders={orders} products={products} />
        )}
      </main>
    </div>
  );
}
