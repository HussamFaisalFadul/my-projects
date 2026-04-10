import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, Supplier } from '../api';

const toNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const fmt = (value: any, digits = 0): string => {
  return toNumber(value).toFixed(digits);
};

export default function Suppliers() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    console.log('Suppliers MOUNTED');
    return () => console.log('Suppliers UNMOUNTED');
  }, []);

  const normalize = (arr: any[]) =>
    (Array.isArray(arr) ? arr : []).map(s => ({
      ...s,
      balance: toNumber(s.balance),
      products_count: toNumber(s.products_count),
      total_stock_value: toNumber(s.total_stock_value),
    }));

  useEffect(() => {
    let isMounted = true;
    const loadSuppliers = async () => {
      setLoading(true);
      try {
        const data = await api.getSuppliers();
        if (isMounted) setSuppliers(normalize(data));
      } catch (err) {
        console.error(t('suppliers.loadError'), err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadSuppliers();
    return () => { isMounted = false; };
  }, [t]);

  const loadSupplierDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('store_token');
      const storeId = localStorage.getItem('store_id');
      const res = await fetch(`https://store-dashboard-backend.onrender.com/suppliers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-store-id': storeId || '',
        },
      });
      const data = await res.json();
      if (data) {
        data.balance = toNumber(data.balance);
        if (data.products) {
          data.products = data.products.map((p: any) => ({
            ...p,
            price: toNumber(p.price),
            cost_price: toNumber(p.cost_price),
            quantity: toNumber(p.quantity),
          }));
        }
      }
      setSelectedSupplier(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateSupplier(editingId, form);
      } else {
        await api.addSupplier(form);
      }
      const data = await api.getSuppliers();
      setSuppliers(normalize(data));
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    } catch (err) {
      console.error(t('suppliers.saveError'), err);
      alert(t('suppliers.saveErrorMsg'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('suppliers.deleteConfirm'))) return;
    try {
      await api.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
    } catch (err) {
      console.error(t('suppliers.deleteError'), err);
      alert(t('suppliers.deleteErrorMsg'));
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = toNumber(suppliers.reduce((sum, s) => sum + toNumber(s.balance), 0));
  const totalProducts = toNumber(suppliers.reduce((sum, s) => sum + toNumber(s.products_count), 0));
  const totalValue = toNumber(suppliers.reduce((sum, s) => sum + toNumber(s.total_stock_value), 0));

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  return (
    <div dir="rtl" style={{ padding: 24, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100%' }}>
      {/* رأس الصفحة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>🏭 {t('suppliers.title')}</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>{t('suppliers.subtitle')}</p>
        </div>
        <button
          onClick={() => { setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setEditingId(null); setShowForm(true); }}
          style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}
        >
          + {t('suppliers.addSupplier')}
        </button>
      </div>

      {/* إحصائيات سريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: '🏭', label: t('suppliers.count'), value: suppliers.length, unit: '' },
          { icon: '📦', label: t('suppliers.totalProducts'), value: totalProducts, unit: '' },
          { icon: '💰', label: t('suppliers.totalStockValue'), value: fmt(totalValue), unit: ' ر.س' },
          { icon: '💳', label: t('suppliers.balanceDue'), value: fmt(totalBalance), unit: ' ر.س', color: totalBalance > 0 ? '#dc2626' : '#059669' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}{card.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* القائمة */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('suppliers.searchPlaceholder')}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif', fontSize: 14, background: 'white' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(supplier => (
              <div
                key={supplier.id}
                onClick={() => loadSupplierDetails(supplier.id)}
                style={{
                  background: 'white', borderRadius: 14, padding: 16, cursor: 'pointer',
                  border: `2px solid ${selectedSupplier?.id === supplier.id ? '#2563eb' : '#e2e8f0'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🏭 {supplier.name}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                      {supplier.phone && <span>📞 {supplier.phone}</span>}
                      {supplier.email && <span>✉️ {supplier.email}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {toNumber(supplier.products_count)} {t('suppliers.productsCountLabel')}
                      </span>
                      <span style={{ background: '#f0fdf4', color: '#059669', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {fmt(supplier.total_stock_value)} {t('suppliers.valueLabel')}
                      </span>
                      {toNumber(supplier.balance) > 0 && (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {fmt(supplier.balance)} {t('suppliers.dueLabel')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(supplier); }}
                      style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                    >{t('common.edit')}</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(supplier.id); }}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                    >{t('common.delete')}</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 16, color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
                <p>{t('suppliers.noSuppliers')}</p>
              </div>
            )}
          </div>
        </div>

        {/* تفاصيل المورد */}
        {selectedSupplier && (
          <div style={{ width: 340, background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>🏭 {selectedSupplier.name}</h3>
              <button onClick={() => setSelectedSupplier(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {selectedSupplier.phone && <div><span style={{ color: '#64748b', fontSize: 13 }}>📞 {t('suppliers.phone')}:</span> <strong>{selectedSupplier.phone}</strong></div>}
              {selectedSupplier.email && <div><span style={{ color: '#64748b', fontSize: 13 }}>✉️ {t('suppliers.email')}:</span> <strong>{selectedSupplier.email}</strong></div>}
              {selectedSupplier.address && <div><span style={{ color: '#64748b', fontSize: 13 }}>📍 {t('suppliers.address')}:</span> <strong>{selectedSupplier.address}</strong></div>}
              {selectedSupplier.notes && <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#475569' }}>📝 {t('suppliers.notes')}: {selectedSupplier.notes}</div>}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
                {t('suppliers.relatedProducts')} ({selectedSupplier.products?.length || 0})
              </div>
              {!selectedSupplier.products?.length ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>{t('suppliers.noProducts')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                  {selectedSupplier.products.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.category} | {t('suppliers.remaining')}: {toNumber(p.quantity)}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{fmt(p.price, 2)} {t('common.currency')}</div>
                        {toNumber(p.cost_price) > 0 && <div style={{ fontSize: 11, color: '#64748b' }}>{t('suppliers.costPrice')}: {fmt(p.cost_price, 2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {toNumber(selectedSupplier.balance) > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '12px', textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>{t('suppliers.balanceDue')}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{fmt(selectedSupplier.balance)} {t('common.currency')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* نموذج إضافة/تعديل */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div dir="rtl" style={{ background: 'white', borderRadius: 20, padding: 28, width: '90%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{editingId ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: t('suppliers.nameRequired'), key: 'name', type: 'text', placeholder: t('suppliers.namePlaceholder') },
                { label: t('suppliers.phone'), key: 'phone', type: 'tel', placeholder: '05xxxxxxxx' },
                { label: t('suppliers.email'), key: 'email', type: 'email', placeholder: 'supplier@email.com' },
                { label: t('suppliers.address'), key: 'address', type: 'text', placeholder: t('suppliers.addressPlaceholder') },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{t('suppliers.notes')}</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder={t('suppliers.notesPlaceholder')}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', opacity: (saving || !form.name.trim()) ? 0.7 : 1 }}
              >
                {saving ? t('common.saving') : editingId ? t('common.saveChanges') : t('suppliers.addSupplier')}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '13px 20px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
