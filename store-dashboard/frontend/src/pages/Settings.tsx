import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const BACKEND = 'https://store-dashboard-backend.onrender.com';
const FRONTEND = 'https://my-projects-bv31.vercel.app';

function authHeaders() {
  const token = localStorage.getItem('store_token');
  const storeId = localStorage.getItem('store_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(storeId ? { 'x-store-id': storeId } : {}),
  };
}

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: { name: string; email: string; avatarUrl?: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
}

interface Props {
  storeName: string | null;
  onStoreNameChange: (name: string) => void;
}

const S = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
.sett-root{padding:0;font-family:'IBM Plex Sans Arabic',sans-serif;direction:rtl;}
.sett-page-title{font-size:20px;font-weight:800;color:#050505;margin-bottom:18px;}
.sett-card{background:#fff;border-radius:10px;padding:20px 22px;border:1px solid #dddfe2;box-shadow:0 1px 2px rgba(0,0,0,0.08);margin-bottom:16px;}
.sett-card-title{font-size:15px;font-weight:700;color:#050505;margin-bottom:14px;display:flex;align-items:center;gap:6px;}
.sett-input{width:100%;padding:10px 14px;border-radius:8px;border:1.5px solid #dddfe2;font-size:14px;font-family:inherit;color:#050505;outline:none;background:#fff;box-sizing:border-box;transition:border .15s;}
.sett-input:focus{border-color:#1877f2;box-shadow:0 0 0 2px rgba(24,119,242,0.15);}
.sett-btn-primary{padding:10px 20px;background:#1877f2;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;transition:background .15s;}
.sett-btn-primary:hover{background:#166fe5;}
.sett-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.sett-btn-ghost{padding:10px 16px;background:#f0f2f5;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;color:#050505;transition:background .15s;}
.sett-btn-ghost:hover{background:#e4e6eb;}
.sett-btn-small{padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:background .15s;}
.sett-store-name-row{display:flex;align-items:center;gap:12px;margin-top:4px;}
.sett-store-name-text{font-size:18px;font-weight:700;color:#050505;}
.sett-link-input{flex:1;padding:10px 14px;border-radius:8px;border:1.5px solid #dddfe2;font-size:13px;font-family:inherit;color:#050505;background:#f0f2f5;outline:none;direction:ltr;text-align:left;}
.sett-invite-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
.sett-select{padding:10px 12px;border:1.5px solid #dddfe2;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#050505;outline:none;cursor:pointer;}
.sett-invite-item{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f2f5;}
.sett-invite-item:last-child{border-bottom:none;}
.sett-member-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f2f5;}
.sett-member-row:last-child{border-bottom:none;}
.sett-avatar{width:38px;height:38px;border-radius:50%;background:#e7f3ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.sett-role-pill{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;}
.sett-msg-success{color:#31a24c;font-size:13px;margin-top:8px;display:flex;align-items:center;gap:4px;}
.sett-msg-error{color:#e41e3f;font-size:13px;margin-top:8px;}
.sett-info-text{font-size:12.5px;color:#65676b;margin-top:6px;line-height:1.5;}
`;

export default function Settings({ storeName, onStoreNameChange }: Props) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(t('settings.employee'));
  const [inviting, setSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(storeName || '');
  const [savingName, setSavingName] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [storeLink, setStoreLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const storeId = localStorage.getItem('store_id');

  useEffect(() => {
    loadData();
    loadStoreSlug();
  }, []);

  const loadData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`${BACKEND}/stores/${storeId}/members`, { headers: authHeaders() }),
        fetch(`${BACKEND}/stores/${storeId}/invitations`, { headers: authHeaders() }),
      ]);
      const [m, i] = await Promise.all([membersRes.json(), invitationsRes.json()]);
      setMembers(Array.isArray(m) ? m : []);
      setInvitations(Array.isArray(i) ? i : []);
    } catch {}
    setLoading(false);
  };

  const loadStoreSlug = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${BACKEND}/stores/${storeId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.slug) {
        setStoreSlug(data.slug);
        setStoreLink(`${window.location.origin}/store/${data.slug}`);
      }
    } catch {}
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError(t('settings.enterEmail')); return; }
    setSending(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await fetch(`${BACKEND}/stores/${storeId}/invitations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error || t('common.errorOccurred')); }
      else {
        setInviteSuccess(`${t('settings.inviteCreated')} ${inviteEmail}`);
        setInviteEmail('');
        loadData();
      }
    } catch { setInviteError(t('common.connectionError')); }
    setSending(false);
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${FRONTEND}/join/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(storeLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm(t('settings.confirmRemoveMember'))) return;
    await fetch(`${BACKEND}/stores/${storeId}/members/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    loadData();
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`${BACKEND}/stores/${storeId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.name) {
        localStorage.setItem('store_name', data.name);
        onStoreNameChange(data.name);
        setEditingName(false);
        loadStoreSlug();
      }
    } catch {}
    setSavingName(false);
  };

  const roleColor = (role: string) => {
    if (role === t('settings.owner'))   return { bg: '#f3e8ff', color: '#7c3aed' };
    if (role === t('settings.manager')) return { bg: '#dbeafe', color: '#1d4ed8' };
    return { bg: '#dcfce7', color: '#15803d' };
  };

  if (loading) return (
    <div className="page">
      <div className="empty">
        <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
        {t('common.loading')}
      </div>
    </div>
  );

  return (
    <>
      <style>{S}</style>
      <div className="sett-root">
        <div className="sett-page-title">⚙️ {t('settings.title')}</div>

        {/* Store name */}
        <div className="sett-card">
          <div className="sett-card-title">🏪 {t('settings.storeName')}</div>
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                className="sett-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                style={{ flex: 1 }}
                autoFocus
              />
              <button onClick={handleSaveName} disabled={savingName} className="sett-btn-primary">
                {savingName ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setEditingName(false)} className="sett-btn-ghost">{t('common.cancel')}</button>
            </div>
          ) : (
            <div className="sett-store-name-row">
              <span className="sett-store-name-text">🏪 {storeName}</span>
              <button
                onClick={() => { setNewName(storeName || ''); setEditingName(true); }}
                className="sett-btn-small"
                style={{ background: '#f0f2f5', color: '#050505' }}
              >
                ✏️ {t('common.edit')}
              </button>
            </div>
          )}
        </div>

        {/* Public store link */}
        {storeLink && (
          <div className="sett-card">
            <div className="sett-card-title">🌐 {t('settings.publicStoreLink') || 'رابط متجرك العام'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input className="sett-link-input" readOnly value={storeLink} />
              <button
                onClick={copyStoreLink}
                className="sett-btn-primary"
                style={{ whiteSpace: 'nowrap', background: linkCopied ? '#31a24c' : '#1877f2' }}
              >
                {linkCopied ? '✅ تم النسخ' : '📋 نسخ'}
              </button>
            </div>
            <p className="sett-info-text">
              شارك هذا الرابط مع عملائك لزيارة متجرك الإلكتروني وطلب المنتجات مباشرة.
            </p>
          </div>
        )}

        {/* Invite member */}
        <div className="sett-card">
          <div className="sett-card-title">➕ {t('settings.inviteMember')}</div>
          <div className="sett-invite-row">
            <input
              className="sett-input"
              style={{ flex: 1, minWidth: 180 }}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder={t('settings.emailPlaceholder')}
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
            <select className="sett-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option>{t('settings.employee')}</option>
              <option>{t('settings.manager')}</option>
            </select>
            <button onClick={handleInvite} disabled={inviting} className="sett-btn-primary">
              {inviting ? t('settings.sending') : t('settings.createInvite')}
            </button>
          </div>
          {inviteError && <div className="sett-msg-error">{inviteError}</div>}
          {inviteSuccess && <div className="sett-msg-success">✅ {inviteSuccess}</div>}
        </div>

        {/* Pending invitations */}
        {invitations.filter(i => !i.acceptedAt).length > 0 && (
          <div className="sett-card">
            <div className="sett-card-title">📨 {t('settings.pendingInvites')}</div>
            {invitations.filter(i => !i.acceptedAt).map(inv => (
              <div key={inv.id} className="sett-invite-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.email}</div>
                  <div style={{ fontSize: 12, color: '#65676b', marginTop: 2 }}>
                    {inv.role} · {t('settings.expires')} {new Date(inv.expiresAt).toLocaleDateString('ar-SA')}
                  </div>
                </div>
                <button
                  onClick={() => copyInviteLink(inv.token)}
                  className="sett-btn-small"
                  style={{
                    background: copiedToken === inv.token ? '#dcfce7' : '#f0f2f5',
                    color: copiedToken === inv.token ? '#15803d' : '#050505',
                  }}
                >
                  {copiedToken === inv.token ? '✅ ' + t('settings.copied') : '🔗 ' + t('settings.copyLink')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Members */}
        <div className="sett-card">
          <div className="sett-card-title">👥 {t('settings.members')} ({members.length})</div>
          {members.map(member => {
            const rc = roleColor(member.role);
            return (
              <div key={member.id} className="sett-member-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {member.user?.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="sett-avatar">👤</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{member.user?.name || t('settings.user')}</div>
                    <div style={{ fontSize: 12, color: '#65676b' }}>{member.user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="sett-role-pill" style={{ background: rc.bg, color: rc.color }}>
                    {member.role}
                  </span>
                  {member.role !== t('settings.owner') && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="sett-btn-small"
                      style={{ background: '#fee2e2', color: '#c0392b' }}
                    >
                      {t('settings.remove')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="empty">{t('settings.noMembers') || 'لا يوجد أعضاء'}</div>
          )}
        </div>
      </div>
    </>
  );
}
