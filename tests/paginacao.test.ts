import { describe, it, expect } from "vitest";
import { paginaForaDoFim } from "@/lib/paginacao";

describe("paginaForaDoFim", () => {
  it("manda para a última página quando pediram uma além do fim", () => {
    expect(paginaForaDoFim("/admin/clientes", undefined, { itens: [], total: 36, paginas: 1 })).toBe("/admin/clientes");
    expect(paginaForaDoFim("/admin/clientes", "ana", { itens: [], total: 120, paginas: 3 })).toBe("/admin/clientes?q=ana&pagina=3");
  });
  it("não mexe quando a página existe ou a lista está vazia", () => {
    expect(paginaForaDoFim("/admin/clientes", undefined, { itens: [1], total: 36, paginas: 1 })).toBeNull();
    expect(paginaForaDoFim("/admin/clientes", "zzz", { itens: [], total: 0, paginas: 1 })).toBeNull();
  });
});
