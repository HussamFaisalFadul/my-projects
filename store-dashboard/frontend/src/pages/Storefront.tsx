import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

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
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const apiUrl = `https://store-dashboard-backend.onrender.com/api/public/stores/${slug}`;
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

  if (loading) return <div>جاري تحميل المتجر...</div>;
  if (error) return <div>حدث خطأ: {error}</div>;
  if (!store) return <div>المتجر غير موجود</div>;

  return (
    <div>
      <h1>{store.name}</h1>
      {store.products && store.products.map((p: any) => (
        <div key={p.id}>
          <h3>{p.name}</h3>
          <p>{p.price} ريال</p>
        </div>
      ))}
    </div>
  );
}
