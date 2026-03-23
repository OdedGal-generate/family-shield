import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyGroups, useCreateGroup } from '../api/hooks.js';
import SafetyBadge from '../components/SafetyBadge.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useMyGroups();
  const createGroup = useCreateGroup();
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('family');
  const [inviteInput, setInviteInput] = useState('');

  if (isLoading) return <LoadingScreen />;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const group = await createGroup.mutateAsync({ name: newName.trim(), type: newType });
    setShowCreate(false);
    setNewName('');
    navigate(`/group/${group.id}`);
  };

  const handleJoinLink = (e) => {
    e.preventDefault();
    const input = inviteInput.trim();
    const token = input.includes('/join/') ? input.split('/join/').pop() : input;
    if (token) navigate(`/join/${token}`);
  };

  const typeEmoji = { family: '👨‍👩‍👧‍👦', work: '💼', friends: '🤝', other: '📋' };

  return (
    <div className="min-h-screen px-6 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t('home.myGroups')}</h1>
        <button
          onClick={() => navigate('/settings')}
          className="text-text-secondary hover:text-text-primary transition p-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </div>

      {(!groups || groups.length === 0) ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-5">🛡️</div>
          <h2 className="text-lg font-semibold mb-2">{t('home.noGroups')}</h2>
          <p className="text-text-secondary text-sm mb-10">{t('home.noGroupsDesc')}</p>
          <div className="space-y-4">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-semibold py-4 rounded-xl text-base"
            >
              {t('home.createGroup')}
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="w-full bg-card border border-border-subtle text-text-primary font-semibold py-4 rounded-xl text-base"
            >
              {t('home.haveInvite')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => navigate(`/group/${g.id}`)}
                className="w-full bg-card border border-border-subtle rounded-xl p-5 text-start hover:bg-card-hover transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{typeEmoji[g.type] || '📋'}</span>
                    <h3 className="font-semibold text-base">{g.name}</h3>
                  </div>
                  <SafetyBadge status={g.my_safety_status} small />
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span>{g.member_count} {t('home.members')}</span>
                  {g.pending_requests > 0 && (
                    <span className="bg-accent-red text-white text-xs px-2 py-0.5 rounded-full">
                      {g.pending_requests} {t('home.pendingRequests')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 bg-gradient-to-r from-accent-green to-emerald-600 text-white font-semibold py-4 rounded-xl text-sm"
            >
              + {t('home.createGroup')}
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex-1 bg-card border border-border-subtle text-text-primary font-semibold py-4 rounded-xl text-sm"
            >
              {t('home.haveInvite')}
            </button>
          </div>
        </>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-primary border-t border-border-subtle rounded-t-2xl w-full max-w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">{t('home.createGroup')}</h2>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('groupSettings.groupName')}
                className="w-full bg-card border border-border-subtle rounded-xl px-5 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 mb-4 text-base"
                autoFocus
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-card border border-border-subtle rounded-xl px-5 py-4 text-text-primary mb-5 focus:outline-none text-base"
              >
                <option value="family">{typeEmoji.family} {t('groupSettings.family')}</option>
                <option value="work">{typeEmoji.work} {t('groupSettings.work')}</option>
                <option value="friends">{typeEmoji.friends} {t('groupSettings.friends')}</option>
                <option value="other">{typeEmoji.other} {t('groupSettings.other')}</option>
              </select>
              <button
                type="submit"
                disabled={!newName.trim() || createGroup.isPending}
                className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 text-base"
              >
                {t('home.createGroup')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setShowInvite(false)}>
          <div className="bg-primary border-t border-border-subtle rounded-t-2xl w-full max-w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">{t('home.haveInvite')}</h2>
            <form onSubmit={handleJoinLink}>
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder={t('home.inviteLinkPlaceholder')}
                className="w-full bg-card border border-border-subtle rounded-xl px-5 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 mb-4 text-base"
                dir="ltr"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inviteInput.trim()}
                className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 text-base"
              >
                {t('home.join')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
