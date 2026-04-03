import { useState, useEffect } from 'react';

interface Props {
  onLogin: (token: string, user: any) => void;
}

const BACKEND = 'https://store-dashboard-backend.onrender.com';

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // استقبال توكن جوجل من الرابط
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const role = params.get('role');
    if (token && name) {
      onLogin(token, { name, email, role });
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('الإيميل وكلمة المرور مطلوبان');
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
      onLogin(data.token, data.user);
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <div className="login-logo">🏪</div>
        <h1 className="login-title">لوحة تحكم المتجر</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'أهلاً بعودتك' : 'إنشاء حساب جديد'}
        </p>

        {error && <div className="login-error">{error}</div>}

        {mode === 'register' && (
          <div className="form-group">
            <label>الاسم</label>
            <input
              placeholder="اسمك الكامل"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
        )}

        <div className="form-group">
          <label>الإيميل</label>
          <input
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>كلمة المرور</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button className="btn-primary login-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'جاري التحميل...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>

        <div className="login-divider"><span>أو</span></div>

        <a href={`${BACKEND}/auth/google`} className="google-btn">
          <span className="google-icon">G</span>
          تسجيل الدخول بحساب جوجل
        </a>

        <div className="login-switch">
          {mode === 'login' ? (
            <span>ليس لديك حساب؟ <button onClick={() => setMode('register')}>إنشاء حساب</button></span>
          ) : (
            <span>عندك حساب؟ <button onClick={() => setMode('login')}>تسجيل الدخول</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
