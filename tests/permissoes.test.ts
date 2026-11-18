import { describe, it, expect } from "vitest";
import { exigirAdmin, exigirClienteVinculado } from "@/lib/permissoes";
import { ErroPermissao } from "@/lib/erros";

describe("permissões", () => {
  it("cliente não passa na checagem de administrador", () => {
    expect(() => exigirAdmin({ usuarioId: "u1", papel: "CLIENTE", clienteId: "c1" })).toThrow(ErroPermissao);
  });

  it("administrador passa na checagem de administrador", () => {
    expect(() => exigirAdmin({ usuarioId: "u1", papel: "ADMIN", clienteId: null })).not.toThrow();
  });

  it("cliente sem vínculo confirmado não acessa dados de ninguém", () => {
    expect(() => exigirClienteVinculado({ usuarioId: "u1", papel: "CLIENTE", clienteId: null })).toThrow(ErroPermissao);
  });

  it("administrador não usa a área do cliente", () => {
    expect(() => exigirClienteVinculado({ usuarioId: "u1", papel: "ADMIN", clienteId: null })).toThrow(ErroPermissao);
  });

  it("cliente vinculado recebe o próprio clienteId", () => {
    expect(exigirClienteVinculado({ usuarioId: "u1", papel: "CLIENTE", clienteId: "c1" })).toBe("c1");
  });
});
