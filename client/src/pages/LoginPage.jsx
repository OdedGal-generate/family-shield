import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await api.post('/auth/register', { username, password, name: name.trim() });
        login(res.data.token, res.data.user);
        navigate('/');
      } else {
        const res = await api.post('/auth/login', { username, password });
        login(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  const isValid = mode === 'register'
    ? username.length >= 3 && password.length >= 4 && name.trim().length >= 1
    : username.length >= 1 && password.length >= 1;

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-accent-green to-accent-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t('login.title')}</h1>
            <p className="text-text-secondary text-sm mt-1">{t('login.subtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-bg border border-accent-red/20 text-accent-red text-sm rounded-xl p-4 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display name — only on register */}
            {mode === 'register' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('login.namePlaceholder')}
                className="w-full bg-primary border border-border-subtle rounded-xl px-5 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 transition text-base"
                autoComplete="name"
              />
            )}

            {/* Username */}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              className="w-full bg-primary border border-border-subtle rounded-xl px-5 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 transition text-base"
              dir="ltr"
              autoComplete="username"
              autoFocus
            />

            {/* Password */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="w-full bg-primary border border-border-subtle rounded-xl px-5 py-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 transition text-base"
              dir="ltr"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 text-base"
            >
              {loading
                ? (mode === 'register' ? t('login.registering') : t('login.loggingIn'))
                : (mode === 'register' ? t('login.register') : t('login.loginBtn'))
              }
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={switchMode}
              className="text-accent-green text-sm hover:underline transition"
            >
              {mode === 'login' ? t('login.switchToRegister') : t('login.switchToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
