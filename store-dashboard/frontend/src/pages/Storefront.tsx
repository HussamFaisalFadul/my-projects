// src/pages/Storefront.tsx
import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, X, Search, LayoutGrid, List } from 'lucide-react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

/* ─────────────── types ─────────────── */
interface Product {
  id: string; name: string; price: number; original_price?: number;
  quantity: number; reserved_quantity?: number; availableQuantity?: number;
  image_url?: string; description?: string; category?: string;
  rating?: number; review_count?: number; variants?: ProductVariant[];
}
interface ProductVariant {
  id: string; title: string; attributes: Record<string, string>;
  price: number; quantity: number; sku?: string; image_url?: string;
}
interface CartItem {
  productId: string; variantId: string | null; productName: string;
  price: number; quantity: number; isReservation: boolean;
  attributes?: Record<string, string>;
}

/* ─────────────── styles (injected once) ─────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Cairo:wght@400;600;700&display=swap');

:root {
  --md-primary: #1565C0;
  --md-primary-dark: #0D47A1;
  --md-primary-light: #E3F2FD;
  --md-secondary: #FF6F00;
  --md-secondary-light: #FFF8E1;
  --md-surface: #FFFFFF;
  --md-surface2: #F5F7FA;
  --md-surface3: #ECEFF4;
  --md-on-primary: #FFFFFF;
  --md-text-high: #0D1B2A;
  --md-text-med: #4A5568;
  --md-text-low: #A0AEC0;
  --md-divider: #E2E8F0;
  --md-success: #2E7D32;
  --md-success-bg: #E8F5E9;
  --md-error: #C62828;
  --md-error-bg: #FFEBEE;
  --md-warning: #E65100;
  --md-warning-bg: #FFF3E0;
  --md-elevation1: 0 2px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --md-elevation2: 0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06);
  --md-elevation3: 0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08);
  --md-elevation4: 0 16px 48px rgba(0,0,0,0.14), 0 8px 16px rgba(0,0,0,0.08);
  --md-radius-sm: 8px;
  --md-radius: 12px;
  --md-radius-lg: 20px;
  --md-radius-xl: 28px;
}

*{margin:0;padding:0;box-sizing:border-box}
.sf-root{font-family:'Tajawal',sans-serif;background:var(--md-surface2);color:var(--md-text-high);direction:rtl;min-height:100vh}

/* ── HEADER ── */
.sf-header{
  position:sticky;top:0;z-index:200;
  background:var(--md-primary);
  box-shadow:var(--md-elevation3);
}
.sf-header-inner{
  max-width:1440px;margin:0 auto;
  height:68px;padding:0 24px;
  display:flex;align-items:center;gap:16px;
}
.sf-brand{display:flex;align-items:center;gap:12px;flex-shrink:0}
.sf-logo{width:44px;height:44px;border-radius:12px;object-fit:cover;background:#fff}
.sf-logo-placeholder{
  width:44px;height:44px;border-radius:12px;
  background:rgba(255,255,255,0.18);
  display:flex;align-items:center;justify-content:center;font-size:24px;
}
.sf-brand-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px}
.sf-search-wrap{
  flex:1;position:relative;max-width:520px;margin:0 auto;
}
.sf-search-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.6);pointer-events:none}
.sf-search{
  width:100%;height:44px;padding:0 44px 0 16px;
  background:rgba(255,255,255,0.15);
  border:1.5px solid rgba(255,255,255,0.25);
  border-radius:100px;color:#fff;
  font-family:'Tajawal',sans-serif;font-size:14px;outline:none;
  transition:all .2s;
}
.sf-search::placeholder{color:rgba(255,255,255,0.55)}
.sf-search:focus{background:rgba(255,255,255,0.22);border-color:rgba(255,255,255,0.5)}
.sf-cart-btn{
  display:flex;align-items:center;gap:8px;
  background:var(--md-secondary);color:#fff;
  border:none;border-radius:100px;
  padding:10px 20px;cursor:pointer;
  font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;
  box-shadow:0 4px 12px rgba(255,111,0,0.4);
  transition:all .2s;flex-shrink:0;white-space:nowrap;
}
.sf-cart-btn:hover{background:#E65100;transform:translateY(-1px);box-shadow:0 6px 16px rgba(255,111,0,0.45)}
.sf-cart-count{
  background:#fff;color:var(--md-secondary);
  width:20px;height:20px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;
}

/* ── HERO ── */
.sf-hero{
  background:linear-gradient(145deg, var(--md-primary-dark) 0%, var(--md-primary) 50%, #1976D2 100%);
  padding:72px 24px 80px;text-align:center;color:#fff;position:relative;overflow:hidden;
}
.sf-hero::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 800px 400px at 50% 120%, rgba(255,111,0,0.18) 0%, transparent 70%);
}
.sf-hero-title{
  font-size:clamp(32px,5vw,52px);font-weight:900;
  letter-spacing:-1px;margin-bottom:14px;
  text-shadow:0 2px 20px rgba(0,0,0,0.2);position:relative;
}
.sf-hero-sub{font-size:18px;opacity:.75;position:relative;font-weight:400}
.sf-hero-chips{display:flex;justify-content:center;gap:12px;margin-top:28px;flex-wrap:wrap;position:relative}
.sf-chip{
  display:flex;align-items:center;gap:6px;
  background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.2);
  color:#fff;padding:7px 16px;border-radius:100px;font-size:13px;font-weight:500;
}

