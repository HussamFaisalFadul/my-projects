import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

function authHeaders() {
  const token = localStorage.getItem('store_token');
  const storeId = localStorage.getItem('store_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(storeId ? { 'x-store-id': storeId } : {}),
  };
}

// دالة مساعدة لتحويل أي قيمة إلى رقم
const toNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  barcode?: string;
  category?: string;
}

interface CartItem {
  productId: string;
  productName: string;
  barcode?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
}

interface Session {
  id: string;
  opening_cash: number;
  opened_at: string;
  opened_by_name: string;
}

interface Invoice {
  id: string;
  invoice_number: number;
  total: number;
  payment_method: string;
  created_at: string;
  items: any[];
  customer_name?: string;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'split';

export default function POS() {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [closingCash, setClosingCash] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [processing, setProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [sessionInvoices, setSessionInvoices] = useState<Invoice[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = async () => {
    setLoadingSession(true);
    try {
      const res = await fetch(`${BACKEND}/pos/sessions/current`, { headers: authHeaders() });
      const data = await res.json();
      setSession(data);
      if (data) loadSessionInvoices(data.id);
    } catch {}
    setLoadingSession(false);
  };

  const loadSessionInvoices = async (sessionId: string) => {
    try {
      const res = await fetch(`${BACKEND}/pos/sessions/${sessionId}/invoices`, { headers: authHeaders() });
      const data = await res.json();
      setSessionInvoices(Array.isArray(data) ? data : []);
    } catch {}
  };

  const openSession = async () => {
    try {
      const res = await fetch(`${BACKEND}/pos/sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ openingCash: parseFloat(openingCash) || 0 }),
      });
      const data = await res.json();
      if (data.id) {
        setSession(data);
        setShowOpenSession(false);
        setOpeningCash('');
      }
    } catch {}
  };

  const closeSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${BACKEND}/pos/sessions/${session.id}/summary`, { headers: authHeaders() });
      const summaryData = await res.json();
      setSummary(summaryData);

      await fetch(`${BACKEND}/pos/sessions/${session.id}/close`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ closingCash: parseFloat(closingCash) || 0 }),
      });
      setSession(null);
      setShowCloseSession(false);
      setCart([]);
    } catch {}
  };

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `${BACKEND}/pos/products/search?q=${encodeURIComponent(q)}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {}
    setSearching(false);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(value), 300);
  };

  const addToCart = (product: Product) => {
    if (!product || !product.id || !product.name || product.price === undefined) {
      console.error(t('pos.invalidProduct'), product);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      const unitPrice = toNumber(product.price);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * unitPrice - toNumber(i.discount),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode || '',
          unitPrice,
          quantity: 1,
          discount: 0,
          total: unitPrice,
        },
      ];
    });
    setSearch('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const updateCartItem = (index: number, field: 'quantity' | 'discount' | 'unitPrice', value: number) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: toNumber(value) };
        updated.total = toNumber(updated.quantity) * toNumber(updated.unitPrice) - toNumber(updated.discount);
        return updated;
      })
    );
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, i) => sum + toNumber(i.quantity) * toNumber(i.unitPrice), 0);
  const cartDiscount = cart.reduce((sum, i) => sum + toNumber(i.discount), 0);
  const discountAmount = discountType === 'percent'
    ? (subtotal - cartDiscount) * discountValue / 100
    : discountValue;
  const afterDiscount = subtotal - cartDiscount - discountAmount;
  const taxAmount = afterDiscount * taxRate / 100;
  const total = afterDiscount + taxAmount;
  const paid = toNumber(paidAmount);
  const change = Math.max(0, paid - total);

  const checkout = async () => {
    if (cart.length === 0) return;
    if (!session) { alert(t('pos.openSessionFirst')); return; }
    if (paymentMethod === 'cash' && paid < total) {
      alert(t('pos.insufficientPaid'));
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`${BACKEND}/pos/invoices`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: session.id,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          items: cart.map(item => ({
            ...item,
            unitPrice: toNumber(item.unitPrice),
            quantity: toNumber(item.quantity),
            discount: toNumber(item.discount),
            total: toNumber(item.total),
          })),
          subtotal: toNumber(subtotal),
          discountType,
          discountValue: toNumber(discountValue),
          discountAmount: toNumber(discountAmount + cartDiscount),
          taxRate: toNumber(taxRate),
          taxAmount: toNumber(taxAmount),
          total: toNumber(total),
          paidAmount: paymentMethod === 'cash' ? paid : total,
          changeAmount: change,
          paymentMethod,
          notes: notes || null,
        }),
      });
      const invoice = await res.json();
      if (invoice.id) {
        invoice.total = toNumber(invoice.total);
        invoice.items = (invoice.items || []).map((item: any) => ({
          ...item,
          total: toNumber(item.total),
          unitPrice: toNumber(item.unitPrice),
          quantity: toNumber(item.quantity),
        }));
        setLastInvoice(invoice);
        setShowInvoice(true);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscountValue(0);
        setTaxRate(0);
        setPaidAmount('');
        setNotes('');
        loadSessionInvoices(session.id);
      }
    } catch (err) {
      console.error(err);
      alert(t('pos.checkoutError'));
    }
    setProcessing(false);
  };

  const printInvoice = () => window.print();

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', fontFamily: 'Tajawal, sans-serif' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '2rem', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '90%' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
          <h2 style={{ marginBottom: 8 }}>{t('pos.title')}</h2>
          <p style={{ color: '#888', marginBottom: 24 }}>{t('pos.openSessionPrompt')}</p>
          {!showOpenSession ? (
            <button
              onClick={() => setShowOpenSession(true)}
              style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}
            >
              {t('pos.openSession')}
            </button>
          ) : (
            <div>
              <label style={{ display: 'block', textAlign: 'right', marginBottom: 8, fontWeight: 600 }}>{t('pos.openingCash')}</label>
              <input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, marginBottom: 12, boxSizing: 'border-box', textAlign: 'center' }}
              />
              <button
                onClick={openSession}
                style={{ width: '100%', padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}
              >
                {t('pos.startSession')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ display: 'flex', height: 'calc(100vh - 60px)', fontFamily: 'Tajawal, sans-serif', background: '#f1f5f9', overflow: 'hidden' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-invoice, #print-invoice * { visibility: visible; }
          #print-invoice { position: fixed; top: 0; left: 0; width: 80mm; }
        }
      `}</style>

      {/* الجانب الأيسر - المنتجات والبحث */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'hidden' }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            ref={searchRef}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={t('pos.searchPlaceholder')}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: '2px solid #e2e8f0', fontSize: 16, boxSizing: 'border-box',
              fontFamily: 'Tajawal, sans-serif', background: 'white',
            }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 100,
              background: 'white', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              maxHeight: 300, overflow: 'auto', marginTop: 4,
            }}>
              {searchResults.map(p => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{p.category || t('pos.general')} | {t('pos.remaining')}: {p.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 16 }}>{toNumber(p.price).toFixed(2)} {t('common.currency')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, background: 'white', borderRadius: 16, overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <p>{t('pos.emptyCart')}</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  {[t('pos.product'), t('pos.price'), t('pos.quantity'), t('pos.discount'), t('pos.total'), ''].map(h => (
                    <th key={h} style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.productName}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateCartItem(idx, 'unitPrice', parseFloat(e.target.value))}
                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => updateCartItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16 }}>−</button>
                        <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                        <button onClick={() => updateCartItem(idx, 'quantity', item.quantity + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 16 }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={e => updateCartItem(idx, 'discount', parseFloat(e.target.value))}
                        style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#2563eb' }}>
                      {toNumber(item.total).toFixed(2)} {t('common.currency')}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button onClick={() => removeFromCart(idx)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* الجانب الأيمن - الحساب والدفع */}
      <div style={{ width: 340, background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        <div style={{ padding: '12px 16px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{t('pos.openSession')}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{session.opened_by_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowHistory(!showHistory)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
              📋 {t('pos.history')} ({sessionInvoices.length})
            </button>
            <button onClick={() => setShowCloseSession(true)}
              style={{ background: '#dc2626', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
              {t('pos.closeSession')}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('pos.customerData')}</div>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('pos.customerName')}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 6, boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }} />
            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder={t('pos.customerPhone')}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('pos.discount')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}
                style={{ padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'Tajawal, sans-serif' }}>
                <option value="percent">%</option>
                <option value="fixed">{t('common.currency')}</option>
              </select>
              <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t('pos.taxRate')}</div>
            <input type="number" value={taxRate || ''} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{ width: 70, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }} />
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
            {[
              [t('pos.subtotal'), `${toNumber(subtotal).toFixed(2)} ${t('common.currency')}`],
              [t('pos.productDiscount'), `- ${toNumber(cartDiscount).toFixed(2)} ${t('common.currency')}`],
              discountAmount > 0 ? [t('pos.extraDiscount'), `- ${toNumber(discountAmount).toFixed(2)} ${t('common.currency')}`] : null,
              taxAmount > 0 ? [`${t('pos.tax')} ${taxRate}%`, `+ ${toNumber(taxAmount).toFixed(2)} ${t('common.currency')}`] : null,
            ].filter(item => item !== null).map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#64748b' }}>
                <span>{label}</span><span>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '2px solid #e2e8f0', fontWeight: 700, fontSize: 18 }}>
              <span>{t('pos.total')}</span>
              <span style={{ color: '#2563eb' }}>{toNumber(total).toFixed(2)} {t('common.currency')}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('pos.paymentMethod')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { value: 'cash', label: t('pos.cash') },
                { value: 'card', label: t('pos.card') },
                { value: 'transfer', label: t('pos.transfer') },
                { value: 'split', label: t('pos.split') },
              ].map(m => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value as PaymentMethod)}
                  style={{
                    padding: '10px', borderRadius: 10, border: '2px solid',
                    borderColor: paymentMethod === m.value ? '#2563eb' : '#e2e8f0',
                    background: paymentMethod === m.value ? '#eff6ff' : 'white',
                    color: paymentMethod === m.value ? '#2563eb' : '#374151',
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600, fontSize: 13,
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('pos.paidAmount')}</div>
              <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                placeholder={toNumber(total).toFixed(2)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 16, textAlign: 'center', boxSizing: 'border-box' }} />
              {paid >= total && paid > 0 && (
                <div style={{ marginTop: 6, padding: '8px', background: '#dcfce7', borderRadius: 8, textAlign: 'center', fontWeight: 700, color: '#166534' }}>
                  {t('pos.change')}: {toNumber(change).toFixed(2)} {t('common.currency')}
                </div>
              )}
            </div>
          )}

          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('pos.notes')}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }} />

          <button
            onClick={checkout}
            disabled={processing || cart.length === 0}
            style={{
              width: '100%', padding: '16px', background: cart.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white', border: 'none', borderRadius: 12, fontSize: 18,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
            }}>
            {processing ? t('pos.processing') : `${t('pos.completeSale')} — ${toNumber(total).toFixed(2)} ${t('common.currency')}`}
          </button>
        </div>
      </div>

      {/* نافذة الفاتورة */}
      {showInvoice && lastInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <div id="print-invoice" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 24 }}>🏪</div>
                <h3 style={{ margin: '4px 0' }}>{localStorage.getItem('store_name')}</h3>
                <div style={{ fontSize: 13, color: '#64748b' }}>{t('pos.invoice')} #{lastInvoice.invoice_number}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(lastInvoice.created_at).toLocaleString('ar-SA')}</div>
              </div>

              {lastInvoice.customer_name && (
                <div style={{ marginBottom: 12, padding: '8px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 13 }}>{t('pos.customerName')}: <strong>{lastInvoice.customer_name}</strong></div>
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 12 }}>{t('pos.product')}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center', fontSize: 12 }}>{t('pos.quantity')}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: 12 }}>{t('pos.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(lastInvoice.items || []).map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 4px', fontSize: 13 }}>{item.productName}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontSize: 13 }}>{toNumber(item.quantity)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'left', fontSize: 13 }}>{toNumber(item.total).toFixed(2)} {t('common.currency')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                  <span>{t('pos.total')}</span>
                  <span>{toNumber(lastInvoice.total).toFixed(2)} {t('common.currency')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  {t('pos.paymentMethod')}: {lastInvoice.payment_method === 'cash' ? t('pos.cash') : lastInvoice.payment_method === 'card' ? t('pos.card') : t('pos.transfer')}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
                {t('pos.thankYou')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={printInvoice}
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
                🖨️ {t('pos.print')}
              </button>
              <button onClick={() => setShowInvoice(false)}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إغلاق الجلسة */}
      {showCloseSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div dir="rtl" style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 420, width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>{t('pos.closeSession')}</h3>
            {summary && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t('pos.totalInvoices')}</span><strong>{summary.summary?.total_invoices}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t('pos.totalSales')}</span><strong>{toNumber(summary.summary?.total_sales).toFixed(2)} {t('common.currency')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{t('pos.cashSales')}</span><strong>{toNumber(summary.summary?.cash_sales).toFixed(2)} {t('common.currency')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('pos.openingCash')}</span><strong>{session?.opening_cash} {t('common.currency')}</strong>
                </div>
              </div>
            )}
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{t('pos.closingCash')}</label>
            <input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, boxSizing: 'border-box', textAlign: 'center', fontSize: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeSession}
                style={{ flex: 1, padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>
                {t('pos.closeSession')}
              </button>
              <button onClick={() => setShowCloseSession(false)}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
