import { useEffect, useState, useMemo } from 'react';
import { 
  ShoppingBag, X, Plus, Minus, Trash2, 
  ChevronLeft, MapPin, Phone, User, 
  CreditCard, MessageSquare, ShoppingCart, 
  Info, CheckCircle
} from 'lucide-react';
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

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  
  // حقول العميل
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [whatsappLink, setWhatsappLink] = useState('');

  // جلب البيانات من السيرفر
  useEffect(() => {
    if (!slug) {
      setError('رابط المتجر غير صالح');
      setLoading(false);
      return;
    }
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        // معالجة الكميات المتاحة
        const processedProducts = data.products?.map((p: any) => ({
          ...p,
          availableQuantity: p.availableQuantity ?? (p.quantity - (p.reserved_quantity || 0)),
        }));
        setStore({ ...data, products: processedProducts });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  // إدارة السلة (LocalStorage)
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${slug}`);
    if (saved) setCart(JSON.parse(saved));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // الحسابات
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.cartQuantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);

  // وظائف السلة
  const addToCart = (product: Product) => {
    const available = product.availableQuantity ?? 0;
    const existing = cart.find(p => p.id === product.id);
    
    setCart(prev => {
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1, isReservation: available <= 0 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(p => p.id === id ? { ...p, cartQuantity: Math.max(1, p.cartQuantity + delta) } : p));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(p => p.id !== id));

  // إرسال الطلب
  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone) {
      alert('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    setOrderStatus('submitting');
    
    try {
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName,
          customerPhone,
          items: cart.map(i => ({
            productId: i.id,
            productName: i.name,
            quantity: i.cartQuantity,
            price: i.price,
            isReservation: i.isReservation
          })),
          totalPrice,
          notes: `${notes}\nالعنوان: ${customerAddress}\nالدفع: ${paymentMethod}`,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setOrderStatus('success');
        const message = `مرحباً ${store.name}، أود تأكيد الطلب:\n` + 
                        cart.map(i => `- ${i.name} (${i.cartQuantity})`).join('\n') + 
                        `\nالإجمالي: ${totalPrice} ريال\nالاسم: ${customerName}`;
        setWhatsappLink(`https://wa.me/${store.owner_phone}?text=${encodeURIComponent(message)}`);
        setCart([]);
        localStorage.removeItem(`cart_${slug}`);
      }
    } catch {
      setOrderStatus('error');
    }
  };

  if (loading) return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p>يتم الآن تجهيز تجربة تسوق فريدة...</p>
    </div>
  );

  return (
    <div className="storefront" dir="rtl">
      {/* الهيدر الاحترافي */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="brand">
            <div className="brand-logo">
              {store?.logo_url ? <img src={store.logo_url} alt="logo" /> : <ShoppingBag />}
            </div>
            <h1>{store?.name}</h1>
          </div>
          
          <button className="cart-trigger" onClick={() => setShowCart(true)}>
            <div className="cart-icon-wrapper">
              <ShoppingCart size={22} />
              {totalItems > 0 && <span className="badge">{totalItems}</span>}
            </div>
            <span className="cart-text">السلة</span>
          </button>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="main-container">
        <header className="hero-section">
          <h2>{store?.description || 'أهلاً بك في متجرنا'}</h2>
          <div className="divider"></div>
        </header>

        <div className="products-grid">
          {store?.products?.map((product: Product) => (
            <div key={product.id} className="product-card shadow-animation">
              <div className="image-wrapper">
                <img src={product.image_url || 'https://via.placeholder.com/400'} alt={product.name} />
                {product.availableQuantity! <= 0 && <span className="preorder-tag">حجز مسبق</span>}
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <div className="price-tag">{product.price} <span>ر.س</span></div>
                <button 
                  className="add-button" 
                  onClick={() => addToCart(product)}
                >
                  <Plus size={18} /> إضافة للسلة
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* سلة المشتريات الجانبية */}
      {showCart && (
        <div className="cart-overlay">
          <div className="cart-backdrop" onClick={() => setShowCart(false)}></div>
          <div className="cart-panel">
            <div className="cart-panel-header">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-blue-600" />
                <h3>حقيبة التسوق</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCart(false)}><X /></button>
            </div>

            <div className="cart-content">
              {cart.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={60} strokeWidth={1} />
                  <p>ابدأ بإضافة المنتجات التي تحبها</p>
                </div>
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item-card">
                        <img src={item.image_url} alt={item.name} />
                        <div className="item-info">
                          <h4>{item.name}</h4>
                          <p className="item-price">{item.price} ر.س</p>
                          <div className="quantity-controls">
                            <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                            <span>{item.cartQuantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                          </div>
                        </div>
                        <button className="delete-btn" onClick={() => removeItem(item.id)}><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>

                  <div className="checkout-section">
                    <div className="total-box">
                      <span>الإجمالي</span>
                      <span className="total-amount">{totalPrice} ر.س</span>
                    </div>

                    <div className="form-group">
                      <div className="input-with-icon">
                        <User size={18} />
                        <input placeholder="الاسم الكامل" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                      </div>
                      <div className="input-with-icon">
                        <Phone size={18} />
                        <input placeholder="رقم الجوال" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                      </div>
                    </div>

                    {orderStatus === 'success' ? (
                      <a href={whatsappLink} target="_blank" className="whatsapp-btn">
                        <MessageSquare size={20} /> تأكيد عبر واتساب
                      </a>
                    ) : (
                      <button 
                        className="final-checkout-btn"
                        onClick={handleSubmitOrder}
                        disabled={orderStatus === 'submitting'}
                      >
                        {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'إتمام الطلب الآن'}
                      </button>
                    )}
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
