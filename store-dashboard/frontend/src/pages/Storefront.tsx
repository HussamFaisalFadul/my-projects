import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Store } from '../api';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  description?: string;
  category?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

export default function Storefront() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<(Store & { products: Product[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    console.log('1. Fetching store for slug:', slug);
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => {
        console.log('2. Response status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('3. Received data:', data);
        if (data.error) throw new Error(data.error);
        setStore(data);
      })
      .catch(err => {
        console.error('4. Fetch error:', err);
        setError(err.message);
      })
      .finally(() => {
        console.log('5. Setting loading to false');
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const newQty = p.cartQuantity + delta;
      if (newQty <= 0) return null;
      return { ...p, cartQuantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone) {
      alert('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    if (cart.length === 0) return;
    setOrderStatus('submitting');
    try {
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store!.id,
          customerName,
          customerPhone,
          items: cart.map(item => ({
            productId: item.id,
            productName: item.name,
            quantity: item.cartQuantity,
            price: item.price,
          })),
          totalPrice,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderStatus('success');
        const message = `مرحباً، أود طلب:\n${cart.map(i => `${i.name} × ${i.cartQuantity} = ${i.price * i.cartQuantity} ريال`).join('\n')}\nالإجمالي: ${totalPrice} ريال\nالاسم: ${customerName}\nالجوال: ${customerPhone}\nملاحظات: ${notes || 'لا توجد'}`;
        const phone = store?.owner_phone || '';
        setWhatsappLink(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
        setCart([]);
        localStorage.removeItem(`cart_${slug}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setOrderStatus('error');
    }
  };

  if (loading) return <div className="storefront-loading">جاري تحميل المتجر...</div>;
  if (error) return <div className="storefront-error">حدث خطأ: {error}</div>;
  if (!store) return <div className="storefront-error">المتجر غير موجود</div>;

  return (
    <div className="storefront" dir="rtl">
      <header className="storefront-header">
        <div className="store-logo">
          {store.logoUrl ? <img src={store.logoUrl} alt={store.name} /> : <span>🏪</span>}
          <h1>{store.name}</h1>
        </div>
        <button className="cart-icon" onClick={() => setShowCart(!showCart)}>
          🛒 {cart.reduce((s, i) => s + i.cartQuantity, 0)}
        </button>
      </header>

      {store.description && <p className="store-description">{store.description}</p>}

      {store.products.length === 0 ? (
        <p className="no-products">لا توجد منتجات متاحة حالياً</p>
      ) : (
        <div className="products-grid">
          {store.products.map(product => (
            <div key={product.id} className="product-card">
              {product.image_url && <img src={product.image_url} alt={product.name} />}
              <h3>{product.name}</h3>
              <p className="price">{product.price} ريال</p>
              <button onClick={() => addToCart(product)} disabled={product.quantity === 0}>
                {product.quantity > 0 ? 'أضف للسلة' : 'غير متوفر'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCart && (
        <div className="cart-sidebar">
          <div className="cart-header">
            <h2>سلة التسوق</h2>
            <button onClick={() => setShowCart(false)}>✕</button>
          </div>
          {cart.length === 0 ? (
            <p>السلة فارغة</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <span>{item.name}</span>
                  <div>
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.cartQuantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button onClick={() => removeItem(item.id)}>🗑️</button>
                  </div>
                  <span>{item.price * item.cartQuantity} ريال</span>
                </div>
              ))}
              <div className="cart-total">الإجمالي: {totalPrice} ريال</div>
              <div className="customer-form">
                <input placeholder="الاسم الكامل" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input placeholder="رقم الجوال" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <textarea placeholder="ملاحظات (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} />
                <button onClick={handleSubmitOrder} disabled={orderStatus === 'submitting'}>
                  {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                </button>
              </div>
            </>
          )}
          {orderStatus === 'success' && whatsappLink && (
            <div className="whatsapp-link">
              <p>تم استلام طلبك! تواصل معنا عبر واتساب لإتمام الطلب:</p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">📱 افتح واتساب</a>
            </div>
          )}
          {orderStatus === 'error' && <p className="error">حدث خطأ، حاول مرة أخرى.</p>}
        </div>
      )}
    </div>
  );
}
