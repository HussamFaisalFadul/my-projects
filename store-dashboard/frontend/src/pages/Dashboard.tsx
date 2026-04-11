import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreStats, Notification, Order, Product } from '../api';
import { api } from '../api';

interface Props {
  stats: StoreStats | null;
  notifications: Notification[];
  orders: Order[];
  products: Product[];
}

export default function Dashboard({ stats, notifications, orders, products }: Props) {
  const { t } = useTranslation();
  const [report, setReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const data = await api.getReport();
      setReport(data.report);
    } catch {
      setReport('حدث خطأ أثناء جلب التقرير.');
    }
    setLoadingReport(false);
  };

  const recentOrders = orders.slice(0, 5);
  const lowStock = products.filter((p) => p.quantity <= p.minQuantity);

  const sourceLabel = (s: string) => {
    if (s === 'واتساب') return { label: t('orders.whatsapp'), cls: 'whatsapp' };
    if (s === 'انستغرام') return { label: t('orders.instagram'), cls: 'instagram' };
    return { label: t('orders.direct'), cls: 'direct' };
  };

  const statusInfo = (s: string) => {
    if (s === 'جديد')        return { label: t('orders.new'),       cls: 'new' };
    if (s === 'قيد التنفيذ') return { label: t('orders.pending'),   cls: 'pending' };
    if (s === 'مكتمل')       return { label: t('orders.completed'), cls: 'done' };
    return { label: t('orders.cancelled'), cls: 'cancelled' };
  };

  return (
    <div className="page">
      <div className="page-title">📊 {t('dashboard.title')}</div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-num">{stats?.totalProducts ?? 0}</div>
          <div className="stat-label">📦 {t('dashboard.totalProducts')}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-num">{stats?.todayOrders ?? 0}</div>
          <div className="stat-label">🛒 {t('dashboard.todayOrders')}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-num">{stats?.todayRevenue ?? 0} {t('common.currency')}</div>
          <div className="stat-label">💰 {t('dashboard.todayRevenue')}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-num">{stats?.lowStockProducts?.length ?? 0}</div>
          <div className="stat-label">⚠️ {t('dashboard.lowStock')}</div>
        </div>
      </div>

      {/* Two columns */}
      <div className="two-col">
        {/* Recent orders */}
        <div className="card">
          <div className="card-title">🛒 {t('dashboard.recentOrders')}</div>
          {recentOrders.length === 0 ? (
            <div className="empty">{t('orders.noOrders')}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('orders.customerName')}</th>
                  <th>{t('orders.source')}</th>
                  <th>{t('orders.total')}</th>
                  <th>{t('orders.status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const src = sourceLabel(o.source);
                  const sts = statusInfo(o.status);
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.customerName}</td>
                      <td><span className={`source-badge ${src.cls}`}>{src.label}</span></td>
                      <td style={{ fontWeight: 700, color: '#1877f2' }}>{o.totalPrice} {t('common.currency')}</td>
                      <td><span className={`status-badge ${sts.cls}`}>{sts.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Stock alerts + AI */}
        <div className="card">
          <div className="card-title">⚠️ {t('dashboard.stockAlerts')}</div>
          {lowStock.length === 0 ? (
            <div className="empty success-msg">✅ {t('dashboard.stockOk')}</div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {lowStock.map((p) => (
                <div key={p.id} className="low-stock-item">
                  <div className="low-stock-name">{p.name}</div>
                  <div className={`low-stock-qty ${p.quantity === 0 ? 'zero' : 'low'}`}>
                    {p.quantity === 0 ? t('products.outOfStock') : `${p.quantity} ${t('products.pieces')}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ai-section">
            <button className="ai-btn" onClick={fetchReport} disabled={loadingReport}>
              {loadingReport ? `⏳ ${t('common.loading')}` : `🤖 ${t('dashboard.aiReport')}`}
            </button>
            {report && (
              <div className="ai-report">
                {report.split('\n').map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
