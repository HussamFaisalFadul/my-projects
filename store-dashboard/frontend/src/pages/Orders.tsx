import { useState } from 'react';
import { Order, Product, api } from '../api';

interface Props {
  orders: Order[];
  products: Product[];
}

export default function Orders({ orders, products }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Order['status'] | 'الكل'>('الكل');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    source: 'واتساب' as Order['source'],
    notes: '',
    selectedProduct: '',
    selectedQty: 1,
    items: [] as { productId: string; productName: string; quantity: number; price: number }[],
  });

  const filtered = filter === 'الكل'
    ? orders
    : orders.filter((o) => o.status === filter);

  const addItem = () => {
    const product = products.find((p) => p.id === form.selectedProduct);
    if (!product) return;
    const exists = form.items.find((i) => i.productId === product.id);
    if (exists) return;
    setForm({
      ...form,
      items: [...form.items, {
        productId: product.id,
        productName: product.name,
        quantity: form.selectedQty,
        price: product.price,
      }],
      selectedProduct: '',
      selectedQty: 1,
    });
  };

  const removeItem = (productId: string) => {
    setForm({ ...form, items: form.items.filter((i) => i.productId !== productId) });
  };

  const totalPrice = form.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!form.customerName || form.items.length === 0) return;
    setSaving(true);
    await api.addOrder({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      source: form.source,
      notes: form.notes,
      items: form.items,
      totalPrice,
      status: 'جديد',
    });
    setSaving(false);
    setShowForm(false);
    setForm({
      customerName: '', customerPhone: '', source: 'واتساب',
      notes: '', selectedProduct: '', selectedQty: 1, items: [],
    });
  };

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    await api.updateOrderStatus(orderId, status);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">الطلبات ({orders.length})</div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + طلب جديد
        </button>
      </div>

      {/* فلتر الحالة */}
      <div className="filter-row">
        {(['الكل', 'جديد', 'قيد التنفيذ', 'مكتمل', 'ملغي'] as const).map((s) => (
          <button
            key={s}
            className={`filter-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
            {s !== 'الكل' && (
              <span className="filter-count">
                {orders.filter((o) => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* نموذج طلب جديد */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal wide">
            <div className="modal-title">إضافة طلب جديد</div>
            <div className="form-grid">
              <div className="form-group">
                <label>اسم الزبون</label>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="أم محمد" />
              </div>
              <div className="form-group">
                <label>رقم الجوال</label>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="05xxxxxxxx" />
              </div>
              <div className="form-group">
                <label>مصدر الطلب</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Order['source'] })}>
                  <option>واتساب</option>
                  <option>انستغرام</option>
                  <option>مباشر</option>
                </select>
              </div>
              <div className="form-group">
                <label>ملاحظات</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="توصيل سريع..." />
              </div>
            </div>

            {/* إضافة منتجات للطلب */}
            <div className="order-items-section">
              <div className="items-header">المنتجات</div>
              <div className="add-item-row">
                <select
                  value={form.selectedProduct}
                  onChange={(e) => setForm({ ...form, selectedProduct: e.target.value })}
                >
                  <option value="">اختر منتجاً...</option>
                  {products.filter((p) => p.quantity > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price} ر ({p.quantity} متاح)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={form.selectedQty}
                  onChange={(e) => setForm({ ...form, selectedQty: Number(e.target.value) })}
                  style={{ width: '70px' }}
                />
                <button className="btn-secondary" onClick={addItem}>إضافة</button>
              </div>

              {form.items.map((item) => (
                <div key={item.productId} className="order-item">
                  <span>{item.productName}</span>
                  <span>{item.quantity} × {item.price} = {item.quantity * item.price} ر</span>
                  <button className="btn-delete small" onClick={() => removeItem(item.productId)}>×</button>
                </div>
              ))}

              {form.items.length > 0 && (
                <div className="order-total">الإجمالي: {totalPrice} ريال</div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSubmit} disabled={saving || form.items.length === 0}>
                {saving ? 'جاري الحفظ...' : 'تسجيل الطلب'}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* قائمة الطلبات */}
      <div className="orders-list">
        {filtered.map((order) => (
          <div key={order.id} className={`order-card ${order.status === 'مكتمل' ? 'done' : order.status === 'ملغي' ? 'cancelled' : ''}`}>
            <div className="order-header">
              <div>
                <div className="order-customer">{order.customerName}</div>
                <div className="order-phone">{order.customerPhone}</div>
              </div>
              <div className="order-meta">
                <span className={`source-badge ${order.source === 'واتساب' ? 'whatsapp' : order.source === 'انستغرام' ? 'instagram' : 'direct'}`}>
                  {order.source}
                </span>
                <div className="order-price">{order.totalPrice} ريال</div>
              </div>
            </div>

            {order.notes && (
              <div className="order-notes">📝 {order.notes}</div>
            )}

            <div className="order-time">
              {new Date(order.createdAt).toLocaleString('ar-SA')}
            </div>

            <div className="order-footer">
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                className={`status-select ${order.status === 'مكتمل' ? 'done' : order.status === 'جديد' ? 'new' : order.status === 'ملغي' ? 'cancelled' : 'pending'}`}
              >
                <option>جديد</option>
                <option>قيد التنفيذ</option>
                <option>مكتمل</option>
                <option>ملغي</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty">لا توجد طلبات في هذه الحالة</div>
      )}
    </div>
  );
}
