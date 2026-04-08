import { useEffect, useState } from 'react';
import './Storefront.css';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export default function Storefront() {
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
    fetch(`${BACKEND}/api/public/stores/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setStore(data);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="storefront-loading">جاري تحميل المتجر...</div>;
  if (error) return <div className="storefront-error">حدث خطأ: {error}</div>;
  if (!store) return <div className="storefront-error">المتجر غير موجود</div>;

  return (
    <div className="storefront" dir="rtl">
      <div className="storefront-header">
        <div className="store-logo">
          {store.logo_url ? <img src={store.logo_url} alt={store.name} /> : <span>🏪</span>}
          <h1>{store.name}</h1>
        </div>
      </div>
      {store.description && <p className="store-description">{store.description}</p>}
      <div className="products-grid">
        {store.products && store.products.length > 0 ? (
          store.products.map((product: Product) => (
            <div key={product.id} className="product-card">
              {product.image_url && <img src={product.image_url} alt={product.name} />}
              <h3>{product.name}</h3>
              <p className="price">{product.price} ريال</p>
              <p className="stock">المتبقي: {product.quantity}</p>
            </div>
          ))
        ) : (
          <p className="no-products">لا توجد منتجات متاحة حالياً</p>
        )}
      </div>
    </div>
  );
}
