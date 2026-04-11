import Login from './pages/Login';
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
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [storeError, setStoreError] = useState('');

  const [token, setToken] = useState<string | null>(localStorage.getItem('store_token'));
  const [currentUser, setCurrentUser] = useState<any>(
    JSON.parse(localStorage.getItem('store_user') || 'null')
  );
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(
    localStorage.getItem('store_id')
  );
  const [storeName, setStoreName] = useState<string | null>(
    localStorage.getItem('store_name')
  );

  const handleLogin = (newToken: string, user: any) => {
    setToken(newToken);
    setCurrentUser(user);
    setCurrentStoreId(localStorage.getItem('store_id'));
    setStoreName(localStorage.getItem('store_name'));
  };

  const handleLogout = () => {
    localStorage.removeItem('store_token');
    localStorage.removeItem('store_user');
    localStorage.removeItem('store_id');
    localStorage.removeItem('store_name');
    setToken(null);
    setCurrentUser(null);
    setCurrentStoreId(null);
    setStoreName(null);
    setProducts([]);
    setOrders([]);
    setStats(null);
    setNotifications([]);
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) { setStoreError('اكتب اسم المتجر'); return; }
    setCreatingStore(true);
    setStoreError('');
    try {
      const store = await api.createStore({ name: newStoreName.trim() });
      if (store.id) {
        localStorage.setItem('store_id', store.id);
        localStorage.setItem('store_name', store.name);
        setCurrentStoreId(store.id);
        setStoreName(store.name);
      } else {
        setStoreError(store.error || 'حدث خطأ');
      }
    } catch {
      setStoreError('تعذر الاتصال بالخادم');
    }
    setCreatingStore(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!token || !currentStoreId) return;
    setLoading(true);
    Promise.all([
      api.getProducts(),
      api.getOrders(),
      api.getStats(),
      api.getNotifications(),
    ]).then(([p, o, s, n]) => {
      setProducts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setStats(s);
      setNotifications(Array.isArray(n) ? n : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, currentStoreId]);

  useEffect(() => {
    if (!currentStoreId) return;
    socket.emit('join_store', currentStoreId);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('product_added', (product) => setProducts(prev => [...prev, product]));
    socket.on('product_updated', (product) => setProducts(prev => prev.map(p => p.id === product.id ? product : p)));
    socket.on('product_deleted', (id) => setProducts(prev => prev.filter(p => p.id !== id)));
    socket.on('order_added', (order) => setOrders(prev => [order, ...prev]));
    socket.on('order_updated', (order) => setOrders(prev => prev.map(o => o.id === order.id ? order : o)));
    socket.on('stats_updated', (s) => setStats(s));
    socket.on('notification', (n) => setNotifications(prev => [n, ...prev].slice(0, 50)));
    return () => {
      socket.emit('leave_store', currentStoreId);
      socket.off('connect'); socket.off('disconnect');
      socket.off('product_added'); socket.off('product_updated'); socket.off('product_deleted');
      socket.off('order_added'); socket.off('order_updated');
      socket.off('stats_updated'); socket.off('notification');
    };
  }, [currentStoreId]);

  // ===== حالة: غير مسجّل =====
  if (!token || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ===== حالة: لا يوجد متجر =====
  if (!currentStoreId) {
    return (
      <div className="app" dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f6fa', flexDirection: 'column', gap: 0 }}>
        {/* شريط علوي بسيط */}
        <div style={{ position: 'fixed', top: 0, right: 0, left: 0, height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 100 }}>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>مرحباً، {currentUser.name} 👋</span>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', color: '#6b7280', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
            تسجيل خروج
          </button>
        </div>

        {/* كارد إنشاء متجر */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', textAlign: 'center', marginTop: 56 }}>
          <div style={{ width: 72, height: 72, background: '#eef1fe', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>🏪</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>أنشئ متجرك</h2>
          <p style={{ color: '#6b7280', marginBottom: 28, fontSize: 14 }}>ابدأ بإدارة منتجاتك وطلباتك الآن.</p>

          <input
            value={newStoreName}
            onChange={e => setNewStoreName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateStore()}
            placeholder="اسم المتجر"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', textAlign: 'right', fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
          />
          {storeError && (
            <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13, background: '#fee2e2', padding: '8px 12px', borderRadius: 8 }}>
              {storeError}
            </div>
          )}
          <button
            onClick={handleCreateStore}
            disabled={creatingStore}
            style={{ width: '100%', padding: '13px', background: '#4f6ef7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', boxShadow: '0 4px 14px rgba(79,110,247,0.35)' }}
          >
            {creatingStore ? 'جاري الإنشاء...' : 'إنشاء المتجر'}
          </button>
        </div>
      </div>
    );
  }

  // ===== حالة: تحميل =====
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  const pageTitles: Record<Page, string> = {
    dashboard: 'لوحة التحكم',
    products: 'المنتجات',
    orders: 'الطلبات',
  };

  const navItems: { key: Page; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'لوحة التحكم', icon: '⊞' },
    { key: 'products',  label: 'المنتجات',    icon: '◫' },
    { key: 'orders',    label: 'الطلبات',     icon: '≡' },
  ];

  const userInitials = currentUser.name
    ? currentUser.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')
    : 'U';

  return (
    <div className="app" dir="rtl">

      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">🏪 {storeName || 'متجري'}</div>
          <div className="sidebar-logo-sub">لوحة إدارة المتجر</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-item${page === item.key ? ' active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {currentUser.avatarUrl
                ? <img src={currentUser.avatarUrl} alt="" />
                : userInitials
              }
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-role">مدير المتجر</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="تسجيل خروج">✕</button>
          </div>
        </div>
      </aside>

      {/* ===== CONTENT ===== */}
      <div className="content-area">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-title">{pageTitles[page]}</div>

          <div className="topbar-right">
            {/* حالة الاتصال */}
            <div className={`status-chip${isConnected ? '' : ' offline'}`}>
              <span className={`status-dot${isConnected ? '' : ' offline'}`}></span>
              {isConnected ? 'متصل' : 'غير متصل'}
            </div>

            {/* الإشعارات */}
            <div className="notif-wrapper">
              <button
                className="notif-btn"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markAllRead();
                }}
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="notif-panel">
                  <div className="notif-header">الإشعارات</div>
                  {notifications.length === 0 ? (
                    <div className="notif-empty">لا توجد إشعارات</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.type === 'تحذير_مخزون' ? 'warning' : n.type === 'طلب_جديد' ? 'info' : 'success'}`}
                      >
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{new Date(n.createdAt).toLocaleTimeString('ar-SA')}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGES */}
        <main className="main">
          {page === 'dashboard' && (
            <Dashboard
              stats={stats}
              notifications={notifications}
              orders={orders}
              products={products}
            />
          )}
          {page === 'products' && (
            <Products products={products} />
          )}
          {page === 'orders' && (
            <Orders orders={orders} products={products} />
          )}
        </main>
      </div>
    </div>
  );
}
