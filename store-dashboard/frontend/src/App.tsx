@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

:root {
  --bg-sidebar: #0f1117;
  --bg-sidebar-hover: #1a1d27;
  --bg-main: #f4f6fa;
  --bg-card: #ffffff;
  --bg-topbar: #ffffff;

  --accent: #4f6ef7;
  --accent-light: #eef1fe;
  --accent-dark: #3a56d4;

  --success: #22c55e;
  --success-light: #dcfce7;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --danger: #ef4444;
  --danger-light: #fee2e2;
  --info: #06b6d4;
  --info-light: #cffafe;

  --text-main: #111827;
  --text-muted: #6b7280;
  --text-light: #9ca3af;
  --border: #e5e7eb;
  --border-light: #f3f4f6;

  --sidebar-width: 240px;
  --topbar-height: 60px;
  --radius: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Tajawal', sans-serif;
  background: var(--bg-main);
  color: var(--text-main);
  direction: rtl;
  min-height: 100vh;
}

/* ===== APP LAYOUT ===== */
.app {
  display: flex;
  min-height: 100vh;
}

/* ===== SIDEBAR ===== */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  height: 100vh;
  position: fixed;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  z-index: 200;
  overflow: hidden;
}

.sidebar-logo {
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.sidebar-logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.3px;
}

.sidebar-logo-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  margin-top: 2px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  text-align: right;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
}

.nav-item.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px rgba(79,110,247,0.35);
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-user:hover { background: rgba(255,255,255,0.06); }

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-info { flex: 1; min-width: 0; }

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
}

.logout-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}
.logout-btn:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

/* ===== MAIN CONTENT ===== */
.content-area {
  margin-right: var(--sidebar-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ===== TOPBAR ===== */
.topbar {
  height: var(--topbar-height);
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-main);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: var(--success-light);
  color: #15803d;
}

.status-chip.offline {
  background: var(--border-light);
  color: var(--text-muted);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  flex-shrink: 0;
}
.status-dot.offline { background: var(--text-light); }

/* ===== NOTIFICATION BUTTON ===== */
.notif-wrapper { position: relative; }

.notif-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  position: relative;
  transition: all 0.2s;
}
.notif-btn:hover { background: var(--bg-main); }

.notif-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: -20px;
  width: 320px;
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  z-index: 300;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

.notif-header {
  padding: 14px 16px;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-main);
  color: var(--text-main);
}

.notif-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.notif-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
  cursor: pointer;
}
.notif-item:hover { background: var(--bg-main); }
.notif-item:last-child { border-bottom: none; }

.notif-item.warning .notif-msg::before { content: '⚠️ '; }
.notif-item.info .notif-msg::before { content: '📦 '; }
.notif-item.success .notif-msg::before { content: '✅ '; }

.notif-msg { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.notif-time { font-size: 11px; color: var(--text-muted); }

/* ===== MAIN PAGE AREA ===== */
.main {
  flex: 1;
  padding: 24px;
}

/* ===== STATS CARDS ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-icon.blue { background: var(--accent-light); }
.stat-icon.green { background: var(--success-light); }
.stat-icon.amber { background: var(--warning-light); }
.stat-icon.red { background: var(--danger-light); }

.stat-info { flex: 1; }

.stat-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.stat-change {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  margin-top: 6px;
  display: inline-block;
}
.stat-change.up { background: var(--success-light); color: #15803d; }
.stat-change.down { background: var(--danger-light); color: #dc2626; }

/* ===== CARDS ===== */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.card-body { padding: 20px; }

/* ===== BUTTONS ===== */
.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(79,110,247,0.3);
}
.btn-primary:hover {
  background: var(--accent-dark);
  box-shadow: 0 4px 14px rgba(79,110,247,0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-main);
  color: var(--text-main);
  border: 1px solid var(--border);
  padding: 9px 18px;
  border-radius: 9px;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-secondary:hover { background: var(--border-light); }

.btn-ghost {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-ghost:hover { background: var(--bg-main); color: var(--text-main); }

/* ===== INPUTS ===== */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  direction: rtl;
}
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79,110,247,0.1);
}
.input::placeholder { color: var(--text-light); }

