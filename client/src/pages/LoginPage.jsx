import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const hasGoogle = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your-google-client-id' && GOOGLE_CLIENT_ID !== 'skip';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const handleGoogleLogin = () => {
    if (!hasGoogle) return;
    /* global google */
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          setLoading(true);
          const res = await api.post('/auth/google', { idToken: response.credential });
          login(res.data.token, res.data.user);
          navigate('/');
        } catch {
          setError(t('login.googleFailed') || 'Google login failed');
        } finally {
          setLoading(false);
        }
      }
    });
    google.accounts.id.prompt();
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setDevCode('');
    setLoading(true);
    try {
      const res = await api.post('/auth/phone/request', { phone });
      if (res.data.code) {
        setDevCode(res.data.code);
        setCode(res.data.code); // auto-fill in dev mode
      }
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || t('login.sendFailed') || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/phone/verify', { phone, code });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('login.verifyFailed') || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border-subtle rounded-2xl p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-green to-accent-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t('login.title')}</h1>
            <p className="text-text-secondary text-sm mt-1">{t('login.subtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-bg border border-accent-red/20 text-accent-red text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Google — only show if configured */}
          {hasGoogle && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition mb-4"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {t('login.googleBtn')}
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-text-muted text-sm">{t('login.or')}</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            </>
          )}

          {/* Phone */}
          {step === 'phone' ? (
            <form onSubmit={handleSendCode}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('login.phonePlaceholder')}
                className="w-full bg-primary border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green/50 transition mb-3"
                dir="ltr"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !phone || phone.length < 9}
                className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-medium py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? t('login.sendingCode') : t('login.sendCode')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              {devCode && (
                <div className="bg-green-bg border border-accent-green/20 text-accent-green text-sm rounded-lg p-3 mb-3 text-center">
                  {t('login.devCodeLabel') || 'Your code'}: <span className="font-bold text-lg tracking-widest">{devCode}</span>
                </div>
              )}
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('login.codePlaceholder')}
                maxLength={6}
                className="w-full bg-primary border border-border-subtle rounded-xl px-4 py-3 text-text-primary text-center text-lg tracking-widest placeholder-text-muted focus:outline-none focus:border-accent-green/50 transition mb-3"
                dir="ltr"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-gradient-to-r from-accent-green to-emerald-600 text-white font-medium py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? t('login.verifying') : t('login.verify')}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setDevCode(''); setError(''); }}
                className="w-full text-text-secondary text-sm mt-2 hover:text-text-primary transition"
              >
                ← {t('common.back')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
