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
 * Cadastro público do cliente (item 1 e 2). Vale para cada oficina em que ele tem cadastro:
 *  - CPF e e-mail iguais ao cadastro da oficina: conta ligada na hora.
 *  - Só o CPF igual: solicitação PENDENTE, o cliente não vê nada daquela oficina até ela confirmar.
 *  - Nenhum cadastro com o CPF: conta criada, esperando a oficina.
 * O resultado devolvido é o "melhor" entre as oficinas (AUTOMATICO > PENDENTE > SEM_CADASTRO).
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
    // Cadastro que já tem dono não pode ser ligado a outra conta.
    const candidatos = await tx.cliente.findMany({ where: { cpf: dados.cpf, usuarioId: null } });

    const usuario = await tx.usuario.create({
      data: { nome: dados.nome, email: dados.email, senhaHash, papel: "CLIENTE", cpf: dados.cpf, telefone: dados.telefone },
    });

    const resultados: ResultadoVinculo[] = [];
    for (const candidato of candidatos) {
      const vinculo = decidirVinculo({ cpf: dados.cpf, email: dados.email }, candidato);
      resultados.push(vinculo);
      if (vinculo === "AUTOMATICO") {
        await tx.cliente.update({ where: { id: candidato.id }, data: { usuarioId: usuario.id } });
      } else if (vinculo === "PENDENTE") {
        await tx.solicitacaoVinculo.create({ data: { usuarioId: usuario.id, clienteId: candidato.id } });
      }
    }
    const vinculo: ResultadoVinculo = resultados.includes("AUTOMATICO")
      ? "AUTOMATICO"
      : resultados.includes("PENDENTE")
        ? "PENDENTE"
        : "SEM_CADASTRO";
    return { usuarioId: usuario.id, vinculo };
  });
}

export async function listarSolicitacoesPendentes(ator: Ator) {
  const empresaId = exigirAdmin(ator);
  return db.solicitacaoVinculo.findMany({
    where: { status: "PENDENTE", cliente: { empresaId } },
    orderBy: { criadoEm: "asc" },
    include: {
      usuario: { select: { id: true, nome: true, email: true, cpf: true, telefone: true } },
      cliente: { select: { id: true, nome: true, email: true, cpf: true } },
    },
  });
}

export async function contarSolicitacoesPendentes(ator: Ator): Promise<number> {
  const empresaId = exigirAdmin(ator);
  return db.solicitacaoVinculo.count({ where: { status: "PENDENTE", cliente: { empresaId } } });
}

export async function decidirSolicitacao(ator: Ator, solicitacaoId: string, aprovar: boolean): Promise<void> {
  const empresaId = exigirAdmin(ator);

  await db.$transaction(async (tx) => {
    const solicitacao = await tx.solicitacaoVinculo.findFirst({
      where: { id: solicitacaoId, cliente: { empresaId } },
      include: {
        usuario: { select: { id: true, clientes: { where: { empresaId }, select: { id: true } } } },
        cliente: { include: { usuario: { select: { id: true } } } },
      },
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

    if (solicitacao.usuario.clientes.length > 0) throw new ErroDeNegocio("Esta conta já está ligada a outro cadastro desta oficina.");
    if (solicitacao.cliente.usuario) throw new ErroDeNegocio("Este cadastro já está ligado a outra conta.");

    await tx.cliente.update({ where: { id: solicitacao.clienteId }, data: { usuarioId: solicitacao.usuarioId } });
    await tx.solicitacaoVinculo.update({
      where: { id: solicitacaoId },
      data: { status: "APROVADO", decididoEm: agora, decididoPorId: ator.usuarioId },
    });
    // Outras solicitações pendentes para o mesmo cadastro, ou da mesma conta nesta oficina, perdem o sentido.
    await tx.solicitacaoVinculo.updateMany({
      where: {
        status: "PENDENTE",
        id: { not: solicitacaoId },
        cliente: { empresaId },
        OR: [{ clienteId: solicitacao.clienteId }, { usuarioId: solicitacao.usuarioId }],
      },
      data: { status: "REJEITADO", decididoEm: agora, decididoPorId: ator.usuarioId },
    });
  });
}
