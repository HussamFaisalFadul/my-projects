import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'
import './i18n';  // <--- أضف هذا السطر

const BACKEND = 'https://store-dashboard-backend.onrender.com';

// معالجة auth/callback قبل تشغيل React
if (window.location.pathname === '/auth/callback') {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const name = params.get('name');
  const email = params.get('email');
  const role = params.get('role');

  if (token && name) {
    localStorage.setItem('store_token', token);
    localStorage.setItem('store_user', JSON.stringify({ name, email, role }));

    fetch(`${BACKEND}/stores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(stores => {
        if (Array.isArray(stores) && stores.length > 0) {
          localStorage.setItem('store_id', stores[0].id);
          localStorage.setItem('store_name', stores[0].name);
        }
      })
      .catch(() => {})
      .finally(() => {
        window.location.href = '/';
      });
  } else {
    window.location.href = '/';
  }
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
