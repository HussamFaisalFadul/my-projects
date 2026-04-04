import { useState } from 'react';
import { Product, api } from '../api';

interface Props {
  products: Product[];
}

const emptyForm = {
  name: '',
  price: 0,
  quantity: 0,
  category: '',
  minQuantity: 5,
};

export default function Products({ products }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = products.filter(
    (p) => p.name.includes(search) || p.category.includes(search)
  );

  const handleSubmit = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const storeId = localStorage.getItem('store_id') || '';
    if (editingId) {
      await api.updateProduct(editingId, form);
    } else {
      await api.addProduct({ ...form, storeId });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      minQuantity: product.minQuantity,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await api.deleteProduct(id);
  };

  const handleQuantityChange = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta);
    await api.updateProduct(product.id, { quantity: newQty });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">المنتجات ({products.length})</div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}>
          + إضافة منتج
        </button>
      </div>

      <input
        className="search-input"
        placeholder="ابحث باسم المنتج أو الفئة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>اسم المنتج</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عباية سوداء فاخرة" />
              </div>
              <div className="form-group">
                <label>الفئة</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: عبايات" />
              </div>
              <div className="form-group">
                <label>السعر (ريال)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>الكمية المتاحة</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>الحد الأدنى للتنبيه</label>
                <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div className="products-grid">
        {filtered.map((product) => (
          <div key={product.id} className={`product-card ${product.quantity === 0 ? 'out-of-stock' : product.quantity <= product.minQuantity ? 'low-stock' : ''}`}>
            <div className="product-category">{product.category}</div>
            <div className="product-name">{product.name}</div>
            <div className="product-price">{product.price} ريال</div>
            <div className="quantity-control">
              <button onClick={() => handleQuantityChange(product, -1)} disabled={product.quantity === 0}>−</button>
              <span className={`quantity ${product.quantity === 0 ? 'zero' : product.quantity <= product.minQuantity ? 'low' : ''}`}>
                {product.quantity}
              </span>
              <button onClick={() => handleQuantityChange(product, 1)}>+</button>
            </div>
            {product.quantity === 0 && <div className="stock-warning out">⛔ نفد المخزون</div>}
            {product.quantity > 0 && product.quantity <= product.minQuantity && <div className="stock-warning low">⚠️ مخزون منخفض</div>}
            <div className="product-actions">
              <button className="btn-edit" onClick={() => handleEdit(product)}>تعديل</button>
              <button className="btn-delete" onClick={() => handleDelete(product.id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty">لا توجد منتجات — أضف منتجك الأول!</div>}
    </div>
  );
}
