import { useEffect, useState } from 'react';
import './Storefront.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  reserved_quantity?: number;
  availableQuantity?: number;
  image_url?: string;
  description?: string;
  category?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
  isReservation: boolean;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'whatsapp';

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [whatsappLink, setWhatsappLink] = useState('');

  useEffect(() => {
    if (!slug) {
      setError('رابط غير صحيح');
      setLoading(false);
      return;
    }
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p,
            availableQuantity: p.availableQuantity ?? (p.quantity - (p.reserved_quantity || 0)),
          }));
        }
        setStore(data);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  const addToCart = (product: Product) => {
    const available = product.availableQuantity ?? product.quantity;
    if (available <= 0) {
      const confirmReserve = window.confirm(
        `"${product.name}" غير متوفر حالياً. هل تريد طلبه كحجز؟ (سيتم إشعارك عند توفره)`
      );
      if (!confirmReserve) return;
      setCart(prev => {
        const existing = prev.find(p => p.id === product.id);
        if (existing) {
          return prev.map(p =>
            p.id === product.id
              ? { ...p, cartQuantity: p.cartQuantity + 1, isReservation: true }
              : p
          );
        }
        return [
          ...prev,
          {
            ...product,
            cartQuantity: 1,
            isReservation: true,
            availableQuantity: product.availableQuantity,
          },
        ];
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      let currentQty = existing ? existing.cartQuantity : 0;
      let newQty = currentQty + 1;
      let isReservation = false;
      if (newQty > available) {
        const confirmReserve = window.confirm(
          `⚠️ الكمية المطلوبة (${newQty}) تتجاوز المتاح (${available}). هل تريد طلب الكمية الزائدة كحجز؟`
        );
        if (!confirmReserve) return prev;
        isReservation = true;
      }
      if (existing) {
        return prev.map(p =>
          p.id === product.id
            ? { ...p, cartQuantity: newQty, isReservation: isReservation || p.isReservation }
            : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          cartQuantity: newQty,
          isReservation,
          availableQuantity: product.availableQuantity,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(p => {
          if (p.id !== productId) return p;
          let newQty = p.cartQuantity + delta;
          if (newQty < 1) return null;
          const available = p.availableQuantity ?? p.quantity;
          if (!p.isReservation && newQty > available) {
            const confirmReserve = window.confirm(
              `⚠️ الكمية المطلوبة (${newQty}) تتجاوز المتاح (${available}). هل تريد تحويل الكمية الزائدة إلى حجز؟`
            );
            if (!confirmReserve) return p;
            return { ...p, cartQuantity: newQty, isReservation: true };
          }
          return { ...p, cartQuantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
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
    if (cart.length === 0) {
      alert('السلة فارغة');
      return;
    }
    setOrderStatus('submitting');
    try {
      const itemsToSend = cart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.cartQuantity,
        price: item.price,
        isReservation: item.isReservation,
      }));
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName,
          customerPhone,
          items: itemsToSend,
          totalPrice,
          notes: `${notes}\nالعنوان: ${customerAddress}\nطريقة الدفع: ${paymentMethod}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderStatus('success');
        const reservationMsg = cart.some(i => i.isReservation) ? '\n⚠️ بعض المنتجات غير متوفرة وتم طلبها كحجز.' : '';
        const message = `مرحباً، أود طلب:\n${cart
          .map(i => `${i.name} × ${i.cartQuantity} = ${i.price * i.cartQuantity} ريال${i.isReservation ? ' (حجز)' : ''}`)
          .join('\n')}\nالإجمالي: ${totalPrice} ريال\nالاسم: ${customerName}\nالجوال: ${customerPhone}\nالعنوان: ${customerAddress || 'غير محدد'}\nملاحظات: ${notes || 'لا توجد'}\nطريقة الدفع: ${paymentMethod === 'cash' ? 'كاش' : paymentMethod === 'card' ? 'بطاقة' : paymentMethod === 'transfer' ? 'تحويل' : 'واتساب'}${reservationMsg}`;
        const phone = store.owner_phone || '';
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
          {store.logo_url ? <img src={store.logo_url} alt={store.name} /> : <span>🏪</span>}
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
          {store.products.map((product: Product) => {
            const available = product.availableQuantity ?? product.quantity;
            return (
              <div key={product.id} className="product-card">
                {product.image_url && <img src={product.image_url} alt={product.name} />}
                <h3>{product.name}</h3>
                <p className="price">{product.price} ريال</p>
                <p className="stock-info">
                  المتاح: {Math.max(0, available)}
                  {product.reserved_quantity && product.reserved_quantity > 0 && (
                    <span style={{ marginRight: '8px', color: '#f59e0b' }}>
                      (محجوز: {product.reserved_quantity})
                    </span>
                  )}
                </p>
                <button onClick={() => addToCart(product)} disabled={available <= 0 && false}>
                  {available > 0 ? 'أضف للسلة' : 'طلب حجز'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showCart && (
        <div className="cart-sidebar">
          <div className="cart-header">
            <h2>سلة التسوق</h2>
            <button onClick={() => setShowCart(false)}>✕</button>
          </div>
          {cart.length === 0 ? (
            <p className="empty-cart">السلة فارغة</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">{item.price} ريال</span>
                    </div>
                    <div className="cart-item-stock">
                      {item.isReservation ? (
                        <span className="reservation-badge">⚠️ حجز (غير متوفر حالياً)</span>
                      ) : (
                        <span>المتبقي في المخزون: {Math.max(0, (item.availableQuantity ?? item.quantity))}</span>
                      )}
                    </div>
                    <div className="cart-item-controls">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.cartQuantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                      <button className="remove-btn" onClick={() => removeItem(item.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">الإجمالي: {totalPrice} ريال</div>

              <div className="customer-form">
                <input type="text" placeholder="الاسم الكامل *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input type="tel" placeholder="رقم الجوال *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <input type="text" placeholder="العنوان (اختياري)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                <textarea placeholder="ملاحظات إضافية (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="payment-methods">
                <p>طريقة الدفع:</p>
                <div className="payment-options">
                  <label><input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} /> 💵 كاش</label>
                  <label><input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} /> 💳 بطاقة</label>
                  <label><input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} /> 📱 تحويل بنكي</label>
                  <label><input type="radio" name="payment" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} /> 📱 واتساب (دردشة)</label>
                </div>
              </div>

              <button className="checkout-btn" onClick={handleSubmitOrder} disabled={orderStatus === 'submitting'}>
                {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>

              {orderStatus === 'success' && whatsappLink && (
                <div className="whatsapp-link">
                  <p>✅ تم استلام طلبك! يرجى تأكيد الطلب عبر واتساب:</p>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">📱 افتح واتساب</a>
                </div>
              )}
              {orderStatus === 'error' && <p className="error-msg">❌ حدث خطأ، حاول مرة أخرى.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
