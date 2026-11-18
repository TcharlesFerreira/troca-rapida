import { describe, it, expect } from "vitest";
import { proximosStatus, transicaoPermitida } from "@/lib/status-os";

describe("status da OS", () => {
  it("segue Aguardando → Em andamento → Pronto para retirada → Entregue", () => {
    expect(transicaoPermitida("AGUARDANDO", "EM_ANDAMENTO")).toBe(true);
    expect(transicaoPermitida("EM_ANDAMENTO", "PRONTO_RETIRADA")).toBe(true);
    expect(transicaoPermitida("PRONTO_RETIRADA", "ENTREGUE")).toBe(true);
  });

  it("não pula etapas", () => {
    expect(transicaoPermitida("AGUARDANDO", "PRONTO_RETIRADA")).toBe(false);
    expect(transicaoPermitida("AGUARDANDO", "ENTREGUE")).toBe(false);
    expect(transicaoPermitida("EM_ANDAMENTO", "ENTREGUE")).toBe(false);
  });

  it("permite cancelar enquanto não foi entregue", () => {
    expect(transicaoPermitida("AGUARDANDO", "CANCELADO")).toBe(true);
    expect(transicaoPermitida("PRONTO_RETIRADA", "CANCELADO")).toBe(true);
  });

  it("entregue e cancelada são finais", () => {
    expect(proximosStatus("ENTREGUE")).toHaveLength(0);
    expect(proximosStatus("CANCELADO")).toHaveLength(0);
  });
});
