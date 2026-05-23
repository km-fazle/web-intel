export function ShieldLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 L21 5 V11 C21 16 17 20.5 12 22 C7 20.5 3 16 3 11 V5 Z"
          stroke="oklch(0.9 0.22 125)"
          strokeWidth="1.8"
          fill="oklch(0.9 0.22 125 / 0.08)"
        />
        <path
          d="M8 12 L11 15 L16 9"
          stroke="oklch(0.9 0.22 125)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-bold text-foreground text-lg">
        Web<span className="text-primary"> Intel</span>
      </span>
      {compact ? null : null}
    </div>
  );
}
