import Login from './pages/Login';
import Settings from './pages/Settings';
import JoinPage from './pages/JoinPage';
import POS from './pages/POS';                     // ← إضافة استيراد الكاشير
import { useState, useEffect, useCallback } from 'react';
import { socket, api, Product, Order, StoreStats, Notification } from './api';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import './App.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

type Page = 'dashboard' | 'products' | 'orders' | 'settings' | 'pos';   // ← إضافة 'pos'

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
  const [initializing, setInitializing] = useState(true);

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

  // معالجة صفحة الانضمام
  if (window.location.pathname.startsWith('/join/')) {
    return <JoinPage />;
  }

  // ===== عند أول تحميل =====
  useEffect(() => {
    const savedToken = localStorage.getItem('store_token');
    const savedStoreId = localStorage.getItem('store_id');
    const pendingJoinToken = localStorage.getItem('pending_join_token');

    // لو عنده دعوة معلقة بعد تسجيل الدخول
    if (savedToken && pendingJoinToken) {
      fetch(`${BACKEND}/stores/join/${pendingJoinToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`,
        },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.storeId) {
            localStorage.setItem('store_id', data.storeId);
            localStorage.setItem('store_name', data.storeName || '');
            localStorage.removeItem('pending_join_token');
            setCurrentStoreId(data.storeId);
            setStoreName(data.storeName);
          } else {
            // فشل القبول — امسح التوكن المعلق وكمّل
            localStorage.removeItem('pending_join_token');
          }
        })
        .catch(() => { localStorage.removeItem('pending_join_token'); })
        .finally(() => setInitializing(false));
      return;
    }

    // لو عنده توكن بدون store_id اجلب متاجره
    if (savedToken && !savedStoreId) {
      fetch(`${BACKEND}/stores`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
        .then(r => r.json())
        .then(stores => {
          if (Array.isArray(stores) && stores.length > 0) {
            localStorage.setItem('store_id', stores[0].id);
            localStorage.setItem('store_name', stores[0].name);
            setCurrentStoreId(stores[0].id);
            setStoreName(stores[0].name);
          }
        })
        .catch(() => {})
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  const handleLogin = (newToken: string, user: any, storeId?: string | null, sName?: string | null) => {
    setToken(newToken);
    setCurrentUser(user);
    setCurrentStoreId(storeId || localStorage.getItem('store_id'));
    setStoreName(sName || localStorage.getItem('store_name'));
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

  // ===== تحميل البيانات =====
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

  // ===== الويب سوكيت =====
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

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!token || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ===== ما عنده متجر — خيار إنشاء أو الانتظار =====
  if (!currentStoreId) {
    return (
      <div className="app" dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #eee' }}>
          <span style={{ fontWeight: 600, color: '#444' }}>مرحباً، {currentUser.name}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', color: '#666' }}>
            تسجيل خروج
          </button>
        </div>
        <div style={{ maxWidth: 440, margin: '60px auto', padding: '2rem', background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏪</div>
          <h2 style={{ marginBottom: 8 }}>أنشئ متجرك</h2>
          <p style={{ color: '#888', marginBottom: 24 }}>ابدأ بإنشاء متجرك الخاص مجاناً.</p>
          <input
            value={newStoreName}
            onChange={e => setNewStoreName(e.target.value)}
            placeholder="اسم المتجر"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #ddd', fontSize: 16, marginBottom: 12, boxSizing: 'border-box', textAlign: 'right' }}
            onKeyDown={e => e.key === 'Enter' && handleCreateStore()}
          />
          {storeError && <div style={{ color: 'red', marginBottom: 12 }}>{storeError}</div>}
          <button
            onClick={handleCreateStore}
            disabled={creatingStore}
            style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, cursor: 'pointer' }}
          >
            {creatingStore ? 'جاري الإنشاء...' : 'إنشاء المتجر'}
          </button>

          {/* لو عنده دعوة معلقة */}
          {localStorage.getItem('pending_join_token') && (
            <div style={{ marginTop: 20, padding: 16, background: '#fef3c7', borderRadius: 10 }}>
              <p style={{ color: '#92400e', fontSize: 14, marginBottom: 8 }}>
                ⏳ عندك دعوة معلقة — سجّل دخول بالإيميل المدعو لقبولها
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
      <header className="header">
        <div className="header-right">
          <div className="logo">🏪 {storeName || 'متجري'}</div>
          <nav className="nav">
            <button className={page === 'dashboard' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('dashboard')}>الرئيسية</button>
            <button className={page === 'products' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('products')}>المنتجات</button>
            <button className={page === 'orders' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('orders')}>الطلبات</button>
            <button className={page === 'pos' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('pos')}>💳 الكاشير</button>
            <button className={page === 'settings' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('settings')}>⚙️ الإعدادات</button>
          </nav>
        </div>

        <div className="header-left">
          <div className="connected-users">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? 'متصل' : 'غير متصل'}</span>
          </div>

          <div className="notif-wrapper">
            <button className="notif-btn" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}>
              🔔{unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notif-panel">
                <div className="notif-header">التنبيهات</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">لا توجد تنبيهات</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div key={n.id} className={`notif-item ${n.type === 'تحذير_مخزون' ? 'warning' : n.type === 'طلب_جديد' ? 'info' : 'success'}`}>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{new Date(n.createdAt).toLocaleTimeString('ar-SA')}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentUser.avatarUrl && (
              <img src={currentUser.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            )}
            <span style={{ fontSize: 14, color: '#444' }}>{currentUser.name}</span>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: '#666' }}
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {page === 'dashboard' && <Dashboard stats={stats} notifications={notifications} orders={orders} products={products} />}
        {page === 'products' && <Products {...{ products } as any} />}
        {page === 'orders' && <Orders orders={orders} products={products} />}
        {page === 'pos' && <POS />}                          {/* ← إضافة صفحة الكاشير */}
        {page === 'settings' && <Settings storeName={storeName} onStoreNameChange={(name) => { setStoreName(name); }} />}
      </main>
    </div>
  );
}
