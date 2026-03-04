import { cn } from '@/lib/utils';

const COLORS = [
  'bg-blue-500/15 text-blue-700',
  'bg-emerald-500/15 text-emerald-700',
  'bg-violet-500/15 text-violet-700',
  'bg-amber-500/15 text-amber-700',
  'bg-rose-500/15 text-rose-700',
  'bg-cyan-500/15 text-cyan-700',
  'bg-pink-500/15 text-pink-700',
  'bg-indigo-500/15 text-indigo-700',
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface MemberAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MemberAvatar({ name, size = 'md', className }: MemberAvatarProps) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold shrink-0',
        sizeClasses[size],
        getColor(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
