import { Product, Order } from './types';
import { db } from './database';

// تحليل المخزون وتقديم اقتراحات ذكية
export function analyzeInventory(product: Product): string | null {
  if (product.quantity === 0) {
    return `⚠️ "${product.name}" نفد المخزون تماماً! أوقف الإعلان عنه فوراً.`;
  }

  if (product.quantity <= product.minQuantity) {
    const daysLeft = estimateDaysLeft(product);
    return `🔔 "${product.name}" وصل للحد الأدنى — متبقي ${product.quantity} قطعة فقط. ${
      daysLeft > 0 ? `يُقدَّر نفادها خلال ${daysLeft} أيام.` : 'اطلب كمية جديدة الآن!'
    }`;
  }

  return null;
}

// تقدير عدد الأيام المتبقية حسب معدل المبيعات
function estimateDaysLeft(product: Product): number {
  const soldCount = db.soldCounts[product.id] || 0;
  if (soldCount === 0) return 0;

  // معدل مبسط — يمكن تحسينه لاحقاً
  const dailyRate = soldCount / 30;
  if (dailyRate === 0) return 0;
  return Math.ceil(product.quantity / dailyRate);
}

// اقتراح أفضل وقت للعرض بناءً على الطلبات
export function suggestBestSellingTime(orders: Order[]): string {
  const hourCounts: Record<number, number> = {};

  orders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const bestHour = Object.entries(hourCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  if (!bestHour) return 'لا توجد بيانات كافية بعد.';

  const hour = parseInt(bestHour[0]);
  const period = hour < 12 ? 'صباحاً' : hour < 17 ? 'ظهراً' : 'مساءً';
  return `أفضل وقت للنشر على الإنستغرام هو الساعة ${hour} ${period} — معظم طلباتك تأتي في هذا الوقت.`;
}

// تحليل المصدر الأكثر مبيعاً
export function analyzeTopSource(orders: Order[]): string {
  const sourceCounts: Record<string, number> = {};
  orders.forEach((o) => {
    sourceCounts[o.source] = (sourceCounts[o.source] || 0) + 1;
  });

  const top = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a)[0];
  if (!top) return '';

  const [source, count] = top;
  const percentage = Math.round((count / orders.length) * 100);
  return `${percentage}% من طلباتك تأتي عبر ${source} — ركّز جهودك التسويقية عليه.`;
}

// توليد تقرير نهاية اليوم
export function generateDailyReport(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = db.orders.filter(
    (o) => new Date(o.createdAt) >= today
  );
  const revenue = todayOrders.reduce((s, o) => s + o.totalPrice, 0);
  const lowStock = db.products.filter((p) => p.quantity <= p.minQuantity);

  let report = `📊 تقرير اليوم:\n`;
  report += `• الطلبات: ${todayOrders.length}\n`;
  report += `• الإيرادات: ${revenue} ريال\n`;

  if (lowStock.length > 0) {
    report += `• ⚠️ منتجات تحتاج تجديد: ${lowStock.map((p) => p.name).join('، ')}\n`;
  }

  report += suggestBestSellingTime(db.orders);

  return report;
}
