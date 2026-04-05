import { useState } from 'react';
import { StoreStats, Notification, Order, Product } from '../api';
import { api } from '../api';

interface Props {
  stats: StoreStats | null;
  notifications: Notification[];
  orders: Order[];
  products: Product[];
}

export default function Dashboard({ stats, notifications, orders, products }: Props) {
  const [report, setReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchReport = async () => {
    setLoadingReport(true);
    const data = await api.getReport();
    setReport(data.report);
    setLoadingReport(false);
  };

  const recentOrders = orders.slice(0, 5);
  const lowStock = products.filter((p) => p.quantity <= p.minQuantity);

  return (
    <div className="page">
      <div className="page-title">لوحة التحكم</div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-num">{stats?.totalProducts ?? 0}</div>
          <div className="stat-label">إجمالي المنتجات</div>
        </div>
        <div className="stat-card green">
          <div className="stat-num">{stats?.todayOrders ?? 0}</div>
          <div className="stat-label">طلبات اليوم</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-num">{stats?.todayRevenue ?? 0} ر</div>
          <div className="stat-label">إيرادات اليوم</div>
        </div>
        <div className="stat-card red">
          <div className="stat-num">{stats?.lowStockProducts?.length ?? 0}</div>
          <div className="stat-label">منتجات تحتاج تجديد</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">آخر الطلبات</div>
          {recentOrders.length === 0 ? (
            <div className="empty">لا توجد طلبات بعد</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>الزبون</th><th>المصدر</th><th>المبلغ</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.customerName}</td>
                    <td><span className={`source-badge ${o.source === 'واتساب' ? 'whatsapp' : o.source === 'انستغرام' ? 'instagram' : 'direct'}`}>{o.source}</span></td>
                    <td>{o.totalPrice} ر</td>
                    <td><span className={`status-badge ${o.status === 'مكتمل' ? 'done' : o.status === 'جديد' ? 'new' : o.status === 'ملغي' ? 'cancelled' : 'pending'}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-title">⚠️ تحذيرات المخزون</div>
          {lowStock.length === 0 ? (
            <div className="empty success-msg">✅ المخزون بخير!</div>
          ) : (
            lowStock.map((p) => (
              <div key={p.id} className="low-stock-item">
                <div className="low-stock-name">{p.name}</div>
                <div className={`low-stock-qty ${p.quantity === 0 ? 'zero' : 'low'}`}>
                  {p.quantity === 0 ? 'نفد!' : `${p.quantity} قطعة`}
                </div>
              </div>
            ))
          )}

          <div className="ai-section">
            <button className="ai-btn" onClick={fetchReport} disabled={loadingReport}>
              {loadingReport ? 'جاري التحليل...' : '🤖 تقرير الذكاء الاصطناعي'}
            </button>
            {report && (
              <div className="ai-report">
                {report.split('\n').map((line, i) => (<div key={i}>{line}</div>))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