/* ── LAYOUT ── */
.sf-layout{max-width:1440px;margin:0 auto;padding:32px 24px;display:flex;gap:24px;align-items:flex-start}

/* ── SIDEBAR ── */
.sf-sidebar{width:256px;flex-shrink:0;position:sticky;top:84px;display:flex;flex-direction:column;gap:16px}
.sf-panel{
  background:var(--md-surface);border-radius:var(--md-radius-lg);
  box-shadow:var(--md-elevation1);border:1px solid var(--md-divider);
  overflow:hidden;
}
.sf-panel-title{
  padding:14px 18px;font-size:13px;font-weight:700;
  color:var(--md-text-med);text-transform:uppercase;letter-spacing:1px;
  border-bottom:1px solid var(--md-divider);background:var(--md-surface2);
}
.sf-cat-btn{
  display:block;width:100%;padding:11px 18px;
  text-align:right;border:none;background:transparent;
  font-family:'Tajawal',sans-serif;font-size:14px;font-weight:500;
  color:var(--md-text-med);cursor:pointer;transition:all .15s;
  border-bottom:1px solid var(--md-divider);
}
.sf-cat-btn:last-child{border-bottom:none}
.sf-cat-btn:hover{background:var(--md-primary-light);color:var(--md-primary)}
.sf-cat-btn.active{background:var(--md-primary-light);color:var(--md-primary);font-weight:700}
.sf-filter-body{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.sf-filter-label{font-size:12px;font-weight:600;color:var(--md-text-med);margin-bottom:6px;display:flex;justify-content:space-between}
.sf-range{width:100%;accent-color:var(--md-primary);cursor:pointer}
.sf-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
.sf-toggle input{accent-color:var(--md-primary);width:16px;height:16px;cursor:pointer}
.sf-toggle span{font-size:14px;font-weight:500}

/* ── PRODUCTS AREA ── */
.sf-products-area{flex:1;min-width:0}
.sf-toolbar{
  background:var(--md-surface);border-radius:var(--md-radius-lg);
  box-shadow:var(--md-elevation1);border:1px solid var(--md-divider);
  padding:12px 18px;
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;gap:12px;flex-wrap:wrap;
}
.sf-sort{
  height:38px;padding:0 14px;
  border:1.5px solid var(--md-divider);border-radius:var(--md-radius-sm);
  background:#fff;font-family:'Tajawal',sans-serif;font-size:14px;
  color:var(--md-text-high);outline:none;cursor:pointer;transition:.2s;
}
.sf-sort:focus{border-color:var(--md-primary)}
.sf-view-btns{display:flex;gap:4px}
.sf-view-btn{
  width:36px;height:36px;border-radius:var(--md-radius-sm);
  border:1.5px solid var(--md-divider);background:#fff;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--md-text-low);transition:.15s;
}
.sf-view-btn.active{background:var(--md-primary);border-color:var(--md-primary);color:#fff}
.sf-count{font-size:13px;color:var(--md-text-med);font-weight:500}

/* ── PRODUCT CARD (GRID) ── */
.sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
.sf-card{
  background:var(--md-surface);border-radius:var(--md-radius-lg);
  border:1px solid var(--md-divider);overflow:hidden;
  box-shadow:var(--md-elevation1);
  transition:box-shadow .25s, transform .25s;
  display:flex;flex-direction:column;
}
.sf-card:hover{box-shadow:var(--md-elevation3);transform:translateY(-3px)}
.sf-card-img{position:relative;padding-top:75%;background:var(--md-surface3)}
.sf-card-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sf-card-img-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--md-text-low)}
.sf-out-badge{
  position:absolute;inset:0;background:rgba(13,27,42,0.6);
  display:flex;align-items:center;justify-content:center;
}
.sf-out-badge span{
  background:#fff;padding:6px 18px;border-radius:100px;
  font-size:13px;font-weight:700;color:var(--md-error);
}
.sf-discount-badge{
  position:absolute;top:12px;left:12px;
  background:var(--md-secondary);color:#fff;
  font-size:12px;font-weight:800;
  padding:4px 10px;border-radius:100px;
  box-shadow:0 2px 8px rgba(255,111,0,0.4);
}
.sf-card-body{padding:16px;flex:1;display:flex;flex-direction:column;gap:10px}
.sf-cat-tag{font-size:11px;font-weight:600;color:var(--md-primary);background:var(--md-primary-light);padding:3px 10px;border-radius:100px;display:inline-block}
.sf-card-name{font-size:15px;font-weight:700;color:var(--md-text-high);line-height:1.4}
.sf-card-desc{font-size:12px;color:var(--md-text-med);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sf-variants{display:flex;flex-direction:column;gap:8px}
.sf-variant-label{font-size:12px;font-weight:700;color:var(--md-text-high)}
.sf-variant-opts{display:flex;flex-wrap:wrap;gap:6px}
.sf-variant-btn{
  padding:4px 12px;border-radius:100px;
  border:1.5px solid var(--md-divider);background:#fff;
  font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;
  color:var(--md-text-med);cursor:pointer;transition:.15s;
}
.sf-variant-btn.active{border-color:var(--md-primary);background:var(--md-primary-light);color:var(--md-primary)}
.sf-card-footer{padding:0 16px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.sf-price-wrap{display:flex;flex-direction:column}
.sf-price{font-size:20px;font-weight:800;color:var(--md-text-high)}
.sf-price-orig{font-size:12px;color:var(--md-text-low);text-decoration:line-through}
.sf-add-btn{
  display:flex;align-items:center;gap:6px;
  background:var(--md-primary);color:#fff;
  border:none;border-radius:100px;
  padding:9px 18px;cursor:pointer;
  font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;
  box-shadow:0 4px 12px rgba(21,101,192,0.35);
  transition:all .2s;white-space:nowrap;flex-shrink:0;
}
.sf-add-btn:hover{background:var(--md-primary-dark);box-shadow:0 6px 16px rgba(21,101,192,0.4);transform:translateY(-1px)}
.sf-add-btn:disabled{background:var(--md-surface3);color:var(--md-text-low);box-shadow:none;cursor:default;transform:none}

/* ── LIST VIEW ── */
.sf-list{display:flex;flex-direction:column;gap:14px}
.sf-list-card{
  background:var(--md-surface);border-radius:var(--md-radius-lg);
  border:1px solid var(--md-divider);overflow:hidden;
  box-shadow:var(--md-elevation1);
  display:flex;transition:box-shadow .25s;
}
.sf-list-card:hover{box-shadow:var(--md-elevation2)}
.sf-list-img{width:140px;flex-shrink:0;position:relative;background:var(--md-surface3)}
.sf-list-img img{width:100%;height:100%;object-fit:cover;display:block}
.sf-list-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;min-height:120px}
.sf-list-body{flex:1;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.sf-list-info{flex:1}
.sf-list-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}

/* ── EMPTY ── */
.sf-empty{
  background:var(--md-surface);border-radius:var(--md-radius-lg);
  border:1px solid var(--md-divider);padding:80px 20px;
  text-align:center;
}
.sf-empty-icon{font-size:56px;margin-bottom:16px}
.sf-empty-title{font-size:18px;font-weight:700;margin-bottom:8px}
.sf-empty-sub{font-size:14px;color:var(--md-text-med)}

/* ── CART DRAWER ── */
.sf-backdrop{position:fixed;inset:0;background:rgba(13,27,42,0.6);z-index:400;display:flex;justify-content:flex-end;backdrop-filter:blur(2px)}
.sf-drawer{
  width:100%;max-width:460px;background:var(--md-surface);
  height:100vh;display:flex;flex-direction:column;
  box-shadow:-8px 0 40px rgba(0,0,0,0.2);
}
.sf-drawer-header{
  padding:20px 24px;
  background:var(--md-primary);color:#fff;
  display:flex;justify-content:space-between;align-items:center;
  flex-shrink:0;
}
.sf-drawer-title{font-size:18px;font-weight:800}
.sf-drawer-close{
  width:36px;height:36px;border-radius:50%;
  background:rgba(255,255,255,0.15);border:none;color:#fff;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:.15s;
}
.sf-drawer-close:hover{background:rgba(255,255,255,0.25)}
.sf-drawer-body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:0}
.sf-cart-item{
  display:flex;gap:14px;padding:16px 0;
  border-bottom:1px solid var(--md-divider);
}
.sf-cart-item:last-child{border-bottom:none}
.sf-cart-thumb{
  width:76px;height:76px;border-radius:var(--md-radius);
  background:var(--md-surface3);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;
}
.sf-cart-thumb img{width:100%;height:100%;object-fit:cover}
.sf-cart-info{flex:1}
.sf-cart-name{font-size:14px;font-weight:700;margin-bottom:4px;line-height:1.3}
.sf-cart-attrs{font-size:12px;color:var(--md-text-med);margin-bottom:8px}
.sf-cart-price{font-size:15px;font-weight:800;color:var(--md-primary)}
.sf-qty-row{display:flex;align-items:center;gap:10px;margin-top:8px}
.sf-qty-btn{
  width:30px;height:30px;border-radius:50%;
  border:1.5px solid var(--md-divider);background:#fff;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--md-text-high);transition:.15s;
}
.sf-qty-btn:hover{background:var(--md-primary-light);border-color:var(--md-primary);color:var(--md-primary)}
.sf-qty-num{font-size:15px;font-weight:700;min-width:20px;text-align:center}
.sf-remove-btn{background:none;border:none;color:var(--md-text-low);cursor:pointer;font-size:12px;font-family:'Tajawal',sans-serif;margin-right:auto;transition:.15s}
.sf-remove-btn:hover{color:var(--md-error)}

