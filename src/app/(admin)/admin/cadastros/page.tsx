import type { Metadata } from "next";
import { ImportarCadastros } from "@/components/importar-cadastros";
import { TituloPagina } from "@/components/titulo-pagina";
import { estiloBotao } from "@/components/ui/button";
import { exigirAdminSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Importar e exportar cadastros" };

export default async function PaginaCadastros() {
  await exigirAdminSessao();

  return (
    <>
      <TituloPagina titulo="Importar e exportar cadastros" descricao="Clientes e veículos em planilha (CSV, abre no Excel)." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-labelledby="exportar" className="grid content-start gap-3 rounded-lg border bg-card p-5">
          <h2 id="exportar" className="text-xl font-semibold">
            Exportar
          </h2>
          <p>Baixa todos os clientes e veículos da oficina, uma linha por veículo, com o último óleo e a próxima troca.</p>
          {/* Link normal (não do Next): o navegador baixa o arquivo. */}
          <div>
            <a href="/admin/cadastros/exportar" className={estiloBotao()}>
              Baixar planilha de cadastros
            </a>
          </div>
          <p className="text-sm text-muted-foreground">A planilha tem dados pessoais dos clientes: guarde com cuidado e não compartilhe.</p>
        </section>

        <section aria-labelledby="importar" className="grid content-start gap-4 rounded-lg border bg-card p-5">
          <h2 id="importar" className="text-xl font-semibold">
            Importar
          </h2>
          <ol className="grid list-decimal gap-1 pl-5">
            <li>
              Baixe o{" "}
              <a href="/admin/cadastros/modelo" className="font-semibold text-primary underline underline-offset-4">
                modelo da planilha
              </a>{" "}
              e preencha (ou use uma planilha exportada daqui).
            </li>
            <li>Uma linha por veículo. Cliente sem carro: deixe as colunas do veículo vazias. Só “Nome” é obrigatório.</li>
            <li>No Excel, salve como <strong>CSV UTF-8</strong> e escolha o arquivo abaixo.</li>
          </ol>
          <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
            <li>Cliente que já existe (mesmo CPF; sem CPF, mesmo nome e telefone) não é duplicado nem alterado.</li>
            <li>Placa que já está cadastrada é deixada como está.</li>
            <li>Veículo precisa de placa, marca, modelo e ano. O óleo recomendado é ligado sozinho quando o carro está na base.</li>
          </ul>
          <ImportarCadastros />
        </section>
      </div>
    </>
  );
}
