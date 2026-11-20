/**
 * Aparece na hora ao trocar de aba, enquanto o servidor monta a página.
 * Também deixa o Next pré-carregar o cabeçalho das páginas dos links visíveis.
 */
export default function Carregando() {
  return (
    <div role="status" aria-live="polite" className="grid animate-pulse gap-6">
      <span className="sr-only">Carregando…</span>
      <div className="grid gap-2">
        <div className="h-9 w-64 rounded-md bg-muted" />
        <div className="h-5 w-96 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