/* ── CHECKOUT FORM ── */
.sf-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.sf-input{
  width:100%;padding:12px 14px;
  border:1.5px solid var(--md-divider);border-radius:var(--md-radius);
  font-family:'Tajawal',sans-serif;font-size:14px;
  color:var(--md-text-high);outline:none;transition:.2s;background:#fff;
}
.sf-input:focus{border-color:var(--md-primary);box-shadow:0 0 0 3px rgba(21,101,192,0.1)}
.sf-input::placeholder{color:var(--md-text-low)}
textarea.sf-input{resize:vertical;min-height:72px}
.sf-payment-label{font-size:13px;font-weight:700;color:var(--md-text-med);margin-bottom:8px}
.sf-payment-opts{display:flex;gap:8px}
.sf-pay-btn{
  flex:1;padding:10px;
  border:2px solid var(--md-divider);border-radius:var(--md-radius);
  background:#fff;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:600;
  color:var(--md-text-med);cursor:pointer;transition:.15s;
  display:flex;flex-direction:column;align-items:center;gap:4px;
}
.sf-pay-btn.active{border-color:var(--md-primary);background:var(--md-primary-light);color:var(--md-primary)}
.sf-pay-icon{font-size:20px}

/* ── DRAWER FOOTER ── */
.sf-drawer-footer{
  padding:18px 24px;border-top:1px solid var(--md-divider);
  background:var(--md-surface2);flex-shrink:0;
}
.sf-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.sf-total-label{font-size:14px;font-weight:600;color:var(--md-text-med)}
.sf-total-price{font-size:26px;font-weight:900;color:var(--md-text-high)}
.sf-checkout-btn{
  width:100%;padding:15px;
  background:linear-gradient(135deg,#25d366,#128C7E);
  color:#fff;border:none;border-radius:100px;
  font-family:'Tajawal',sans-serif;font-size:16px;font-weight:800;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;
  box-shadow:0 6px 20px rgba(37,211,102,0.4);
  transition:all .2s;
}
.sf-checkout-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,211,102,0.45)}
.sf-checkout-btn:disabled{opacity:.6;cursor:default;transform:none}

