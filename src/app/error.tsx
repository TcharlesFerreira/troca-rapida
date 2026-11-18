"use client";

import { Button } from "@/components/ui/button";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">Não foi possível carregar esta página. Tente de novo; se continuar, avise a oficina.</p>
      <div>
        <Button onClick={reset}>Tentar de novo</Button>
      </div>
    </main>
  );
}
