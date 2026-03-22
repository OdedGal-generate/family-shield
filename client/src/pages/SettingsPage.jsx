import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useMyStatus, useUpdateStatus, useUpdateMe } from '../api/hooks.js';
import { subscribeToPush, unsubscribeFromPush } from '../services/push.js';
import api from '../api/client.js';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { data: myStatus } = useMyStatus();
  const updateStatus = useUpdateStatus();
  const updateMe = useUpdateMe();

  const [name, setName] = useState(user?.name || '');
  const [statusText, setStatusText] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (myStatus) setStatusText(myStatus.text || '');
  }, [myStatus]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
      );
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (name !== user?.name) {
        const updated = await updateMe.mutateAsync({ name });
        updateUser(updated);
      }
      if (statusText !== (myStatus?.text || '')) {
        await updateStatus.mutateAsync(statusText);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleLang = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
    updateMe.mutate({ locale: newLang });
  };

  const togglePush = async () => {
    try {
      if (pushEnabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await api.delete('/push/subscribe', { data: { endpoint } });
        setPushEnabled(false);
      } else {
        const sub = await subscribeToPush();
        if (sub) await api.post('/push/subscribe', sub);
        setPushEnabled(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <div className="bg-card border-b border-border-subtle px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-text-secondary hover:text-text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="font-bold text-lg">{t('settings.title')}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Display Name */}
        <div className="bg-card border border-border-subtle rounded-xl p-4">
          <label className="text-sm text-text-secondary block mb-1">{t('settings.displayName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-primary border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-green/50"
          />
        </div>

        {/* Status */}
        <div className="bg-card border border-border-subtle rounded-xl p-4">
          <label className="text-sm text-text-secondary block mb-1">{t('settings.status')}</label>
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value.slice(0, 100))}
            placeholder={t('settings.statusPlaceholder')}
            className="w-full bg-primary border border-border-subtle rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50"
          />
          <p className="text-xs text-text-muted mt-1">{statusText.length}/100</p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        {/* Language */}
        <div className="bg-card border border-border-subtle rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm">{t('settings.language')}</span>
          <button
            onClick={toggleLang}
            className="bg-primary border border-border-subtle rounded-lg px-4 py-2 text-sm"
          >
            {i18n.language === 'he' ? t('settings.english') : t('settings.hebrew')}
          </button>
        </div>

        {/* Push */}
        <div className="bg-card border border-border-subtle rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm">{t('settings.pushNotifications')}</span>
          <button
            onClick={togglePush}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${pushEnabled ? 'bg-red-bg text-accent-red' : 'bg-green-bg text-accent-green'}`}
          >
            {pushEnabled ? t('settings.disablePush') : t('settings.enablePush')}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-card border border-accent-red/30 text-accent-red py-3 rounded-xl font-medium"
        >
          {t('settings.logout')}
        </button>
      </div>
    </div>
  );
}
