import type { Metadata } from "next";
import { decidirVinculoAction } from "@/acoes/vinculos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatarCpf } from "@/lib/cpf";
import { dataHoraBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { listarSolicitacoesPendentes } from "@/servicos/vinculos";

export const metadata: Metadata = { title: "Vínculos pendentes" };

export default async function PaginaVinculos({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const ator = await exigirAdminSessao();
  const { erro } = await searchParams;
  const pendentes = await listarSolicitacoesPendentes(ator);

  return (
    <>
      <TituloPagina
        titulo="Vínculos pendentes"
        descricao="Alguém criou uma conta com o CPF de um cliente cadastrado, mas com outro e-mail. Confirme só se tiver certeza de que é a mesma pessoa: depois disso ela passa a ver os veículos e serviços desse cliente."
      />
      {erro && (
        <div className="mb-4">
          <Alert variant="erro">{erro}</Alert>
        </div>
      )}

      {pendentes.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Nenhum vínculo esperando confirmação.</p>
      ) : (
        <ul className="grid gap-4">
          {pendentes.map((p) => (
            <li key={p.id} className="rounded-lg border bg-card p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground">Conta criada no site</h2>
                  <p className="text-lg font-semibold">{p.usuario.nome}</p>
                  <p className="break-all">{p.usuario.email}</p>
                  <p>CPF {p.usuario.cpf ? formatarCpf(p.usuario.cpf) : "—"}</p>
                  <p className="text-sm text-muted-foreground">Criada em {dataHoraBR(p.criadoEm)}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground">Cadastro da oficina</h2>
                  <p className="text-lg font-semibold">{p.cliente.nome}</p>
                  <p className="break-all">{p.cliente.email}</p>
                  <p>CPF {formatarCpf(p.cliente.cpf)}</p>
                  <p className="text-sm font-medium">O e-mail é diferente.</p>
                </div>
              </div>
              <form action={decidirVinculoAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit" name="decisao" value="aprovar">
                  Confirmar vínculo
                </Button>
                <Button type="submit" name="decisao" value="recusar" variant="outline">
                  Recusar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
