import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { fatia, montarPagina } from "@/lib/paginacao";
import { decidirVinculo } from "@/lib/vinculo";

export interface ClienteDados {
  nome: string;
  cpf: string; // só dígitos
  telefone: string; // só dígitos
  email: string;
  endereco?: string;
}

export async function listarClientes(ator: Ator, busca?: string, pagina = 1) {
  const empresaId = exigirAdmin(ator);
  const termo = busca?.trim();
  const digitos = termo?.replace(/\D/g, "");

  const where: Prisma.ClienteWhereInput = termo
    ? {
        empresaId,
        OR: [
          { nome: { contains: termo, mode: "insensitive" } },
          { email: { contains: termo, mode: "insensitive" } },
          ...(digitos ? [{ cpf: { contains: digitos } }, { telefone: { contains: digitos } }] : []),
        ],
      }
    : { empresaId };

  const [itens, total] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      ...fatia(pagina),
      include: { _count: { select: { veiculos: true } } },
    }),
    db.cliente.count({ where }),
  ]);
  return montarPagina(itens, total, pagina);
}

export async function contarClientes(ator: Ator) {
  const empresaId = exigirAdmin(ator);
  return db.cliente.count({ where: { empresaId } });
}

/** Sugestões ao escolher o dono de um carro: por nome, telefone ou CPF (até 8). */
export async function sugerirClientes(ator: Ator, digitado: string) {
  const empresaId = exigirAdmin(ator);
  const termo = digitado.trim();
  if (termo.length < 2) return [];
  const digitos = termo.replace(/\D/g, "");
  return db.cliente.findMany({
    where: {
      empresaId,
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }, { cpf: { contains: digitos } }] : []),
      ],
    },
    orderBy: { nome: "asc" },
    take: 8,
    select: { id: true, nome: true, telefone: true },
  });
}

export async function obterCliente(ator: Ator, id: string) {
  const empresaId = exigirAdmin(ator);
  return db.cliente.findFirst({
    where: { id, empresaId },
    include: {
      veiculos: { orderBy: { placa: "asc" }, include: { _count: { select: { ordens: true } } } },
      usuario: { select: { id: true, email: true, nome: true } },
      solicitacoes: { where: { status: "PENDENTE" }, include: { usuario: { select: { id: true, email: true, nome: true } } } },
    },
  });
}

export async function criarCliente(ator: Ator, dados: ClienteDados) {
  const empresaId = exigirAdmin(ator);

  const existente = await db.cliente.findFirst({ where: { empresaId, cpf: dados.cpf }, select: { id: true } });
  if (existente) throw new ErroDeNegocio("Já existe um cliente com este CPF.", "cpf");

  return db.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: { empresaId, nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, email: dados.email, endereco: dados.endereco ?? null },
    });

    await ligarContaExistente(tx, cliente);
    return cliente;
  });
}

/**
 * O cliente pode já ter criado a conta no site antes de esta oficina cadastrá-lo: liga sozinho
 * (CPF e e-mail iguais) ou deixa o pedido para o administrador (só o CPF igual).
 * A mesma conta pode estar ligada a cadastros de outras oficinas: isso não impede.
 */
export async function ligarContaExistente(
  tx: Prisma.TransactionClient,
  cliente: { id: string; cpf: string | null; email: string | null },
) {
  if (!cliente.cpf) return;
  const conta = await tx.usuario.findFirst({ where: { cpf: cliente.cpf, papel: "CLIENTE" } });
  if (!conta?.cpf) return;
  const resultado = decidirVinculo({ cpf: conta.cpf, email: conta.email }, cliente);
  if (resultado === "AUTOMATICO") {
    await tx.cliente.update({ where: { id: cliente.id }, data: { usuarioId: conta.id } });
  } else if (resultado === "PENDENTE") {
    await tx.solicitacaoVinculo.create({ data: { usuarioId: conta.id, clienteId: cliente.id } });
  }
}

export async function atualizarCliente(ator: Ator, id: string, dados: ClienteDados) {
  const empresaId = exigirAdmin(ator);

  const atual = await db.cliente.findFirst({ where: { id, empresaId }, include: { usuario: { select: { id: true } } } });
  if (!atual) throw new ErroDeNegocio("Cliente não encontrado.");

  if (dados.cpf !== atual.cpf) {
    if (atual.usuario) {
      throw new ErroDeNegocio("Este cliente já tem conta no site: o CPF não pode ser alterado.", "cpf");
    }
    const outro = await db.cliente.findFirst({ where: { empresaId, cpf: dados.cpf, NOT: { id } }, select: { id: true } });
    if (outro) throw new ErroDeNegocio("Já existe outro cliente com este CPF.", "cpf");
  }

  return db.cliente.update({
    where: { id },
    data: { nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, email: dados.email, endereco: dados.endereco ?? null },
  });
}

/**
 * Exclui um cliente cadastrado por engano, junto com os carros dele.
 * Não deixa excluir se algum carro tem ordem de serviço: o histórico da oficina não se apaga.
 * Se o cliente tem conta no site, a conta continua existindo (só perde o vínculo com esta oficina).
 */
export async function excluirCliente(ator: Ator, id: string) {
  const empresaId = exigirAdmin(ator);
  const cliente = await db.cliente.findFirst({ where: { id, empresaId }, select: { id: true, nome: true } });
  if (!cliente) throw new ErroDeNegocio("Cliente não encontrado.");

  const ordens = await db.ordemServico.count({ where: { veiculo: { clienteId: id, empresaId } } });
  if (ordens > 0) {
    throw new ErroDeNegocio(
      `Este cliente tem ${ordens === 1 ? "1 ordem de serviço" : `${ordens} ordens de serviço`} no histórico e não pode ser excluído.`,
    );
  }

  await db.$transaction([
    db.veiculo.deleteMany({ where: { clienteId: id, empresaId } }),
    db.cliente.delete({ where: { id } }),
  ]);
  return cliente;
}
