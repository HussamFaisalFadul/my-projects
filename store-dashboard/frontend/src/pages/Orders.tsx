// src/pages/Orders.tsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Order, Product, api } from '../api';

interface Props {
  orders: Order[];
  products: Product[];
}

type FilterStatus = Order['status'] | 'الكل';
type SortMode = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
.ord-root{min-height:100vh;background:#f0f2f7;font-family:'Tajawal',sans-serif;padding:24px;box-sizing:border-box;direction:rtl;}
.ord-hero{background:linear-gradient(135deg,#0a1628 0%,#112240 50%,#1a3a6b 100%);border-radius:20px;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;position:relative;overflow:hidden;}
.ord-hero::after{content:'🛒';position:absolute;left:32px;bottom:-12px;font-size:88px;opacity:0.06;pointer-events:none;}
.ord-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;color:#63a3ff;text-transform:uppercase;margin:0 0 5px;}
.ord-hero h1{font-size:24px;font-weight:900;color:#fff;margin:0 0 5px;}
.ord-hero p{font-size:13px;color:rgba(255,255,255,0.5);margin:0;}
.ord-hero-actions{display:flex;gap:10px;flex-wrap:wrap;}
.ord-btn-add{padding:10px 22px;border-radius:30px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;box-shadow:0 4px 16px rgba(37,99,235,.45);transition:all .2s;white-space:nowrap;}
.ord-btn-add:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.55);}
.ord-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px;}
@media(max-width:900px){.ord-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:580px){.ord-stats{grid-template-columns:repeat(2,1fr);}}
.ord-stat{background:#fff;border-radius:13px;padding:16px 18px;border:1px solid #e8ecf4;position:relative;overflow:hidden;}
.ord-stat::before{content:'';position:absolute;top:0;right:0;width:4px;height:100%;border-radius:0 13px 13px 0;}
.ord-stat.s-new::before{background:#3b82f6;}.ord-stat.s-pending::before{background:#f59e0b;}.ord-stat.s-done::before{background:#10b981;}.ord-stat.s-cancel::before{background:#ef4444;}.ord-stat.s-rev::before{background:#8b5cf6;}
.ord-stat-icon{font-size:20px;opacity:.2;position:absolute;top:12px;left:14px;}
.ord-stat-label{font-size:11px;color:#8896b3;margin-bottom:4px;font-weight:500;}
.ord-stat-val{font-size:24px;font-weight:900;color:#111;}
.ord-filters{background:#fff;border-radius:13px;padding:14px 18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:18px;border:1px solid #e8ecf4;}
.ord-search{flex:1;min-width:180px;padding:8px 12px;border:1.5px solid #e0e7ff;border-radius:9px;font-size:13px;font-family:'Tajawal',sans-serif;background:#f8faff;color:#1e293b;outline:none;}
.ord-search:focus{border-color:#2563eb;background:#fff;}
.ord-sel{padding:8px 11px;border:1.5px solid #e0e7ff;border-radius:9px;font-size:12.5px;font-family:'Tajawal',sans-serif;background:#f8faff;color:#374151;outline:none;cursor:pointer;}
.ord-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;}
.ord-tab{padding:8px 18px;border-radius:30px;border:1.5px solid #e0e7ff;background:#fff;color:#64748b;font-size:12.5px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all .18s;display:flex;align-items:center;gap:6px;}
.ord-tab:hover{border-color:#2563eb;color:#2563eb;}
.ord-tab.active-all{background:#1e293b;border-color:#1e293b;color:#fff;}.ord-tab.active-new{background:#3b82f6;border-color:#3b82f6;color:#fff;}.ord-tab.active-pending{background:#f59e0b;border-color:#f59e0b;color:#fff;}.ord-tab.active-done{background:#10b981;border-color:#10b981;color:#fff;}.ord-tab.active-cancel{background:#ef4444;border-color:#ef4444;color:#fff;}
.ord-tab-count{background:rgba(255,255,255,.25);border-radius:20px;padding:1px 7px;font-size:11px;}
.ord-empty{text-align:center;padding:72px 20px;background:#fff;border-radius:16px;border:1px solid #e8ecf4;}
.ord-empty-icon{font-size:50px;margin-bottom:10px;}
.ord-empty h3{font-size:17px;font-weight:700;color:#1e293b;margin:0 0 5px;font-family:'Tajawal',sans-serif;}
.ord-empty p{font-size:13px;color:#94a3b8;margin:0;font-family:'Tajawal',sans-serif;}
.ord-list{display:flex;flex-direction:column;gap:12px;}
.ord-card{background:#fff;border-radius:16px;border:1.5px solid #e8ecf4;overflow:hidden;transition:box-shadow .2s;}
.ord-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);}
.ord-card.st-new{border-right:4px solid #3b82f6;}.ord-card.st-pending{border-right:4px solid #f59e0b;}.ord-card.st-done{border-right:4px solid #10b981;opacity:.85;}.ord-card.st-cancel{border-right:4px solid #ef4444;opacity:.7;}
.ord-card-header{padding:14px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;cursor:pointer;}
.ord-card-right{display:flex;gap:12px;align-items:flex-start;}
.ord-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#4f46e5;flex-shrink:0;font-family:'Tajawal',sans-serif;}
.ord-customer{font-size:14px;font-weight:800;color:#111;margin:0 0 3px;}
.ord-phone{font-size:12px;color:#64748b;margin:0 0 4px;}
.ord-badges{display:flex;gap:5px;flex-wrap:wrap;}
.ord-source-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;}
.ord-source-badge.wa{background:#dcfce7;color:#15803d;}.ord-source-badge.ig{background:#fce7f3;color:#9d174d;}.ord-source-badge.dr{background:#e0e7ff;color:#3730a3;}
.ord-status-pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;}
.ord-status-pill.s-new{background:#dbeafe;color:#1d4ed8;}.ord-status-pill.s-pending{background:#fef9c3;color:#92400e;}.ord-status-pill.s-done{background:#dcfce7;color:#15803d;}.ord-status-pill.s-cancel{background:#fee2e2;color:#b91c1c;}
.ord-card-left{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.ord-price-big{font-size:18px;font-weight:900;color:#111;}
.ord-time{font-size:11px;color:#94a3b8;}
.ord-chevron{color:#94a3b8;transition:transform .2s;font-size:14px;align-self:center;}
.ord-card.expanded .ord-chevron{transform:rotate(180deg);}
.ord-card-body{border-top:1px solid #f1f5f9;padding:14px 18px;display:none;}
.ord-card.expanded .ord-card-body{display:block;}
.ord-items-title{font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;}
.ord-items-list{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ord-item-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8faff;border-radius:9px;font-size:13px;}
.ord-item-name{font-weight:700;color:#111;}
.ord-item-detail{color:#64748b;font-size:12px;}
.ord-item-price{font-weight:800;color:#1e293b;}
.ord-notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12.5px;color:#92400e;margin-bottom:12px;}
.ord-actions-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.ord-status-select{padding:8px 12px;border:1.5px solid #e0e7ff;border-radius:9px;font-family:'Tajawal',sans-serif;font-size:13px;background:#f8faff;outline:none;cursor:pointer;font-weight:600;flex:1;min-width:140px;}
.ord-status-select.s-new{border-color:#3b82f6;color:#1d4ed8;}.ord-status-select.s-pending{border-color:#f59e0b;color:#92400e;}.ord-status-select.s-done{border-color:#10b981;color:#065f46;}.ord-status-select.s-cancel{border-color:#ef4444;color:#b91c1c;}
.ord-btn-edit{padding:8px 14px;border:1.5px solid #e0e7ff;border-radius:9px;background:#fff;color:#374151;font-size:12.5px;cursor:pointer;font-family:'Tajawal',sans-serif;font-weight:600;}
.ord-btn-edit:hover{background:#f0f4ff;border-color:#2563eb;color:#2563eb;}
/* Modal */
.ord-modal-bg{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.48);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;}
.ord-modal{background:#fff;border-radius:20px;width:100%;max-width:640px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;font-family:'Tajawal',sans-serif;direction:rtl;}
.ord-modal-header{padding:18px 22px 0;flex-shrink:0;}
.ord-modal-header-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.ord-modal-header-top h2{margin:0;font-size:17px;font-weight:800;color:#111;}
.ord-modal-close{width:30px;height:30px;border-radius:50%;border:none;background:#f0f0f0;cursor:pointer;font-size:15px;}
.ord-modal-close:hover{background:#e0e0e0;}
.ord-modal-body{flex:1;overflow-y:auto;padding:0 22px 18px;}
.ord-modal-nav{display:flex;justify-content:space-between;padding:14px 22px;border-top:1px solid #f0f0f0;flex-shrink:0;background:#fff;}
.ord-form-section{background:#f8faff;border:1px solid #e8ecf4;border-radius:12px;padding:14px 16px;margin-bottom:12px;}
.ord-form-section h3{font-size:13px;font-weight:800;color:#111;margin:0 0 12px;}
.ord-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:480px){.ord-g2{grid-template-columns:1fr;}}
.ord-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
@media(max-width:480px){.ord-g3{grid-template-columns:1fr;}}
.ord-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
.ord-field:last-child{margin-bottom:0;}
.ord-label{font-size:12px;font-weight:600;color:#374151;}
.ord-label .ord-optional{font-weight:400;color:#94a3b8;font-size:11px;margin-right:4px;}
.ord-input,.ord-select,.ord-textarea{width:100%;padding:9px 11px;border:1.5px solid #e0e7ff;border-radius:9px;font-family:'Tajawal',sans-serif;font-size:13px;color:#111;background:#fff;outline:none;box-sizing:border-box;transition:border .15s;}
.ord-input:focus,.ord-select:focus,.ord-textarea:focus{border-color:#2563eb;}
.ord-textarea{resize:vertical;min-height:58px;}
/* Category filter in product picker */
.ord-cat-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.ord-cat-chip{padding:4px 12px;border-radius:20px;border:1.5px solid #e0e7ff;background:#f8faff;color:#374151;font-size:11.5px;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all .14s;}
.ord-cat-chip:hover{border-color:#2563eb;color:#2563eb;}
.ord-cat-chip.active{background:#2563eb;border-color:#2563eb;color:#fff;}
/* Product picker */
.ord-picker-row{display:flex;gap:8px;margin-bottom:10px;}
.ord-picker-row .ord-select{flex:1;}
.ord-picker-row input[type=number]{width:68px;padding:9px 8px;border:1.5px solid #e0e7ff;border-radius:9px;font-size:13px;font-family:'Tajawal',sans-serif;outline:none;}
.ord-picker-row input[type=number]:focus{border-color:#2563eb;}
.ord-btn-add-item{padding:9px 16px;border:none;border-radius:9px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;white-space:nowrap;}
.ord-btn-add-item:disabled{background:#b0c4de;cursor:not-allowed;}
.ord-item-entry{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#fff;border:1px solid #e8ecf4;border-radius:9px;margin-bottom:6px;}
.ord-item-entry-left{display:flex;flex-direction:column;gap:2px;}
.ord-item-entry-name{font-size:13px;font-weight:700;color:#111;}
.ord-item-entry-meta{font-size:11.5px;color:#64748b;display:flex;align-items:center;gap:6px;}
.ord-qty-ctrl{display:flex;align-items:center;gap:4px;}
.ord-qty-ctrl button{width:24px;height:24px;border-radius:6px;border:1px solid #e0e7ff;background:#f8faff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.ord-qty-ctrl button:hover{background:#e0e7ff;}
.ord-qty-num{font-weight:700;min-width:20px;text-align:center;font-size:13px;}
.ord-item-entry-price{font-size:14px;font-weight:800;color:#1d4ed8;}
.ord-item-del{background:none;border:none;cursor:pointer;color:#ef4444;font-size:16px;padding:2px 5px;}
.ord-empty-items{text-align:center;padding:22px 10px;color:#94a3b8;font-size:13px;border:1.5px dashed #e0e7ff;border-radius:9px;}
.ord-total-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:9px;margin-top:6px;}
.ord-total-label{font-size:13px;font-weight:700;color:#1e40af;}
.ord-total-val{font-size:18px;font-weight:900;color:#1e40af;}
.ord-btn-save{padding:11px 28px;border:none;border-radius:10px;background:#1d4ed8;color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all .2s;}
.ord-btn-save:hover{background:#1e40af;}
.ord-btn-save:disabled{background:#93c5fd;cursor:not-allowed;}
.ord-btn-cancel{padding:11px 18px;border:1.5px solid #e0e7ff;border-radius:10px;background:#fff;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;font-family:'Tajawal',sans-serif;}
.ord-btn-cancel:hover{background:#f1f5f9;}
/* Confirm dialog */
.ord-confirm-bg{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;}
.ord-confirm-box{background:#fff;border-radius:16px;padding:28px 28px 22px;max-width:380px;width:100%;font-family:'Tajawal',sans-serif;direction:rtl;}
.ord-confirm-icon{font-size:36px;text-align:center;margin-bottom:12px;}
.ord-confirm-title{font-size:16px;font-weight:800;color:#111;margin-bottom:8px;text-align:center;}
.ord-confirm-msg{font-size:13px;color:#64748b;text-align:center;line-height:1.6;margin-bottom:20px;}
.ord-confirm-btns{display:flex;gap:10px;}
.ord-confirm-ok{flex:1;padding:11px;border:none;border-radius:10px;background:#1d4ed8;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;}
.ord-confirm-ok:hover{background:#1e40af;}
.ord-confirm-cancel{flex:1;padding:11px;border:1.5px solid #e0e7ff;border-radius:10px;background:#fff;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;font-family:'Tajawal',sans-serif;}
.ord-confirm-cancel:hover{background:#f1f5f9;}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '؟';
}

function statusClass(s: Order['status']) {
  return s === 'جديد' ? 's-new' : s === 'قيد التنفيذ' ? 's-pending' : s === 'مكتمل' ? 's-done' : 's-cancel';
}

function sourceClass(s: Order['source']) {
  return s === 'واتساب' ? 'wa' : s === 'انستغرام' ? 'ig' : 'dr';
}

function sourceLabel(s: Order['source']) {
  return s === 'واتساب' ? '💬 واتساب' : s === 'انستغرام' ? '📸 انستغرام' : '🏪 مباشر';
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `منذ ${dy} يوم`;
  return new Date(d).toLocaleDateString('ar-SA');
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  missingName: boolean;
  missingPhone: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ missingName, missingPhone, onConfirm, onCancel }: ConfirmDialogProps) {
  const missing: string[] = [];
  if (missingName) missing.push('اسم العميل');
  if (missingPhone) missing.push('رقم الهاتف');

  return (
    <div className="ord-confirm-bg" onClick={onCancel}>
      <div className="ord-confirm-box" onClick={e => e.stopPropagation()}>
        <div className="ord-confirm-icon">⚠️</div>
        <div className="ord-confirm-title">حقول غير مكتملة</div>
        <div className="ord-confirm-msg">
          لم تقم بإدخال {missing.join(' و')}.<br />
          سيتم حفظ الطلب باسم <strong>{missingName ? 'بدون اسم' : ''}</strong>{missingName && missingPhone ? ' و' : ''}{missingPhone ? <> رقم <strong>بدون رقم</strong></> : ''}.
          <br /><br />
          هل تريد المتابعة رغم ذلك؟
        </div>
        <div className="ord-confirm-btns">
          <button className="ord-confirm-cancel" onClick={onCancel}>تعديل البيانات</button>
          <button className="ord-confirm-ok" onClick={onConfirm}>حفظ على أي حال</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Orders({ orders, products }: Props) {
  const { t } = useTranslation();

  const [filter, setFilter] = useState<FilterStatus>('الكل');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Category filter inside product picker
  const [pickerCategory, setPickerCategory] = useState('الكل');

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);

  const emptyForm = {
    customerName: '',
    customerPhone: '',
    source: 'واتساب' as Order['source'],
    notes: '',
    selectedProduct: '',
    selectedQty: 1,
    items: [] as { productId: string; productName: string; quantity: number; price: number; category?: string }[],
  };
  const [form, setForm] = useState(emptyForm);

  // ── Computed ──

  const stats = useMemo(() => ({
    all: orders.length,
    new: orders.filter(o => o.status === 'جديد').length,
    pending: orders.filter(o => o.status === 'قيد التنفيذ').length,
    done: orders.filter(o => o.status === 'مكتمل').length,
    cancel: orders.filter(o => o.status === 'ملغي').length,
    todayRevenue: orders
      .filter(o => o.status === 'مكتمل' && new Date(o.createdAt).toDateString() === new Date().toDateString())
      .reduce((s, o) => s + o.totalPrice, 0),
  }), [orders]);

  const filtered = useMemo(() => {
    let list = filter === 'الكل' ? orders : orders.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortMode === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortMode === 'price_asc') return a.totalPrice - b.totalPrice;
      return b.totalPrice - a.totalPrice;
    });
  }, [orders, filter, search, sortMode]);

  // Product categories for picker
  const productCategories = useMemo(() => {
    const cats = new Set(products.map(p => (p as any).category).filter(Boolean));
    return ['الكل', ...Array.from(cats)] as string[];
  }, [products]);

  // Filtered products in picker by category
  const pickerProducts = useMemo(() => {
    if (pickerCategory === 'الكل') return products;
    return products.filter(p => (p as any).category === pickerCategory);
  }, [products, pickerCategory]);

  const totalPrice = form.items.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Handlers ──

  const openAdd = () => {
    setEditingOrder(null);
    setForm(emptyForm);
    setPickerCategory('الكل');
    setShowModal(true);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setForm({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      source: order.source,
      notes: order.notes || '',
      selectedProduct: '',
      selectedQty: 1,
      items: order.items.map(i => ({ ...i })),
    });
    setPickerCategory('الكل');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingOrder(null); setShowConfirm(false); };

  const addItem = () => {
    if (!form.selectedProduct) return;
    const product = pickerProducts.find(p => p.id === form.selectedProduct)
      || products.find(p => p.id === form.selectedProduct);
    if (!product) return;
    const exists = form.items.find(i => i.productId === product.id);
    if (exists) {
      setForm(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + prev.selectedQty } : i
        ),
        selectedProduct: '',
        selectedQty: 1,
      }));
      return;
    }
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: product.id,
        productName: product.name,
        quantity: prev.selectedQty,
        price: product.price,
        category: (product as any).category || '',
      }],
      selectedProduct: '',
      selectedQty: 1,
    }));
  };

  const removeItem = (productId: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.productId !== productId) }));
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setForm(prev => ({
      ...prev,
      items: prev.items.map(i => i.productId === productId ? { ...i, quantity: qty } : i),
    }));
  };

  // Attempt save — if name/phone missing, show confirm dialog
  const attemptSave = () => {
    if (form.items.length === 0) return;
    const missingName = !form.customerName.trim();
    const missingPhone = !form.customerPhone.trim();
    if (missingName || missingPhone) {
      setShowConfirm(true);
      return;
    }
    doSave();
  };

  const doSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      const storeId = localStorage.getItem('store_id') || '';
      const customerName = form.customerName.trim() || 'بدون اسم';
      const customerPhone = form.customerPhone.trim() || 'بدون رقم';

      if (editingOrder) {
        await api.updateOrderStatus(editingOrder.id, editingOrder.status);
      } else {
        await api.addOrder({
          storeId,
          customerName,
          customerPhone,
          source: form.source,
          notes: form.notes.trim(),
          items: form.items.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            price: i.price,
          })),
          totalPrice,
          status: 'جديد',
        });
      }
      closeModal();
      setForm(emptyForm);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    setUpdatingStatus(orderId);
    try { await api.updateOrderStatus(orderId, status); }
    catch (e) { console.error(e); }
    finally { setUpdatingStatus(null); }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{STYLES}</style>
      <div className="ord-root">

        {/* Hero */}
        <div className="ord-hero">
          <div>
            <p className="ord-eyebrow">إدارة المبيعات</p>
            <h1>الطلبات</h1>
            <p>{orders.length} طلب إجمالي · {stats.new} جديد</p>
          </div>
          <div className="ord-hero-actions">
            <button className="ord-btn-add" onClick={openAdd}>+ طلب جديد</button>
          </div>
        </div>

        {/* Stats */}
        <div className="ord-stats">
          {[
            { cls: 's-new', icon: '🆕', label: 'جديد', val: stats.new },
            { cls: 's-pending', icon: '⏳', label: 'قيد التنفيذ', val: stats.pending },
            { cls: 's-done', icon: '✅', label: 'مكتمل', val: stats.done },
            { cls: 's-cancel', icon: '❌', label: 'ملغي', val: stats.cancel },
            { cls: 's-rev', icon: '💰', label: 'إيراد اليوم', val: `${stats.todayRevenue.toFixed(0)} ر.س`, small: true },
          ].map((s, i) => (
            <div key={i} className={`ord-stat ${s.cls}`}>
              <span className="ord-stat-icon">{s.icon}</span>
              <div className="ord-stat-label">{s.label}</div>
              <div className="ord-stat-val" style={(s as any).small ? { fontSize: 15 } : {}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="ord-filters">
          <input
            className="ord-search"
            placeholder="🔍 بحث باسم العميل أو رقم الطلب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="ord-sel" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
            <option value="newest">الأحدث أولاً</option>
            <option value="oldest">الأقدم أولاً</option>
            <option value="price_desc">السعر: تنازلي</option>
            <option value="price_asc">السعر: تصاعدي</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="ord-tabs">
          {([
            { label: 'الكل', val: 'الكل' as FilterStatus, cls: 'active-all', count: stats.all },
            { label: 'جديد', val: 'جديد' as FilterStatus, cls: 'active-new', count: stats.new },
            { label: 'قيد التنفيذ', val: 'قيد التنفيذ' as FilterStatus, cls: 'active-pending', count: stats.pending },
            { label: 'مكتمل', val: 'مكتمل' as FilterStatus, cls: 'active-done', count: stats.done },
            { label: 'ملغي', val: 'ملغي' as FilterStatus, cls: 'active-cancel', count: stats.cancel },
          ]).map(tab => (
            <button
              key={tab.val}
              className={`ord-tab ${filter === tab.val ? tab.cls : ''}`}
              onClick={() => setFilter(tab.val)}
            >
              {tab.label}
              <span className="ord-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="ord-empty">
            <div className="ord-empty-icon">🛒</div>
            <h3>لا توجد طلبات</h3>
            <p>جرّب تغيير الفلتر أو أضف طلباً جديداً</p>
          </div>
        ) : (
          <div className="ord-list">
            {filtered.map(order => {
              const isExpanded = expandedId === order.id;
              const sc = statusClass(order.status);
              const cardCls = sc === 's-new' ? 'st-new' : sc === 's-pending' ? 'st-pending' : sc === 's-done' ? 'st-done' : 'st-cancel';
              return (
                <div key={order.id} className={`ord-card ${cardCls} ${isExpanded ? 'expanded' : ''}`}>
                  <div className="ord-card-header" onClick={() => toggleExpand(order.id)}>
                    <div className="ord-card-right">
                      <div className="ord-avatar">{initials(order.customerName)}</div>
                      <div>
                        <div className="ord-customer">{order.customerName}</div>
                        <div className="ord-phone">{order.customerPhone || '—'}</div>
                        <div className="ord-badges">
                          <span className={`ord-source-badge ${sourceClass(order.source)}`}>{sourceLabel(order.source)}</span>
                          <span className={`ord-status-pill ${sc}`}>{order.status}</span>
                          {(order.items || []).length > 0 && (
                            <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '1px 7px', borderRadius: 20 }}>
                              {(order.items || []).length} منتج
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ord-card-left">
                      <div className="ord-price-big">{order.totalPrice.toFixed(2)} ر.س</div>
                      <div className="ord-time">{timeAgo(order.createdAt)}</div>
                      <span className="ord-chevron">▾</span>
                    </div>
                  </div>

                  <div className="ord-card-body">
                    <div className="ord-items-title">تفاصيل الطلب</div>
                    <div className="ord-items-list">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="ord-item-row">
                          <div>
                            <div className="ord-item-name">{item.productName}</div>
                            <div className="ord-item-detail">{item.quantity} × {item.price.toFixed(2)} ر.س</div>
                          </div>
                          <div className="ord-item-price">{(item.quantity * item.price).toFixed(2)} ر.س</div>
                        </div>
                      ))}
                    </div>
                    {order.notes && <div className="ord-notes-box">📝 {order.notes}</div>}
                    <div className="ord-actions-row">
                      <select
                        className={`ord-status-select ${sc}`}
                        value={order.status}
                        disabled={updatingStatus === order.id}
                        onChange={e => handleStatusChange(order.id, e.target.value as Order['status'])}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="جديد">🆕 جديد</option>
                        <option value="قيد التنفيذ">⏳ قيد التنفيذ</option>
                        <option value="مكتمل">✅ مكتمل</option>
                        <option value="ملغي">❌ ملغي</option>
                      </select>
                      <button
                        className="ord-btn-edit"
                        onClick={e => { e.stopPropagation(); openEdit(order); }}
                      >
                        ✏️ تعديل
                      </button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                      # {order.id.slice(0, 8).toUpperCase()} · {new Date(order.createdAt).toLocaleString('ar-SA')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Modal ── */}
        {showModal && (
          <div className="ord-modal-bg" onClick={closeModal}>
            <div className="ord-modal" onClick={e => e.stopPropagation()}>

              <div className="ord-modal-header">
                <div className="ord-modal-header-top">
                  <h2>{editingOrder ? 'تعديل الطلب' : 'طلب جديد'}</h2>
                  <button className="ord-modal-close" onClick={closeModal}>✕</button>
                </div>
              </div>

              <div className="ord-modal-body">

                {/* Customer Info */}
                <div className="ord-form-section">
                  <h3>معلومات العميل</h3>
                  <div className="ord-g2">
                    <div className="ord-field">
                      <label className="ord-label">
                        اسم العميل
                        <span className="ord-optional">(اختياري)</span>
                      </label>
                      <input
                        className="ord-input"
                        value={form.customerName}
                        onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                        placeholder="مثال: أحمد محمد"
                      />
                    </div>
                    <div className="ord-field">
                      <label className="ord-label">
                        رقم الهاتف
                        <span className="ord-optional">(اختياري)</span>
                      </label>
                      <input
                        className="ord-input"
                        value={form.customerPhone}
                        onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                        placeholder="05xxxxxxxx"
                        type="tel"
                      />
                    </div>
                  </div>
                  <div className="ord-g3">
                    <div className="ord-field" style={{ gridColumn: '1 / 2' }}>
                      <label className="ord-label">مصدر الطلب</label>
                      <select
                        className="ord-select"
                        value={form.source}
                        onChange={e => setForm(p => ({ ...p, source: e.target.value as Order['source'] }))}
                      >
                        <option value="واتساب">💬 واتساب</option>
                        <option value="انستغرام">📸 انستغرام</option>
                        <option value="مباشر">🏪 مباشر</option>
                      </select>
                    </div>
                  </div>
                  <div className="ord-field">
                    <label className="ord-label">ملاحظات <span className="ord-optional">(اختياري)</span></label>
                    <textarea
                      className="ord-textarea"
                      rows={2}
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="أي ملاحظات خاصة..."
                    />
                  </div>
                </div>

                {/* Products */}
                <div className="ord-form-section">
                  <h3>المنتجات *</h3>

                  {/* Category filter chips */}
                  {productCategories.length > 1 && (
                    <div className="ord-cat-filter">
                      {productCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`ord-cat-chip ${pickerCategory === cat ? 'active' : ''}`}
                          onClick={() => {
                            setPickerCategory(cat);
                            setForm(p => ({ ...p, selectedProduct: '' }));
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="ord-picker-row">
                    <select
                      className="ord-select"
                      value={form.selectedProduct}
                      onChange={e => setForm(p => ({ ...p, selectedProduct: e.target.value }))}
                    >
                      <option value="">— اختر منتجاً —</option>
                      {pickerProducts.map(p => (
                        <option key={p.id} value={p.id} disabled={(p.quantity || 0) === 0}>
                          {p.name} — {p.price.toFixed(2)} ر.س
                          {(p.quantity || 0) === 0 ? ' (نفد)' : ` (${p.quantity})`}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={form.selectedQty}
                      onChange={e => setForm(p => ({ ...p, selectedQty: Math.max(1, parseInt(e.target.value) || 1) }))}
                    />
                    <button
                      type="button"
                      className="ord-btn-add-item"
                      onClick={addItem}
                      disabled={!form.selectedProduct}
                    >
                      + إضافة
                    </button>
                  </div>

                  {form.items.length === 0 ? (
                    <div className="ord-empty-items">لم تُضف أي منتجات بعد</div>
                  ) : (
                    <>
                      {form.items.map(item => (
                        <div key={item.productId} className="ord-item-entry">
                          <div className="ord-item-entry-left">
                            <span className="ord-item-entry-name">{item.productName}</span>
                            <div className="ord-item-entry-meta">
                              <div className="ord-qty-ctrl">
                                <button type="button" onClick={() => updateItemQty(item.productId, item.quantity - 1)}>−</button>
                                <span className="ord-qty-num">{item.quantity}</span>
                                <button type="button" onClick={() => updateItemQty(item.productId, item.quantity + 1)}>+</button>
                              </div>
                              <span>× {item.price.toFixed(2)} ر.س</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="ord-item-entry-price">{(item.quantity * item.price).toFixed(2)} ر.س</span>
                            <button type="button" className="ord-item-del" onClick={() => removeItem(item.productId)}>✕</button>
                          </div>
                        </div>
                      ))}
                      <div className="ord-total-bar">
                        <span className="ord-total-label">الإجمالي</span>
                        <span className="ord-total-val">{totalPrice.toFixed(2)} ر.س</span>
                      </div>
                    </>
                  )}
                </div>

              </div>

              <div className="ord-modal-nav">
                <button className="ord-btn-cancel" onClick={closeModal}>إلغاء</button>
                <button
                  type="button"
                  className="ord-btn-save"
                  onClick={attemptSave}
                  disabled={saving || form.items.length === 0}
                >
                  {saving ? '⏳ جاري الحفظ...' : editingOrder ? '✓ حفظ التعديلات' : '✓ إضافة الطلب'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Confirm dialog */}
        {showConfirm && (
          <ConfirmDialog
            missingName={!form.customerName.trim()}
            missingPhone={!form.customerPhone.trim()}
            onConfirm={doSave}
            onCancel={() => setShowConfirm(false)}
          />
        )}

      </div>
    </>
  );
}
