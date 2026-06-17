import { Cpu, Zap, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

interface QvacBadgeProps {
  model?: string;
  status?: 'idle' | 'loading' | 'running' | 'done';
  showGpu?: boolean;
  compact?: boolean;
}

export default function QvacBadge({ 
  model = 'LLAMA_3_2_1B_INST_Q4_0',
  status = 'idle',
  showGpu = false,
  compact = false
}: QvacBadgeProps) {
  const isActive = status === 'running' || status === 'loading';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        QVAC
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
      isActive 
        ? 'bg-primary/10 border-primary/30 text-primary' 
        : 'bg-muted/50 border-border text-muted-foreground'
    }`}>
      <motion.div
        animate={isActive ? { rotate: 360 } : { rotate: 0 }}
        transition={isActive ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Cpu className="w-3 h-3" />
      </motion.div>
      <span className="font-semibold">@qvac/sdk</span>
      <span className="text-muted-foreground opacity-70">·</span>
      <span className="truncate max-w-[180px]" title={model}>{model}</span>
      {showGpu && (
        <>
          <span className="text-muted-foreground opacity-70">·</span>
          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" />Vulkan
          </span>
        </>
      )}
      <span className="ml-1 flex items-center gap-0.5 text-destructive/60">
        <Wifi className="w-2.5 h-2.5" />
        <span>offline</span>
      </span>
    </div>
  );
}
