export default function Avatar({ name, url, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  const colors = ['bg-accent-blue', 'bg-accent-green', 'bg-accent-yellow', 'bg-accent-red'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  if (url) {
    return <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }

  return (
    <div className={`${sizes[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {letter}
    </div>
  );
}
