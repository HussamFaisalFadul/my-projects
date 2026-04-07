import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Store, api } from '../api'; // استيراد الواجهة والدالة من api.ts

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

interface CartItem extends Product {
  cartQuantity: number;
}

export default function Storefront() {
  // استخدام slug ليطابق المعرف في الرابط
  const { slug } = useParams<{ slug: string }>(); 
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        // جلب بيانات المتجر بناءً على المعرف (ID أو Slug)
        const data = await api.getStoreById(slug);
        setStore(data);
      } catch (err) {
        console.error("Error fetching store:", err);
        setError("تعذر تحميل بيانات المتجر");
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [slug]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>جاري تحميل المتجر...</div>;
  if (error || !store) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error || "المتجر غير موجود"}</div>;

  return (
    <div className="storefront-container" dir="rtl" style={{ padding: '20px', fontFamily: 'Tajawal, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        {store.logoUrl && (
          <img src={store.logoUrl} alt={store.name} style={{ width: '100px', borderRadius: '50%' }} />
        )}
        <h1>{store.name}</h1>
        <p>{store.description}</p>
      </header>
      
      {/* حل الخطأ TS2339: الآن TypeScript يعرف owner_phone لأننا أضفناه في api.ts */}
      {store.owner_phone && (
        <div className="contact-info" style={{ 
          background: '#e1ffc7', 
          padding: '15px', 
          borderRadius: '10px', 
          display: 'inline-block',
          marginBottom: '20px'
        }}>
          <span>تواصل معنا عبر الواتساب: </span>
          <a 
            href={`https://wa.me/${store.owner_phone}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontWeight: 'bold', color: '#25d366', textDecoration: 'none' }}
          >
            {store.owner_phone}
          </a>
        </div>
      )}

      <div className="products-grid">
        {/* هنا يمكنك إضافة عرض المنتجات لاحقاً */}
        <h3>منتجاتنا</h3>
        <p style={{ color: '#666' }}>سيتم عرض المنتجات هنا قريباً...</p>
      </div>
    </div>
  );
}
