export function Marca({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight ${className ?? ""}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none">
        <path d="M12 2.5c3.2 4.1 6 7.2 6 10.8a6 6 0 0 1-12 0c0-3.6 2.8-6.7 6-10.8Z" fill="hsl(var(--accent))" />
        <path d="M9.2 14.2a3 3 0 0 0 2.4 2.5" stroke="hsl(var(--accent-foreground))" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Troca Rápida
    </span>
  );
}
