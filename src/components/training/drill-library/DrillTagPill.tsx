import { cn } from '@/lib/utils';

interface DrillTagPillProps {
  name: string;
  color?: string | null;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function DrillTagPill({ name, color, onClick, active, className }: DrillTagPillProps) {
  const c = color || '#6366f1';
  const style = active
    ? { backgroundColor: c, color: '#fff', borderColor: c }
    : { backgroundColor: `${c}22`, color: c, borderColor: `${c}55` };

  return (
    <span
      onClick={onClick}
      style={style}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
    >
      {name}
    </span>
  );
}