.search-input {
  padding: 9px 14px 9px 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-main);
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  transition: all 0.2s;
  direction: rtl;
  width: 220px;
}
.search-input:focus {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79,110,247,0.1);
}

/* ===== TABLE ===== */
.table-wrapper { overflow-x: auto; }

.table {
  width: 100%;
  border-collapse: collapse;
}
.table th {
  text-align: right;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-main);
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  color: var(--text-main);
}
.table tbody tr { transition: background 0.15s; }
.table tbody tr:hover { background: var(--bg-main); }
.table tbody tr:last-child td { border-bottom: none; }

/* ===== BADGES ===== */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.badge-success { background: var(--success-light); color: #15803d; }
.badge-warning { background: var(--warning-light); color: #92400e; }
.badge-danger  { background: var(--danger-light);  color: #dc2626; }
.badge-info    { background: var(--info-light);    color: #0e7490; }
.badge-gray    { background: var(--border-light);  color: var(--text-muted); }
.badge-blue    { background: var(--accent-light);  color: var(--accent-dark); }

/* ===== PRODUCT CARD ===== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.product-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}
.product-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.product-img {
  width: 100%;
  height: 140px;
  background: var(--bg-main);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  border-bottom: 1px solid var(--border-light);
}

.product-body { padding: 14px; }

.product-name {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--text-main);
}

.product-price {
  font-weight: 800;
  font-size: 16px;
  color: var(--accent);
}

.product-stock {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.product-actions {
  display: flex;
  gap: 6px;
  padding: 12px 14px;
  border-top: 1px solid var(--border-light);
}

/* ===== ORDER CARD ===== */
.order-row {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
  transition: background 0.15s;
}
.order-row:hover { background: var(--bg-main); }
.order-row:last-child { border-bottom: none; }

.order-id {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-light);
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.order-customer { font-weight: 600; font-size: 14px; flex: 1; }
.order-price    { font-weight: 800; font-size: 15px; color: var(--text-main); }

/* ===== LOGIN PAGE ===== */
.login-page {
  min-height: 100vh;
  display: flex;
  background: var(--bg-main);
}

.login-left {
  flex: 1;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-brand {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
}

.login-tagline {
  color: rgba(255,255,255,0.4);
  font-size: 15px;
  text-align: center;
  max-width: 280px;
}

.login-right {
  width: 460px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-card {
  width: 100%;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 36px 32px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}

.login-title {
  font-size: 22px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 6px;
}

.login-sub {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 28px;
}

.form-group { margin-bottom: 16px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 6px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Tajawal', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(79,110,247,0.35);
}
.login-btn:hover { background: var(--accent-dark); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.login-divider {
  text-align: center;
  color: var(--text-light);
  font-size: 12px;
  margin: 18px 0;
  position: relative;
}
.login-divider::before,
.login-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: var(--border);
}
.login-divider::before { right: 0; }
.login-divider::after  { left: 0; }

.oauth-btn {
  width: 100%;
  padding: 10px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.oauth-btn:hover { background: var(--bg-main); }

/* ===== LOADING ===== */
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  gap: 16px;
}

.loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-screen p {
  color: var(--text-muted);
  font-size: 14px;
}

/* ===== EMPTY STATE ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; }
.empty-desc  { font-size: 13px; text-align: center; }

/* ===== MODALS ===== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title { font-size: 16px; font-weight: 700; }
.modal-close {
  width: 30px; height: 30px;
  border: none; background: var(--bg-main);
  border-radius: 8px; cursor: pointer;
  font-size: 16px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-muted); transition: all 0.2s;
}
.modal-close:hover { background: var(--danger-light); color: var(--danger); }

.modal-body { padding: 20px; }

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ===== DASHBOARD GRID ===== */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 0;
}

.dashboard-grid .full { grid-column: 1 / -1; }

/* ===== PAGE TITLE ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title  { font-size: 20px; font-weight: 800; }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* ===== FILTERS BAR ===== */
.filters-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.select-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #fff;
  font-family: 'Tajawal', sans-serif;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.select-input:focus { border-color: var(--accent); }

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-light); }

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid { grid-template-columns: 1fr; }
  .login-left { display: none; }
  .login-right { width: 100%; }
}

@media (max-width: 600px) {
  .sidebar { display: none; }
  .content-area { margin-right: 0; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
