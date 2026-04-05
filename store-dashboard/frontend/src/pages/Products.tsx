import { useState, useEffect, useCallback } from 'react';
import { api, Product as ApiProduct, Order, socket } from '../api';

// ─── توسيع واجهة المنتج للحقول المتقدمة ─────────────────────────────
interface ProductImage {
  url: string;
  is_primary: boolean;
  sort_order: number;
}

interface StockMovement {
  id: string;
  product_id: string;
  quantity_change: number;
  reason: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage';
  note?: string;
  created_at: string;
}

interface Variant {
  id: string;
  attributes: Record<string, string>; // e.g., { color: 'red', size: 'L' }
  price: number;
  quantity: number;
  sku?: string;
  image_url?: string;
}

interface ExtendedProduct extends ApiProduct {
  images?: ProductImage[];
  stock_movements?: StockMovement[];
  variants?: Variant[];
  barcode?: string;
  brand?: string;
  weight_kg?: number;
  tax_rate?: number;
  sale_price?: number;
  sale_start?: string;
  sale_end?: string;
  sku?: string;
  description?: string;
  cost_price?: number;
  unit?: string;
  is_active?: boolean;
}

// ─── دوال مساعدة للتعامل مع localStorage ────────────────────────────
const STORAGE_KEY = 'product_extras';
const getStoreId = () => localStorage.getItem('store_id') || '';
const loadExtras = (): Record<string, any> => {
  const key = `${STORAGE_KEY}_${getStoreId()}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
};
const saveExtras = (extras: Record<string, any>) => {
  const key = `${STORAGE_KEY}_${getStoreId()}`;
  localStorage.setItem(key, JSON.stringify(extras));
};
const getProductExtras = (productId: string) => loadExtras()[productId] || {};
const setProductExtras = (productId: string, data: any) => {
  const all = loadExtras();
  all[productId] = { ...all[productId], ...data };
  saveExtras(all);
};

// ─── النموذج الفارغ ──────────────────────────────────────────────────
const emptyForm = {
  name: '',
  price: 0,
  quantity: 0,
  category: '',
  minQuantity: 5,
  imageUrl: '',
  images: [] as ProductImage[],
  variants: [] as Variant[],
  stock_movements: [] as StockMovement[],
  barcode: '',
  brand: '',
  weight_kg: 0,
  tax_rate: 0,
  sale_price: 0,
  sale_start: '',
  sale_end: '',
  sku: '',
  description: '',
  cost_price: 0,
  unit: 'قطعة',
  is_active: true,
};

// ─── المكون الرئيسي ──────────────────────────────────────────────────
export default function Products() {
  const [mode, setMode] = useState<'simple' | 'advanced'>(
    () => (localStorage.getItem('products_mode') as any) || 'simple'
  );
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'variants' | 'movements'>('basic');
  const [selectedProductForLog, setSelectedProductForLog] = useState<ExtendedProduct | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementReason, setMovementReason] = useState<StockMovement['reason']>('adjustment');
  const [movementQuantity, setMovementQuantity] = useState(0);
  const [movementNote, setMovementNote] = useState('');

  // ─── جلب المنتجات من API ودمج البيانات الإضافية ────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await api.getProducts() as ApiProduct[];
      const productsWithExtras = productsData.map(p => ({
        ...p,
        ...getProductExtras(p.id),
      }));
      setProducts(productsWithExtras);
    } catch (error) {
      console.error('فشل تحميل المنتجات', error);
      alert('حدث خطأ أثناء تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    // استماع لأحداث الـ socket لتحديث فوري (اختياري)
    socket.on('product_updated', fetchProducts);
    return () => {
      socket.off('product_updated');
    };
  }, [fetchProducts]);

  // ─── تبديل الوضع ────────────────────────────────────────────────────
  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'advanced' : 'simple';
    setMode(newMode);
    localStorage.setItem('products_mode', newMode);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(JSON.parse(JSON.stringify(emptyForm)));
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleEdit = (product: ExtendedProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category || '',
      minQuantity: product.minQuantity || 5,
      imageUrl: product.imageUrl || '',
      images: product.images || [],
      variants: product.variants || [],
      stock_movements: product.stock_movements || [],
      barcode: product.barcode || '',
      brand: product.brand || '',
      weight_kg: product.weight_kg || 0,
      tax_rate: product.tax_rate || 0,
      sale_price: product.sale_price || 0,
      sale_start: product.sale_start || '',
      sale_end: product.sale_end || '',
      sku: product.sku || '',
      description: product.description || '',
      cost_price: product.cost_price || 0,
      unit: product.unit || 'قطعة',
      is_active: product.is_active !== false,
    });
    setActiveTab('basic');
    setShowForm(true);
  };

  // ─── إدارة الصور المتعددة ──────────────────────────────────────────
  const addImage = (url: string) => {
    const newImages = [...form.images, { url, is_primary: form.images.length === 0, sort_order: form.images.length }];
    setForm({ ...form, images: newImages });
  };
  const removeImage = (index: number) => {
    const newImages = form.images.filter((_, i) => i !== index);
    if (newImages.length > 0 && form.images[index].is_primary) newImages[0].is_primary = true;
    setForm({ ...form, images: newImages });
  };
  const setPrimaryImage = (index: number) => {
    const newImages = form.images.map((img, i) => ({ ...img, is_primary: i === index }));
    setForm({ ...form, images: newImages });
  };
  const moveImage = (from: number, to: number) => {
    const newImages = [...form.images];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    newImages.forEach((img, idx) => { img.sort_order = idx; });
    setForm({ ...form, images: newImages });
  };

  // ─── إدارة المتغيرات ───────────────────────────────────────────────
  const addVariant = () => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      attributes: {},
      price: form.price,
      quantity: 0,
    };
    setForm({ ...form, variants: [...form.variants, newVariant] });
  };
  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...form.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setForm({ ...form, variants: newVariants });
  };
  const removeVariant = (index: number) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  // ─── حفظ المنتج (يدعم الحقول الأساسية + الإضافات في localStorage) ───
  const handleSubmit = async () => {
    if (!form.name || form.price <= 0) return;
    setSaving(true);
    try {
      const baseProduct = {
        name: form.name,
        price: form.price,
        quantity: form.quantity,
        category: form.category,
        minQuantity: form.minQuantity,
        imageUrl: form.imageUrl,
        storeId: getStoreId(),
      };
      let savedProduct: ApiProduct;
      if (editingId) {
        await api.updateProduct(editingId, baseProduct);
        savedProduct = { id: editingId, ...baseProduct, createdAt: '', updatedAt: '' } as ApiProduct;
      } else {
        savedProduct = await api.addProduct(baseProduct);
      }
      // حفظ البيانات الإضافية في localStorage
      const extras = {
        images: form.images,
        variants: form.variants,
        stock_movements: form.stock_movements,
        barcode: form.barcode,
        brand: form.brand,
        weight_kg: form.weight_kg,
        tax_rate: form.tax_rate,
        sale_price: form.sale_price,
        sale_start: form.sale_start,
        sale_end: form.sale_end,
        sku: form.sku,
        description: form.description,
        cost_price: form.cost_price,
        unit: form.unit,
        is_active: form.is_active,
      };
      setProductExtras(savedProduct.id, extras);
      await fetchProducts();
      setShowForm(false);
      setEditingId(null);
      setForm(JSON.parse(JSON.stringify(emptyForm)));
    } catch (error) {
      console.error('خطأ في الحفظ', error);
      alert('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await api.deleteProduct(id);
      const all = loadExtras();
      delete all[id];
      saveExtras(all);
      await fetchProducts();
    } catch (error) {
      console.error('خطأ في الحذف', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  const handleQuantityChange = async (product: ExtendedProduct, delta: number, reason?: StockMovement['reason']) => {
    const newQty = Math.max(0, product.quantity + delta);
    try {
      await api.updateProduct(product.id, { quantity: newQty });
      if (reason) {
        const movement: StockMovement = {
          id: Date.now().toString(),
          product_id: product.id,
          quantity_change: delta,
          reason,
          note: movementNote || 'تعديل يدوي',
          created_at: new Date().toISOString(),
        };
        const current = getProductExtras(product.id);
        const movements = current.stock_movements || [];
        setProductExtras(product.id, { ...current, stock_movements: [movement, ...movements] });
      }
      await fetchProducts();
    } catch (error) {
      console.error('خطأ في تحديث الكمية', error);
      alert('فشل تحديث الكمية');
    }
  };

  const addStockMovement = async (productId: string, change: number, reason: StockMovement['reason'], note: string) => {
    const movement: StockMovement = {
      id: Date.now().toString(),
      product_id: productId,
      quantity_change: change,
      reason,
      note,
      created_at: new Date().toISOString(),
    };
    const current = getProductExtras(productId);
    const movements = current.stock_movements || [];
    setProductExtras(productId, { ...current, stock_movements: [movement, ...movements] });
    await fetchProducts();
    alert('تم تسجيل الحركة بنجاح');
  };

  const showStockLog = (product: ExtendedProduct) => {
    setSelectedProductForLog(product);
    setShowMovementModal(true);
  };

  // ─── الفلترة ────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.includes(search) ||
      (mode === 'advanced' && (p.sku || '').includes(search)) ||
      p.category.includes(search);
    const matchesCategory = !filterCategory || p.category === filterCategory;
    const matchesLow = !filterLowStock || p.quantity <= (p.minQuantity || 5);
    return matchesSearch && matchesCategory && matchesLow;
  });

  const lowStockCount = products.filter(p => p.quantity <= (p.minQuantity || 5)).length;
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // ─── واجهة المستخدم ─────────────────────────────────────────────────
  return (
    <div className="products-page" dir="rtl">
      {/* رأس الصفحة */}
      <div className="products-header">
        <div className="header-right">
          <h1 className="page-title">المنتجات ({products.length})</h1>
          {lowStockCount > 0 && (
            <button className={`low-stock-badge ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock(!filterLowStock)}>
              ⚠️ {lowStockCount} منتج مخزونه منخفض
            </button>
          )}
        </div>
        <div className="header-left">
          <button className={`mode-toggle ${mode}`} onClick={toggleMode}>
            {mode === 'simple' ? '⚡ بسيط' : '🔬 متقدم'}
          </button>
          <button className="btn-add" onClick={openAddForm}>+ منتج جديد</button>
        </div>
      </div>

      {/* بحث وفلاتر */}
      <div className="filters-bar">
        <input className="search-input" placeholder="ابحث بالاسم أو SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {uniqueCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className={`filter-low-btn ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock(!filterLowStock)}>
          {filterLowStock ? '✅' : '⚠️'} مخزون منخفض
        </button>
      </div>

      {/* جدول المنتجات */}
      {loading ? <div className="loading-msg">جار التحميل...</div> : (
        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                {mode === 'advanced' && <th>سعر التكلفة</th>}
                <th>المخزون</th>
                <th>التصنيف</th>
                {mode === 'advanced' && <th>الماركة</th>}
                {mode === 'advanced' && <th>الباركود</th>}
                {mode === 'advanced' && <th>الوزن</th>}
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isLow = p.quantity <= (p.minQuantity || 5);
                return (
                  <tr key={p.id} className={isLow ? 'row-low-stock' : ''}>
                    <td>
                      <div className="product-name-cell">
                        {p.imageUrl && <img src={p.imageUrl} className="product-thumb" />}
                        {p.name}
                      </div>
                    </td>
                    <td>{p.price} ر.س</td>
                    {mode === 'advanced' && <td>{p.cost_price ? `${p.cost_price} ر.س` : '—'}</td>}
                    <td>
                      <div className="quantity-control">
                        <button onClick={() => handleQuantityChange(p, -1, 'adjustment')}>−</button>
                        <span className={`qty-badge ${isLow ? 'qty-low' : 'qty-ok'}`}>{p.quantity}</span>
                        <button onClick={() => handleQuantityChange(p, 1, 'adjustment')}>+</button>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    {mode === 'advanced' && <td>{p.brand || '—'}</td>}
                    {mode === 'advanced' && <td>{p.barcode || '—'}</td>}
                    {mode === 'advanced' && <td>{p.weight_kg ? `${p.weight_kg} كجم` : '—'}</td>}
                    <td>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => handleEdit(p)}>تعديل</button>
                        <button className="btn-delete" onClick={() => handleDelete(p.id)}>حذف</button>
                        <button className="btn-log" onClick={() => showStockLog(p)}>📋 سجل</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={mode === 'advanced' ? 8 : 5} className="empty-row">لا توجد منتجات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال سجل الحركات */}
      {showMovementModal && selectedProductForLog && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>سجل حركات - {selectedProductForLog.name}</h2>
              <button className="modal-close" onClick={() => setShowMovementModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <table className="movements-table">
                <thead><tr><th>التاريخ</th><th>التغيير</th><th>السبب</th><th>ملاحظة</th></tr></thead>
                <tbody>
                  {(selectedProductForLog.stock_movements || []).map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString()}</td>
                      <td className={m.quantity_change > 0 ? 'positive' : 'negative'}>{m.quantity_change}</td>
                      <td>{m.reason}</td>
                      <td>{m.note}</td>
                    </tr>
                  ))}
                  {(!selectedProductForLog.stock_movements || selectedProductForLog.stock_movements.length === 0) && (
                    <tr><td colSpan={4}>لا توجد حركات مسجلة</td></tr>
                  )}
                </tbody>
              </table>
              <div className="add-movement-form">
                <h4>تسجيل حركة جديدة</h4>
                <input type="number" placeholder="الكمية (+/-)" value={movementQuantity} onChange={e => setMovementQuantity(Number(e.target.value))} />
                <select value={movementReason} onChange={e => setMovementReason(e.target.value as any)}>
                  <option value="purchase">شراء</option>
                  <option value="sale">بيع</option>
                  <option value="return">مرتجع</option>
                  <option value="adjustment">تعديل</option>
                  <option value="damage">تلف</option>
                </select>
                <input placeholder="ملاحظة" value={movementNote} onChange={e => setMovementNote(e.target.value)} />
                <button onClick={() => {
                  addStockMovement(selectedProductForLog.id, movementQuantity, movementReason, movementNote);
                  setShowMovementModal(false);
                }}>تسجيل</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال إضافة/تعديل المنتج مع تبويبات */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'تعديل المنتج' : 'منتج جديد'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-tabs">
              <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>基本信息</button>
              <button className={activeTab === 'images' ? 'active' : ''} onClick={() => setActiveTab('images')}>🖼️ الصور ({form.images.length})</button>
              <button className={activeTab === 'variants' ? 'active' : ''} onClick={() => setActiveTab('variants')}>🧬 المتغيرات ({form.variants.length})</button>
              <button className={activeTab === 'movements' ? 'active' : ''} onClick={() => setActiveTab('movements')}>📜 الحركات</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              {activeTab === 'basic' && (
                <div className="form-section">
                  <div className="form-row"><label>الاسم *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="form-grid-2">
                    <div className="form-row"><label>السعر (ريال) *</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
                    <div className="form-row"><label>الكمية *</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row"><label>التصنيف</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                    <div className="form-row"><label>الحد الأدنى للتنبيه</label><input type="number" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: Number(e.target.value) })} /></div>
                  </div>
                  <div className="form-row"><label>رابط الصورة الرئيسية</label><input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></div>
                  {mode === 'advanced' && (
                    <>
                      <div className="form-grid-2">
                        <div className="form-row"><label>الباركود</label><input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
                        <div className="form-row"><label>العلامة التجارية</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
                      </div>
                      <div className="form-grid-2">
                        <div className="form-row"><label>الوزن (كجم)</label><input type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })} /></div>
                        <div className="form-row"><label>نسبة الضريبة (%)</label><input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
                      </div>
                      <div className="form-grid-2">
                        <div className="form-row"><label>سعر التكلفة (ريال)</label><input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} /></div>
                        <div className="form-row"><label>وحدة القياس</label><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option>قطعة</option><option>كيلو</option><option>لتر</option><option>متر</option></select></div>
                      </div>
                      <div className="form-row"><label>الوصف</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                      <div className="form-row form-row-checkbox">
                        <label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> المنتج نشط</label>
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab === 'images' && mode === 'advanced' && (
                <div>
                  <div className="images-grid">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="image-item">
                        <img src={img.url} alt={`صورة ${idx+1}`} />
                        <div className="image-actions">
                          <button type="button" onClick={() => setPrimaryImage(idx)} className={img.is_primary ? 'primary' : ''}>⭐ رئيسية</button>
                          <button type="button" onClick={() => moveImage(idx, idx-1)} disabled={idx===0}>⬆️</button>
                          <button type="button" onClick={() => moveImage(idx, idx+1)} disabled={idx===form.images.length-1}>⬇️</button>
                          <button type="button" onClick={() => removeImage(idx)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="add-image">
                    <input type="url" id="newImageUrl" placeholder="رابط الصورة" />
                    <button type="button" onClick={() => {
                      const input = document.getElementById('newImageUrl') as HTMLInputElement;
                      if (input.value) addImage(input.value);
                      input.value = '';
                    }}>+ إضافة صورة</button>
                  </div>
                </div>
              )}
              {activeTab === 'variants' && mode === 'advanced' && (
                <div>
                  <button type="button" onClick={addVariant}>+ أضف متغير</button>
                  {form.variants.map((v, idx) => (
                    <div key={v.id} className="variant-item">
                      <input placeholder="السمات (مثل: {\"اللون\":\"أحمر\",\"الحجم\":\"L\"})" value={JSON.stringify(v.attributes)} onChange={e => { try { updateVariant(idx, 'attributes', JSON.parse(e.target.value)); } catch {} }} />
                      <input type="number" placeholder="السعر" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} />
                      <input type="number" placeholder="الكمية" value={v.quantity} onChange={e => updateVariant(idx, 'quantity', Number(e.target.value))} />
                      <input placeholder="SKU" value={v.sku || ''} onChange={e => updateVariant(idx, 'sku', e.target.value)} />
                      <button type="button" onClick={() => removeVariant(idx)}>حذف</button>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'movements' && mode === 'advanced' && (
                <div>
                  <table className="movements-table">
                    <thead><tr><th>التاريخ</th><th>التغيير</th><th>السبب</th><th>ملاحظة</th></tr></thead>
                    <tbody>
                      {form.stock_movements.map(m => (
                        <tr key={m.id}>
                          <td>{m.created_at ? new Date(m.created_at).toLocaleString() : 'جديد'}</td>
                          <td className={m.quantity_change > 0 ? 'positive' : 'negative'}>{m.quantity_change}</td>
                          <td>{m.reason}</td>
                          <td>{m.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : 'إضافة المنتج')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* الأنماط (CSS) */}
      <style>{`
        .products-page { padding: 24px; font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f6fb; color: #1a1a2e; }
        .products-header { display: flex; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; }
        .page-title { font-size: 24px; font-weight: 700; margin: 0; }
        .low-stock-badge { background: #fff3cd; border: 1px solid #ffc107; border-radius: 20px; padding: 4px 12px; cursor: pointer; }
        .low-stock-badge.active { background: #ffe08a; }
        .mode-toggle { padding: 8px 14px; border-radius: 22px; border: 2px solid; cursor: pointer; }
        .mode-toggle.simple { border-color: #6c757d; background: #fff; color: #6c757d; }
        .mode-toggle.advanced { border-color: #7b2d8b; background: #f3e8fa; color: #7b2d8b; }
        .btn-add { background: #4361ee; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; }
        .filters-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-input { flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; }
        .filter-select, .filter-low-btn { padding: 10px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; cursor: pointer; }
        .filter-low-btn.active { background: #fff3cd; border-color: #ffc107; }
        .table-wrapper { background: #fff; border-radius: 14px; overflow-x: auto; }
        .products-table { width: 100%; border-collapse: collapse; }
        .products-table th, .products-table td { padding: 12px; text-align: right; border-bottom: 1px solid #f3f4f6; }
        .row-low-stock td { background: #fffbeb; }
        .product-name-cell { display: flex; align-items: center; gap: 10px; }
        .product-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
        .quantity-control { display: flex; align-items: center; gap: 8px; }
        .quantity-control button { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
        .qty-badge { padding: 3px 10px; border-radius: 12px; font-weight: 600; }
        .qty-ok { background: #d1fae5; color: #065f46; }
        .qty-low { background: #fee2e2; color: #991b1b; }
        .action-btns { display: flex; gap: 6px; }
        .btn-edit, .btn-delete, .btn-log { padding: 5px 12px; border-radius: 7px; font-size: 12px; cursor: pointer; }
        .btn-edit { border: 1px solid #4361ee; background: #eef0ff; color: #4361ee; }
        .btn-delete { border: 1px solid #ef4444; background: #fff; color: #ef4444; }
        .btn-log { background: #6b7280; color: #fff; border: none; }
        .empty-row { text-align: center; color: #9ca3af; padding: 40px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
        .modal { background: #fff; border-radius: 16px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
        .modal-close { background: none; border: none; font-size: 18px; cursor: pointer; }
        .modal-tabs { display: flex; gap: 8px; padding: 0 24px; border-bottom: 1px solid #e5e7eb; }
        .modal-tabs button { padding: 10px 16px; background: none; border: none; cursor: pointer; font-weight: 500; }
        .modal-tabs button.active { color: #4361ee; border-bottom: 2px solid #4361ee; }
        .product-form { padding: 20px 24px; }
        .form-section { margin-bottom: 20px; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-row { margin-bottom: 14px; }
        .form-row label { display: block; font-weight: 600; margin-bottom: 6px; }
        .form-row input, .form-row select, .form-row textarea { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; }
        .form-row-checkbox label { display: flex; align-items: center; gap: 8px; }
        .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .image-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; text-align: center; }
        .image-item img { width: 100%; height: 100px; object-fit: cover; border-radius: 4px; }
        .image-actions { display: flex; justify-content: center; gap: 4px; margin-top: 8px; }
        .image-actions button { background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; padding: 4px 6px; font-size: 12px; }
        .image-actions button.primary { background: #fbbf24; }
        .add-image { display: flex; gap: 8px; }
        .variant-item { display: flex; flex-wrap: wrap; gap: 8px; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 8px; }
        .movements-table { width: 100%; border-collapse: collapse; }
        .movements-table td, .movements-table th { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
        .positive { color: #10b981; font-weight: bold; }
        .negative { color: #ef4444; font-weight: bold; }
        .add-movement-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .add-movement-form input, .add-movement-form select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6; }
        .btn-cancel, .btn-save { padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        .btn-cancel { border: 1px solid #d1d5db; background: #fff; }
        .btn-save { background: #4361ee; color: #fff; border: none; }
        @media (max-width: 600px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
