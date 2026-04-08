import { useEffect, useState, useMemo, useRef } from 'react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

// أيقونات SVG (نفس الكود الثاني)
const Icons = {
  Cart: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Star: ({ filled }: { filled: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Heart: ({ active }: { active: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#ef4444' : 'none'} stroke={active ? '#ef4444' : 'currentColor'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Whatsapp: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Package: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Truck: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

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
  badge?: 'new' | 'sale' | 'hot' | 'bestseller';
  sku?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
  isReservation: boolean;
}

// مكون تقييم النجوم
function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => <Icons.Star key={i} filled={i <= Math.round(rating)} />)}
      {count && <span style={{ fontSize: 12, color: '#888', marginRight: 4 }}>({count.toLocaleString()})</span>}
    </div>
  );
}

// الأنماط (مبسطة من الكود الثاني، مع تعديلات بسيطة)
const styles: Record<string, React.CSSProperties> = {
  app: { fontFamily: "'Tajawal', 'Segoe UI', sans-serif", background: '#f8f8f6', minHeight: '100vh', direction: 'rtl' },
  header: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e8e4', padding: '0 24px' },
  headerInner: { maxWidth: 1400, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', gap: 20 },
  logo: { display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 },
  logoImg: { width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid #e8e8e4' },
  logoText: { fontSize: 20, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' },
  searchWrap: { flex: 1, position: 'relative', maxWidth: 480 },
  searchInput: { width: '100%', height: 42, paddingRight: 44, paddingLeft: 16, border: '1.5px solid #e8e8e4', borderRadius: 24, fontSize: 14, background: '#f8f8f6', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  searchIcon: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' },
  cartBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 24, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, flexShrink: 0 },
  badge: { background: '#ef4444', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 },
  hero: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: '60px 24px', textAlign: 'center', color: '#fff' },
  heroTitle: { fontSize: 42, fontWeight: 800, marginBottom: 12, letterSpacing: '-1px' },
  heroSub: { fontSize: 18, opacity: 0.75, marginBottom: 32 },
  heroStats: { display: 'flex', justifyContent: 'center', gap: 48 },
  heroStatNum: { fontSize: 28, fontWeight: 700 },
  heroStatLabel: { fontSize: 13, opacity: 0.6 },
  trustBar: { background: '#fff', borderBottom: '1px solid #e8e8e4', padding: '12px 24px' },
  trustInner: { maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' },
  trustItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555' },
  main: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 28, alignItems: 'flex-start' },
  sidebar: { width: 240, flexShrink: 0, position: 'sticky', top: 90 },
  sidebarCard: { background: '#fff', borderRadius: 16, border: '1px solid #e8e8e4', padding: 20, marginBottom: 16 },
  sidebarTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  catBtn: { display: 'block', width: '100%', padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'right', marginBottom: 4, transition: 'all 0.15s' },
  content: { flex: 1, minWidth: 0 },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  sortSelect: { height: 36, padding: '0 12px', border: '1px solid #e8e8e4', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' },
  viewBtns: { display: 'flex', gap: 4 },
  viewBtn: { width: 36, height: 36, border: '1px solid #e8e8e4', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' },
  resultCount: { fontSize: 14, color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 },
  card: { background: '#fff', borderRadius: 18, border: '1px solid #e8e8e4', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s ease', position: 'relative' },
  imgWrap: { position: 'relative', paddingTop: '85%', background: '#f4f3f0', overflow: 'hidden' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' },
  cardBadge: { position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, zIndex: 1 },
  wishBtn: { position: 'absolute', bottom: 10, left: 10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  outOfStockOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  outOfStockLabel: { background: '#fff', color: '#1a1a1a', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700 },
  cardBody: { padding: '14px 16px 16px' },
  cardCat: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6, lineHeight: 1.4 },
  priceRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  price: { fontSize: 17, fontWeight: 700, color: '#1a1a1a' },
  oldPrice: { fontSize: 13, color: '#bbb', textDecoration: 'line-through' },
  discount: { fontSize: 12, color: '#ef4444', fontWeight: 600 },
  addBtn: { width: '100%', height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' },
  listView: { display: 'flex', flexDirection: 'column', gap: 12 },
  listCard: { background: '#fff', borderRadius: 16, border: '1px solid #e8e8e4', display: 'flex', overflow: 'hidden', position: 'relative' },
  listImg: { width: 140, height: 120, objectFit: 'cover', flexShrink: 0 },
  listBody: { padding: '14px 18px', flex: 1, display: 'flex', gap: 16, alignItems: 'center' },
  listInfo: { flex: 1 },
  listActions: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  drawerBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  drawer: { width: '100%', maxWidth: 440, background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' },
  drawerHeader: { padding: '20px 24px', borderBottom: '1px solid #e8e8e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  drawerBody: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  drawerFooter: { padding: '20px 24px', borderTop: '1px solid #e8e8e4', background: '#fafafa' },
  cartRow: { display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #f0f0ec' },
  cartImg: { width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid #e8e8e4', flexShrink: 0 },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 },
  cartPrice: { fontSize: 14, fontWeight: 700, color: '#1a1a1a' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 },
  qtyBtn: { width: 28, height: 28, border: '1px solid #e8e8e4', background: '#f8f8f6', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qtyNum: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { height: 44, padding: '0 14px', border: '1.5px solid #e8e8e4', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  textarea: { padding: '12px 14px', border: '1.5px solid #e8e8e4', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  payRow: { display: 'flex', gap: 8 },
  payBtn: { flex: 1, height: 40, border: '1.5px solid #e8e8e4', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: '#fff', transition: 'all 0.15s' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e8e8e4', borderBottom: '1px solid #e8e8e4', marginBottom: 16 },
  submitBtn: { width: '100%', height: 52, borderRadius: 14, border: 'none', background: '#25d366', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#999' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  successScreen: { textAlign: 'center', padding: '60px 20px' },
  filterSection: { marginBottom: 8 },
  filterLabel: { fontSize: 13, color: '#888', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rangeInput: { width: '100%', accentColor: '#1a1a1a' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' },
};

const BADGE_CONFIG = {
  new: { label: 'جديد', bg: '#3b82f6', color: '#fff' },
  sale: { label: 'تخفيض', bg: '#ef4444', color: '#fff' },
  hot: { label: 'رائج', bg: '#f97316', color: '#fff' },
  bestseller: { label: 'الأكثر مبيعاً', bg: '#8b5cf6', color: '#fff' },
};

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
  const [maxPrice, setMaxPrice] = useState(5000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // جلب بيانات المتجر من API الحقيقي
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p,
            availableQuantity: p.quantity - (p.reserved_quantity || 0),
            rating: p.rating || (4 + Math.random() * 0.8),
            review_count: p.review_count || Math.floor(Math.random() * 300 + 10),
            original_price: p.original_price || (p.salePrice ? p.price : undefined),
            badge: p.badge || (p.salePrice ? 'sale' : undefined),
          }));
        }
        setStore(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  const products: Product[] = useMemo(() => {
    if (!store?.products) return [];
    return store.products.map((p: any) => ({
      ...p,
      availableQuantity: p.quantity - (p.reserved_quantity || 0),
    }));
  }, [store]);

  const allCategories = useMemo(() => {
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

  const totalPrice = useMemo(() => cart.reduce((s, i) => s + i.price * i.cartQuantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.cartQuantity, 0), [cart]);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const available = product.availableQuantity ?? product.quantity;
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      const currentQty = existing ? existing.cartQuantity : 0;
      const newQty = currentQty + 1;
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, cartQuantity: newQty, isReservation: newQty > available } : p);
      }
      return [...prev, { ...product, cartQuantity: 1, isReservation: 1 > available }];
    });
    setShowCart(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(0, item.cartQuantity + delta);
      if (newQty === 0) return null;
      return { ...item, cartQuantity: newQty, isReservation: newQty > (item.availableQuantity ?? item.quantity) };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const submitOrder = async () => {
    if (!customer.name.trim() || !customer.phone.trim()) return alert('يرجى ملء الاسم ورقم الجوال');
    setOrderStatus('submitting');
    try {
      const response = await fetch(`${BACKEND}/api/public/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.cartQuantity, price: i.price, isReservation: i.isReservation })),
          totalPrice,
          paymentMethod,
          notes: customer.notes,
        }),
      });
      if (response.ok) {
        const itemsList = cart.map(i => `• ${i.name} × ${i.cartQuantity} = ${(i.price * i.cartQuantity).toLocaleString()} ر.س${i.isReservation ? ' (حجز)' : ''}`).join('\n');
        const msg = `🛍️ طلب جديد\n\nالعميل: ${customer.name}\nالجوال: ${customer.phone}\nالعنوان: ${customer.address || 'غير محدد'}\n\n${itemsList}\n\n💰 الإجمالي: ${totalPrice.toLocaleString()} ر.س\nالدفع: ${paymentMethod === 'cash' ? 'كاش' : paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}${customer.notes ? '\n\nملاحظات: ' + customer.notes : ''}`;
        window.open(`https://wa.me/${store.owner_phone || '966500000000'}?text=${encodeURIComponent(msg)}`, '_blank');
        setCart([]);
        setOrderStatus('success');
      } else {
        throw new Error();
      }
    } catch {
      alert('حدث خطأ في إرسال الطلب، حاول مرة أخرى');
      setOrderStatus('idle');
    }
  };

  const resetOrder = () => {
    setOrderStatus('idle');
    setCustomer({ name: '', phone: '', address: '', notes: '' });
    setShowCart(false);
  };

  const discountPct = (p: Product) => p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f6', direction: 'rtl' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e8e8e4', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#888', fontSize: 15 }}>جاري تحميل المتجر...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  if (!store) return <div style={{ textAlign: 'center', padding: 40 }}>المتجر غير موجود</div>;

  return (
    <div style={styles.app}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Tajawal', sans-serif; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f0f0ec; } ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        input:focus, textarea:focus { border-color: #1a1a1a !important; }
        .add-btn-primary:hover { background: #333 !important; transform: translateY(-1px); }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .cat-btn-active { background: #1a1a1a !important; color: #fff !important; }
        .cat-btn:hover { background: #f4f3f0 !important; }
        .view-btn-active { background: #1a1a1a !important; color: #fff !important; }
        .wishbtn:hover { transform: scale(1.15); }
        .pay-btn-active { background: #1a1a1a !important; color: #fff !important; border-color: #1a1a1a !important; }
        .submit-btn:hover { background: #1ebc57 !important; transform: translateY(-1px); }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 768px) {
          .main-layout { flex-direction: column !important; }
          .sidebar { width: 100% !important; position: static !important; }
          .hero-title { font-size: 28px !important; }
          .hero-stats { gap: 24px !important; }
          .trust-inner { gap: 20px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            {store?.logo_url
              ? <img src={store.logo_url} alt="logo" style={styles.logoImg} onError={e => (e.currentTarget.style.display = 'none')} />
              : <div style={{ ...styles.logoImg, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>م</div>
            }
            <span style={styles.logoText}>{store.name}</span>
          </div>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}><Icons.Search /></span>
            <input ref={searchRef} style={styles.searchInput} placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button style={styles.cartBtn} onClick={() => setShowCart(true)}>
            <Icons.Cart />
            <span>السلة</span>
            {totalItems > 0 && <div style={styles.badge}>{totalItems}</div>}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 className="hero-title" style={styles.heroTitle}>{store.name}</h1>
        <p style={styles.heroSub}>{store.description || 'تسوق أفضل المنتجات بأسعار منافسة'}</p>
        <div className="hero-stats" style={styles.heroStats}>
          {[
            { num: products.length + '+', label: 'منتج' },
            { num: '24 ساعة', label: 'توصيل سريع' },
            { num: '100%', label: 'ضمان الجودة' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={styles.heroStatNum}>{s.num}</div>
              <div style={styles.heroStatLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Bar */}
      <div style={styles.trustBar}>
        <div className="trust-inner" style={styles.trustInner}>
          {[
            { icon: <Icons.Truck />, text: 'شحن سريع لجميع المناطق' },
            { icon: <Icons.Shield />, text: 'دفع آمن ومشفر' },
            { icon: <Icons.Package />, text: 'إرجاع مجاني خلال 14 يوم' },
            { icon: <Icons.Tag />, text: 'أسعار تنافسية مضمونة' },
          ].map(item => (
            <div key={item.text} style={styles.trustItem}>
              <span style={{ color: '#1a1a1a' }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-layout" style={{ ...styles.main, flexDirection: undefined }}>
        {/* Sidebar */}
        <aside className="sidebar" style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <div style={styles.sidebarTitle}>الفئات</div>
            {allCategories.map(cat => (
              <button
                key={cat}
                style={{ ...styles.catBtn, background: category === cat ? '#1a1a1a' : 'transparent', color: category === cat ? '#fff' : '#444' }}
                className={`cat-btn ${category === cat ? 'cat-btn-active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div style={styles.sidebarCard}>
            <div style={styles.sidebarTitle}>تصفية</div>
            <div style={styles.filterSection}>
              <div style={styles.filterLabel}>
                <span>السعر الأقصى</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{maxPrice.toLocaleString()} ر.س</span>
              </div>
              <input type="range" min={0} max={topPrice} step={50} value={maxPrice} style={styles.rangeInput} onChange={e => setMaxPrice(Number(e.target.value))} />
            </div>
            <label style={styles.checkRow}>
              <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} />
              <span style={{ fontSize: 14, color: '#444' }}>المتوفر فقط</span>
            </label>
          </div>
        </aside>

        {/* Products */}
        <div style={styles.content}>
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <select style={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">الترتيب الافتراضي</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="name">الاسم أبجدياً</option>
              </select>
              <div style={styles.viewBtns}>
                {(['grid', 'list'] as const).map(v => (
                  <button
                    key={v}
                    style={{ ...styles.viewBtn, background: viewMode === v ? '#1a1a1a' : '#fff', color: viewMode === v ? '#fff' : '#666' }}
                    onClick={() => setViewMode(v)}
                  >
                    {v === 'grid' ? <Icons.Grid /> : <Icons.List />}
                  </button>
                ))}
              </div>
            </div>
            <span style={styles.resultCount}>{filtered.length} منتج</span>
          </div>

          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🔍</div>
              <p>لا توجد منتجات تطابق بحثك</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={styles.grid}>
              {filtered.map(p => {
                const available = p.availableQuantity ?? p.quantity;
                const isOut = available <= 0;
                const disc = discountPct(p);
                return (
                  <div
                    key={p.id}
                    style={styles.card}
                    className="card-hover"
                    onMouseEnter={() => setHoveredCard(p.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div style={styles.imgWrap}>
                      {!imgErrors.has(p.id) && p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ ...styles.img, transform: hoveredCard === p.id ? 'scale(1.06)' : 'scale(1)' }} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#bbb' }}>📦</div>
                      )}
                      {p.badge && p.badge in BADGE_CONFIG && (
                        <div style={{ ...styles.cardBadge, background: BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].bg, color: BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].color }}>
                          {BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].label}
                        </div>
                      )}
                      <button style={styles.wishBtn} className="wishbtn" onClick={e => toggleWishlist(p.id, e)}>
                        <Icons.Heart active={wishlist.has(p.id)} />
                      </button>
                      {isOut && (
                        <div style={styles.outOfStockOverlay}>
                          <div style={styles.outOfStockLabel}>نفد المخزون</div>
                        </div>
                      )}
                    </div>
                    <div style={styles.cardBody}>
                      {p.category && <div style={styles.cardCat}>{p.category}</div>}
                      <div style={styles.cardName}>{p.name}</div>
                      {p.rating && <StarRating rating={p.rating} count={p.review_count} />}
                      <div style={styles.priceRow}>
                        <span style={styles.price}>{p.price.toLocaleString()} ر.س</span>
                        {p.original_price && <span style={styles.oldPrice}>{p.original_price.toLocaleString()}</span>}
                        {disc > 0 && <span style={styles.discount}>-{disc}%</span>}
                      </div>
                      {!isOut && available <= 5 && <p style={{ fontSize: 12, color: '#f97316', marginBottom: 8 }}>⚡ متبقي {available} فقط</p>}
                      <button
                        style={{ ...styles.addBtn, background: isOut ? '#eee' : '#1a1a1a', color: isOut ? '#999' : '#fff' }}
                        className={isOut ? '' : 'add-btn-primary'}
                        onClick={e => addToCart(p, e)}
                      >
                        {isOut ? 'اطلب كحجز' : 'أضف للسلة'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.listView}>
              {filtered.map(p => {
                const available = p.availableQuantity ?? p.quantity;
                const isOut = available <= 0;
                const disc = discountPct(p);
                return (
                  <div key={p.id} style={styles.listCard} className="card-hover">
                    <div style={{ position: 'relative', width: 140, flexShrink: 0 }}>
                      {!imgErrors.has(p.id) && p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={styles.listImg} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} />
                      ) : (
                        <div style={{ width: 140, height: 120, background: '#f4f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#bbb' }}>📦</div>
                      )}
                      {p.badge && p.badge in BADGE_CONFIG && (
                        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].bg, color: BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].color }}>
                          {BADGE_CONFIG[p.badge as keyof typeof BADGE_CONFIG].label}
                        </div>
                      )}
                    </div>
                    <div style={styles.listBody}>
                      <div style={styles.listInfo}>
                        {p.category && <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>{p.category}</div>}
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{p.name}</div>
                        {p.rating && <StarRating rating={p.rating} count={p.review_count} />}
                        {p.description && <p style={{ fontSize: 13, color: '#777', marginTop: 6, lineHeight: 1.5 }}>{p.description}</p>}
                      </div>
                      <div style={styles.listActions}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>{p.price.toLocaleString()} ر.س</div>
                          {p.original_price && <div style={{ fontSize: 12, color: '#bbb', textDecoration: 'line-through' }}>{p.original_price.toLocaleString()}</div>}
                          {disc > 0 && <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>وفر {disc}%</div>}
                          <button
                            style={{ ...styles.addBtn, width: 120, marginTop: 10, height: 36, fontSize: 13, background: isOut ? '#eee' : '#1a1a1a', color: isOut ? '#999' : '#fff' }}
                            className={isOut ? '' : 'add-btn-primary'}
                            onClick={e => addToCart(p, e)}
                          >
                            {isOut ? 'اطلب كحجز' : 'أضف للسلة'}
                          </button>
                        </div>
                        <button style={{ ...styles.wishBtn, position: 'static', marginRight: 8 }} className="wishbtn" onClick={e => toggleWishlist(p.id, e)}>
                          <Icons.Heart active={wishlist.has(p.id)} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1a1a1a', color: '#aaa', textAlign: 'center', padding: '24px', fontSize: 13, marginTop: 40 }}>
        <p>© {new Date().getFullYear()} {store.name} · جميع الحقوق محفوظة</p>
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <div style={styles.drawerBackdrop} onClick={() => setShowCart(false)}>
          <div style={styles.drawer} className="drawer-enter" onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>سلة المشتريات</h2>
                {totalItems > 0 && <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{totalItems} منتج</p>}
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center' }} onClick={() => setShowCart(false)}>
                <Icons.X />
              </button>
            </div>
            <div style={styles.drawerBody}>
              {orderStatus === 'success' ? (
                <div style={styles.successScreen}>
                  <div style={{ ...styles.emptyIcon, background: '#dcfce7', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>✅</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>تم إرسال طلبك!</h3>
                  <p style={{ color: '#888', fontSize: 15, marginBottom: 24 }}>سيتواصل معك فريقنا قريباً عبر واتساب</p>
                  <button style={{ ...styles.submitBtn, background: '#1a1a1a', maxWidth: 200, margin: '0 auto' }} onClick={resetOrder}>
                    متابعة التسوق
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div style={styles.empty}>
                  <div style={styles.emptyIcon}>🛒</div>
                  <p style={{ fontSize: 15, color: '#888', marginBottom: 20 }}>سلتك فارغة</p>
                  <button style={{ ...styles.submitBtn, background: '#1a1a1a', maxWidth: 180, margin: '0 auto' }} onClick={() => setShowCart(false)}>
                    تسوق الآن
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    {cart.map(item => (
                      <div key={item.id} style={styles.cartRow}>
                        {item.image_url && !imgErrors.has(item.id)
                          ? <img src={item.image_url} alt={item.name} style={styles.cartImg} onError={() => setImgErrors(prev => new Set(prev).add(item.id))} />
                          : <div style={{ ...styles.cartImg, background: '#f4f3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#bbb' }}>📦</div>
                        }
                        <div style={styles.cartInfo}>
                          <div style={styles.cartName}>{item.name}</div>
                          {item.isReservation && <div style={{ fontSize: 11, color: '#f97316', marginBottom: 4 }}>⚠️ طلب حجز - سيُجهز قريباً</div>}
                          <div style={styles.cartPrice}>{(item.price * item.cartQuantity).toLocaleString()} ر.س</div>
                          <div style={styles.qtyRow}>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}><Icons.Plus /></button>
                            <span style={styles.qtyNum}>{item.cartQuantity}</span>
                            <button style={styles.qtyBtn} onClick={() => updateQty(item.id, -1)}><Icons.Minus /></button>
                            <button style={{ marginRight: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center' }} onClick={() => removeFromCart(item.id)}>حذف</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 20, ...styles.form }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>بيانات التوصيل</div>
                    <input style={styles.input} placeholder="الاسم الكامل *" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                    <input style={styles.input} placeholder="رقم الجوال *" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                    <input style={styles.input} placeholder="العنوان التفصيلي" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
                    <textarea style={styles.textarea} rows={2} placeholder="ملاحظات إضافية" value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>طريقة الدفع</div>
                    <div style={styles.payRow}>
                      {[
                        { val: 'cash', label: '💵 كاش' },
                        { val: 'card', label: '💳 بطاقة' },
                        { val: 'transfer', label: '🏦 تحويل' },
                      ].map(m => (
                        <button key={m.val} style={styles.payBtn} className={paymentMethod === m.val ? 'pay-btn-active' : ''} onClick={() => setPaymentMethod(m.val)}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {orderStatus !== 'success' && cart.length > 0 && (
              <div style={styles.drawerFooter}>
                <div style={styles.totalRow}>
                  <span style={{ fontSize: 15, color: '#666' }}>الإجمالي</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>{totalPrice.toLocaleString()} ر.س</span>
                </div>
                <button style={styles.submitBtn} className="submit-btn" onClick={submitOrder} disabled={orderStatus === 'submitting'}>
                  {orderStatus === 'submitting' ? 'جاري التأكيد...' : <><Icons.Whatsapp /><span>تأكيد الطلب عبر واتساب</span></>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
