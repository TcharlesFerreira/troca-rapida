import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { decidirVinculo } from "@/lib/vinculo";

export interface ClienteDados {
  nome: string;
  cpf: string; // só dígitos
  telefone: string; // só dígitos
  email: string;
  endereco?: string;
}

export async function listarClientes(ator: Ator, busca?: string) {
  exigirAdmin(ator);
  const termo = busca?.trim();
  const digitos = termo?.replace(/\D/g, "");

  const where: Prisma.ClienteWhereInput = termo
    ? {
        OR: [
          { nome: { contains: termo, mode: "insensitive" } },
          { email: { contains: termo, mode: "insensitive" } },
          ...(digitos ? [{ cpf: { contains: digitos } }, { telefone: { contains: digitos } }] : []),
        ],
      }
    : {};

  return db.cliente.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 200,
    include: { _count: { select: { veiculos: true } } },
  });
}

export async function listarClientesParaSelecao(ator: Ator) {
  exigirAdmin(ator);
  return db.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cpf: true } });
}

export async function obterCliente(ator: Ator, id: string) {
  exigirAdmin(ator);
  return db.cliente.findUnique({
    where: { id },
    include: {
      veiculos: { orderBy: { placa: "asc" } },
      usuario: { select: { id: true, email: true, nome: true } },
      solicitacoes: { where: { status: "PENDENTE" }, include: { usuario: { select: { id: true, email: true, nome: true } } } },
    },
  });
}

export async function criarCliente(ator: Ator, dados: ClienteDados) {
  exigirAdmin(ator);

  const existente = await db.cliente.findUnique({ where: { cpf: dados.cpf }, select: { id: true } });
  if (existente) throw new ErroDeNegocio("Já existe um cliente com este CPF.", "cpf");

  return db.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: { nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, email: dados.email, endereco: dados.endereco ?? null },
    });

    // O cliente pode já ter criado a conta no site antes de a oficina cadastrá-lo.
    const conta = await tx.usuario.findFirst({ where: { cpf: dados.cpf, papel: "CLIENTE", clienteId: null } });
    if (conta?.cpf) {
      const resultado = decidirVinculo({ cpf: conta.cpf, email: conta.email }, cliente);
      if (resultado === "AUTOMATICO") {
        await tx.usuario.update({ where: { id: conta.id }, data: { clienteId: cliente.id } });
      } else if (resultado === "PENDENTE") {
        await tx.solicitacaoVinculo.create({ data: { usuarioId: conta.id, clienteId: cliente.id } });
      }
    }
    return cliente;
  });
}

export async function atualizarCliente(ator: Ator, id: string, dados: ClienteDados) {
  exigirAdmin(ator);

  const atual = await db.cliente.findUnique({ where: { id }, include: { usuario: { select: { id: true } } } });
  if (!atual) throw new ErroDeNegocio("Cliente não encontrado.");

  if (dados.cpf !== atual.cpf) {
    if (atual.usuario) {
      throw new ErroDeNegocio("Este cliente já tem conta no site: o CPF não pode ser alterado.", "cpf");
    }
    const outro = await db.cliente.findFirst({ where: { cpf: dados.cpf, NOT: { id } }, select: { id: true } });
    if (outro) throw new ErroDeNegocio("Já existe outro cliente com este CPF.", "cpf");
  }

  return db.cliente.update({
    where: { id },
    data: { nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, email: dados.email, endereco: dados.endereco ?? null },
  });
}
