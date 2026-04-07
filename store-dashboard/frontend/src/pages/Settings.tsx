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

  const storeId = localStorage.getItem('store_id');

  useEffect(() => {
    loadData();
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
    const link = `${FRONTEND}/join/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
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
      }
    } catch {}
    setSavingName(false);
  };

  const roleColor = (role: string) => {
    if (role === t('settings.owner')) return '#7c3aed';
    if (role === t('settings.manager')) return '#2563eb';
    return '#059669';
  };

  if (loading) return <div className="page"><div className="empty">{t('common.loading')}</div></div>;

  return (
    <div className="page" dir="rtl">
      <div className="page-title">⚙️ {t('settings.title')}</div>

      {/* اسم المتجر */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">{t('settings.storeName')}</div>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <button
              onClick={handleSaveName}
              disabled={savingName}
              style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              {savingName ? t('common.saving') : t('common.save')}
            </button>
            <button
              onClick={() => setEditingName(false)}
              style={{ padding: '10px 16px', background: 'none', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>🏪 {storeName}</span>
            <button
              onClick={() => { setNewName(storeName || ''); setEditingName(true); }}
              style={{ padding: '6px 14px', background: 'none', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              {t('common.edit')}
            </button>
          </div>
        )}
      </div>

      {/* دعوة عضو جديد */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">➕ {t('settings.inviteMember')}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder={t('settings.emailPlaceholder')}
            type="email"
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          >
            <option>{t('settings.employee')}</option>
            <option>{t('settings.manager')}</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            {inviting ? t('settings.sending') : t('settings.createInvite')}
          </button>
        </div>
        {inviteError && <div style={{ color: 'red', marginTop: 8, fontSize: 13 }}>{inviteError}</div>}
        {inviteSuccess && <div style={{ color: '#059669', marginTop: 8, fontSize: 13 }}>✅ {inviteSuccess}</div>}
      </div>

      {/* الدعوات المعلقة */}
      {invitations.filter(i => !i.acceptedAt).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">📨 {t('settings.pendingInvites')}</div>
          {invitations.filter(i => !i.acceptedAt).map(inv => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{inv.email}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {inv.role} · {t('settings.expires')} {new Date(inv.expiresAt).toLocaleDateString('ar-SA')}
                </div>
              </div>
              <button
                onClick={() => copyInviteLink(inv.token)}
                style={{ padding: '6px 14px', background: copiedToken === inv.token ? '#059669' : '#f3f4f6', color: copiedToken === inv.token ? 'white' : '#444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >
                {copiedToken === inv.token ? t('settings.copied') : t('settings.copyLink')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* الأعضاء */}
      <div className="card">
        <div className="card-title">👥 {t('settings.members')} ({members.length})</div>
        {members.map(member => (
          <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {member.user?.avatarUrl ? (
                <img src={member.user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  👤
                </div>
              )}
              <div>
                <div style={{ fontWeight: 500 }}>{member.user?.name || t('settings.user')}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{member.user?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: roleColor(member.role) + '20', color: roleColor(member.role) }}>
                {member.role}
              </span>
              {member.role !== t('settings.owner') && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                >
                  {t('settings.remove')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
