import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { socket, api, Product, Order, StoreStats, Notification, Store } from './api';

// استيراد الصفحات
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import POS from './pages/POS';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import JoinPage from './pages/JoinPage';
import Storefront from './pages/Storefront';

import './App.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

type Page = 'dashboard' | 'products' | 'orders' | 'settings' | 'pos' | 'suppliers';

export default function App() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState<Page>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [storeError, setStoreError] = useState('');
  const [initializing, setInitializing] = useState(true);

  // إدارة التوثيق
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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  // معالجة الروابط الخارجية
  if (window.location.pathname.startsWith('/join/')) return <JoinPage />;
  if (window.location.pathname.startsWith('/store/')) return <Storefront />;

  // منطق تهيئة المتجر والتوثيق
  useEffect(() => {
    const savedToken = localStorage.getItem('store_token');
    const savedStoreId = localStorage.getItem('store_id');
    const pendingJoinToken = localStorage.getItem('pending_join_token');

    if (savedToken && pendingJoinToken) {
      fetch(`${BACKEND}/api/stores/join/${pendingJoinToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`,
        },
      })
        .then(r => r.json())
        .then(data => {
          const anyData = data as any;
          if (anyData.success && anyData.storeId) {
            localStorage.setItem('store_id', anyData.storeId);
            localStorage.setItem('store_name', anyData.storeName || '');
            localStorage.removeItem('pending_join_token');
            setCurrentStoreId(anyData.storeId);
            setStoreName(anyData.storeName);
          } else {
            localStorage.removeItem('pending_join_token');
          }
        })
        .catch(() => { localStorage.removeItem('pending_join_token'); })
        .finally(() => setInitializing(false));
      return;
    }

    if (savedToken && !savedStoreId) {
      fetch(`${BACKEND}/api/stores`, {
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
    const id = storeId || localStorage.getItem('store_id');
    const name = sName || localStorage.getItem('store_name');
    setCurrentStoreId(id);
    setStoreName(name);
  };

  const handleLogout = () => {
    localStorage.clear();
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
    if (!newStoreName.trim()) { setStoreError(t('common.requiredField')); return; }
    setCreatingStore(true);
    setStoreError('');
    try {
      const store: Store = await api.createStore({ name: newStoreName.trim() });
      if (store.id) {
        localStorage.setItem('store_id', store.id);
        localStorage.setItem('store_name', store.name);
        setCurrentStoreId(store.id);
        setStoreName(store.name);
      }
    } catch {
      setStoreError(t('common.connectionError'));
    }
    setCreatingStore(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // جلب البيانات الأساسية
  useEffect(() => {
    if (!token || !currentStoreId) return;
    api.getProducts().then(setProducts).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
    api.getStats().then(setStats).catch(() => {});
    api.getNotifications().then(setNotifications).catch(() => {});
  }, [token, currentStoreId]);

  // الربط الحي (Sockets)
  useEffect(() => {
    if (!currentStoreId) return;
    socket.emit('join_store', currentStoreId);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    setIsConnected(socket.connected);

    socket.on('order_added', (o) => setOrders(prev => [o, ...prev]));
    socket.on('notification', (n) => setNotifications(prev => [n, ...prev]));
    socket.on('stats_updated', setStats);

    return () => {
      socket.emit('leave_store', currentStoreId);
      socket.off('connect'); socket.off('disconnect');
      socket.off('order_added'); socket.off('notification'); socket.off('stats_updated');
    };
  }, [currentStoreId]);

  if (initializing) return <div className="loading-screen">...</div>;
  if (!token || !currentUser) return <Login onLogin={handleLogin} />;

  // شاشة إنشاء متجر إذا كان المستخدم لا يملك متجراً
  if (!currentStoreId) {
    return (
      <div className="create-store-view" dir="rtl">
        <div className="card">
          <h2>{t('common.createStore')}</h2>
          <input value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="اسم المتجر" />
          <button onClick={handleCreateStore}>{creatingStore ? '...' : 'إنشاء'}</button>
          <button onClick={handleLogout} className="text-btn">خروج</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* القائمة العلوية المحسنة كلياً */}
      <header className="header-modern">
        <div className="header-container">
          
          <div className="header-right-side">
            <div className="brand-wrapper">
              <div className="brand-icon">🏪</div>
              <div className="brand-info">
                <span className="brand-name">{storeName}</span>
                <div className="live-indicator">
                  <span className={`dot ${isConnected ? 'online' : 'offline'}`}></span>
                  <span className="dot-text">{isConnected ? 'متصل' : 'جاري الاتصال'}</span>
                </div>
              </div>
            </div>

            <nav className="main-nav">
              {['dashboard', 'products', 'orders', 'suppliers', 'pos', 'settings'].map((p) => (
                <button 
                  key={p} 
                  className={`nav-item ${page === p ? 'active' : ''}`} 
                  onClick={() => setPage(p as Page)}
                >
                  {t(`nav.${p}`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="header-left-side">
            <div className="action-group">
              <div className="notif-wrapper">
                <button className="action-btn" onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAllRead(); }}>
                  🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className="notif-dropdown">
                    <div className="dropdown-header"><h3>التنبيهات</h3></div>
                    <div className="dropdown-body">
                      {notifications.length === 0 ? <p>لا يوجد تنبيهات</p> : 
                        notifications.slice(0,5).map(n => <div key={n.id} className="notif-line">{n.message}</div>)}
                    </div>
                  </div>
                )}
              </div>

              <button className="action-btn lang-btn" onClick={toggleLanguage}>
                🌐 {i18n.language === 'ar' ? 'English' : 'العربية'}
              </button>

              <button className="logout-btn-modern" onClick={handleLogout}>
                🚪 {t('common.logout')}
              </button>
            </div>
          </div>

        </div>
      </header>

      <main className="main-viewport">
        {page === 'dashboard' && <Dashboard stats={stats} notifications={notifications} orders={orders} products={products} />}
        {page === 'products' && <Products products={products} />}
        {page === 'orders' && <Orders orders={orders} products={products} />}
        {page === 'pos' && <POS />}
        {page === 'suppliers' && <Suppliers />}
        {page === 'settings' && <Settings storeName={storeName} onStoreNameChange={setStoreName} />}
      </main>
    </div>
  );
}
