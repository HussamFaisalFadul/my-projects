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

  // إدارة التوثيق والمخزن
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

  // التعامل مع روابط المتجر الخارجي أو الانضمام
  if (window.location.pathname.startsWith('/join/')) return <JoinPage />;
  if (window.location.pathname.startsWith('/store/')) return <Storefront />;

  // تهيئة التطبيق والتحقق من التوكن والمخازن
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
    if (!window.confirm(t('common.confirmLogout'))) return;
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

  // الإشعارات
  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    api.markNotificationsRead().catch(() => {});
  }, []);

  // جلب البيانات الأولية
  useEffect(() => {
    if (!token || !currentStoreId) return;
    api.getProducts().then(setProducts).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
    api.getStats().then(setStats).catch(() => {});
    api.getNotifications().then(setNotifications).catch(() => {});
  }, [token, currentStoreId]);

  // Socket.io الأحداث الحية
  useEffect(() => {
    if (!currentStoreId) return;
    socket.emit('join_store', currentStoreId);
    
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    socket.on('product_added', (p) => setProducts(prev => [...prev, p]));
    socket.on('product_updated', (p) => setProducts(prev => prev.map(old => old.id === p.id ? p : old)));
    socket.on('product_deleted', (id) => setProducts(prev => prev.filter(p => p.id !== id)));
    socket.on('order_added', (o) => {
      setOrders(prev => [o, ...prev]);
      // تنبيه صوتي بسيط عند طلب جديد يمكن إضافته هنا
    });
    socket.on('order_updated', (o) => setOrders(prev => prev.map(old => old.id === o.id ? o : old)));
    socket.on('stats_updated', setStats);
    socket.on('notification', (n) => setNotifications(prev => [n, ...prev].slice(0, 50)));

    return () => {
      socket.emit('leave_store', currentStoreId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('product_added'); socket.off('product_updated'); socket.off('product_deleted');
      socket.off('order_added'); socket.off('order_updated');
      socket.off('stats_updated'); socket.off('notification');
    };
  }, [currentStoreId]);

  if (initializing) return <div className="loading-screen"><div className="loading-spinner"></div><p>{t('common.loading')}</p></div>;
  
  if (!token || !currentUser) return <Login onLogin={handleLogin} />;

  // واجهة إنشاء مخزن إذا لم يوجد
  if (!currentStoreId) {
    return (
      <div className="app" dir="rtl">
        <header className="header" style={{ justifyContent: 'space-between', padding: '0 2rem' }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{t('common.welcome')} {currentUser.name}</span>
          <button onClick={handleLogout} className="logout-btn-simple" style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
            {t('common.logout')} 🚪
          </button>
        </header>
        <div className="create-store-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <div className="create-store-card" style={{ maxWidth: 440, width: '100%', padding: '2.5rem', textAlign: 'center', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏪</div>
            <h2 style={{ marginBottom: '0.5rem' }}>{t('common.createStore')}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{t('common.noStoreFound')}</p>
            <input
              value={newStoreName}
              onChange={e => setNewStoreName(e.target.value)}
              placeholder={t('common.storeNamePlaceholder')}
              className="input-field"
              style={{ width: '100%', marginBottom: '1rem', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            {storeError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '14px' }}>{storeError}</div>}
            <button onClick={handleCreateStore} disabled={creatingStore} className="primary-btn" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              {creatingStore ? t('common.creating') : t('common.createStore')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="header">
        <div className="header-right">
          <div className="logo" style={{ fontWeight: 800, fontSize: '20px', color: '#2563eb' }}>
            🏪 <span style={{ color: '#1e293b' }}>{storeName || t('common.myStore')}</span>
          </div>
          <nav className="nav">
            {['dashboard', 'products', 'orders', 'suppliers', 'pos', 'settings'].map((p) => (
              <button 
                key={p} 
                className={page === p ? 'nav-btn active' : 'nav-btn'} 
                onClick={() => setPage(p as Page)}
              >
                {t(`nav.${p}`)}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-left">
          {/* حالة الاتصال الذكية */}
          <div className="status-pill" title={isConnected ? 'Connected to Live Server' : 'Connecting...'}>
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span className="status-text">{isConnected ? t('common.connected') : t('common.connecting')}</span>
          </div>

          {/* الإشعارات المحسنة */}
          <div className="notif-wrapper">
            <button 
              className={`icon-circle-btn ${unreadCount > 0 ? 'has-unread' : ''}`} 
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead(); }}
            >
              🔔
              {unreadCount > 0 && <span className="notif-badge-new">{unreadCount}</span>}
            </button>
            
            {showNotifications && (
              <>
                <div className="notif-overlay" onClick={() => setShowNotifications(false)}></div>
                <div className="notif-panel-new">
                  <div className="notif-header-new">
                    <span>{t('notifications.title')}</span>
                    <button onClick={() => setShowNotifications(false)}>✕</button>
                  </div>
                  <div className="notif-list-new">
                    {notifications.length === 0 ? (
                      <div className="notif-empty-state">
                        <div style={{ fontSize: '24px' }}>📭</div>
                        <p>{t('notifications.noNotifications')}</p>
                      </div>
                    ) : (
                      notifications.slice(0, 15).map(n => (
                        <div key={n.id} className={`notif-card ${n.read ? 'read' : 'unread'} ${n.type}`}>
                          <div className="notif-content">
                            <p className="notif-message">{n.message}</p>
                            <span className="notif-time-new">
                              {n.createdAt ? new Date(n.createdAt).toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* لغة النظام */}
          <button className="lang-toggle-btn" onClick={toggleLanguage}>
            <span className="lang-icon">🌐</span>
            <span className="lang-text">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* تسجيل الخروج */}
          <button className="logout-btn-new" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            <span className="logout-text">{t('common.logout')}</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-container">
          {page === 'dashboard' && <Dashboard stats={stats} notifications={notifications} orders={orders} products={products} />}
          {page === 'products' && <Products products={products} />}
          {page === 'orders' && <Orders orders={orders} products={products} />}
          {page === 'pos' && <POS />}
          {page === 'suppliers' && <Suppliers />}
          {page === 'settings' && <Settings storeName={storeName} onStoreNameChange={setStoreName} />}
        </div>
      </main>
    </div>
  );
}
