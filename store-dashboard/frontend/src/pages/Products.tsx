import React from 'react';
import { useProductsLogic } from './useProductsLogic';
import BarcodeScanner from '../BarcodeScanner';
import ProductWizard from './ProductWizard';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
.pp-root{min-height:100vh;background:#f0f2f7;font-family:'Tajawal',sans-serif;padding:28px 24px;box-sizing:border-box;}
.pp-hero{background:linear-gradient(135deg,#0a1628 0%,#112240 50%,#1a3a6b 100%);border-radius:20px;padding:32px 36px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;position:relative;overflow:hidden;}
.pp-hero::before{content:'';position:absolute;top:-60px;left:-60px;width:220px;height:220px;background:radial-gradient(circle,rgba(99,163,255,0.12) 0%,transparent 70%);pointer-events:none;}
.pp-hero::after{content:'📦';position:absolute;left:36px;bottom:-10px;font-size:90px;opacity:0.06;pointer-events:none;}
.pp-eyebrow{font-size:11px;font-weight:700;letter-spacing:2.5px;color:#63a3ff;text-transform:uppercase;margin:0 0 6px;}
.pp-hero-text h1{font-size:26px;font-weight:900;color:#fff;margin:0 0 6px;}
.pp-hero-text p{font-size:13px;color:rgba(255,255,255,0.55);margin:0;}
.pp-hero-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.pp-btn-mode,.pp-btn-view,.pp-btn-export{padding:9px 16px;border-radius:30px;border:1.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#cde;font-size:12.5px;font-weight:600;cursor:pointer;font-family:'Tajawal',sans-serif;transition:all 0.2s;}
.pp-btn-mode:hover,.pp-btn-view:hover,.pp-btn-export:hover{background:rgba(255,255,255,0.16);}
.pp-btn-add{padding:10px 22px;border-radius:30px;border:none;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;box-shadow:0 4px 16px rgba(37,99,235,0.45);transition:all 0.2s;white-space:nowrap;}
.pp-btn-add:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.55);}
.pp-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;}
@media(max-width:900px){.pp-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:600px){.pp-stats{grid-template-columns:repeat(2,1fr);}}
.pp-stat{background:#fff;border-radius:14px;padding:18px 20px;border:1px solid #e8ecf4;position:relative;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;}
.pp-stat:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08);}
.pp-stat::before{content:'';position:absolute;top:0;right:0;width:4px;height:100%;background:#e0e7ff;border-radius:0 14px 14px 0;}
.pp-stat.warn::before{background:linear-gradient(180deg,#f97316,#ea580c);}
.pp-stat-label{font-size:11.5px;color:#8896b3;margin-bottom:6px;display:block;font-weight:500;}
.pp-stat-val{font-size:26px;font-weight:900;color:#111827;line-height:1;}
.pp-stat.warn .pp-stat-val{color:#ea580c;}
.pp-stat-icon{position:absolute;top:14px;left:16px;font-size:22px;opacity:0.2;}
.pp-filters{background:#fff;border-radius:14px;padding:16px 20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px;border:1px solid #e8ecf4;box-shadow:0 2px 8px rgba(0,0,0,0.04);}
.pp-search{flex:1;min-width:200px;padding:9px 14px;border:1.5px solid #e0e7ff;border-radius:10px;font-size:13.5px;font-family:'Tajawal',sans-serif;background:#f8faff;color:#1e293b;outline:none;transition:border 0.2s;}
.pp-search:focus{border-color:#2563eb;background:#fff;}
.pp-select{padding:9px 12px;border:1.5px solid #e0e7ff;border-radius:10px;font-size:13px;font-family:'Tajawal',sans-serif;background:#f8faff;color:#374151;outline:none;cursor:pointer;}
.pp-btn-low{padding:9px 14px;border-radius:10px;border:1.5px solid #fed7aa;background:#fff7ed;color:#c2410c;font-size:12.5px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;white-space:nowrap;transition:all 0.2s;}
.pp-btn-low.active{background:#c2410c;color:#fff;border-color:#c2410c;}
.pp-loading{text-align:center;padding:80px 20px;color:#6b7280;font-size:15px;font-family:'Tajawal',sans-serif;}
.pp-spinner{width:36px;height:36px;border:3px solid #e0e7ff;border-top-color:#2563eb;border-radius:50%;animation:pp-spin 0.7s linear infinite;margin:0 auto 16px;}
@keyframes pp-spin{to{transform:rotate(360deg);}}
.pp-empty{text-align:center;padding:80px 20px;background:#fff;border-radius:16px;border:1px solid #e8ecf4;}
.pp-empty-icon{font-size:52px;margin-bottom:12px;}
.pp-empty h3{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 6px;font-family:'Tajawal',sans-serif;}
.pp-empty p{font-size:13px;color:#94a3b8;margin:0;font-family:'Tajawal',sans-serif;}
.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;}
.pp-card{background:#fff;border-radius:16px;border:1.5px solid #e8ecf4;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;display:flex;flex-direction:column;}
.pp-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.1);}
.pp-card.low-stock{border-color:#fed7aa;}
.pp-card.inactive{opacity:0.6;}
.pp-card-media{position:relative;aspect-ratio:4/3;background:linear-gradient(135deg,#f0f4ff,#e8ecf8);overflow:hidden;}
.pp-card-media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s;}
.pp-card:hover .pp-card-media img{transform:scale(1.04);}
.pp-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#93a8d4;background:linear-gradient(135deg,#eef2ff,#e0e7ff);font-family:'Tajawal',sans-serif;}
.pp-card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 50%);opacity:0;transition:opacity 0.25s;display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;gap:6px;}
.pp-card:hover .pp-card-overlay{opacity:1;}
.pp-overlay-action{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.9);border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}
.pp-img-count{position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:10px;padding:2px 7px;border-radius:20px;font-family:'Tajawal',sans-serif;}
.pp-variant-count{position:absolute;top:8px;left:8px;background:#2563eb;color:#fff;font-size:10px;padding:2px 7px;border-radius:20px;font-family:'Tajawal',sans-serif;}
.pp-low-badge{position:absolute;bottom:8px;right:8px;background:#ea580c;color:#fff;font-size:10px;padding:2px 8px;border-radius:20px;font-family:'Tajawal',sans-serif;font-weight:700;}
.pp-card-body{padding:14px 16px;flex:1;}
.pp-card-badges{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}
.pp-pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;font-family:'Tajawal',sans-serif;}
.pp-pill-green{background:#dcfce7;color:#15803d;}
.pp-pill-gray{background:#f1f5f9;color:#64748b;}
.pp-pill-red{background:#fef2f2;color:#dc2626;}
.pp-card-name{font-size:15px;font-weight:800;color:#111827;margin:0 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Tajawal',sans-serif;}
.pp-card-cat{font-size:12px;color:#94a3b8;margin:0 0 10px;font-family:'Tajawal',sans-serif;}
.pp-price-row{margin-bottom:10px;display:flex;align-items:baseline;gap:7px;}
.pp-price-main{font-size:17px;font-weight:900;color:#1e293b;font-family:'Tajawal',sans-serif;}
.pp-price-old{font-size:12px;color:#94a3b8;text-decoration:line-through;font-family:'Tajawal',sans-serif;}
.pp-price-range{font-size:13px;font-weight:700;color:#2563eb;font-family:'Tajawal',sans-serif;}
.pp-price-sale{font-size:17px;font-weight:900;color:#dc2626;font-family:'Tajawal',sans-serif;}
.pp-meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.pp-meta-item{background:#f8faff;border-radius:8px;padding:6px 8px;}
.pp-meta-item span{display:block;font-size:10px;color:#94a3b8;font-family:'Tajawal',sans-serif;}
.pp-meta-item strong{font-size:13px;font-weight:700;color:#374151;font-family:'Tajawal',sans-serif;}
.pp-card-footer{padding:10px 16px 14px;display:flex;gap:6px;border-top:1px solid #f1f5f9;}
.pp-act-edit{flex:1;padding:8px;background:#eff6ff;color:#1d4ed8;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:700;font-family:'Tajawal',sans-serif;transition:background 0.2s;}
.pp-act-edit:hover{background:#dbeafe;}
.pp-act-log{padding:8px 10px;background:#f8faff;color:#64748b;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;font-family:'Tajawal',sans-serif;}
.pp-act-del{padding:8px 10px;background:#fef2f2;color:#dc2626;border:none;border-radius:8px;cursor:pointer;font-size:12.5px;font-family:'Tajawal',sans-serif;}
.pp-table-wrap{background:#fff;border-radius:16px;border:1px solid #e8ecf4;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.pp-table{width:100%;border-collapse:collapse;}
.pp-table thead tr{background:linear-gradient(135deg,#f0f4ff,#e8ecf8);}
.pp-table th{padding:13px 16px;text-align:right;font-size:12px;font-weight:700;color:#4b5563;font-family:'Tajawal',sans-serif;border-bottom:1px solid #e0e7ff;white-space:nowrap;}
.pp-table td{padding:12px 16px;font-size:13.5px;color:#374151;font-family:'Tajawal',sans-serif;border-bottom:1px solid #f3f4f6;vertical-align:middle;}
.pp-table tr:last-child td{border-bottom:none;}
.pp-table tr:hover td{background:#f8faff;}
.pp-table-name{font-weight:700;color:#111827;display:flex;align-items:center;gap:10px;}
.pp-table-thumb{width:38px;height:38px;border-radius:8px;object-fit:cover;flex-shrink:0;}
.pp-table-initials{width:38px;height:38px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#4f46e5;font-family:'Tajawal',sans-serif;}
.pp-table-actions{display:flex;gap:6px;}
.pp-tbl-edit{padding:6px 12px;background:#eff6ff;color:#1d4ed8;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-family:'Tajawal',sans-serif;font-weight:700;}
.pp-tbl-del{padding:6px 12px;background:#fef2f2;color:#dc2626;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-family:'Tajawal',sans-serif;font-weight:700;}
.pp-modal-bg{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;}
.pp-modal{background:#fff;border-radius:18px;width:100%;max-width:520px;padding:28px;box-shadow:0 24px 64px rgba(0,0,0,0.18);font-family:'Tajawal',sans-serif;}
.pp-modal h3{margin:0 0 20px;font-size:17px;font-weight:800;color:#111827;}
.pp-modal-form{display:flex;flex-direction:column;gap:14px;}
.pp-modal-label{font-size:12.5px;font-weight:600;color:#374151;margin-bottom:5px;display:block;}
.pp-modal-select,.pp-modal-input,.pp-modal-textarea{width:100%;padding:9px 12px;border:1.5px solid #e0e7ff;border-radius:9px;font-family:'Tajawal',sans-serif;font-size:13.5px;color:#111827;background:#f8faff;outline:none;box-sizing:border-box;}
.pp-modal-select:focus,.pp-modal-input:focus,.pp-modal-textarea:focus{border-color:#2563eb;}
.pp-modal-history{max-height:220px;overflow-y:auto;margin-top:4px;}
.pp-mov-row{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:9px;margin-bottom:5px;background:#f8faff;font-size:12.5px;gap:8px;}
.pp-mov-type{font-weight:700;}
.pp-mov-qty{font-weight:900;}
.pp-mov-qty.pos{color:#16a34a;}
.pp-mov-qty.neg{color:#dc2626;}
.pp-modal-actions{display:flex;gap:10px;margin-top:8px;}
.pp-modal-save{flex:1;padding:11px;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:'Tajawal',sans-serif;}
.pp-modal-cancel{padding:11px 18px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:'Tajawal',sans-serif;}
`;

export default function Products() {
  const {
    mode, viewMode, sortMode, products, loading, showForm, editingId,
    showScanner, search, filterCategory, filterLowStock, filterActive,
    selectedProductForLog, showMovementModal, movementReason, movementQuantity,
    movementNote, movementsData, suppliers, categories, filteredProducts,
    lowStockCount, activeCount, imageCount, totalValue,
    toggleMode, toggleViewMode, changeSort, openAddForm, handleEdit,
    handleDelete, showStockLog, addStockMovement, handleSubmitDirect,
    getMainImage, setSearch, setFilterCategory, setFilterLowStock,
    setFilterActive, setShowForm, setShowScanner, setMovementReason,
    setMovementQuantity, setMovementNote, setSelectedProductForLog,
    setShowMovementModal, getInitials,
    t, formatMoney, formatDate, exportToExcel,
  } = useProductsLogic();

  const movTypeLabel: Record<string, string> = {
    purchase: 'شراء', sale: 'بيع', return: 'إرجاع', adjustment: 'تسوية', damage: 'تلف',
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="pp-root" dir="rtl">

        {showScanner && (
          <BarcodeScanner
            onDetected={(code: string) => { setShowScanner(false); }}
            onClose={() => setShowScanner(false)}
          />
        )}

        <div className="pp-hero">
          <div className="pp-hero-text">
            <p className="pp-eyebrow">إدارة المخزون</p>
            <h1>{t('products.title')}</h1>
            <p>{t('products.subtitle')}</p>
          </div>
          <div className="pp-hero-actions">
            <button className="pp-btn-mode" onClick={toggleMode} type="button">{mode === 'simple' ? '⚡ بسيط' : '🧠 متقدم'}</button>
            <button className="pp-btn-view" onClick={toggleViewMode} type="button">{viewMode === 'grid' ? '☷ جدول' : '▣ بطاقات'}</button>
            <button className="pp-btn-export" onClick={exportToExcel} type="button">📊 Excel</button>
            <button className="pp-btn-add" onClick={openAddForm} type="button">+ {t('products.addProduct')}</button>
          </div>
        </div>

        <div className="pp-stats">
          {[
            { icon: '🗂️', label: 'إجمالي المنتجات', val: products.length, warn: false, small: false },
            { icon: '✅', label: 'المنتجات النشطة', val: activeCount, warn: false, small: false },
            { icon: '⚠️', label: 'مخزون منخفض',    val: lowStockCount, warn: true,  small: false },
            { icon: '🖼️', label: 'مع صور',           val: imageCount,   warn: false, small: false },
            { icon: '💰', label: 'إجمالي القيمة',   val: formatMoney(totalValue, t), warn: false, small: true },
          ].map((s, i) => (
            <div key={i} className={`pp-stat ${s.warn ? 'warn' : ''}`}>
              <span className="pp-stat-icon">{s.icon}</span>
              <span className="pp-stat-label">{s.label}</span>
              <div className="pp-stat-val" style={s.small ? { fontSize: 15 } : {}}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="pp-filters">
          <input className="pp-search" placeholder="🔍 بحث بالاسم، SKU، باركود..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="pp-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">كل الفئات</option>
            {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="pp-select" value={filterActive} onChange={e => setFilterActive(e.target.value as any)}>
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
          </select>
          <select className="pp-select" value={sortMode} onChange={e => changeSort(e.target.value as any)}>
            <option value="newest">الأحدث</option>
            <option value="name">الاسم</option>
            <option value="price_asc">السعر ↑</option>
            <option value="price_desc">السعر ↓</option>
            <option value="stock_asc">المخزون ↑</option>
            <option value="stock_desc">المخزون ↓</option>
          </select>
          <button className={`pp-btn-low ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock((v: boolean) => !v)} type="button">
            {filterLowStock ? '✅' : '⚠️'} مخزون منخفض
          </button>
        </div>

        {loading ? (
          <div className="pp-loading"><div className="pp-spinner" />جارٍ التحميل...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="pp-empty">
            <div className="pp-empty-icon">📦</div>
            <h3>لا توجد منتجات</h3>
            <p>جرّب تغيير الفلاتر أو أضف منتجاً جديداً</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="pp-grid">
            {filteredProducts.map((p: any) => {
              const isLow = (p.quantity || 0) <= (p.minQuantity ?? 5);
              const mainImage = getMainImage(p);
              const imagesCount = (p.images || []).length;
              const hasSale = (p.salePrice || 0) > 0 && (p.salePrice || 0) < (p.price || 0);
              const hasVariants = (p.variants || []).length > 0;
              const totalVariantQty = hasVariants
                ? (p.variants as any[]).reduce((s: number, v: any) => s + (v.quantity || 0), 0) : null;
              return (
                <article key={p.id} className={`pp-card ${isLow ? 'low-stock' : ''} ${p.isActive === false ? 'inactive' : ''}`}>
                  <div className="pp-card-media">
                    {mainImage ? <img src={mainImage} alt={p.name} /> : <div className="pp-no-img">{getInitials(p.name || 'P')}</div>}
                    {imagesCount > 1 && <span className="pp-img-count">+{imagesCount - 1}</span>}
                    {hasVariants && <span className="pp-variant-count">{p.variants.length} متغير</span>}
                    {isLow && <span className="pp-low-badge">مخزون منخفض</span>}
                    <div className="pp-card-overlay">
                      <button className="pp-overlay-action" type="button" onClick={() => handleEdit(p)}>✏️</button>
                      <button className="pp-overlay-action" type="button" onClick={() => showStockLog(p)}>📋</button>
                    </div>
                  </div>
                  <div className="pp-card-body">
                    <div className="pp-card-badges">
                      <span className={`pp-pill ${p.isActive !== false ? 'pp-pill-green' : 'pp-pill-gray'}`}>{p.isActive !== false ? 'نشط' : 'موقوف'}</span>
                      {hasSale && <span className="pp-pill pp-pill-red">خصم</span>}
                      {hasVariants && <span className="pp-pill" style={{ background: '#eff6ff', color: '#1d4ed8' }}>متغيرات</span>}
                    </div>
                    <h3 className="pp-card-name" title={p.name}>{p.name}</h3>
                    <p className="pp-card-cat">{p.category || 'بدون فئة'}</p>
                    <div className="pp-price-row">
                      {hasVariants ? (
                        <span className="pp-price-range">{formatMoney(Math.min(...p.variants.map((v: any) => v.price)), t)} – {formatMoney(Math.max(...p.variants.map((v: any) => v.price)), t)}</span>
                      ) : hasSale ? (
                        <><span className="pp-price-sale">{formatMoney(p.salePrice, t)}</span><span className="pp-price-old">{formatMoney(p.price, t)}</span></>
                      ) : (
                        <span className="pp-price-main">{formatMoney(p.price, t)}</span>
                      )}
                    </div>
                    <div className="pp-meta">
                      <div className="pp-meta-item"><span>المخزون</span><strong>{hasVariants ? totalVariantQty : (p.quantity || 0)}</strong></div>
                      <div className="pp-meta-item"><span>الحد الأدنى</span><strong>{p.minQuantity ?? 5}</strong></div>
                      {p.sku && <div className="pp-meta-item" style={{ gridColumn: '1/-1' }}><span>SKU</span><strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</strong></div>}
                    </div>
                  </div>
                  <div className="pp-card-footer">
                    <button className="pp-act-edit" onClick={() => handleEdit(p)}>تعديل</button>
                    <button className="pp-act-log" onClick={() => showStockLog(p)}>📋</button>
                    <button className="pp-act-del" onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="pp-table-wrap">
            <table className="pp-table">
              <thead><tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>المتغيرات</th><th>الفئة</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
              <tbody>
                {filteredProducts.map((p: any) => {
                  const mainImage = getMainImage(p);
                  const hasVariants = (p.variants || []).length > 0;
                  const totalQty = hasVariants ? (p.variants as any[]).reduce((s: number, v: any) => s + (v.quantity || 0), 0) : p.quantity || 0;
                  return (
                    <tr key={p.id}>
                      <td><div className="pp-table-name">{mainImage ? <img className="pp-table-thumb" src={mainImage} alt={p.name} /> : <div className="pp-table-initials">{getInitials(p.name || 'P')}</div>}{p.name}</div></td>
                      <td><strong>{formatMoney(p.price, t)}</strong></td>
                      <td><span style={{ fontWeight: 700, color: totalQty <= (p.minQuantity ?? 5) ? '#dc2626' : '#374151' }}>{totalQty}</span></td>
                      <td>{hasVariants ? `${p.variants.length} متغير` : '—'}</td>
                      <td>{p.category || '—'}</td>
                      <td><span className={`pp-pill ${p.isActive !== false ? 'pp-pill-green' : 'pp-pill-gray'}`}>{p.isActive !== false ? 'نشط' : 'موقوف'}</span></td>
                      <td><div className="pp-table-actions"><button className="pp-tbl-edit" onClick={() => handleEdit(p)}>تعديل</button><button className="pp-tbl-del" onClick={() => handleDelete(p.id)}>حذف</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showMovementModal && selectedProductForLog && (
          <div className="pp-modal-bg" onClick={() => setShowMovementModal(false)}>
            <div className="pp-modal" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3>📦 حركة مخزون — {(selectedProductForLog as any).name}</h3>
              <div className="pp-modal-form">
                <div>
                  <label className="pp-modal-label">نوع الحركة</label>
                  <select className="pp-modal-select" value={movementReason} onChange={e => setMovementReason(e.target.value as any)}>
                    <option value="purchase">شراء (إضافة)</option>
                    <option value="sale">بيع (خصم)</option>
                    <option value="return">إرجاع</option>
                    <option value="adjustment">تسوية يدوية</option>
                    <option value="damage">تلف / هالك</option>
                  </select>
                </div>
                <div>
                  <label className="pp-modal-label">الكمية</label>
                  <input className="pp-modal-input" type="number" min="1" value={movementQuantity} onChange={e => setMovementQuantity(Number(e.target.value))} />
                </div>
                <div>
                  <label className="pp-modal-label">ملاحظة</label>
                  <textarea className="pp-modal-textarea" rows={2} value={movementNote} onChange={e => setMovementNote(e.target.value)} placeholder="اختياري..." />
                </div>
                {(movementsData as any[]).length > 0 && (
                  <div>
                    <label className="pp-modal-label">آخر الحركات</label>
                    <div className="pp-modal-history">
                      {(movementsData as any[]).slice(0, 10).map((m: any) => (
                        <div key={m.id} className="pp-mov-row">
                          <span className="pp-mov-type">{movTypeLabel[m.type] || m.type}</span>
                          <span style={{ flex: 1, color: '#64748b' }}>{m.note || '—'}</span>
                          <span className={`pp-mov-qty ${m.quantityChange > 0 ? 'pos' : 'neg'}`}>{m.quantityChange > 0 ? '+' : ''}{m.quantityChange}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(m.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pp-modal-actions">
                  <button className="pp-modal-save" onClick={() => {
                    const delta = ['sale', 'damage'].includes(movementReason) ? -Math.abs(movementQuantity) : Math.abs(movementQuantity);
                    addStockMovement((selectedProductForLog as any).id, delta, movementReason, movementNote);
                    setShowMovementModal(false);
                  }}>تسجيل الحركة</button>
                  <button className="pp-modal-cancel" onClick={() => setShowMovementModal(false)}>إلغاء</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <ProductWizard
            onClose={() => setShowForm(false)}
            onSave={async (wizardData: any) => {
              await handleSubmitDirect({
                name:        wizardData.name,
                price:       parseFloat(wizardData.price)       || 0,
                quantity:    parseInt(wizardData.quantity)      || 0,
                category:    wizardData.category   || '',
                minQuantity: parseInt(wizardData.minQuantity)   || 5,
                barcode:     wizardData.barcode    || '',
                sku:         wizardData.sku        || '',
                brand:       wizardData.brand      || '',
                description: wizardData.description|| '',
                cost_price:  parseFloat(wizardData.costPrice)   || 0,
                sale_price:  parseFloat(wizardData.salePrice)   || 0,
                sale_start:  wizardData.saleStart  || '',
                sale_end:    wizardData.saleEnd    || '',
                tax_rate:    parseFloat(wizardData.taxRate)     || 0,
                weight_kg:   parseFloat(wizardData.weightKg)    || 0,
                unit:        wizardData.unit       || 'قطعة',
                is_active:   wizardData.isActive   !== false,
                tagsText:    wizardData.tags       || '',
                supplierId:  wizardData.supplierId || '',
                images: (wizardData.images || []).map((img: any, idx: number) => ({
                  id: img.id, productId: '', url: img.url,
                  isPrimary: img.isPrimary, sortOrder: idx,
                  createdAt: new Date().toISOString(),
                })),
                variants: (wizardData.variants || []).map((v: any, idx: number) => ({
                  id: v.id, productId: '', title: v.title,
                  attributes: Object.fromEntries((v.attributes || []).map((a: any) => [a.key, a.value])),
                  price:     parseFloat(v.price)     || 0,
                  costPrice: parseFloat(v.costPrice) || 0,
                  quantity:  parseInt(v.quantity)    || 0,
                  sku: v.sku || undefined, barcode: v.barcode || undefined,
                  imageUrl: v.imageUrl || undefined,
                  isActive: v.isActive !== false, sortOrder: idx,
                })),
              });
            }}
            editingId={editingId}
            suppliers={suppliers}
            categories={categories}
            t={t}
          />
        )}

      </div>
    </>
  );
}
