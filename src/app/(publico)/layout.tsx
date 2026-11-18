import { Marca } from "@/components/marca";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Marca className="text-2xl" />
        <div className="max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight">Cada carro com a sua história de óleo.</p>
          <p className="mt-4 text-lg text-primary-foreground/85">
            Veja o que foi feito, quando foi feito e quando a próxima troca vence, pela placa.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/75">Confira sempre no manual do veículo.</p>
      </aside>
      <main id="conteudo" className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Marca className="text-primary" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
