import { useTranslation } from 'react-i18next';

export default function SafetyBadge({ status, small = false }) {
  const { t } = useTranslation();
  const config = {
    safe: { bg: 'bg-green-bg', text: 'text-accent-green', label: t('group.safe') },
    waiting: { bg: 'bg-yellow-bg', text: 'text-accent-yellow', label: t('group.waiting') },
    sos: { bg: 'bg-red-bg', text: 'text-accent-red', label: t('group.sos') }
  };

  if (!status || !config[status]) {
    return <span className={`${small ? 'text-xs' : 'text-sm'} text-text-muted`}>—</span>;
  }

  const c = config[status];
  return (
    <span className={`inline-flex items-center ${c.bg} ${c.text} ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} rounded-full font-medium`}>
      {c.label}
    </span>
  );
}
