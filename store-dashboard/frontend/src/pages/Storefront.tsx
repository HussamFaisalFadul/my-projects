import { useEffect, useState, useMemo } from 'react';
import './Storefront.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

// الأيقونات بصيغة SVG لضمان عدم تعطل الـ Build
const Icons = {
  Cart: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
  ),
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
};

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  reserved_quantity?: number;
  availableQuantity?: number;
  image_url?: string;
  description?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
  isReservation: boolean;
}

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderStatus, setOrderStatus] = useState<'idle'|'submitting'|'success'>('idle');

  // تحميل البيانات وحساب المتاح
  useEffect(() => {
    if (!slug) return;
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p,
            availableQuantity: p.quantity - (p.reserved_quantity || 0),
          }));
        }
        setStore(data);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [slug]);

  const totalPrice = useMemo(() => cart.reduce((s, i) => s + i.price * i.cartQuantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.cartQuantity, 0), [cart]);

  const addToCart = (product: Product) => {
    const available = product.availableQuantity ?? 0;
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      const currentQty = existing ? existing.cartQuantity : 0;
      const newQty = currentQty + 1;
      const isRes = newQty > available;

      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: newQty, isReservation: isRes } : p);
      }
      return [...prev, { ...product, cartQuantity: 1, isReservation: isRes }];
    });
    setShowCart(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(0, item.cartQuantity + delta);
      if (newQty === 0) return null;
      return { ...item, cartQuantity: newQty, isReservation: newQty > (item.availableQuantity ?? 0) };
    }).filter(Boolean) as CartItem[]);
  };

  const submitOrder = async () => {
    if (!customer.name || !customer.phone) return alert("يرجى ملء البيانات الأساسية");
    setOrderStatus('submitting');
    
    try {
      const response = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          items: cart,
          totalPrice,
          notes: `${customer.notes}\nالعنوان: ${customer.address}\nالدفع: ${paymentMethod}`
        })
      });

      if (response.ok) {
        const msg = `طلب جديد من: ${customer.name}\nالمحتويات:\n${cart.map(i => `- ${i.name} (${i.cartQuantity})`).join('\n')}\nالإجمالي: ${totalPrice} ر.س`;
        window.open(`https://wa.me/${store.owner_phone}?text=${encodeURIComponent(msg)}`, '_blank');
        setCart([]);
        setOrderStatus('success');
      }
    } catch { setOrderStatus('idle'); }
  };

  if (loading) return <div className="loader">جاري التحميل...</div>;

  return (
    <div className="store-app" dir="rtl">
      <header className="main-header">
        <div className="container header-flex">
          <div className="store-brand">
            <img src={store?.logo_url || '🏪'} alt="logo" className="store-logo" />
            <h1>{store?.name}</h1>
          </div>
          <button className="cart-trigger" onClick={() => setShowCart(true)}>
            <Icons.Cart />
            {totalItems > 0 && <span className="badge">{totalItems}</span>}
          </button>
        </div>
      </header>

      <main className="container">
        <div className="product-grid">
          {store?.products?.map((p: Product) => (
            <div key={p.id} className="product-card">
              <div className="image-wrapper">
                <img src={p.image_url} alt={p.name} />
                {(p.availableQuantity ?? 0) <= 0 && <span className="tag reservation">طلب حجز</span>}
              </div>
              <div className="product-details">
                <h3>{p.name}</h3>
                <p className="price">{p.price} <span>ر.س</span></p>
                <button 
                  className={`add-button ${(p.availableQuantity ?? 0) <= 0 ? 'res-btn' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  {(p.availableQuantity ?? 0) > 0 ? 'أضف للسلة' : 'اطلب كحجز الآن'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showCart && (
        <div className="drawer-backdrop" onClick={() => setShowCart(false)}>
          <div className="drawer-ui" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>سلة المشتريات ({totalItems})</h2>
              <button onClick={() => setShowCart(false)}><Icons.X /></button>
            </div>

            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="empty-cart">السلة فارغة حالياً</div>
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item-row">
                        <div className="item-info">
                          <h4>{item.name}</h4>
                          {item.isReservation && <p className="res-warning">⚠️ سيتم توفيره قريباً (حجز)</p>}
                          <p className="item-subtotal">{item.price * item.cartQuantity} ر.س</p>
                        </div>
                        <div className="qty-controls">
                          <button onClick={() => updateQty(item.id, 1)}><Icons.Plus /></button>
                          <span>{item.cartQuantity}</span>
                          <button onClick={() => updateQty(item.id, -1)}><Icons.Minus /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="checkout-section">
                    <div className="total-bar">
                      <span>الإجمالي النهائي:</span>
                      <strong>{totalPrice} ر.س</strong>
                    </div>
                    <div className="form-group">
                      <input placeholder="الاسم الكامل" onChange={e => setCustomer({...customer, name: e.target.value})} />
                      <input placeholder="رقم الجوال" onChange={e => setCustomer({...customer, phone: e.target.value})} />
                      <input placeholder="العنوان" onChange={e => setCustomer({...customer, address: e.target.value})} />
                      <div className="payment-methods">
                        {['cash', 'card', 'transfer'].map(m => (
                          <button 
                            key={m} 
                            className={paymentMethod === m ? 'active' : ''} 
                            onClick={() => setPaymentMethod(m)}
                          >
                            {m === 'cash' ? '💵 كاش' : m === 'card' ? '💳 بطاقة' : '🏦 تحويل'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      className="submit-btn" 
                      onClick={submitOrder}
                      disabled={orderStatus === 'submitting'}
                    >
                      {orderStatus === 'submitting' ? 'جاري التأكيد...' : 'تأكيد الطلب عبر واتساب'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
