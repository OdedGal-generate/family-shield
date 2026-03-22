import { useTranslation } from 'react-i18next';

export default function RoleBadge({ role }) {
  const { t } = useTranslation();
  const config = {
    owner: 'bg-accent-blue/20 text-accent-blue',
    admin: 'bg-accent-yellow/20 text-accent-yellow',
    member: 'bg-border-subtle text-text-secondary'
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${config[role] || config.member}`}>
      {t(`group.${role}`)}
    </span>
  );
}
