import { Product, Order } from './types';

export function analyzeInventory(product: Product): string | null {
  if (product.quantity === 0) {
    return `⚠️ "${product.name}" نفد المخزون تماماً! أوقف الإعلان عنه فوراً.`;
  }
  if (product.quantity <= product.minQuantity) {
    return `🔔 "${product.name}" وصل للحد الأدنى — متبقي ${product.quantity} قطعة فقط. اطلب كمية جديدة الآن!`;
  }
  return null;
}

export function suggestBestSellingTime(orders: Order[]): string {
  const hourCounts: Record<number, number> = {};
  orders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const bestHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
  if (!bestHour) return 'لا توجد بيانات كافية بعد.';
  const hour = parseInt(bestHour[0]);
  const period = hour < 12 ? 'صباحاً' : hour < 17 ? 'ظهراً' : 'مساءً';
  return `أفضل وقت للنشر على الإنستغرام هو الساعة ${hour} ${period}.`;
}

export function generateDailyReport(orders: Order[], products: Product[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
  const revenue = todayOrders.reduce((s, o) => s + o.totalPrice, 0);
  const lowStock = products.filter(p => p.quantity <= p.minQuantity);

  let report = `📊 تقرير اليوم:\n`;
  report += `• الطلبات: ${todayOrders.length}\n`;
  report += `• الإيرادات: ${revenue} ريال\n`;
  if (lowStock.length > 0) {
    report += `• ⚠️ منتجات تحتاج تجديد: ${lowStock.map(p => p.name).join('، ')}\n`;
  }
  report += suggestBestSellingTime(orders);
  return report;
}
