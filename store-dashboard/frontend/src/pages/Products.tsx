import { useState, useEffect, useCallback } from 'react';
import { Product, api } from '../api';

// ─── توسيع واجهة Product لتشمل الحقول الجديدة (اختيارية للتوافق) ───
interface ExtendedProduct extends Product {
  sku?: string;
  description?: string;
  cost_price?: number;
  unit?: string;
  category_id?: string;
  supplier_id?: string;
  is_active?: boolean;
  image_url?: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Props {
  products: ExtendedProduct[];  // نفس الـ prop القديم لكن مع حقول إضافية اختيارية
}

const emptyForm = {
  name: '',
  price: 0,
  quantity: 0,
  category: '',
  minQuantity: 5,
  sku: '',
  description: '',
  cost_price: 0,
  unit: 'قطعة',
  category_id: '',
  supplier_id: '',
  is_active: true,
  image_url: '',
};

export default function Products({ products: externalProducts }: Props) {
  // ─── وضع التشغيل (بسيط / متقدم) ───
  const [mode, setMode] = useState<'simple' | 'advanced'>(
    () => (localStorage.getItem('products_mode') as 'simple' | 'advanced') || 'simple'
  );

  // ─── البيانات ───
  const [products, setProducts] = useState<ExtendedProduct[]>(externalProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // ─── حالة النافذة المنبثقة ───
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ─── البحث والفلترة ───
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // ─── تحديث المنتجات عندما تتغير الـ props من الخارج ───
  useEffect(() => {
    setProducts(externalProducts);
  }, [externalProducts]);

  // ─── جلب التصنيفات والموردين (فقط في الوضع المتقدم) ───
  const fetchAdvancedData = useCallback(async () => {
    if (mode !== 'advanced') return;
    try {
      const storeId = localStorage.getItem('store_id');
      const token = localStorage.getItem('store_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(storeId && { 'x-store-id': storeId }),
      };
      const [catRes, supRes] = await Promise.all([
        fetch('https://store-dashboard-backend.onrender.com/api/categories', { headers }),
        fetch('https://store-dashboard-backend.onrender.com/api/suppliers', { headers }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
    } catch (error) {
      console.error('فشل تحميل البيانات المتقدمة', error);
    }
  }, [mode]);

  useEffect(() => {
    fetchAdvancedData();
  }, [fetchAdvancedData]);

  // ─── تبديل الوضع ───
  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'advanced' : 'simple';
    setMode(newMode);
    localStorage.setItem('products_mode', newMode);
  };

  // ─── فتح النموذج للإضافة ───
  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  // ─── فتح النموذج للتعديل ───
  const handleEdit = (product: ExtendedProduct) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category || '',
      minQuantity: product.minQuantity || 5,
      sku: product.sku || '',
      description: product.description || '',
      cost_price: product.cost_price || 0,
      unit: product.unit || 'قطعة',
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      is_active: product.is_active !== false,
      image_url: product.image_url || '',
    });
    setShowForm(true);
  };

  // ─── حفظ المنتج (إضافة أو تعديل) ───
  const handleSubmit = async () => {
    if (!form.name || form.price <= 0) return;
    setSaving(true);
    const storeId = localStorage.getItem('store_id') || '';

    // تحضير الكائن حسب الوضع (بسيط أو متقدم)
    const baseProduct = {
      name: form.name,
      price: form.price,
      quantity: form.quantity,
      category: form.category,
      minQuantity: form.minQuantity,
      storeId,
    };

    let productToSend: any = baseProduct;
    if (mode === 'advanced') {
      productToSend = {
        ...baseProduct,
        sku: form.sku || undefined,
        description: form.description || undefined,
        cost_price: form.cost_price || undefined,
        unit: form.unit,
        category_id: form.category_id || undefined,
        supplier_id: form.supplier_id || undefined,
        is_active: form.is_active,
        image_url: form.image_url || undefined,
      };
    } else {
      // في الوضع البسيط نضيف الصورة فقط إذا وجدت
      if (form.image_url) productToSend.image_url = form.image_url;
    }

    try {
      if (editingId) {
        await api.updateProduct(editingId, productToSend);
      } else {
        await api.addProduct(productToSend);
      }
      // تحديث القائمة: نطلب من المكون الأب إعادة التحميل (لأننا لا نتحكم بـ props)
      // يمكننا أيضاً تحديث الحالة المحلية، لكن الأفضل إعلام الأب.
      // هنا سنقوم بإعادة جلب البيانات من خلال حدث مخصص أو يمكننا استدعاء api.getProducts
      // ولكن للتوافق، سنفترض أن المكون الأب سيعيد تحميل البيانات تلقائياً.
      // بدلاً من ذلك، سنقوم بتحديث القائمة المحلية مؤقتاً.
      // بما أننا نستقبل products كـ props، سنطلب من الأب التحديث عبر callback لو موجود.
      // للتبسيط، سنقوم بإعادة تحميل الصفحة أو نعتمد على أن الأب سيتعامل مع الأمر.
      // الحل الأمثل: إطلاق حدث مخصص (custom event) أو استدعاء دالة من السياق.
      // هنا سأقوم بتحديث الحالة المحلية (setProducts) بناءً على الاستجابة الجديدة.
      // لكن الأسهل: إعادة جلب كل المنتجات من api.
      const freshProducts = await api.getProducts(); // افتراض وجود هذه الدالة
      setProducts(freshProducts);
    } catch (error) {
      console.error('خطأ في الحفظ', error);
      alert('حدث خطأ أثناء حفظ المنتج');
    } finally {
      setSaving(false);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    }
  };

  // ─── حذف المنتج ───
  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await api.deleteProduct(id);
      const freshProducts = await api.getProducts();
      setProducts(freshProducts);
    } catch (error) {
      console.error('خطأ في الحذف', error);
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  // ─── تعديل الكمية (+ / -) ───
  const handleQuantityChange = async (product: ExtendedProduct, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta);
    try {
      await api.updateProduct(product.id, { quantity: newQty });
      const freshProducts = await api.getProducts();
      setProducts(freshProducts);
    } catch (error) {
      console.error('خطأ في تحديث الكمية', error);
      alert('فشل تحديث الكمية');
    }
  };

