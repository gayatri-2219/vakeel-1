export function VakeelLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VAKEEL logo"
    >
      <path
        d="M19 1.5L35.5 7.5V20.5C35.5 30.5 28.5 37.5 19 40.5C9.5 37.5 2.5 30.5 2.5 20.5V7.5L19 1.5Z"
        fill="#0b3b2d"
        stroke="#0b3b2d"
        strokeWidth="1"
      />
      <path
        d="M12 13.5L19 28.5L26 13.5"
        stroke="#c5a880"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 20L19 28.5L22.5 20"
        stroke="#c5a880"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function VakeelWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      VAKEEL
    </span>
  );
}
