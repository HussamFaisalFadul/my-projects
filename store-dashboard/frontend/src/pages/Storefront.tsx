import { useEffect, useState, useMemo } from 'react';
import { 
  ShoppingBag, X, Plus, Minus, Trash2, 
  ChevronLeft, CheckCircle2, AlertCircle, 
  MapPin, Phone, User, CreditCard, MessageSquare 
} from 'lucide-react';

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
  
  // حقول العميل
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [whatsappLink, setWhatsappLink] = useState('');

  // جلب البيانات
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
        const processedProducts = data.products?.map((p: any) => ({
          ...p,
          availableQuantity: p.availableQuantity ?? (p.quantity - (p.reserved_quantity || 0)),
        }));
        setStore({ ...data, products: processedProducts });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // إدارة السلة (LocalStorage)
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${slug}`);
    if (saved) setCart(JSON.parse(saved));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // حسابات السلة
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.cartQuantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0), [cart]);

  // منطق الإضافة للسلة الاحترافي
  const addToCart = (product: Product) => {
    const available = product.availableQuantity ?? 0;
    const existing = cart.find(p => p.id === product.id);
    const currentQtyInCart = existing ? existing.cartQuantity : 0;

    if (available <= 0 || currentQtyInCart >= available) {
      const confirmReserve = window.confirm(`"${product.name}" غير متوفر حالياً بالكمية المطلوبة. هل تريد طلبه كحجز؟`);
      if (!confirmReserve) return;
      
      setCart(prev => {
        if (existing) {
          return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1, isReservation: true } : p);
        }
        return [...prev, { ...product, cartQuantity: 1, isReservation: true }];
      });
    } else {
      setCart(prev => {
        if (existing) {
          return prev.map(p => p.id === product.id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
        }
        return [...prev, { ...product, cartQuantity: 1, isReservation: false }];
      });
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(p => p.id === id ? { ...p, cartQuantity: Math.max(1, p.cartQuantity + delta) } : p));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(p => p.id !== id));

  // إرسال الطلب
  const handleSubmitOrder = async () => {
    if (!customerName || !customerPhone) return alert('يرجى إكمال بيانات الاتصال');
    setOrderStatus('submitting');
    
    try {
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName,
          customerPhone,
          items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.cartQuantity, price: i.price, isReservation: i.isReservation })),
          totalPrice,
          notes: `${notes}\nالعنوان: ${customerAddress}\nالدفع: ${paymentMethod}`,
        }),
      });
      
      if (res.ok) {
        setOrderStatus('success');
        const message = `طلب جديد من ${customerName}:\n` + cart.map(i => `- ${i.name} x${i.cartQuantity}`).join('\n') + `\nالإجمالي: ${totalPrice} ريال`;
        setWhatsappLink(`https://wa.me/${store.owner_phone}?text=${encodeURIComponent(message)}`);
        setCart([]);
        localStorage.removeItem(`cart_${slug}`);
      }
    } catch {
      setOrderStatus('error');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">جاري تحضير المتجر...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-[60] bg-white/70 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              {store?.logo_url ? <img src={store.logo_url} className="w-full h-full object-cover rounded-xl" /> : <ShoppingBag size={20} />}
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{store?.name}</h1>
          </div>
          
          <button 
            onClick={() => setShowCart(true)}
            className="relative p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition active:scale-90"
          >
            <ShoppingBag size={22} className="text-slate-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-10">
        {/* Store Intro */}
        <div className="mb-12">
          <p className="text-slate-500 text-lg max-w-2xl">{store?.description}</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {store?.products.map((product: Product) => (
            <div key={product.id} className="group bg-white rounded-[2.5rem] border border-slate-100 p-3 hover:shadow-2xl transition-all duration-500">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-100 mb-4">
                <img 
                  src={product.image_url || 'https://via.placeholder.com/400'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                />
                {product.availableQuantity === 0 && (
                  <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    طلب مسبق
                  </div>
                )}
              </div>
              <div className="px-3 pb-3">
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-2xl font-black text-blue-600">{product.price} <span className="text-xs text-slate-400 font-normal">ر.س</span></p>
                  <button 
                    onClick={() => addToCart(product)}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition active:scale-95 shadow-lg shadow-slate-100"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Side Cart (Drawer) */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 italic">YOUR BAG</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <ShoppingBag size={48} strokeWidth={1} className="opacity-20" />
                  <p className="font-medium">حقيبتك فارغة، ابدأ بالتسوق</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <img src={item.image_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-bold text-slate-800">{item.name}</h4>
                        <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus size={12}/></button>
                          <span className="text-sm font-bold w-4 text-center">{item.cartQuantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus size={12}/></button>
                        </div>
                        <p className="font-black text-blue-600">{item.price * item.cartQuantity} ر.س</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-slate-50 border-t space-y-6">
                <div className="space-y-3">
                  <div className="relative group">
                    <User className="absolute right-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition" size={18}/>
                    <input 
                      className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition outline-none" 
                      placeholder="الاسم الكامل" 
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="relative group">
                    <Phone className="absolute right-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition" size={18}/>
                    <input 
                      className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition outline-none" 
                      placeholder="رقم الجوال" 
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                  <span className="text-slate-500 font-medium">الإجمالي الكلي</span>
                  <span className="text-3xl font-black text-slate-900">{totalPrice} <span className="text-sm font-normal">ر.س</span></span>
                </div>

                {orderStatus === 'success' ? (
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    className="w-full bg-green-500 text-white py-5 rounded-[2rem] font-bold text-center flex items-center justify-center gap-3 animate-bounce shadow-xl shadow-green-200"
                  >
                    <MessageSquare size={20}/> تأكيد عبر واتساب
                  </a>
                ) : (
                  <button 
                    disabled={orderStatus === 'submitting'}
                    onClick={handleSubmitOrder}
                    className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-bold shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition active:scale-95"
                  >
                    {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'إتمام الطلب'}
                    <ChevronLeft size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
