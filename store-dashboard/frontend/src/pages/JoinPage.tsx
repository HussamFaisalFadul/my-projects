import { useEffect, useState } from 'react';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

export default function JoinPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = window.location.pathname.split('/join/')[1];
    if (!token) { setStatus('error'); setMessage('رابط غير صحيح'); return; }

    const authToken = localStorage.getItem('store_token');
    if (!authToken) {
      // حفظ التوكن وإعادة التوجيه لتسجيل الدخول
      localStorage.setItem('join_token', token);
      window.location.href = '/';
      return;
    }

    fetch(`${BACKEND}/stores/join/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.storeId) {
          localStorage.setItem('store_id', data.storeId);
          localStorage.removeItem('join_token');
          setStatus('success');
          setMessage('تم قبول الدعوة بنجاح! جاري التوجيه...');
          setTimeout(() => { window.location.href = '/'; }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'فشل قبول الدعوة');
        }
      })
      .catch(() => { setStatus('error'); setMessage('تعذر الاتصال بالخادم'); });
  }, []);

  return (
    <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Tajawal, sans-serif', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '90%' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2>جاري قبول الدعوة...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#059669' }}>{message}</h2>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#dc2626' }}>{message}</h2>
            <button
              onClick={() => window.location.href = '/'}
              style={{ marginTop: 16, padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}
            >
              العودة للرئيسية
            </button>
          </>
        )}
      </div>
    </div>
  );
}
