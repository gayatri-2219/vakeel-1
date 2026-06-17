import { clsx } from 'clsx';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

type RiskLevel = 'green' | 'amber' | 'red' | 'processing';

export default function RiskBadge({ level, text, className, size = 'md' }: {
  level: RiskLevel;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (level === 'processing') {
    return (
      <div className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-semibold bg-muted text-muted-foreground",
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3.5 py-1.5 text-sm',
        className
      )}>
        <div className={clsx("rounded-full border-2 border-muted-foreground border-t-transparent animate-spin",
          size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'
        )} />
        {text || 'Analyzing'}
      </div>
    );
  }

  const configs = {
    green: {
      cls: 'bg-risk-green/10 text-risk-green border border-risk-green/20',
      icon: CheckCircle2,
      defaultText: 'Safe',
      dot: 'bg-risk-green',
    },
    amber: {
      cls: 'bg-risk-amber/10 text-risk-amber border border-risk-amber/20',
      icon: AlertTriangle,
      defaultText: 'Caution',
      dot: 'bg-risk-amber',
    },
    red: {
      cls: 'bg-risk-red/10 text-risk-red border border-risk-red/20',
      icon: AlertCircle,
      defaultText: 'Danger',
      dot: 'bg-risk-red',
    },
  };

  const c = configs[level];

  return (
    <div className={clsx(
      `inline-flex items-center gap-1.5 rounded-full font-semibold ${c.cls}`,
      size === 'sm' && 'px-2 py-0.5 text-[10px]',
      size === 'md' && 'px-2.5 py-1 text-xs',
      size === 'lg' && 'px-3.5 py-1.5 text-sm',
      className
    )}>
      <span className={clsx('rounded-full shrink-0', c.dot,
        size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
      )} />
      {text || c.defaultText}
    </div>
  );
}
