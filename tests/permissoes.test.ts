import { describe, it, expect } from "vitest";
import { exigirAdmin, exigirClienteVinculado, exigirSuperadmin } from "@/lib/permissoes";
import { ErroPermissao } from "@/lib/erros";
import type { Ator } from "@/lib/permissoes";

const cliente: Ator = { usuarioId: "u1", papel: "CLIENTE", empresaId: null, clienteIds: ["c1"] };
const clienteSemVinculo: Ator = { usuarioId: "u1", papel: "CLIENTE", empresaId: null, clienteIds: [] };
const admin: Ator = { usuarioId: "u2", papel: "ADMIN", empresaId: "emp-1", clienteIds: [] };
const adminSemEmpresa: Ator = { usuarioId: "u3", papel: "ADMIN", empresaId: null, clienteIds: [] };
const superadmin: Ator = { usuarioId: "u4", papel: "SUPERADMIN", empresaId: null, clienteIds: [] };

describe("permissões", () => {
  it("cliente não passa na checagem de administrador", () => {
    expect(() => exigirAdmin(cliente)).toThrow(ErroPermissao);
  });

  it("administrador passa e recebe a própria empresa", () => {
    expect(exigirAdmin(admin)).toBe("emp-1");
  });

  it("administrador sem empresa não acessa nada", () => {
    expect(() => exigirAdmin(adminSemEmpresa)).toThrow(ErroPermissao);
  });

  it("superadministrador não entra na área de uma empresa (não vê clientes)", () => {
    expect(() => exigirAdmin(superadmin)).toThrow(ErroPermissao);
  });

  it("só o superadministrador cadastra empresas", () => {
    expect(() => exigirSuperadmin(superadmin)).not.toThrow();
    for (const ator of [admin, cliente]) expect(() => exigirSuperadmin(ator)).toThrow(ErroPermissao);
  });

  it("cliente sem vínculo confirmado não acessa dados de ninguém", () => {
    expect(() => exigirClienteVinculado(clienteSemVinculo)).toThrow(ErroPermissao);
  });

  it("administrador não usa a área do cliente", () => {
    expect(() => exigirClienteVinculado(admin)).toThrow(ErroPermissao);
  });

  it("cliente vinculado recebe os próprios cadastros", () => {
    expect(exigirClienteVinculado(cliente)).toEqual(["c1"]);
  });
});
