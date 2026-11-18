import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { decidirVinculo, type ResultadoVinculo } from "@/lib/vinculo";

export interface NovaConta {
  nome: string;
  email: string;
  senha: string;
  cpf: string; // só dígitos
  telefone: string;
}

/**
 * Cadastro público do cliente (item 1 e 2).
 *  - CPF e e-mail iguais ao cadastro da oficina: conta ligada na hora.
 *  - Só o CPF igual: solicitação PENDENTE, o cliente não vê nada até o administrador confirmar.
 *  - Nenhum cadastro com o CPF: conta criada, esperando a oficina.
 */
export async function registrarContaCliente(dados: NovaConta): Promise<{ usuarioId: string; vinculo: ResultadoVinculo }> {
  const [emailUsado, cpfUsado] = await Promise.all([
    db.usuario.findUnique({ where: { email: dados.email }, select: { id: true } }),
    db.usuario.findUnique({ where: { cpf: dados.cpf }, select: { id: true } }),
  ]);
  if (emailUsado) throw new ErroDeNegocio("Já existe uma conta com este e-mail. Tente entrar.", "email");
  if (cpfUsado) throw new ErroDeNegocio("Já existe uma conta com este CPF. Tente entrar ou fale com a oficina.", "cpf");

  const senhaHash = await bcrypt.hash(dados.senha, 12);

  return db.$transaction(async (tx) => {
    const cadastro = await tx.cliente.findUnique({
      where: { cpf: dados.cpf },
      include: { usuario: { select: { id: true } } },
    });
    // Cadastro que já tem dono não pode ser ligado a outra conta.
    const candidato = cadastro && !cadastro.usuario ? cadastro : null;
    const vinculo = decidirVinculo({ cpf: dados.cpf, email: dados.email }, candidato);

    const usuario = await tx.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        papel: "CLIENTE",
        cpf: dados.cpf,
        telefone: dados.telefone,
        clienteId: vinculo === "AUTOMATICO" && candidato ? candidato.id : null,
      },
    });

    if (vinculo === "PENDENTE" && candidato) {
      await tx.solicitacaoVinculo.create({ data: { usuarioId: usuario.id, clienteId: candidato.id } });
    }
    return { usuarioId: usuario.id, vinculo };
  });
}

export async function listarSolicitacoesPendentes(ator: Ator) {
  exigirAdmin(ator);
  return db.solicitacaoVinculo.findMany({
    where: { status: "PENDENTE" },
    orderBy: { criadoEm: "asc" },
    include: {
      usuario: { select: { id: true, nome: true, email: true, cpf: true, telefone: true } },
      cliente: { select: { id: true, nome: true, email: true, cpf: true } },
    },
  });
}

export async function contarSolicitacoesPendentes(ator: Ator): Promise<number> {
  exigirAdmin(ator);
  return db.solicitacaoVinculo.count({ where: { status: "PENDENTE" } });
}

export async function decidirSolicitacao(ator: Ator, solicitacaoId: string, aprovar: boolean): Promise<void> {
  exigirAdmin(ator);

  await db.$transaction(async (tx) => {
    const solicitacao = await tx.solicitacaoVinculo.findUnique({
      where: { id: solicitacaoId },
      include: { usuario: { select: { id: true, clienteId: true } }, cliente: { include: { usuario: { select: { id: true } } } } },
    });
    if (!solicitacao || solicitacao.status !== "PENDENTE") {
      throw new ErroDeNegocio("Esta solicitação não está mais pendente.");
    }

    const agora = new Date();

    if (!aprovar) {
      await tx.solicitacaoVinculo.update({
        where: { id: solicitacaoId },
        data: { status: "REJEITADO", decididoEm: agora, decididoPorId: ator.usuarioId },
      });
      return;
    }

    if (solicitacao.usuario.clienteId) throw new ErroDeNegocio("Esta conta já está ligada a outro cadastro.");
    if (solicitacao.cliente.usuario) throw new ErroDeNegocio("Este cadastro já está ligado a outra conta.");

    await tx.usuario.update({ where: { id: solicitacao.usuarioId }, data: { clienteId: solicitacao.clienteId } });
    await tx.solicitacaoVinculo.update({
      where: { id: solicitacaoId },
      data: { status: "APROVADO", decididoEm: agora, decididoPorId: ator.usuarioId },
    });
    // Outras solicitações pendentes para o mesmo cadastro ou a mesma conta perdem o sentido.
    await tx.solicitacaoVinculo.updateMany({
      where: {
        status: "PENDENTE",
        id: { not: solicitacaoId },
        OR: [{ clienteId: solicitacao.clienteId }, { usuarioId: solicitacao.usuarioId }],
      },
      data: { status: "REJEITADO", decididoEm: agora, decididoPorId: ator.usuarioId },
    });
  });
}
