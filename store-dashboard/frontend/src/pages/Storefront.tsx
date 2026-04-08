import { useEffect, useState } from 'react';

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

  // تحميل بيانات المتجر
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
        // حساب الكمية المتاحة لكل منتج (المخزون الفعلي - المحجوز)
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p,
            availableQuantity: p.quantity - (p.reserved_quantity || 0),
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

  // تحميل السلة من localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [slug]);

  // حفظ السلة
  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // إضافة منتج إلى السلة (مع دعم الحجز)
  const addToCart = (product: Product) => {
    const available = product.availableQuantity ?? product.quantity;
    if (available <= 0) {
      const confirmReserve = window.confirm(
        `"${product.name}" غير متوفر حالياً. هل تريد طلبه كحجز؟ (سيتم إشعارك عند توفره)`
      );
      if (!confirmReserve) return;
      // إضافة كحجز (الكمية المتاحة 0 أو أقل)
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

  // تحديث الكمية في السلة
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(p => {
          if (p.id !== productId) return p;
          let newQty = p.cartQuantity + delta;
          if (newQty < 1) return null;
          const available = p.availableQuantity ?? p.quantity;
          let isReservation = p.isReservation;
          if (!isReservation && newQty > available) {
            const confirmReserve = window.confirm(
              `⚠️ الكمية المطلوبة (${newQty}) تتجاوز المتاح (${available}). هل تريد تحويل الكمية الزائدة إلى حجز؟`
            );
            if (!confirmReserve) return p;
            isReservation = true;
          }
          return { ...p, cartQuantity: newQty, isReservation };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  // إرسال الطلب
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
        const reservationMsg = cart.some(i => i.isReservation)
          ? '\n⚠️ بعض المنتجات غير متوفرة وتم طلبها كحجز.'
          : '';
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>جاري تحميل المتجر...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>حدث خطأ: {error}</div>;
  if (!store) return <div style={{ textAlign: 'center', padding: 40 }}>المتجر غير موجود</div>;

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif', maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* الهيدر */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {store.logo_url ? <img src={store.logo_url} alt={store.name} style={{ width: 50, height: 50, borderRadius: '50%' }} /> : <span style={{ fontSize: 40 }}>🏪</span>}
          <h1 style={{ fontSize: 24, margin: 0 }}>{store.name}</h1>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          style={{ background: '#f1f5f9', border: 'none', fontSize: 28, padding: '8px 12px', borderRadius: 30, cursor: 'pointer', position: 'relative' }}
        >
          🛒 {cart.reduce((s, i) => s + i.cartQuantity, 0) > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', fontSize: 12, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cart.reduce((s, i) => s + i.cartQuantity, 0)}</span>}
        </button>
      </header>

      {store.description && <p style={{ color: '#64748b', marginBottom: 20 }}>{store.description}</p>}

      {/* المنتجات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {store.products && store.products.length > 0 ? (
          store.products.map((product: Product) => {
            const available = product.availableQuantity ?? product.quantity;
            return (
              <div key={product.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, textAlign: 'center', background: 'white', transition: '0.2s' }}>
                {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />}
                <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{product.name}</h3>
                <p style={{ fontWeight: 'bold', color: '#2c7da0', fontSize: 20, margin: '8px 0' }}>{product.price} ريال</p>
                <p style={{ fontSize: 14, color: '#64748b' }}>المتبقي: {Math.max(0, available)}</p>
                {product.reserved_quantity && product.reserved_quantity > 0 && (
                  <p style={{ fontSize: 12, color: '#f59e0b' }}>محجوز: {product.reserved_quantity}</p>
                )}
                <button
                  onClick={() => addToCart(product)}
                  disabled={available <= 0 && false}
                  style={{ background: available > 0 ? '#2c7da0' : '#cbd5e1', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 30, cursor: available > 0 ? 'pointer' : 'not-allowed', width: '100%', marginTop: 12 }}
                >
                  {available > 0 ? 'أضف للسلة' : 'طلب حجز'}
                </button>
              </div>
            );
          })
        ) : (
          <p style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>لا توجد منتجات متاحة حالياً</p>
        )}
      </div>

      {/* السلة الجانبية */}
      {showCart && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: 420, height: '100%', background: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', padding: 24, overflowY: 'auto', zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideLeft 0.3s ease'
        }}>
          <style>{`
            @keyframes slideLeft {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
            <h2 style={{ fontSize: 22 }}>سلة التسوق</h2>
            <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>السلة فارغة</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 400, overflowY: 'auto' }}>
                {cart.map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 600 }}>
                      <span>{item.name}</span>
                      <span>{item.price} ريال</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8 }}>
                      {item.isReservation ? (
                        <span style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>⚠️ حجز (غير متوفر حالياً)</span>
                      ) : (
                        <span>المتبقي في المخزون: {Math.max(0, item.availableQuantity ?? item.quantity)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => updateQuantity(item.id, -1)} style={{ width: 32, height: 32, border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, cursor: 'pointer' }}>-</button>
                      <span>{item.cartQuantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} style={{ width: 32, height: 32, border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, cursor: 'pointer' }}>+</button>
                      <button onClick={() => removeItem(item.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: 20, textAlign: 'left', borderTop: '2px solid #e2e8f0', paddingTop: 16 }}>الإجمالي: {totalPrice} ريال</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" placeholder="الاسم الكامل *" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10 }} />
                <input type="tel" placeholder="رقم الجوال *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10 }} />
                <input type="text" placeholder="العنوان (اختياري)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10 }} />
                <textarea placeholder="ملاحظات إضافية (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, fontFamily: 'inherit' }} rows={2} />
              </div>

              <div style={{ marginTop: 8 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>طريقة الدفع:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { value: 'cash', label: '💵 كاش' },
                    { value: 'card', label: '💳 بطاقة' },
                    { value: 'transfer', label: '📱 تحويل بنكي' },
                    { value: 'whatsapp', label: '📱 واتساب (دردشة)' },
                  ].map(m => (
                    <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '8px 12px', borderRadius: 30, border: `1px solid ${paymentMethod === m.value ? '#2c7da0' : '#e2e8f0'}` }}>
                      <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value as PaymentMethod)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={orderStatus === 'submitting'}
                style={{ background: '#2c7da0', color: 'white', border: 'none', padding: 14, borderRadius: 40, cursor: 'pointer', fontSize: 16, fontWeight: 'bold', marginTop: 8 }}
              >
                {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>

              {orderStatus === 'success' && whatsappLink && (
                <div style={{ background: '#dcfce7', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <p>✅ تم استلام طلبك! يرجى تأكيد الطلب عبر واتساب:</p>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#25d366', color: 'white', padding: '10px 20px', borderRadius: 40, textDecoration: 'none', marginTop: 8 }}>📱 افتح واتساب</a>
                </div>
              )}
              {orderStatus === 'error' && <p style={{ color: '#dc2626', textAlign: 'center' }}>❌ حدث خطأ، حاول مرة أخرى.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
