import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroup, usePostSafety, usePendingRequests, useReviewRequest, useMessages, useSendMessage } from '../api/hooks.js';
import Avatar from '../components/Avatar.jsx';
import SafetyBadge from '../components/SafetyBadge.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function GroupPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useGroup(id);
  const postSafety = usePostSafety(id);
  const [tab, setTab] = useState('members');
  const [sosConfirm, setSosConfirm] = useState(false);

  if (isLoading) return <LoadingScreen />;
  if (!data) return <div className="p-4 text-text-secondary">{t('common.error')}</div>;

  const { group, members, myRole } = data;
  const myMember = members.find(m => m.id === user?.id);
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const handleSafety = (status) => {
    if (status === 'sos') {
      setSosConfirm(true);
      return;
    }
    postSafety.mutate({ status });
  };

  const confirmSos = () => {
    postSafety.mutate({ status: 'sos' });
    setSosConfirm(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h1 className="font-bold text-lg">{group.name}</h1>
          </div>
          {isAdmin && (
            <button onClick={() => navigate(`/group/${id}/settings`)} className="text-text-secondary hover:text-text-primary p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Safety Buttons */}
      <div className="bg-card/50 border-b border-border-subtle px-6 py-4">
        <div className="flex gap-3 mb-2">
          <button
            onClick={() => handleSafety('safe')}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition ${myMember?.safety_status === 'safe' ? 'bg-accent-green text-white' : 'bg-green-bg text-accent-green border border-accent-green/20'}`}
          >
            {t('group.safe')}
          </button>
          <button
            onClick={() => handleSafety('waiting')}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition ${myMember?.safety_status === 'waiting' ? 'bg-accent-yellow text-black' : 'bg-yellow-bg text-accent-yellow border border-accent-yellow/20'}`}
          >
            {t('group.waiting')}
          </button>
          <button
            onClick={() => handleSafety('sos')}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition ${myMember?.safety_status === 'sos' ? 'bg-accent-red text-white' : 'bg-red-bg text-accent-red border border-accent-red/20'}`}
          >
            🆘 {t('group.sos')}
          </button>
        </div>
        {myMember?.safety_status && (
          <p className="text-xs text-text-muted">
            {t('group.currentStatus')}: {myMember.safety_status} · {myMember.safety_timestamp ? new Date(myMember.safety_timestamp + 'Z').toLocaleString() : ''}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-3 text-sm font-medium text-center transition ${tab === 'members' ? 'text-accent-green border-b-2 border-accent-green' : 'text-text-secondary'}`}
        >
          {t('group.members')} ({members.length})
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 py-3 text-sm font-medium text-center transition ${tab === 'chat' ? 'text-accent-green border-b-2 border-accent-green' : 'text-text-secondary'}`}
        >
          {t('group.chat')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'members' ? (
          <MembersTab groupId={id} members={members} isAdmin={isAdmin} />
        ) : (
          <ChatTab groupId={id} userId={user?.id} />
        )}
      </div>

      {/* SOS Confirm */}
      {sosConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-primary border border-border-subtle rounded-2xl p-6 w-full max-w-sm">
            <p className="text-center font-medium mb-4">{t('group.sosConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setSosConfirm(false)} className="flex-1 bg-card border border-border-subtle py-3 rounded-xl">
                {t('group.cancel')}
              </button>
              <button onClick={confirmSos} className="flex-1 bg-accent-red text-white py-3 rounded-xl font-medium">
                {t('group.sosConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MembersTab({ groupId, members, isAdmin }) {
  const { t } = useTranslation();
  const { data: requests } = usePendingRequests(isAdmin ? groupId : null);
  const reviewRequest = useReviewRequest(groupId);

  return (
    <div className="px-6 py-4 space-y-3">
      {isAdmin && requests && requests.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-accent-yellow mb-2">{t('group.pendingRequestsTitle')}</h3>
          {requests.map(r => (
            <div key={r.id} className="bg-yellow-bg border border-accent-yellow/20 rounded-xl p-3 flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar name={r.user_name} url={r.user_avatar} size="sm" />
                <span className="text-sm font-medium">{r.user_name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => reviewRequest.mutate({ requestId: r.id, action: 'approve' })}
                  className="bg-accent-green text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  {t('group.approve')}
                </button>
                <button
                  onClick={() => reviewRequest.mutate({ requestId: r.id, action: 'reject' })}
                  className="bg-card border border-border-subtle text-text-secondary text-xs px-3 py-1.5 rounded-lg"
                >
                  {t('group.reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {members.map(m => (
        <div key={m.id} className="bg-card border border-border-subtle rounded-xl p-4 flex items-center gap-3">
          <Avatar name={m.name} url={m.avatar_url} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm truncate">{m.name}</span>
              <RoleBadge role={m.role} />
            </div>
            <div className="flex items-center gap-2">
              <SafetyBadge status={m.safety_status} small />
              {m.user_status_text && (
                <span className="text-xs text-text-muted truncate">{m.user_status_text}</span>
              )}
            </div>
          </div>
          {m.safety_timestamp && (
            <span className="text-xs text-text-muted shrink-0">
              {new Date(m.safety_timestamp + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ChatTab({ groupId, userId }) {
  const { t } = useTranslation();
  const { data: messages } = useMessages(groupId);
  const sendMessage = useSendMessage(groupId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage.mutate(input.trim());
    setInput('');
    setAutoScroll(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-240px)]">
      <div
        className="flex-1 overflow-auto p-4 space-y-3"
        onScroll={(e) => {
          const el = e.target;
          setAutoScroll(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
        }}
      >
        {(!messages || messages.length === 0) ? (
          <p className="text-center text-text-muted text-sm py-8">{t('group.noMessages')}</p>
        ) : (
          messages.map(m => (
            m.type === 'system' ? (
              <p key={m.id} className="text-center text-text-muted text-xs py-1">{m.content}</p>
            ) : (
              <div key={m.id} className={`flex gap-2 ${m.user_id === userId ? 'flex-row-reverse' : ''}`}>
                <Avatar name={m.user_name} url={m.user_avatar} size="sm" />
                <div className={`max-w-[75%] ${m.user_id === userId ? 'bg-accent-green/20' : 'bg-card'} border border-border-subtle rounded-xl px-3 py-2`}>
                  {m.user_id !== userId && (
                    <p className="text-xs text-accent-blue font-medium mb-0.5">{m.user_name}</p>
                  )}
                  <p className="text-sm">{m.content}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(m.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border-subtle flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('group.sendMessage')}
          className="flex-1 bg-card border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-accent-green text-white px-4 rounded-xl font-medium disabled:opacity-50 transition"
        >
          {t('group.send')}
        </button>
      </form>
    </div>
  );
}
