import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useInviteInfo, useRequestJoin, useJoinRequestStatus } from '../api/hooks.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function JoinPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: info, isLoading, isError } = useInviteInfo(token);
  const requestJoin = useRequestJoin();
  const [requested, setRequested] = useState(false);
  const { data: reqStatus } = useJoinRequestStatus(token, requested);

  useEffect(() => {
    if (reqStatus?.status === 'approved') {
      setTimeout(() => navigate(`/group/${info?.groupId}`), 1500);
    }
  }, [reqStatus, info, navigate]);

  if (authLoading || isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
          <div className="text-4xl mb-4">🔗</div>
          <p className="text-text-secondary mb-4">{t('joinPage.loginFirst')}</p>
          <button
            onClick={() => navigate(`/login?redirect=/join/${token}`)}
            className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-3 rounded-xl font-medium"
          >
            {t('login.title')}
          </button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-accent-red">{t('joinPage.invalidInvite')}</p>
          <button onClick={() => navigate('/')} className="text-text-secondary text-sm mt-4 hover:text-text-primary">
            ← {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const handleJoin = async () => {
    await requestJoin.mutateAsync(token);
    setRequested(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="bg-card border border-border-subtle rounded-2xl p-8 text-center w-full max-w-sm">
        <div className="text-4xl mb-4">🛡️</div>
        <h1 className="text-xl font-bold mb-2">{t('joinPage.title')}</h1>
        <h2 className="text-lg font-semibold text-accent-green mb-1">{info?.groupName}</h2>
        <p className="text-text-secondary text-sm mb-6">{t('joinPage.memberCount', { count: info?.memberCount })}</p>

        {reqStatus?.status === 'approved' ? (
          <div className="bg-green-bg text-accent-green py-3 rounded-xl font-medium">
            {t('joinPage.approved')}
          </div>
        ) : reqStatus?.status === 'rejected' ? (
          <div className="bg-red-bg text-accent-red py-3 rounded-xl font-medium">
            {t('joinPage.rejected')}
          </div>
        ) : requested || requestJoin.data?.alreadyPending ? (
          <div className="bg-yellow-bg text-accent-yellow py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-accent-yellow border-t-transparent rounded-full animate-spin" />
            {t('joinPage.waiting')}
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={requestJoin.isPending}
            className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {t('joinPage.requestJoin')}
          </button>
        )}
      </div>
    </div>
  );
}
