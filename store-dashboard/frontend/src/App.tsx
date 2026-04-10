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

        <div className="header-left" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* حالة الاتصال */}
          <div className="connected-users" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '30px' }}>
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }}></span>
            <span style={{ fontSize: 13, color: '#334155' }}>{isConnected ? t('common.connected') : t('common.disconnected')}</span>
          </div>

          {/* أيقونة الإشعارات */}
          <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button className="notif-btn" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '30px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px' }}>
              🔔{unreadCount > 0 && <span className="notif-badge" style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: 'white', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notif-panel" style={{ position: 'absolute', left: 0, top: 45, width: 320, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 200, overflow: 'hidden' }}>
                <div className="notif-header" style={{ padding: '12px 16px', fontWeight: 700, borderBottom: '1px solid #f0f0f0' }}>{t('notifications.title')}</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>{t('notifications.noNotifications')}</div>
                ) : (
                  notifications.slice(0, 10).map(n => {
                    const timeValue = (n as any).createdAt ?? (n as any).created_at;
                    return (
                      <div key={n.id} className={`notif-item ${n.type === 'تحذير_مخزون' ? 'warning' : n.type === 'طلب_جديد' ? 'info' : 'success'}`} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', borderRight: '3px solid transparent' }}>
                        <div className="notif-msg" style={{ fontSize: 13, marginBottom: 4 }}>{n.message}</div>
                        <div className="notif-time" style={{ fontSize: 11, color: '#999' }}>{timeValue ? new Date(timeValue).toLocaleTimeString('ar-SA') : '--:--'}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* زر تبديل اللغة */}
          <button onClick={toggleLanguage} style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '30px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
            🌐 {i18n.language === 'ar' ? 'English' : 'العربية'}
          </button>

          {/* زر تسجيل الخروج */}
          <button onClick={handleLogout} style={{
            background: '#fee2e2',
            border: 'none',
            borderRadius: '30px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
          onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}>
            🚪 {t('common.logout')}
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