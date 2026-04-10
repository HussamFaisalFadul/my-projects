import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onLogin: (token: string, user: any) => void;
}

const BACKEND = 'https://store-dashboard-backend.onrender.com';

async function fetchAndSaveStore(token: string) {
  try {
    const res = await fetch(`${BACKEND}/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    const stores = await res.json();
    if (Array.isArray(stores) && stores.length > 0) {
      localStorage.setItem('store_id', stores[0].id);
      localStorage.setItem('store_name', stores[0].name);
    }
  } catch {
    // لو فشل نكمل بدون store_id
  }
}

export default function Login({ onLogin }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const role = params.get('role');
    if (token && name) {
      localStorage.setItem('store_token', token);
      localStorage.setItem('store_user', JSON.stringify({ name, email, role }));
      fetchAndSaveStore(token).then(() => {
        onLogin(token, { name, email, role });
        window.history.replaceState({}, '', '/');
      });
    }
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError(t('login.emailPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const body: any = { email: form.email, password: form.password };
      if (mode === 'register') body.name = form.name;

      const res = await fetch(`${BACKEND}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      localStorage.setItem('store_token', data.token);
      localStorage.setItem('store_user', JSON.stringify(data.user));

      await fetchAndSaveStore(data.token);

      onLogin(data.token, data.user);
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-logo">🏪</div>
        <h1 className="login-title">{t('login.title')}</h1>
        <p className="login-subtitle">
          {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
        </p>

        {error && <div className="login-error">{error}</div>}

        {mode === 'register' && (
          <div className="form-group">
            <label>{t('login.name')}</label>
            <input
              placeholder={t('login.namePlaceholder')}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
        )}

        <div className="form-group">
          <label>{t('login.email')}</label>
          <input
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>{t('login.password')}</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button className="btn-primary login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? t('common.loading') : mode === 'login' ? t('login.login') : t('login.register')}
        </button>

        <div className="login-divider"><span>{t('login.or')}</span></div>

        <a href={`${BACKEND}/auth/google?prompt=select_account`} className="google-btn">
          <span className="google-icon">G</span>
          {t('login.googleLogin')}
        </a>

        <div className="login-switch">
          {mode === 'login' ? (
            <span>{t('login.noAccount')} <button onClick={() => setMode('register')}>{t('login.register')}</button></span>
          ) : (
            <span>{t('login.haveAccount')} <button onClick={() => setMode('login')}>{t('login.login')}</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