  // ─── فلترة المنتجات ───
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (mode === 'advanced' && p.sku?.toLowerCase().includes(search.toLowerCase())) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !filterCategory ||
      p.category === filterCategory ||
      (mode === 'advanced' && p.category_id === filterCategory);
    const matchesLowStock =
      !filterLowStock || p.quantity <= (p.minQuantity || 5);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // ─── إحصائيات للمخزون المنخفض ───
  const lowStockCount = products.filter((p) => p.quantity <= (p.minQuantity || 5)).length;

  // ─── قائمة فريدة للتصنيفات (للفلتر) ───
  const uniqueCategories = mode === 'advanced'
    ? categories.map((c) => c.name)
    : [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="products-page" dir="rtl">
      {/* ─── رأس الصفحة ─── */}
      <div className="products-header">
        <div className="header-right">
          <div className="page-title">المنتجات ({products.length})</div>
          {lowStockCount > 0 && (
            <button
              className={`low-stock-badge ${filterLowStock ? 'active' : ''}`}
              onClick={() => setFilterLowStock(!filterLowStock)}
            >
              ⚠️ {lowStockCount} منتج مخزونه منخفض
            </button>
          )}
        </div>
        <div className="header-left">
          <button className={`mode-toggle ${mode}`} onClick={toggleMode}>
            <span className="mode-icon">{mode === 'simple' ? '⚡' : '🔬'}</span>
            <span className="mode-label">{mode === 'simple' ? 'وضع بسيط' : 'وضع متقدم'}</span>
          </button>
          <button className="btn-add" onClick={openAddForm}>+ منتج جديد</button>
        </div>
      </div>

      {/* ─── شريط البحث والفلترة ─── */}
      <div className="filters-bar">
        <input
          className="search-input"
          placeholder={mode === 'advanced' ? 'ابحث باسم المنتج أو SKU...' : 'ابحث باسم المنتج أو الفئة...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {uniqueCategories.map((cat, idx) => (
            <option key={idx} value={cat as string}>
              {cat}
            </option>
          ))}
        </select>
        <button
          className={`filter-low-btn ${filterLowStock ? 'active' : ''}`}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          {filterLowStock ? '✅' : '⚠️'} مخزون منخفض
        </button>
      </div>

      {/* ─── عرض المنتجات في جدول ─── */}
      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>السعر</th>
              {mode === 'advanced' && <th>سعر التكلفة</th>}
              <th>المخزون</th>
              <th>التصنيف</th>
              {mode === 'advanced' && <th>المورد</th>}
              {mode === 'advanced' && <th>SKU</th>}
              {mode === 'advanced' && <th>الحالة</th>}
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={mode === 'advanced' ? 8 : 5} className="empty-row">
                  لا توجد منتجات — أضف منتجك الأول!
                </td>
              </tr>
            )}
            {filteredProducts.map((product) => {
              const isLowStock = product.quantity <= (product.minQuantity || 5);
              const supplierName = suppliers.find((s) => s.id === product.supplier_id)?.name;
              const categoryName =
                categories.find((c) => c.id === product.category_id)?.name ||
                product.category ||
                '—';

              return (
                <tr key={product.id} className={isLowStock ? 'row-low-stock' : ''}>
                  <td>
                    <div className="product-name-cell">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="product-thumb" />
                      )}
                      <div>
                        <div className="product-name">{product.name}</div>
                        {mode === 'advanced' && product.description && (
                          <div className="product-desc">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="price-cell">{product.price} ر.س</td>
                  {mode === 'advanced' && (
                    <td className="cost-cell">
                      {product.cost_price ? `${product.cost_price} ر.س` : '—'}
                    </td>
                  )}
                  <td>
                    <div className="quantity-control">
                      <button onClick={() => handleQuantityChange(product, -1)} disabled={product.quantity === 0}>−</button>
                      <span className={`qty-badge ${isLowStock ? 'qty-low' : 'qty-ok'}`}>
                        {product.quantity} {mode === 'advanced' && product.unit ? product.unit : ''}
                      </span>
                      <button onClick={() => handleQuantityChange(product, 1)}>+</button>
                    </div>
                  </td>
                  <td>{categoryName}</td>
                  {mode === 'advanced' && <td>{supplierName || '—'}</td>}
                  {mode === 'advanced' && <td className="sku-cell">{product.sku || '—'}</td>}
                  {mode === 'advanced' && (
                    <td>
                      <span className={`status-dot ${product.is_active !== false ? 'active' : 'inactive'}`}>
                        {product.is_active !== false ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                  )}
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => handleEdit(product)}>تعديل</button>
                      <button className="btn-delete" onClick={() => handleDelete(product.id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── نافذة إضافة / تعديل المنتج ─── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
              <div className="modal-mode-tag">{mode === 'simple' ? '⚡ وضع بسيط' : '🔬 وضع متقدم'}</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="product-form">
              {/* ─── الحقول الأساسية (تظهر في كلا الوضعين) ─── */}
              <div className="form-section">
                {mode === 'advanced' && <div className="section-label">المعلومات الأساسية</div>}
                <div className="form-row">
                  <label>اسم المنتج *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: قميص قطني"
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label>السعر (ريال) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-row">
                    <label>الكمية *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label>التصنيف</label>
                    {mode === 'advanced' && categories.length > 0 ? (
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      >
                        <option value="">— اختر تصنيفاً —</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        placeholder="مثال: ملابس"
                      />
                    )}
                  </div>
                  <div className="form-row">
                    <label>الحد الأدنى للتنبيه</label>
                    <input
                      type="number"
                      min="0"
                      value={form.minQuantity}
                      onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <label>رابط الصورة</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* ─── الحقول المتقدمة (تظهر فقط في الوضع المتقدم) ─── */}
              {mode === 'advanced' && (
                <div className="form-section advanced-section">
                  <div className="section-label">🔬 معلومات متقدمة</div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>سعر التكلفة (ريال)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_price}
                        onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-row">
                      <label>وحدة القياس</label>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      >
                        {['قطعة', 'كيلو', 'غرام', 'لتر', 'متر', 'صندوق', 'حبة', 'زوج'].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label>رمز SKU</label>
                      <input
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="مثال: PROD-001"
                        style={{ direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>
                    <div className="form-row">
                      <label>المورد</label>
                      <select
                        value={form.supplier_id}
                        onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                      >
                        <option value="">— بدون مورد —</option>
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>الوصف</label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="وصف المنتج..."
                    />
                  </div>
                  <div className="form-row form-row-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      />
                      المنتج نشط (يظهر في الطلبات)
                    </label>
                  </div>
                  {form.cost_price > 0 && form.price > 0 && (
                    <div className="profit-preview">
                      💰 هامش الربح: {(form.price - form.cost_price).toFixed(2)} ر.س (
                      {(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}%)
                    </div>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── الأنماط (CSS مدمجة) ─── */}
      <style>{`
        /* جميع الأنماط من الملف الجديد مع تعديلات بسيطة للتوافق */
        .products-page {
          padding: 24px;
          font-family: 'Segoe UI', Tahoma, sans-serif;
          color: #1a1a2e;
          min-height: 100vh;
          background: #f4f6fb;
        }
        .products-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .page-title { font-size: 24px; font-weight: 700; margin: 0; }
        .low-stock-badge {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffc107;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .low-stock-badge.active, .low-stock-badge:hover { background: #ffe08a; }
        .mode-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 22px;
          border: 2px solid;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }
        .mode-toggle.simple {
          border-color: #6c757d;
          background: #fff;
          color: #6c757d;
        }
        .mode-toggle.advanced {
          border-color: #7b2d8b;
          background: #f3e8fa;
          color: #7b2d8b;
        }
        .btn-add {
          background: #4361ee;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .filters-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-input {
          flex: 1;
          min-width: 180px;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          background: #fff;
        }
        .filter-select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
        }
        .filter-low-btn {
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
        }
        .filter-low-btn.active {
          background: #fff3cd;
          border-color: #ffc107;
        }
        .table-wrapper {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 1px 8px rgba(0,0,0,0.07);
          overflow-x: auto;
        }
        .products-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .products-table th {
          padding: 14px 16px;
          text-align: right;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: #6b7280;
        }
        .products-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .row-low-stock td { background: #fffbeb !important; }
        .product-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .product-thumb {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e5e7eb;
        }
        .product-name { font-weight: 600; }
        .product-desc { font-size: 12px; color: #9ca3af; }
        .price-cell { font-weight: 600; color: #059669; }
        .cost-cell { color: #6b7280; }
        .sku-cell { font-family: monospace; direction: ltr; }
        .quantity-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .quantity-control button {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #fff;
          cursor: pointer;
          font-weight: bold;
        }
        .qty-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
        }
        .qty-ok { background: #d1fae5; color: #065f46; }
        .qty-low { background: #fee2e2; color: #991b1b; }
        .status-dot {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-dot.active { background: #d1fae5; color: #065f46; }
        .status-dot.inactive { background: #f3f4f6; color: #6b7280; }
        .action-btns { display: flex; gap: 6px; }
        .btn-edit, .btn-delete {
          padding: 5px 12px;
          border-radius: 7px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-edit {
          border: 1px solid #4361ee;
          color: #4361ee;
          background: #eef0ff;
        }
        .btn-edit:hover { background: #4361ee; color: #fff; }
        .btn-delete {
          border: 1px solid #ef4444;
          color: #ef4444;
          background: #fff;
        }
        .btn-delete:hover { background: #ef4444; color: #fff; }
        .empty-row { text-align: center; color: #9ca3af; padding: 40px; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-header {
          display: flex;
          align-items: center;
          padding: 20px 24px 0;
          gap: 10px;
        }
        .modal-header h2 { margin: 0; font-size: 18px; flex: 1; }
        .modal-mode-tag {
          font-size: 12px;
          padding: 3px 10px;
          border-radius: 20px;
          background: #f3f4f6;
          color: #6b7280;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #9ca3af;
        }
        .product-form { padding: 20px 24px 24px; }
        .form-section { margin-bottom: 20px; }
        .advanced-section {
          border-top: 1px dashed #e5e7eb;
          padding-top: 16px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          color: #7b2d8b;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .form-row { margin-bottom: 14px; }
        .form-row label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .form-row input, .form-row select, .form-row textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .form-row-checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .profit-preview {
          background: #d1fae5;
          color: #065f46;
          padding: 10px 14px;
          border-radius: 10px;
          margin-top: 4px;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }
        .btn-cancel, .btn-save {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-cancel {
          border: 1px solid #d1d5db;
          background: #fff;
        }
        .btn-save {
          border: none;
          background: #4361ee;
          color: #fff;
        }
        @media (max-width: 600px) {
          .form-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
