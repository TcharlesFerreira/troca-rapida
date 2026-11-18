import type { Metadata } from "next";
import { FormOS } from "@/components/form-os";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { formatarPlaca } from "@/lib/placa";
import { exigirAdminSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Nova ordem de serviço" };

export default async function NovaOrdem({ searchParams }: { searchParams: Promise<{ veiculoId?: string }> }) {
  const ator = await exigirAdminSessao();
  const { veiculoId } = await searchParams;
  const veiculos = await db.veiculo.findMany({
    where: { empresaId: ator.empresaId! },
    orderBy: { placa: "asc" },
    select: { id: true, placa: true, marca: true, modelo: true, kmAtual: true, cliente: { select: { nome: true } } },
  });

  return (
    <>
      <TituloPagina titulo="Nova ordem de serviço" />
      {veiculos.length === 0 ? (
        <Alert variant="aviso">Cadastre um veículo antes de abrir uma ordem de serviço.</Alert>
      ) : (
        <FormOS
          veiculos={veiculos.map((v) => ({ id: v.id, placa: v.placa, kmAtual: v.kmAtual, rotulo: `${formatarPlaca(v.placa)}, ${v.marca} ${v.modelo}, ${v.cliente.nome}` }))}
          veiculoIdInicial={veiculoId}
          hoje={new Date().toISOString().slice(0, 10)}
        />
      )}
    </>
  );
}
