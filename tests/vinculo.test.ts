import { describe, it, expect } from "vitest";
import { decidirVinculo } from "@/lib/vinculo";

const cadastro = { cpf: "529.982.247-25", email: "Maria@Exemplo.com" };

describe("vínculo da conta com o cadastro da oficina (item 2)", () => {
  it("CPF e e-mail iguais: liga automaticamente (ignora máscara e maiúsculas)", () => {
    expect(decidirVinculo({ cpf: "52998224725", email: "maria@exemplo.com " }, cadastro)).toBe("AUTOMATICO");
  });

  it("só o CPF igual: fica pendente até o administrador confirmar", () => {
    expect(decidirVinculo({ cpf: "52998224725", email: "outra@exemplo.com" }, cadastro)).toBe("PENDENTE");
  });

  it("e-mail igual mas CPF diferente: não liga (ninguém entra só pelo e-mail)", () => {
    expect(decidirVinculo({ cpf: "11144477735", email: "maria@exemplo.com" }, cadastro)).toBe("SEM_CADASTRO");
  });

  it("sem cadastro com aquele CPF: a conta espera a oficina", () => {
    expect(decidirVinculo({ cpf: "52998224725", email: "maria@exemplo.com" }, null)).toBe("SEM_CADASTRO");
  });
});
