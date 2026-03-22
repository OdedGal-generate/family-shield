import { useTranslation } from 'react-i18next';

export default function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-text-secondary text-sm">{t('common.loading')}</p>
      </div>
    </div>
  );
}
