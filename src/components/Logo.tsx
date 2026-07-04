export function VakeelLogo({ className = "" }: { className?: string }) {
  return (
    <img src="/logo.svg" alt="VAKEEL logo" className={className} />
  );
}

export function VakeelWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      VAKEEL
    </span>
  );
}
