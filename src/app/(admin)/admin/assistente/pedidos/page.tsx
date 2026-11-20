import type { Metadata } from "next";
import Link from "next/link";
import { resolverPedidoAction } from "@/acoes/assistente";
import { TituloPagina } from "@/components/titulo-pagina";
import { Button } from "@/components/ui/button";
import { dataHoraBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { listarPedidos } from "@/servicos/assistente";

export const metadata: Metadata = { title: "Carros pedidos" };

export default async function PaginaPedidos() {
  const ator = await exigirAdminSessao();
  const pedidos = await listarPedidos(ator);

  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Carros pedidos"
        descricao="Carros que alguém perguntou no assistente e a base de óleo não tinha, do mais pedido para o menos. Cadastre a partir do manual da montadora e marque como cadastrado."
      />
      <p className="mb-4">
        <Link href="/admin/assistente" className="font-semibold text-primary underline underline-offset-4">
          Voltar ao assistente
        </Link>
      </p>

      {pedidos.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Nenhum carro pedido por enquanto.</p>
      ) : (
        <ul className="grid gap-3">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">
                  {[p.marca, p.modelo, p.motor, p.ano || null].filter(Boolean).join(" ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {p.motor ? "" : "Motor não informado. "}
                  {p.ano ? "" : "Ano não informado. "}
                  Último pedido em {dataHoraBR(p.ultimoEm)}
                </p>
              </div>
              <p className="text-center">
                <span className="block text-2xl font-bold">{p.vezes}</span>
                <span className="text-sm text-muted-foreground">{p.vezes === 1 ? "pedido" : "pedidos"}</span>
              </p>
              <form action={resolverPedidoAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit" variant="outline">
                  Já cadastrei
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
