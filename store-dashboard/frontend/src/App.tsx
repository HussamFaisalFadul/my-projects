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

  if (initializing) return <div className="loading-screen"><div className="loading-spinner"></div><p>{t('common.loading')}</p></div>;
  if (!token || !currentUser) return <Login onLogin={handleLogin} />;

  if (!currentStoreId) {
    return (
      <div className="app" dir="rtl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #eee' }}>
          <span style={{ fontWeight: 600 }}>{t('common.welcome')} {currentUser.name}</span>
          <button onClick={handleLogout} className="nav-btn">{t('common.logout')}</button>
        </div>
        <div className="create-store-card" style={{ maxWidth: 440, margin: '60px auto', padding: '2rem', textAlign: 'center' }}>
          <h2>{t('common.createStore')}</h2>
          <input
            value={newStoreName}
            onChange={e => setNewStoreName(e.target.value)}
            placeholder={t('common.storeNamePlaceholder')}
            className="input-field"
            style={{ width: '100%', marginBottom: 12, padding: 10 }}
          />
          {storeError && <div style={{ color: 'red', marginBottom: 12 }}>{storeError}</div>}
          <button onClick={handleCreateStore} disabled={creatingStore} className="primary-btn" style={{ width: '100%' }}>
            {creatingStore ? t('common.creating') : t('common.createStore')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="header">
        <div className="header-right">
          <div className="logo">🏪 {storeName || t('common.myStore')}</div>
          <nav className="nav">
            {['dashboard', 'products', 'orders', 'suppliers', 'pos', 'settings'].map((p) => (
              <button key={p} className={page === p ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage(p as Page)}>
                {t(`nav.${p}`)}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-left" style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <div className="connected-users">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? t('common.connected') : t('common.disconnected')}</span>
          </div>

          <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button className="notif-btn" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}>
              🔔{unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
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
                      <div key={n.id} className={`notif-item ${n.type === 'تحذير_مخزون' ? 'warning' : n.type === 'طلب_جديد' ? 'info' : 'success'}`}>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{timeValue ? new Date(timeValue).toLocaleTimeString('ar-SA') : '--:--'}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button onClick={toggleLanguage} className="lang-btn" style={{ background: 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: 20 }}>
            🌐 {i18n.language === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button onClick={handleLogout} className="logout-btn" style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 8 }}>
            {t('common.logout')}
          </button>
        </div>
      </header>

      <main className="main">
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
