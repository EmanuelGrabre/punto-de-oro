export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#d8f23a" />
      <path d="M5 9c6 3 6 11 0 14M27 9c-6 3-6 11 0 14" fill="none" stroke="#0f1d57" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
