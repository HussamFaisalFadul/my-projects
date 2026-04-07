import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Order, Product, api } from '../api';

interface Props {
  orders: Order[];
  products: Product[];
}

export default function Orders({ orders, products }: Props) {
  const { t } = useTranslation();
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

  const filtered = filter === 'الكل' ? orders : orders.filter((o) => o.status === filter);

  const addItem = () => {
    const product = products.find((p) => p.id === form.selectedProduct);
    if (!product) return;
    const exists = form.items.find((i) => i.productId === product.id);
    if (exists) return;
    setForm({
      ...form,
      items: [...form.items, { productId: product.id, productName: product.name, quantity: form.selectedQty, price: product.price }],
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
    const storeId = localStorage.getItem('store_id') || '';
    await api.addOrder({
      storeId,
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
    setForm({ customerName: '', customerPhone: '', source: 'واتساب', notes: '', selectedProduct: '', selectedQty: 1, items: [] });
  };

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    await api.updateOrderStatus(orderId, status);
  };

  // قائمة خيارات الفلتر
  const filterOptions: (Order['status'] | 'الكل')[] = ['الكل', 'جديد', 'قيد التنفيذ', 'مكتمل', 'ملغي'];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">{t('orders.title')} ({orders.length})</div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ {t('orders.newOrder')}</button>
      </div>

      <div className="filter-row">
        {filterOptions.map((s) => (
          <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'الكل' ? t('orders.filterAll') : t(`orders.${s === 'جديد' ? 'new' : s === 'قيد التنفيذ' ? 'pending' : s === 'مكتمل' ? 'completed' : 'cancelled'}`)}
            {s !== 'الكل' && <span className="filter-count">{orders.filter((o) => o.status === s).length}</span>}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal wide">
            <div className="modal-title">{t('orders.newOrder')}</div>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('orders.customerName')}</label>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder={t('orders.customerNamePlaceholder')} />
              </div>
              <div className="form-group">
                <label>{t('orders.customerPhone')}</label>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder={t('orders.customerPhonePlaceholder')} />
              </div>
              <div className="form-group">
                <label>{t('orders.source')}</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Order['source'] })}>
                  <option value="واتساب">{t('orders.whatsapp')}</option>
                  <option value="انستغرام">{t('orders.instagram')}</option>
                  <option value="مباشر">{t('orders.direct')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('orders.notes')}</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('orders.notesPlaceholder')} />
              </div>
            </div>

            <div className="order-items-section">
              <div className="items-header">{t('orders.items')}</div>
              <div className="add-item-row">
                <select value={form.selectedProduct} onChange={(e) => setForm({ ...form, selectedProduct: e.target.value })}>
                  <option value="">{t('orders.selectProduct')}</option>
                  {products.filter((p) => p.quantity > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price} {t('common.currency')} ({t('orders.stockAvailable', { count: p.quantity })})
                    </option>
                  ))}
                </select>
                <input type="number" min={1} value={form.selectedQty} onChange={(e) => setForm({ ...form, selectedQty: Number(e.target.value) })} style={{ width: '70px' }} />
                <button className="btn-secondary" onClick={addItem}>{t('common.add')}</button>
              </div>
              {form.items.map((item) => (
                <div key={item.productId} className="order-item">
                  <span>{item.productName}</span>
                  <span>{item.quantity} × {item.price} {t('common.currency')} = {item.quantity * item.price} {t('common.currency')}</span>
                  <button className="btn-delete small" onClick={() => removeItem(item.productId)}>×</button>
                </div>
              ))}
              {form.items.length > 0 && <div className="order-total">{t('orders.total')}: {totalPrice} {t('common.currency')}</div>}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSubmit} disabled={saving || form.items.length === 0}>
                {saving ? t('common.saving') : t('orders.submitOrder')}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

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
                  {order.source === 'واتساب' ? t('orders.whatsapp') : order.source === 'انستغرام' ? t('orders.instagram') : t('orders.direct')}
                </span>
                <div className="order-price">{order.totalPrice} {t('common.currency')}</div>
              </div>
            </div>
            {order.notes && <div className="order-notes">📝 {order.notes}</div>}
            <div className="order-time">{new Date(order.createdAt).toLocaleString('ar-SA')}</div>
            <div className="order-footer">
              <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])} className={`status-select ${order.status === 'مكتمل' ? 'done' : order.status === 'جديد' ? 'new' : order.status === 'ملغي' ? 'cancelled' : 'pending'}`}>
                <option value="جديد">{t('orders.new')}</option>
                <option value="قيد التنفيذ">{t('orders.pending')}</option>
                <option value="مكتمل">{t('orders.completed')}</option>
                <option value="ملغي">{t('orders.cancelled')}</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty">{t('orders.noOrders')}</div>}
    </div>
  );
}