/* ── SUCCESS ── */
.sf-success{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center;gap:16px}
.sf-success-icon{
  width:80px;height:80px;border-radius:50%;
  background:var(--md-success-bg);color:var(--md-success);
  display:flex;align-items:center;justify-content:center;font-size:40px;
}
.sf-success-title{font-size:22px;font-weight:800}
.sf-success-sub{font-size:14px;color:var(--md-text-med)}
.sf-continue-btn{
  margin-top:8px;padding:12px 32px;
  background:var(--md-primary);color:#fff;border:none;border-radius:100px;
  font-family:'Tajawal',sans-serif;font-size:15px;font-weight:700;
  cursor:pointer;box-shadow:0 4px 12px rgba(21,101,192,0.35);
  transition:.2s;
}
.sf-continue-btn:hover{background:var(--md-primary-dark);transform:translateY(-1px)}

/* ── LOADING / ERROR ── */
.sf-loading{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:var(--md-surface2)}
.sf-spinner{
  width:48px;height:48px;border:4px solid var(--md-primary-light);
  border-top-color:var(--md-primary);border-radius:50%;
  animation:spin .8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.sf-loading p{font-size:15px;color:var(--md-text-med);font-family:'Tajawal',sans-serif}
.sf-error{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--md-surface2);text-align:center;padding:24px;font-family:'Tajawal',sans-serif}
.sf-error-icon{font-size:56px}
.sf-error h2{font-size:22px;font-weight:800;color:var(--md-text-high)}
.sf-error p{font-size:14px;color:var(--md-text-med)}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .sf-sidebar{display:none}
  .sf-layout{padding:20px 16px}
}
@media(max-width:600px){
  .sf-header-inner{padding:0 16px;gap:10px}
  .sf-brand-name{display:none}
  .sf-hero{padding:48px 16px 56px}
  .sf-hero-title{font-size:28px}
  .sf-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
  .sf-cart-btn span:first-of-type{display:none}
}
`;

/* inject styles once */
if (!document.getElementById('sf-styles')) {
  const s = document.createElement('style');
  s.id = 'sf-styles'; s.textContent = css;
  document.head.appendChild(s);
}

/* ─────────────── component ─────────────── */
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
  const [maxPrice, setMaxPrice] = useState(10000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p, availableQuantity: p.quantity - (p.reserved_quantity || 0),
          }));
        }
        setStore(data); setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const products: Product[] = useMemo(() => {
    if (!store?.products) return [];
    return store.products.map((p: any) => ({
      ...p, availableQuantity: p.quantity - (p.reserved_quantity || 0),
    }));
  }, [store]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['الكل', ...Array.from(cats)] as string[];
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

  const getVariantInfo = (product: Product) => {
    if (!product.variants?.length)
      return { price: product.price, available: product.availableQuantity ?? product.quantity, variantId: null };
    const selectedId = selectedVariants[product.id];
    const variant = product.variants.find(v => v.id === selectedId) ?? product.variants[0];
    return { price: variant.price, available: variant.quantity, variantId: variant.id };
  };

  const addToCart = (product: Product) => {
    const { price, available, variantId } = getVariantInfo(product);
    if (available <= 0) { alert('هذا المنتج غير متوفر حالياً'); return; }
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.variantId === variantId);
      if (idx !== -1) { const u = [...prev]; u[idx].quantity += 1; return u; }
      const variant = product.variants?.find(v => v.id === variantId);
      return [...prev, { productId: product.id, variantId, productName: product.name, price, quantity: 1, isReservation: false, attributes: variant?.attributes }];
    });
    setShowCart(true);
  };

  const updateQty = (productId: string, variantId: string | null, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId || item.variantId !== variantId) return item;
      const newQty = item.quantity + delta;
      return newQty <= 0 ? null : { ...item, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string, variantId: string | null) =>
    setCart(prev => prev.filter(i => !(i.productId === productId && i.variantId === variantId)));

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
            productId: i.productId, variantId: i.variantId,
            productName: i.productName + (i.attributes ? ` (${Object.values(i.attributes).join(', ')})` : ''),
            quantity: i.quantity, price: i.price, isReservation: i.isReservation,
          })),
          totalPrice,
          notes: `${customer.address}\n${customer.notes}\nطريقة الدفع: ${paymentMethod}`,
        }),
      });
      if (res.ok) {
        const payLabel = paymentMethod === 'cash' ? 'كاش' : paymentMethod === 'card' ? 'بطاقة' : 'تحويل';
        const msg = `🛍️ *طلب جديد*\n👤 العميل: ${customer.name}\n📱 الجوال: ${customer.phone}\n📍 العنوان: ${customer.address}\n\n${cart.map(i => `• ${i.productName} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString()} ر.س`).join('\n')}\n\n💰 *الإجمالي: ${totalPrice.toLocaleString()} ر.س*\n💳 الدفع: ${payLabel}`;
        window.open(`https://wa.me/${store.owner_phone || '966500000000'}?text=${encodeURIComponent(msg)}`, '_blank');
        setCart([]);
        setOrderStatus('success');
      }
    } catch { setOrderStatus('idle'); }
  };

  const resetOrder = () => {
    setOrderStatus('idle');
    setCustomer({ name: '', phone: '', address: '', notes: '' });
    setShowCart(false);
  };

  /* ── render variants helper ── */
  const renderVariants = (p: Product) => {
    if (!p.variants?.length) return null;
    const attrMap = p.variants.reduce((acc, v) => {
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (!acc[k]) acc[k] = new Set<string>();
        acc[k].add(val);
      });
      return acc;
    }, {} as Record<string, Set<string>>);

    return (
      <div className="sf-variants">
        {Object.entries(attrMap).map(([attrName, values]) => (
          <div key={attrName}>
            <div className="sf-variant-label">{attrName}:</div>
            <div className="sf-variant-opts">
              {Array.from(values).map(val => {
                const v = p.variants?.find(vr => vr.attributes[attrName] === val);
                const active = selectedVariants[p.id] === v?.id;
                return (
                  <button key={val} className={`sf-variant-btn${active ? ' active' : ''}`}
                    onClick={() => v && setSelectedVariants(prev => ({ ...prev, [p.id]: v.id }))}>
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ── states ── */
  if (loading) return (
    <div className="sf-loading">
      <div className="sf-spinner" />
      <p>جاري تحميل المتجر...</p>
    </div>
  );
  if (!store) return (
    <div className="sf-error">
      <div className="sf-error-icon">🏪</div>
      <h2>المتجر غير موجود</h2>
      <p>تأكد من صحة الرابط</p>
    </div>
  );

  const discountPct = (p: Product) =>
    p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0;

  /* ── main render ── */
  return (
    <div className="sf-root">

      {/* HEADER */}
      <header className="sf-header">
        <div className="sf-header-inner">
          <div className="sf-brand">
            {store.logo_url
              ? <img src={store.logo_url} alt="logo" className="sf-logo" />
              : <div className="sf-logo-placeholder">🏪</div>}
            <span className="sf-brand-name">{store.name}</span>
          </div>

          <div className="sf-search-wrap">
            <Search size={18} className="sf-search-icon" />
            <input className="sf-search" placeholder="ابحث عن منتج..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <button className="sf-cart-btn" onClick={() => setShowCart(true)}>
            <ShoppingCart size={20} />
            <span>السلة</span>
            {totalItems > 0 && <span className="sf-cart-count">{totalItems}</span>}
          </button>
        </div>
      </header>

      {/* HERO */}
      <div className="sf-hero">
        <h1 className="sf-hero-title">{store.name}</h1>
        <p className="sf-hero-sub">{store.description || 'تسوق أفضل المنتجات بأسعار منافسة'}</p>
        <div className="sf-hero-chips">
          <div className="sf-chip"><span>🚚</span> شحن سريع</div>
          <div className="sf-chip"><span>🔒</span> دفع آمن</div>
          <div className="sf-chip"><span>↩️</span> إرجاع مجاني</div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="sf-layout">

        {/* SIDEBAR */}
        <aside className="sf-sidebar">
          <div className="sf-panel">
            <div className="sf-panel-title">الفئات</div>
            {categories.map(cat => (
              <button key={cat} className={`sf-cat-btn${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>

          <div className="sf-panel">
            <div className="sf-panel-title">فلتر</div>
            <div className="sf-filter-body">
              <div>
                <div className="sf-filter-label">
                  <span>السعر الأقصى</span>
                  <span style={{ color: 'var(--md-primary)', fontWeight: 700 }}>{maxPrice.toLocaleString()} ر.س</span>
                </div>
                <input type="range" className="sf-range" min={0} max={topPrice} step={50}
                  value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
              </div>
              <label className="sf-toggle">
                <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} />
                <span>المتوفر فقط</span>
              </label>
            </div>
          </div>
        </aside>

        {/* PRODUCTS */}
        <div className="sf-products-area">

          {/* TOOLBAR */}
          <div className="sf-toolbar">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select className="sf-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">الترتيب الافتراضي</option>
                <option value="price-asc">السعر: من الأقل</option>
                <option value="price-desc">السعر: من الأعلى</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="name">الاسم</option>
              </select>
              <div className="sf-view-btns">
                <button className={`sf-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid size={16} /></button>
                <button className={`sf-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
              </div>
            </div>
            <span className="sf-count">{filtered.length} منتج</span>
          </div>

          {/* PRODUCT LIST */}
          {filtered.length === 0 ? (
            <div className="sf-empty">
              <div className="sf-empty-icon">🔍</div>
              <div className="sf-empty-title">لا توجد منتجات</div>
              <div className="sf-empty-sub">جرب تغيير الفلتر أو كلمة البحث</div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="sf-grid">
              {filtered.map(p => {
                const { price, available, variantId: _ } = getVariantInfo(p);
                const isOut = available <= 0;
                const disc = discountPct(p);
                return (
                  <div key={p.id} className="sf-card">
                    <div className="sf-card-img">
                      {!imgErrors.has(p.id) && p.image_url
                        ? <img src={p.image_url} alt={p.name} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} />
                        : <div className="sf-card-img-ph">📦</div>}
                      {isOut && <div className="sf-out-badge"><span>نفد المخزون</span></div>}
                      {disc > 0 && !isOut && <div className="sf-discount-badge">-{disc}%</div>}
                    </div>
                    <div className="sf-card-body">
                      {p.category && <span className="sf-cat-tag">{p.category}</span>}
                      <div className="sf-card-name">{p.name}</div>
                      {p.description && <div className="sf-card-desc">{p.description}</div>}
                      {renderVariants(p)}
                    </div>
                    <div className="sf-card-footer">
                      <div className="sf-price-wrap">
                        <span className="sf-price">{price.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>ر.س</span></span>
                        {p.original_price && <span className="sf-price-orig">{p.original_price.toLocaleString()} ر.س</span>}
                      </div>
                      <button className="sf-add-btn" disabled={isOut} onClick={() => addToCart(p)}>
                        {isOut ? 'غير متوفر' : <><Plus size={15} /> أضف</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sf-list">
              {filtered.map(p => {
                const { price, available } = getVariantInfo(p);
                const isOut = available <= 0;
                const disc = discountPct(p);
                return (
                  <div key={p.id} className="sf-list-card">
                    <div className="sf-list-img">
                      {!imgErrors.has(p.id) && p.image_url
                        ? <img src={p.image_url} alt={p.name} onError={() => setImgErrors(prev => new Set(prev).add(p.id))} />
                        : <div className="sf-list-img-ph">📦</div>}
                    </div>
                    <div className="sf-list-body">
                      <div className="sf-list-info">
                        {p.category && <span className="sf-cat-tag" style={{ marginBottom: 6, display: 'inline-block' }}>{p.category}</span>}
                        <div className="sf-card-name" style={{ marginBottom: 4 }}>{p.name}</div>
                        {p.description && <div className="sf-card-desc">{p.description}</div>}
                        <div style={{ marginTop: 8 }}>{renderVariants(p)}</div>
                      </div>
                      <div className="sf-list-right">
                        <div className="sf-price-wrap" style={{ alignItems: 'flex-end' }}>
                          <span className="sf-price">{price.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>ر.س</span></span>
                          {p.original_price && <span className="sf-price-orig">{p.original_price.toLocaleString()} ر.س</span>}
                          {disc > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--md-secondary)', padding: '2px 8px', borderRadius: 100 }}>-{disc}%</span>}
                        </div>
                        <button className="sf-add-btn" disabled={isOut} onClick={() => addToCart(p)}>
                          {isOut ? 'غير متوفر' : <><Plus size={15} /> أضف للسلة</>}
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

      {/* CART DRAWER */}
      {showCart && (
        <div className="sf-backdrop" onClick={() => setShowCart(false)}>
          <div className="sf-drawer" onClick={e => e.stopPropagation()}>

            <div className="sf-drawer-header">
              <span className="sf-drawer-title">🛍️ سلة المشتريات {totalItems > 0 && `(${totalItems})`}</span>
              <button className="sf-drawer-close" onClick={() => setShowCart(false)}><X size={20} /></button>
            </div>

            <div className="sf-drawer-body">
              {orderStatus === 'success' ? (
                <div className="sf-success">
                  <div className="sf-success-icon">✅</div>
                  <div className="sf-success-title">تم إرسال طلبك!</div>
                  <div className="sf-success-sub">سيتواصل معك صاحب المتجر قريباً</div>
                  <button className="sf-continue-btn" onClick={resetOrder}>متابعة التسوق</button>
                </div>
              ) : cart.length === 0 ? (
                <div className="sf-empty" style={{ margin: 'auto' }}>
                  <div className="sf-empty-icon">🛒</div>
                  <div className="sf-empty-title">السلة فارغة</div>
                  <div className="sf-empty-sub">أضف منتجات للبدء</div>
                </div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={`${item.productId}-${item.variantId}`} className="sf-cart-item">
                      <div className="sf-cart-thumb">
                        {products.find(p => p.id === item.productId)?.image_url
                          ? <img src={products.find(p => p.id === item.productId)!.image_url} alt="" />
                          : '📦'}
                      </div>
                      <div className="sf-cart-info">
                        <div className="sf-cart-name">{item.productName}</div>
                        {item.attributes && <div className="sf-cart-attrs">{Object.values(item.attributes).join(' · ')}</div>}
                        <div className="sf-cart-price">{item.price.toLocaleString()} ر.س</div>
                        <div className="sf-qty-row">
                          <button className="sf-qty-btn" onClick={() => updateQty(item.productId, item.variantId, -1)}><Minus size={13} /></button>
                          <span className="sf-qty-num">{item.quantity}</span>
                          <button className="sf-qty-btn" onClick={() => updateQty(item.productId, item.variantId, 1)}><Plus size={13} /></button>
                          <button className="sf-remove-btn" onClick={() => removeFromCart(item.productId, item.variantId)}>✕ حذف</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="sf-form" style={{ marginTop: 20 }}>
                    <input className="sf-input" placeholder="الاسم الكامل *" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                    <input className="sf-input" placeholder="رقم الجوال *" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} />
                    <input className="sf-input" placeholder="العنوان" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
                    <textarea className="sf-input" placeholder="ملاحظات إضافية..." value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} rows={2} />

                    <div>
                      <div className="sf-payment-label">طريقة الدفع</div>
                      <div className="sf-payment-opts">
                        {[
                          { k: 'cash', label: 'كاش', icon: '💵' },
                          { k: 'card', label: 'بطاقة', icon: '💳' },
                          { k: 'transfer', label: 'تحويل', icon: '🏦' },
                        ].map(m => (
                          <button key={m.k} className={`sf-pay-btn${paymentMethod === m.k ? ' active' : ''}`}
                            onClick={() => setPaymentMethod(m.k)}>
                            <span className="sf-pay-icon">{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {orderStatus !== 'success' && cart.length > 0 && (
              <div className="sf-drawer-footer">
                <div className="sf-total-row">
                  <span className="sf-total-label">الإجمالي</span>
                  <span className="sf-total-price">{totalPrice.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 600 }}>ر.س</span></span>
                </div>
                <button className="sf-checkout-btn" disabled={orderStatus === 'submitting'} onClick={submitOrder}>
                  <span>📱</span>
                  {orderStatus === 'submitting' ? 'جاري الإرسال...' : 'تأكيد الطلب عبر واتساب'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
