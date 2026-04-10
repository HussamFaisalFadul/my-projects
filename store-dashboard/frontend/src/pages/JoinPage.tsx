import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface InviteInfo {
  email: string;
  role: string;
  storeName: string;
  storeId: string;
  expiresAt: string;
}

export default function JoinPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'info' | 'wrong_email' | 'success' | 'error'>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [message, setMessage] = useState('');
  const [accepting, setAccepting] = useState(false);

  const token = window.location.pathname.split('/join/')[1];
  const authToken = localStorage.getItem('store_token');
  const currentUser = JSON.parse(localStorage.getItem('store_user') || 'null');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage(t('join.invalidLink')); return; }

    // جلب تفاصيل الدعوة أولاً
    fetch(`${BACKEND}/stores/join/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('error'); setMessage(data.error); return; }
        setInviteInfo(data);

        if (!authToken) {
          // حفظ التوكن للرجوع إليه بعد تسجيل الدخول
          localStorage.setItem('pending_join_token', token);
          setStatus('info');
          return;
        }

        // التحقق من الإيميل
        if (currentUser?.email?.toLowerCase() !== data.email.toLowerCase()) {
          setStatus('wrong_email');
          return;
        }

        setStatus('info');
      })
      .catch(() => { setStatus('error'); setMessage(t('join.connectionError')); });
  }, [t]);

  const handleAccept = async () => {
    if (!authToken) {
      localStorage.setItem('pending_join_token', token);
      window.location.href = '/';
      return;
    }
    setAccepting(true);
    try {
      const res = await fetch(`${BACKEND}/stores/join/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('store_id', data.storeId);
        localStorage.setItem('store_name', data.storeName);
        localStorage.removeItem('pending_join_token');
        setStatus('success');
        setMessage(t('join.acceptSuccess', { storeName: data.storeName, role: data.role }));
        setTimeout(() => { window.location.href = '/'; }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || t('join.acceptFailed'));
      }
    } catch { setStatus('error'); setMessage(t('join.connectionError')); }
    setAccepting(false);
  };

  const handleLoginFirst = () => {
    localStorage.setItem('pending_join_token', token);
    window.location.href = '/';
  };

  const styles = {
    page: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb', fontFamily: 'Tajawal, sans-serif' } as React.CSSProperties,
    card: { textAlign: 'center' as const, padding: '2.5rem', background: 'white', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', maxWidth: 420, width: '90%' },
    btn: { display: 'block', width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16, marginTop: 12 } as React.CSSProperties,
    btnOutline: { display: 'block', width: '100%', padding: '12px', background: 'white', color: '#444', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 16, marginTop: 8 } as React.CSSProperties,
  };

  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.card}>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2>{t('join.verifying')}</h2>
          </>
        )}

        {status === 'info' && inviteInfo && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ marginBottom: 8 }}>{t('join.inviteTitle')}</h2>
            <p style={{ color: '#888', marginBottom: 20 }}>
              {t('join.inviteDescription')}
            </p>
            <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>🏪 {inviteInfo.storeName}</div>
              <div style={{ marginTop: 8, color: '#2563eb', fontWeight: 600 }}>{t('join.asRole', { role: inviteInfo.role })}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>{t('join.forEmail', { email: inviteInfo.email })}</div>
            </div>

            {!authToken ? (
              <>
                <p style={{ color: '#f59e0b', fontSize: 14, marginBottom: 12 }}>{t('join.loginRequired', { email: inviteInfo.email })}</p>
                <button style={styles.btn} onClick={handleLoginFirst}>
                  {t('join.loginToProceed')}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
                  {t('join.currentAccount')} <strong>{currentUser?.email}</strong>
                </p>
                <button style={styles.btn} onClick={handleAccept} disabled={accepting}>
                  {accepting ? t('common.loading') : t('join.accept')}
                </button>
                <button style={styles.btnOutline} onClick={() => window.location.href = '/'}>
                  {t('join.decline')}
                </button>
              </>
            )}
          </>
        )}

        {status === 'wrong_email' && inviteInfo && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: '#f59e0b', marginBottom: 8 }}>{t('join.emailMismatch')}</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>
              {t('join.emailMismatchDesc', { email: inviteInfo.email })}
            </p>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
              {t('join.currentAccountEmail', { email: currentUser?.email })}
            </p>
            <button style={styles.btn} onClick={() => {
              localStorage.removeItem('store_token');
              localStorage.removeItem('store_user');
              localStorage.removeItem('store_id');
              localStorage.removeItem('store_name');
              localStorage.setItem('pending_join_token', token);
              window.location.href = '/';
            }}>
              {t('join.logoutAndLogin')}
            </button>
            <button style={styles.btnOutline} onClick={() => window.location.href = '/'}>
              {t('join.backToStore')}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎊</div>
            <h2 style={{ color: '#059669' }}>{message}</h2>
            <p style={{ color: '#888', marginTop: 8 }}>{t('join.redirecting')}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#dc2626', marginBottom: 16 }}>{message}</h2>
            <button style={styles.btn} onClick={() => window.location.href = '/'}>
              {t('join.backToHome')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
