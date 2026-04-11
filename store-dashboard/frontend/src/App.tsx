import Login from './pages/Login';
import Settings from './pages/Settings';
import JoinPage from './pages/JoinPage';
import POS from './pages/POS';
import Storefront from './pages/Storefront';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { socket, api, Product, Order, StoreStats, Notification, Store } from './api';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import './App.css';
import Suppliers from './pages/Suppliers';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

type Page = 'dashboard' | 'products' | 'orders' | 'settings' | 'pos' | 'suppliers';

const NAV_ICONS: Record<string, string> = {
  dashboard: '📊',
  products: '📦',
  orders: '🛒',
  suppliers: '🏭',
  pos: '🖥️',
  settings: '⚙️',
};

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

  if (window.location.pathname.startsWith('/join/')) return <JoinPage />;
  if (window.location.pathname.startsWith('/store/')) return <Storefront />;

  useEffect(() => {
    const savedToken = localStorage.getItem('store_token');
    const savedStoreId = localStorage.getItem('store_id');
    const pendingJoinToken = localStorage.getItem('pending_join_token');

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
      } else if ((store as any).error) {
        setStoreError((store as any).error || t('common.errorOccurred'));
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

  useEffect(() => {
    if (!token || !currentStoreId) return;
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
    }).catch(() => {});
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

  if (initializing) return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p>{t('common.loading')}</p>
    </div>
  );

  if (!token || !currentUser) return <Login onLogin={handleLogin} />;

  if (!currentStoreId) {
    return (
      <div className="app" dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #dddfe2', background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#050505' }}>مرحباً {currentUser.name} 👋</span>
          <button onClick={handleLogout} className="icon-btn danger">🚪 {t('common.logout')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 57px)', background: '#f0f2f5' }}>
          <div className="create-store-card" style={{ maxWidth: 440, width: '100%', margin: '0 16px', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
            <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: 22 }}>{t('common.createStore')}</h2>
            <p style={{ color: '#65676b', marginBottom: 20, fontSize: 14 }}>أنشئ متجرك الآن وابدأ إدارة منتجاتك وطلباتك</p>
            <input
              value={newStoreName}
              onChange={e => setNewStoreName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateStore()}
              placeholder={t('common.storeNamePlaceholder')}
              className="input-field"
              style={{ marginBottom: 12, textAlign: 'right' }}
            />
            {storeError && <div style={{ color: '#e41e3f', marginBottom: 12, fontSize: 13 }}>{storeError}</div>}
            <button onClick={handleCreateStore} disabled={creatingStore} className="primary-btn" style={{ width: '100%' }}>
              {creatingStore ? t('common.creating') : t('common.createStore')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

      {/* ===== HEADER ===== */}
      <header className="header">

        {/* Right side: logo + nav */}
        <div className="header-right">
          <div className="logo">
            🏪 <span>{storeName || t('common.myStore')}</span>
          </div>
          <nav className="nav">
            {(['dashboard', 'products', 'orders', 'suppliers', 'pos', 'settings'] as Page[]).map((p) => (
              <button
                key={p}
                className={`nav-btn${page === p ? ' active' : ''}`}
                onClick={() => setPage(p)}
              >
                {NAV_ICONS[p]} {t(`nav.${p}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Left side: status + notifs + lang + logout */}
        <div className="header-left">

          {/* Connection status */}
          <div className="conn-pill">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? t('common.connected') : t('common.disconnected')}</span>
          </div>

          {/* Notifications */}
          <div className="notif-wrapper">
            <button
              className="notif-btn"
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}
              title={t('notifications.title')}
            >
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <div className="notif-panel">
                <div className="notif-header">{t('notifications.title')}</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">{t('notifications.noNotifications')}</div>
                ) : (
                  notifications.slice(0, 10).map(n => {
                    const timeValue = (n as any).createdAt ?? (n as any).created_at;
                    return (
                      <div key={n.id} className="notif-item">
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">
                          {timeValue ? new Date(timeValue).toLocaleTimeString('ar-SA') : '--:--'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Language toggle */}
          <button onClick={toggleLanguage} className="icon-btn">
            🌐 {i18n.language === 'ar' ? 'EN' : 'ع'}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} className="icon-btn danger">
            🚪 {t('common.logout')}
          </button>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="main">
        {page === 'dashboard' && <Dashboard stats={stats} notifications={notifications} orders={orders} products={products} />}
        {page === 'products'  && <Products products={products} />}
        {page === 'orders'    && <Orders orders={orders} products={products} />}
        {page === 'pos'       && <POS />}
        {page === 'suppliers' && <Suppliers />}
        {page === 'settings'  && <Settings storeName={storeName} onStoreNameChange={setStoreName} />}
      </main>
    </div>
  );
}
