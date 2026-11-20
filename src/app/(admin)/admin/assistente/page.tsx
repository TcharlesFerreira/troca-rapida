import type { Metadata } from "next";
import { ChatAssistente } from "@/components/chat-assistente";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirAdminSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Assistente" };

export default async function PaginaAssistente() {
  await exigirAdminSessao();
  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Assistente"
        descricao="Pergunte em texto livre sobre óleo e filtros. Ele entende por palavras-chave (sem IA) e responde só com a base de óleo e o catálogo de filtros, sempre com a fonte e a confiança."
      />
      <ChatAssistente />
    </div>
  );
}
