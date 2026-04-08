import { useEffect, useState, useMemo } from 'react';
import './Storefront.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

// أيقونات SVG مدمجة - لا تعتمد على مكتبات خارجية نهائياً
const Icons = {
  Cart: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  X: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Trash: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  )
};

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [orderStatus, setOrderStatus] = useState<'idle'|'sending'|'success'>('idle');

  useEffect(() => {
    if (!slug) return;
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => res.json())
      .then(data => {
        setStore(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.cartQuantity, 0), [cart]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.map(p => p.id === product.id ? {...p, cartQuantity: p.cartQuantity + 1} : p);
      return [...prev, {...product, cartQuantity: 1}];
    });
    setShowCart(true);
  };

  const submitOrder = async () => {
    if (!customer.name || !customer.phone) return alert('يرجى إكمال البيانات');
    setOrderStatus('sending');
    try {
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          items: cart,
          totalPrice,
          notes: `العنوان: ${customer.address}`
        })
      });
      if (res.ok) {
        setOrderStatus('success');
        window.open(`https://wa.me/${store.owner_phone}?text=${encodeURIComponent('طلب جديد من المتجر')}`, '_blank');
        setCart([]);
      }
    } catch { setOrderStatus('idle'); }
  };

  if (loading) return <div className="loader">جاري التحميل...</div>;

  return (
    <div className="store-container" dir="rtl">
      <nav className="store-nav">
        <div className="nav-content">
          <div className="store-info">
            <img src={store?.logo_url || 'https://via.placeholder.com/50'} className="logo-img" />
            <h1>{store?.name}</h1>
          </div>
          <button className="cart-btn" onClick={() => setShowCart(true)}>
            <Icons.Cart />
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>
        </div>
      </nav>

      <div className="product-grid">
        {store?.products?.map((p: any) => (
          <div key={p.id} className="p-card">
            <img src={p.image_url} alt={p.name} className="p-img" />
            <div className="p-info">
              <h3>{p.name}</h3>
              <div className="p-footer">
                <span className="p-price">{p.price} ر.س</span>
                <button onClick={() => addToCart(p)} className="add-btn">إضافة</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCart && (
        <div className="drawer-overlay">
          <div className="drawer-content">
            <div className="drawer-header">
              <h2>سلة المشتريات</h2>
              <button onClick={() => setShowCart(false)}><Icons.X /></button>
            </div>
            <div className="cart-list">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-meta">
                    <h4>{item.name}</h4>
                    <span>الكمية: {item.cartQuantity}</span>
                  </div>
                  <button className="del-btn" onClick={() => setCart(c => c.filter(i => i.id !== item.id))}>
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="checkout-form">
                <p>الإجمالي: {totalPrice} ر.س</p>
                <input placeholder="الاسم" onChange={e => setCustomer({...customer, name: e.target.value})} />
                <input placeholder="رقم الجوال" onChange={e => setCustomer({...customer, phone: e.target.value})} />
                <button onClick={submitOrder} className="order-btn">إتمام الطلب</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
