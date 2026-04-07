import { useEffect, useState } from 'react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  description?: string;
  category?: string;
}

export default function Storefront() {
  // استخراج slug من الرابط مباشرة (لأننا لا نستخدم React Router)
  const slug = window.location.pathname.split('/store/')[1];
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      setError('رابط غير صحيح');
      setLoading(false);
      return;
    }
    const apiUrl = `${BACKEND}/api/public/stores/${slug}`;
    console.log('Fetching:', apiUrl);
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Store data:', data);
        setStore(data);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>جاري تحميل المتجر...</div>;
  if (error) return <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>حدث خطأ: {error}</div>;
  if (!store) return <div style={{ padding: 20, textAlign: 'center' }}>المتجر غير موجود</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>
      <h1>{store.name}</h1>
      {store.products && store.products.length === 0 && <p>لا توجد منتجات متاحة حالياً</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {store.products && store.products.map((product: Product) => (
          <div key={product.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
            <h3>{product.name}</h3>
            <p>{product.price} ريال</p>
            <p>المتبقي: {product.quantity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
