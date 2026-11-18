import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirSuperadmin, type Ator } from "@/lib/permissoes";

export interface EmpresaDados {
  nome: string;
  cnpj?: string; // só dígitos
}

export interface NovaEmpresaDados extends EmpresaDados {
  adminNome: string;
  adminEmail: string;
  adminSenha: string;
}

export async function listarEmpresas(ator: Ator) {
  exigirSuperadmin(ator);
  return db.empresa.findMany({
    orderBy: { nome: "asc" },
    include: {
      usuarios: { where: { papel: "ADMIN" }, select: { nome: true, email: true } },
      _count: { select: { clientes: true, veiculos: true } },
    },
  });
}

export async function obterEmpresa(ator: Ator, id: string) {
  exigirSuperadmin(ator);
  return db.empresa.findUnique({
    where: { id },
    include: {
      usuarios: { where: { papel: "ADMIN" }, select: { id: true, nome: true, email: true } },
      _count: { select: { clientes: true, veiculos: true } },
    },
  });
}

async function cnpjLivre(cnpj: string | undefined, exceto?: string) {
  if (!cnpj) return;
  const outra = await db.empresa.findFirst({ where: { cnpj, ...(exceto ? { NOT: { id: exceto } } : {}) }, select: { id: true } });
  if (outra) throw new ErroDeNegocio("Já existe uma empresa com este CNPJ.", "cnpj");
}

/** Cria a empresa e o administrador dela de uma vez (nada fica pela metade). */
export async function criarEmpresa(ator: Ator, dados: NovaEmpresaDados) {
  exigirSuperadmin(ator);
  await cnpjLivre(dados.cnpj);
  const emailUsado = await db.usuario.findUnique({ where: { email: dados.adminEmail }, select: { id: true } });
  if (emailUsado) throw new ErroDeNegocio("Já existe uma conta com este e-mail.", "adminEmail");

  const senhaHash = await bcrypt.hash(dados.adminSenha, 12);
  return db.empresa.create({
    data: {
      nome: dados.nome,
      cnpj: dados.cnpj ?? null,
      usuarios: { create: { nome: dados.adminNome, email: dados.adminEmail, senhaHash, papel: "ADMIN" } },
    },
  });
}

export async function atualizarEmpresa(ator: Ator, id: string, dados: EmpresaDados) {
  exigirSuperadmin(ator);
  const atual = await db.empresa.findUnique({ where: { id }, select: { id: true } });
  if (!atual) throw new ErroDeNegocio("Empresa não encontrada.");
  await cnpjLivre(dados.cnpj, id);
  return db.empresa.update({ where: { id }, data: { nome: dados.nome, cnpj: dados.cnpj ?? null } });
}
