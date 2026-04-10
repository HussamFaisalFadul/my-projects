import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = 'https://store-dashboard-backend.onrender.com';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export default function AuthCallback({ onLogin }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const role = params.get('role');

    if (token && name) {
      onLogin(token, { name, email, role });

      // جلب متجر المستخدم بعد تسجيل الدخول
      fetch(`${BACKEND_URL}/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
        .then(r => r.json())
        .then(stores => {
          if (Array.isArray(stores) && stores.length > 0) {
            localStorage.setItem('store_id', stores[0].id);
            localStorage.setItem('store_name', stores[0].name);
          }
          window.location.href = '/';
        })
        .catch(() => {
          window.location.href = '/';
        });
    } else {
      window.location.href = '/login?error=google';
    }
  }, [onLogin]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Tajawal, sans-serif' }}>
      <p>{t('auth.loggingIn')}</p>
    </div>
  );
}
