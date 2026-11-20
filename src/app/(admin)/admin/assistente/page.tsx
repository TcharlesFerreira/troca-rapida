import type { Metadata } from "next";
import Link from "next/link";
import { ChatAssistente } from "@/components/chat-assistente";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirAdminSessao } from "@/lib/sessao";
import { contarPedidos } from "@/servicos/assistente";

export const metadata: Metadata = { title: "Assistente" };

export default async function PaginaAssistente() {
  const ator = await exigirAdminSessao();
  const pedidos = await contarPedidos(ator);
  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Assistente"
        descricao="Pergunte em texto livre sobre óleo e filtros. Ele entende por palavras-chave (sem IA) e responde com a base de óleo e o catálogo de filtros, com a fonte e a confiança. Se a base não tiver o carro, mostra o que a sua oficina já usou nele."
      />
      <p className="mb-4">
        <Link href="/admin/assistente/pedidos" className="font-semibold text-primary underline underline-offset-4">
          Carros pedidos que a base não tem{pedidos ? ` (${pedidos})` : ""}
        </Link>
      </p>
      <ChatAssistente />
    </div>
  );
}
