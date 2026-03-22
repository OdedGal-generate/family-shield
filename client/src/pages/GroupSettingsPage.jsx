import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import {
  useGroup, useUpdateGroup, useDeleteGroup, useLeaveGroup,
  useUpdateMemberRole, useRemoveMember, useToggleSosNotify,
  useCreateInvite, useGroupInvites, useRevokeInvite
} from '../api/hooks.js';
import Avatar from '../components/Avatar.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function GroupSettingsPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useGroup(id);
  const { data: invites } = useGroupInvites(id);
  const updateGroup = useUpdateGroup(id);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();
  const updateRole = useUpdateMemberRole(id);
  const removeMember = useRemoveMember(id);
  const toggleSos = useToggleSosNotify(id);
  const createInvite = useCreateInvite(id);
  const revokeInvite = useRevokeInvite(id);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [nameInit, setNameInit] = useState(false);
  const [copied, setCopied] = useState(null);
  const [maxUses, setMaxUses] = useState('');
  const [expiresHours, setExpiresHours] = useState('');

  if (isLoading) return <LoadingScreen />;
  if (!data) return null;

  const { group, members, myRole } = data;
  const isOwner = myRole === 'owner';

  if (!nameInit) {
    setName(group.name);
    setType(group.type);
    setNameInit(true);
  }

  const settings = JSON.parse(group.settings || '{}');

  const handleSave = () => {
    const updates = {};
    if (name !== group.name) updates.name = name;
    if (type !== group.type) updates.type = type;
    if (Object.keys(updates).length > 0) updateGroup.mutate(updates);
  };

  const handleCreateInvite = async () => {
    const data = {};
    if (maxUses) data.maxUses = parseInt(maxUses);
    if (expiresHours) data.expiresInHours = parseInt(expiresHours);
    const result = await createInvite.mutateAsync(data);
    await navigator.clipboard.writeText(result.url);
    setCopied('new');
    setTimeout(() => setCopied(null), 2000);
    setMaxUses('');
    setExpiresHours('');
  };

  const copyInvite = async (url, id) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-card border-b border-border-subtle px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/group/${id}`)} className="text-text-secondary hover:text-text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="font-bold text-lg">{t('groupSettings.title')}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Group Info */}
        <section className="bg-card border border-border-subtle rounded-xl p-4 space-y-3">
          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('groupSettings.groupName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-primary border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-green/50"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">{t('groupSettings.groupType')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-primary border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none"
            >
              <option value="family">{t('groupSettings.family')}</option>
              <option value="work">{t('groupSettings.work')}</option>
              <option value="friends">{t('groupSettings.friends')}</option>
              <option value="other">{t('groupSettings.other')}</option>
            </select>
          </div>
          {isOwner && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.onlyAdminsCanInvite}
                onChange={(e) => updateGroup.mutate({ settings: { onlyAdminsCanInvite: e.target.checked } })}
                className="rounded"
              />
              {t('groupSettings.onlyAdminsCanInvite')}
            </label>
          )}
          <button
            onClick={handleSave}
            disabled={updateGroup.isPending}
            className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {t('groupSettings.save')}
          </button>
        </section>

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2">{t('groupSettings.members')}</h2>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="bg-card border border-border-subtle rounded-xl p-3 flex items-center gap-3">
                <Avatar name={m.name} url={m.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.name}</span>
                    <RoleBadge role={m.role} />
                  </div>
                </div>
                {isOwner && m.id !== user?.id && m.role !== 'owner' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateRole.mutate({ userId: m.id, role: m.role === 'admin' ? 'member' : 'admin' })}
                      className="text-xs bg-card-hover px-2 py-1 rounded text-text-secondary hover:text-text-primary"
                    >
                      {m.role === 'admin' ? t('groupSettings.makeMember') : t('groupSettings.makeAdmin')}
                    </button>
                    <button
                      onClick={() => removeMember.mutate(m.id)}
                      className="text-xs bg-red-bg px-2 py-1 rounded text-accent-red"
                    >
                      {t('groupSettings.remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SOS Targets */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2">{t('groupSettings.sosTargets')}</h2>
          <div className="space-y-2">
            {members.map(m => (
              <label key={m.id} className="bg-card border border-border-subtle rounded-xl p-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!m.notify_sos}
                  onChange={(e) => toggleSos.mutate({ userId: m.id, enabled: e.target.checked })}
                  className="rounded"
                />
                <Avatar name={m.name} url={m.avatar_url} size="sm" />
                <span className="text-sm">{m.name}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Invites */}
        <section>
          <h2 className="text-sm font-semibold text-text-secondary mb-2">{t('groupSettings.inviteLinks')}</h2>
          <div className="bg-card border border-border-subtle rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t('groupSettings.maxUses')}
                className="flex-1 bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none"
              />
              <input
                type="number"
                value={expiresHours}
                onChange={(e) => setExpiresHours(e.target.value)}
                placeholder={t('groupSettings.expiresInHours')}
                className="flex-1 bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreateInvite}
              disabled={createInvite.isPending}
              className="w-full bg-accent-blue/20 text-accent-blue py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {copied === 'new' ? t('groupSettings.copied') : t('groupSettings.createInvite')}
            </button>

            {invites && invites.length > 0 ? (
              <div className="space-y-2">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-sm bg-primary rounded-lg px-3 py-2">
                    <span className="text-text-secondary truncate text-xs font-mono flex-1 ltr">
                      ...{inv.token.slice(-8)}
                      {inv.max_uses && ` (${inv.use_count}/${inv.max_uses} ${t('groupSettings.uses')})`}
                    </span>
                    <div className="flex gap-1 ms-2">
                      <button
                        onClick={() => copyInvite(`${window.location.origin}/join/${inv.token}`, inv.id)}
                        className="text-xs text-accent-blue px-2 py-1"
                      >
                        {copied === inv.id ? t('groupSettings.copied') : t('groupSettings.copyLink')}
                      </button>
                      <button
                        onClick={() => revokeInvite.mutate(inv.id)}
                        className="text-xs text-accent-red px-2 py-1"
                      >
                        {t('groupSettings.revoke')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t('groupSettings.noInvites')}</p>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-2">
          {!isOwner && (
            <button
              onClick={() => {
                if (confirm(t('groupSettings.leaveConfirm'))) {
                  leaveGroup.mutate(id, { onSuccess: () => navigate('/') });
                }
              }}
              className="w-full bg-card border border-accent-yellow/30 text-accent-yellow py-3 rounded-xl font-medium"
            >
              {t('groupSettings.leaveGroup')}
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => {
                if (confirm(t('groupSettings.deleteConfirm'))) {
                  deleteGroup.mutate(id, { onSuccess: () => navigate('/') });
                }
              }}
              className="w-full bg-red-bg border border-accent-red/30 text-accent-red py-3 rounded-xl font-medium"
            >
              {t('groupSettings.deleteGroup')}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
