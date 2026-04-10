// src/pages/Storefront.tsx
import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, X, Search, Star, Heart, LayoutGrid, List, Truck, Shield, Package, Tag } from 'lucide-react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  quantity: number;
  reserved_quantity?: number;
  availableQuantity?: number;
  image_url?: string;
  description?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  quantity: number;
  sku?: string;
  image_url?: string;
}

interface CartItem {
  productId: string;
  variantId: string | null;
  productName: string;
  price: number;
  quantity: number;
  isReservation: boolean;
  attributes?: Record<string, string>;
}

export default function Storefront() {
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState(10000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

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
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const products: Product[] = useMemo(() => {
    if (!store?.products) return [];
    return store.products.map((p: any) => ({
      ...p,
      availableQuantity: p.quantity - (p.reserved_quantity || 0),
    }));
  }, [store]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['الكل', ...Array.from(cats)];
  }, [products]);

  const topPrice = useMemo(() => Math.max(...products.map(p => p.price), 1000), [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'الكل') list = list.filter(p => p.category === category);
    if (search.trim()) list = list.filter(p => p.name.includes(search) || p.description?.includes(search));
    if (onlyInStock) list = list.filter(p => (p.availableQuantity ?? p.quantity) > 0);
    list = list.filter(p => p.price <= maxPrice);
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, search, sortBy, maxPrice, onlyInStock]);

  const totalPrice = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  // دالة للحصول على سعر وكمية المنتج بناءً على المتغير المختار
  const getVariantPriceAndStock = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return { price: product.price, available: product.availableQuantity ?? product.quantity, variantId: null };
    }
    const selectedId = selectedVariants[product.id];
    const variant = product.variants.find(v => v.id === selectedId);
    if (variant) {
      return { price: variant.price, available: variant.quantity, variantId: variant.id };
    }
    // إذا لم يتم اختيار متغير، نعرض أول متغير (أو نعطيه قيمة صفر)
    const first = product.variants[0];
    return { price: first.price, available: first.quantity, variantId: first.id };
  };

  const addToCart = (product: Product) => {
    const { price, available, variantId } = getVariantPriceAndStock(product);
    if (available <= 0) {
      alert('هذا المنتج غير متوفر حالياً');
      return;
    }
    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.productId === product.id && i.variantId === variantId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      const variant = product.variants?.find(v => v.id === variantId);
      return [...prev, {
        productId: product.id,
        variantId,
        productName: product.name,
        price,
        quantity: 1,
        isReservation: false,
        attributes: variant?.attributes,
      }];
    });
    setShowCart(true);
  };

  const updateQty = (productId: string, variantId: string | null, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId || item.variantId !== variantId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      return { ...item, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string, variantId: string | null) => {
    setCart(prev => prev.filter(i => !(i.productId === productId && i.variantId === variantId)));
  };

  const submitOrder = async () => {
    if (!customer.name.trim() || !customer.phone.trim()) return alert('يرجى ملء الاسم ورقم الجوال');
    setOrderStatus('submitting');
    try {
      const res = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          items: cart.map(i => ({
            productId: i.productId,
            variantId: i.variantId,
            productName: i.productName + (i.attributes ? ` (${Object.values(i.attributes).join(', ')})` : ''),
            quantity: i.quantity,
            price: i.price,
            isReservation: i.isReservation,
          })),
          totalPrice,
          notes: `${customer.address}\n${customer.notes}\nطريقة الدفع: ${paymentMethod}`,
        }),
      });
      if (res.ok) {
        const msg = `🛍️ طلب جديد\nالعميل: ${customer.name}\nالجوال: ${customer.phone}\nالعنوان: ${customer.address}\n\n${cart.map(i => `${i.productName} × ${i.quantity} = ${i.price * i.quantity} ر.س`).join('\n')}\nالإجمالي: ${totalPrice} ر.س\nالدفع: ${paymentMethod === 'cash' ? 'كاش' : paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}`;
        window.open(`https://wa.me/${store.owner_phone || '966500000000'}?text=${encodeURIComponent(msg)}`, '_blank');
        setCart([]);
        setOrderStatus('success');
      }
    } catch {
      setOrderStatus('idle');
    }
  };

  const resetOrder = () => {
    setOrderStatus('idle');
    setCustomer({ name: '', phone: '', address: '', notes: '' });
    setShowCart(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}>جاري تحميل المتجر...</div>;
  if (!store) return <div style={{ textAlign: 'center', padding: 50 }}>المتجر غير موجود</div>;

  return (
    <div style={{ fontFamily: 'Tajawal, sans-serif', background: '#f8f8f6', minHeight: '100vh', direction: 'rtl' }}>
      {/* Header (نفس السابق) */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'white', borderBottom: '1px solid #eaeaea', padding: '0 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {store.logo_url ? <img src={store.logo_url} alt="logo" style={{ width: 40, height: 40, borderRadius: 10 }} /> : <span style={{ fontSize: 32 }}>🏪</span>}
            <span style={{ fontSize: 20, fontWeight: 700 }}>{store.name}</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', height: 42, paddingRight: 44, paddingLeft: 16, border: '1.5px solid #eaeaea', borderRadius: 24, fontSize: 14, outline: 'none' }} />
          </div>
          <button onClick={() => setShowCart(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 24, padding: '10px 20px', cursor: 'pointer' }}>
            <ShoppingCart size={20} />
            <span>السلة</span>
            {totalItems > 0 && <span style={{ background: '#ef4444', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{totalItems}</span>}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', padding: '60px 24px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12 }}>{store.name}</h1>
        <p style={{ fontSize: 18, opacity: 0.75 }}>{store.description || 'تسوق أفضل المنتجات بأسعار منافسة'}</p>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 28 }}>
        {/* Sidebar */}
        <aside style={{ width: 240, position: 'sticky', top: 90 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eaeaea', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>الفئات</div>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ display: 'block', width: '100%', padding: '9px 14px', borderRadius: 10, background: category === cat ? '#1a1a1a' : 'transparent', color: category === cat ? '#fff' : '#444', textAlign: 'right', marginBottom: 4, cursor: 'pointer', border: 'none' }}>{cat}</button>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eaeaea', padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>فلتر</div>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>السعر الأقصى</span><span>{maxPrice.toLocaleString()} ر.س</span></div><input type="range" min={0} max={topPrice} step={50} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', accentColor: '#1a1a1a' }} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}><input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} /> <span>المتوفر فقط</span></label>
          </div>
        </aside>

        {/* Products */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 36, padding: '0 12px', border: '1px solid #eaeaea', borderRadius: 8 }}>
                <option value="default">الترتيب الافتراضي</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="name">الاسم</option>
              </select>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setViewMode('grid')} style={{ width: 36, height: 36, border: '1px solid #eaeaea', borderRadius: 8, background: viewMode === 'grid' ? '#1a1a1a' : '#fff', color: viewMode === 'grid' ? '#fff' : '#666' }}><LayoutGrid size={18} /></button>
                <button onClick={() => setViewMode('list')} style={{ width: 36, height: 36, border: '1px solid #eaeaea', borderRadius: 8, background: viewMode === 'list' ? '#1a1a1a' : '#fff', color: viewMode === 'list' ? '#fff' : '#666' }}><List size={18} /></button>
              </div>
            </div>
            <span>{filtered.length} منتج</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16 }}><div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div><p>لا توجد منتجات</p></div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {filtered.map(p => {
                const { price, available } = getVariantPriceAndStock(p);
                const isOut = available <= 0;
                const hasVariants = p.variants && p.variants.length > 0;
                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 20, border: '1px solid #eaeaea', overflow: 'hidden', transition: '0.2s' }}>
                    <div style={{ position: 'relative', paddingTop: '85%', background: '#f4f3f0' }}>
                      {!imgErrors.has(p.id) && p.image_url ? <img src={p.image_url} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#bbb' }}>📦</div>}
                      {isOut && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ background: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>نفد المخزون</span></div>}
                    </div>
                    <div style={{ padding: '14px 16px 16px' }}>
                      {p.category && <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{p.category}</div>}
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                      {hasVariants && (
                        <div style={{ marginBottom: 12 }}>
                          {Object.entries(
                            p.variants!.reduce((acc, v) => {
                              Object.entries(v.attributes).forEach(([key, val]) => {
                                if (!acc[key]) acc[key] = new Set();
                                acc[key].add(val);
                              });
                              return acc;
                            }, {} as Record<string, Set<string>>)
                          ).map(([attrName, values]) => (
                            <div key={attrName} style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{attrName}:</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {Array.from(values).map(val => {
                                  const variantForValue = p.variants?.find(v => v.attributes[attrName] === val);
                                  const isSelected = selectedVariants[p.id] === variantForValue?.id;
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => variantForValue && setSelectedVariants(prev => ({ ...prev, [p.id]: variantForValue.id }))}
                                      style={{ padding: '4px 12px', borderRadius: 30, border: isSelected ? '2px solid #2563eb' : '1px solid #ddd', background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 12 }}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{price.toLocaleString()} ر.س</span>
                        {p.original_price && <span style={{ fontSize: 13, color: '#bbb', textDecoration: 'line-through' }}>{p.original_price.toLocaleString()}</span>}
                      </div>
                      <button onClick={() => addToCart(p)} disabled={isOut} style={{ width: '100%', height: 40, borderRadius: 40, border: 'none', background: isOut ? '#eee' : '#1a1a1a', color: isOut ? '#999' : '#fff', cursor: 'pointer' }}>
                        {isOut ? 'غير متوفر' : 'أضف للسلة'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(p => {
                const { price, available } = getVariantPriceAndStock(p);
                const isOut = available <= 0;
                const hasVariants = p.variants && p.variants.length > 0;
                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #eaeaea', display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: 120, height: 120, background: '#f4f3f0', flexShrink: 0 }}>
                      {!imgErrors.has(p.id) && p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📦</div>}
                    </div>
                    <div style={{ padding: 14, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        {p.category && <div style={{ fontSize: 11, color: '#888' }}>{p.category}</div>}
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                        {hasVariants && (
                          <div style={{ marginTop: 8 }}>
                            {Object.entries(
                              p.variants!.reduce((acc, v) => {
                                Object.entries(v.attributes).forEach(([key, val]) => {
                                  if (!acc[key]) acc[key] = new Set();
                                  acc[key].add(val);
                                });
                                return acc;
                              }, {} as Record<string, Set<string>>)
                            ).map(([attrName, values]) => (
                              <div key={attrName} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{attrName}:</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {Array.from(values).map(val => {
                                    const variantForValue = p.variants?.find(v => v.attributes[attrName] === val);
                                    const isSelected = selectedVariants[p.id] === variantForValue?.id;
                                    return (
                                      <button key={val} onClick={() => variantForValue && setSelectedVariants(prev => ({ ...prev, [p.id]: variantForValue.id }))} style={{ padding: '2px 8px', borderRadius: 20, border: isSelected ? '1px solid #2563eb' : '1px solid #ddd', background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 11 }}>{val}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{price.toLocaleString()} ر.س</div>
                        <button onClick={() => addToCart(p)} disabled={isOut} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 30, border: 'none', background: isOut ? '#eee' : '#1a1a1a', color: isOut ? '#999' : '#fff', cursor: 'pointer' }}>{isOut ? 'غير متوفر' : 'أضف للسلة'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowCart(false)}>
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeaea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>سلة المشتريات</h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {orderStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 48, marginBottom: 16 }}>✅</div><h3>تم إرسال طلبك!</h3><button onClick={resetOrder} style={{ marginTop: 20, padding: '12px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 40, cursor: 'pointer' }}>متابعة التسوق</button></div>
              ) : cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>السلة فارغة</div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={`${item.productId}-${item.variantId}`} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #f0f0ec' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 12, background: '#f4f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{item.productName}{item.attributes && ` (${Object.values(item.attributes).join(', ')})`}</div>
                        <div>{item.price.toLocaleString()} ر.س</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <button onClick={() => updateQty(item.productId, item.variantId, -1)} style={{ width: 28, height: 28, border: '1px solid #eaeaea', background: '#f8f8f6', borderRadius: 8, cursor: 'pointer' }}><Minus size={14} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, item.variantId, 1)} style={{ width: 28, height: 28, border: '1px solid #eaeaea', background: '#f8f8f6', borderRadius: 8, cursor: 'pointer' }}><Plus size={14} /></button>
                          <button onClick={() => removeFromCart(item.productId, item.variantId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>حذف</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 20 }}>
                    <input placeholder="الاسم الكامل *" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #eaeaea', borderRadius: 10, marginBottom: 12 }} />
                    <input placeholder="رقم الجوال *" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #eaeaea', borderRadius: 10, marginBottom: 12 }} />
                    <input placeholder="العنوان" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #eaeaea', borderRadius: 10, marginBottom: 12 }} />
                    <textarea placeholder="ملاحظات" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} rows={2} style={{ width: '100%', padding: 12, border: '1px solid #eaeaea', borderRadius: 10, marginBottom: 12, fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {['cash', 'card', 'transfer'].map(m => (<button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: 10, border: '1.5px solid #eaeaea', borderRadius: 10, background: paymentMethod === m ? '#1a1a1a' : '#fff', color: paymentMethod === m ? '#fff' : '#444', cursor: 'pointer' }}>{m === 'cash' ? 'كاش' : m === 'card' ? 'بطاقة' : 'تحويل'}</button>))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {orderStatus !== 'success' && cart.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid #eaeaea', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><span>الإجمالي</span><span style={{ fontSize: 22, fontWeight: 800 }}>{totalPrice.toLocaleString()} ر.س</span></div>
                <button onClick={submitOrder} disabled={orderStatus === 'submitting'} style={{ width: '100%', padding: 14, background: '#25d366', color: '#fff', border: 'none', borderRadius: 40, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><span>📱</span>{orderStatus === 'submitting' ? 'جاري...' : 'تأكيد الطلب عبر واتساب'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}