import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { normalizarPlaca } from "@/lib/placa";
import { buscarRecomendacao, incluirRecomendacaoCompleta } from "./base-oleo";

export interface VeiculoDados {
  clienteId: string;
  placa: string; // já normalizada
  marca: string;
  modelo: string;
  motor: string;
  ano: number;
  cor: string;
  kmAtual: number;
}

export async function listarVeiculos(ator: Ator, busca?: string) {
  exigirAdmin(ator);
  const termo = busca?.trim();
  const placa = termo ? normalizarPlaca(termo) : "";

  const where: Prisma.VeiculoWhereInput = termo
    ? {
        OR: [
          ...(placa ? [{ placa: { contains: placa } }] : []),
          { modelo: { contains: termo, mode: "insensitive" as const } },
          { marca: { contains: termo, mode: "insensitive" as const } },
          { cliente: { nome: { contains: termo, mode: "insensitive" as const } } },
        ],
      }
    : {};

  return db.veiculo.findMany({
    where,
    orderBy: { placa: "asc" },
    take: 200,
    include: { cliente: { select: { id: true, nome: true } }, recomendacaoOleo: { select: { id: true } } },
  });
}

export async function obterVeiculo(ator: Ator, id: string) {
  exigirAdmin(ator);
  return db.veiculo.findUnique({
    where: { id },
    include: {
      cliente: true,
      recomendacaoOleo: { include: incluirRecomendacaoCompleta },
      ordens: {
        orderBy: [{ dataEntrada: "desc" }, { numero: "desc" }],
        include: { trocaOleo: true },
      },
    },
  });
}

export async function criarVeiculo(ator: Ator, dados: VeiculoDados) {
  exigirAdmin(ator);

  const cliente = await db.cliente.findUnique({ where: { id: dados.clienteId }, select: { id: true } });
  if (!cliente) throw new ErroDeNegocio("Escolha um cliente da lista.", "clienteId");

  const placaUsada = await db.veiculo.findUnique({ where: { placa: dados.placa }, select: { id: true } });
  if (placaUsada) throw new ErroDeNegocio("Já existe um veículo com esta placa.", "placa");

  const recomendacao = await buscarRecomendacao(dados);
  return db.veiculo.create({ data: { ...dados, recomendacaoOleoId: recomendacao?.id ?? null } });
}

export async function atualizarVeiculo(ator: Ator, id: string, dados: VeiculoDados) {
  exigirAdmin(ator);

  const atual = await db.veiculo.findUnique({ where: { id }, select: { id: true } });
  if (!atual) throw new ErroDeNegocio("Veículo não encontrado.");

  const cliente = await db.cliente.findUnique({ where: { id: dados.clienteId }, select: { id: true } });
  if (!cliente) throw new ErroDeNegocio("Escolha um cliente da lista.", "clienteId");

  const placaUsada = await db.veiculo.findFirst({ where: { placa: dados.placa, NOT: { id } }, select: { id: true } });
  if (placaUsada) throw new ErroDeNegocio("Já existe outro veículo com esta placa.", "placa");

  const recomendacao = await buscarRecomendacao(dados);
  return db.veiculo.update({ where: { id }, data: { ...dados, recomendacaoOleoId: recomendacao?.id ?? null } });
}
