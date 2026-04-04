
import { useEffect } from 'react';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export default function AuthCallback({ onLogin }: Props) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const role = params.get('role');

    if (token && name) {
      onLogin(token, { name, email, role });
      window.location.href = '/';
    } else {
      window.location.href = '/login?error=google';
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Tajawal, sans-serif' }}>
      <p>جاري تسجيل الدخول...</p>
    </div>
  );
}
