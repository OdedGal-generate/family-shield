import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useInviteInfo } from '../api/hooks.js';
import api from '../api/client.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function JoinPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: info, isLoading, isError } = useInviteInfo(token);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (authLoading || isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <p className="text-text-secondary mb-5">{t('joinPage.loginFirst')}</p>
          <button
            onClick={() => navigate(`/login?redirect=/join/${token}`)}
            className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-4 rounded-xl font-semibold text-base"
          >
            {t('login.loginBtn')}
          </button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-accent-red mb-4">{t('joinPage.invalidInvite')}</p>
          <button onClick={() => navigate('/')} className="text-text-secondary text-sm hover:text-text-primary">
            ← {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const res = await api.post(`/join/${token}`);
      setSuccess(true);
      // Redirect to group after brief success message
      setTimeout(() => navigate(`/group/${res.data.groupId}`), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join');
      setJoining(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-xl font-bold mb-2">{t('joinPage.title')}</h1>
        <h2 className="text-lg font-semibold text-accent-green mb-1">{info?.groupName}</h2>
        <p className="text-text-secondary text-sm mb-6">{t('joinPage.memberCount', { count: info?.memberCount })}</p>

        {error && (
          <div className="bg-red-bg border border-accent-red/20 text-accent-red text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-bg text-accent-green py-4 rounded-xl font-semibold text-base">
            ✅ {t('joinPage.approved')}
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50"
          >
            {joining ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('joinPage.joining') || 'Joining...'}
              </span>
            ) : (
              t('joinPage.requestJoin')
            )}
          </button>
        )}
      </div>
    </div>
  );
}
