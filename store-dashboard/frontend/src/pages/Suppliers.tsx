import { useState, useEffect } from 'react';
import { api, Supplier } from '../api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<(Supplier & { products?: any[] }) | null>(null);
  const [search, setSearch] = useState('');

  // تحميل الموردين مرة واحدة فقط عند تحميل الصفحة
  useEffect(() => {
    let isMounted = true;
    const loadSuppliers = async () => {
      setLoading(true);
      try {
        const data = await api.getSuppliers();
        if (isMounted) setSuppliers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('فشل تحميل الموردين', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadSuppliers();
    return () => { isMounted = false; };
  }, []); // ← لا توجد تبعيات، يتم التشغيل مرة واحدة

  const loadSupplierDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('store_token');
      const storeId = localStorage.getItem('store_id');
      const res = await fetch(`${api.BACKEND_URL}/suppliers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-store-id': storeId || '',
        },
      });
      const data = await res.json();
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
      // إعادة تحميل القائمة
      const data = await api.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    } catch (err) {
      console.error('خطأ في الحفظ', err);
      alert('حدث خطأ أثناء حفظ المورد');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا المورد؟ سيتم فك ربطه بجميع المنتجات.')) return;
    try {
      await api.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
    } catch (err) {
      console.error('خطأ في الحذف', err);
      alert('حدث خطأ أثناء حذف المورد');
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

  const totalBalance = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.products_count || 0), 0);
  const totalValue = suppliers.reduce((sum, s) => sum + (s.total_stock_value || 0), 0);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>جاري التحميل...</div>;
  }

  return (
    <div dir="rtl" style={{ padding: 24, fontFamily: 'Tajawal, sans-serif', background: '#f8fafc', minHeight: '100%' }}>
      {/* رأس الصفحة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>🏭 الموردون</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>إدارة الموردين وربطهم بالمنتجات</p>
        </div>
        <button
          onClick={() => { setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setEditingId(null); setShowForm(true); }}
          style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}
        >
          + إضافة مورد
        </button>
      </div>

      {/* إحصائيات سريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🏭</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>عدد الموردين</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{suppliers.length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>إجمالي المنتجات</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalProducts}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>قيمة المخزون</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalValue.toFixed(0)} ر.س</div>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>الرصيد المستحق</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalBalance > 0 ? '#dc2626' : '#059669' }}>{totalBalance.toFixed(0)} ر.س</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* القائمة */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 بحث بالاسم أو الجوال أو الإيميل..."
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
                        {supplier.products_count || 0} منتج
                      </span>
                      <span style={{ background: '#f0fdf4', color: '#059669', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {parseFloat(String(supplier.total_stock_value || 0)).toFixed(0)} ر.س قيمة
                      </span>
                      {supplier.balance > 0 && (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {supplier.balance} ر.س مستحق
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(supplier); }}
                      style={{ padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(supplier.id); }}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 16, color: '#94a3b8' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏭</div>
                <p>لا يوجد موردون بعد</p>
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
              {selectedSupplier.phone && <div><span style={{ color: '#64748b', fontSize: 13 }}>📞 الجوال:</span> <strong>{selectedSupplier.phone}</strong></div>}
              {selectedSupplier.email && <div><span style={{ color: '#64748b', fontSize: 13 }}>✉️ الإيميل:</span> <strong>{selectedSupplier.email}</strong></div>}
              {selectedSupplier.address && <div><span style={{ color: '#64748b', fontSize: 13 }}>📍 العنوان:</span> <strong>{selectedSupplier.address}</strong></div>}
              {selectedSupplier.notes && <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#475569' }}>📝 {selectedSupplier.notes}</div>}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>المنتجات المرتبطة ({selectedSupplier.products?.length || 0})</div>
              {selectedSupplier.products?.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>لا توجد منتجات مرتبطة</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                  {selectedSupplier.products?.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.category} | متبقي: {p.quantity}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{p.price} ر.س</div>
                        {p.cost_price && <div style={{ fontSize: 11, color: '#64748b' }}>تكلفة: {p.cost_price}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedSupplier.balance > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '12px', textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>الرصيد المستحق</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>{selectedSupplier.balance} ر.س</div>
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
              <h2 style={{ margin: 0, fontSize: 20 }}>{editingId ? 'تعديل مورد' : 'إضافة مورد جديد'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>اسم المورد *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة الأمل للتوريد" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>رقم الجوال</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="supplier@email.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>العنوان</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="المدينة، الحي..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>ملاحظات</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="أي ملاحظات إضافية..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: (saving || !form.name.trim()) ? 0.7 : 1 }}>
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المورد'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '13px 20px', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
