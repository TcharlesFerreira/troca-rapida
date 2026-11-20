import { describe, it, expect } from "vitest";
import { chaveCliente, filtroParaPlanilha, lerCadastros } from "@/lib/cadastros-planilha";
import { gerarCsv, lerCsv } from "@/lib/planilha";

describe("CSV", () => {
  it("lê ponto e vírgula, vírgula e tabulação, com aspas", () => {
    expect(lerCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(lerCsv("a,b\r\n\"x, y\",\"diz \"\"oi\"\"\"")).toEqual([["a", "b"], ["x, y", 'diz "oi"']]);
    expect(lerCsv("a\tb\n1\t2\n\n")).toEqual([["a", "b"], ["1", "2"]]);
    expect(lerCsv('﻿nome;obs\nANA;"linha 1\nlinha 2"')).toEqual([["nome", "obs"], ["ANA", "linha 1\nlinha 2"]]);
  });

  it("gera CSV que volta igual e não deixa fórmula passar", () => {
    const csv = gerarCsv([["nome", "obs"], ["ANA; filha", "=HYPERLINK(1)"], ["BETO", 'diz "oi"']]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lerCsv(csv)).toEqual([["nome", "obs"], ["ANA; filha", "'=HYPERLINK(1)"], ["BETO", 'diz "oi"']]);
  });
});

describe("leitura dos cadastros", () => {
  const ok = (texto: string) => {
    const r = lerCadastros(texto, 2027);
    if (!r.ok) throw new Error(r.erro);
    return r;
  };

  it("aceita os nomes de coluna das oficinas e limpa os valores", () => {
    const r = ok(
      "Nome do cliente;Celular;CPF;Placa;Marca;Modelo;Ano;Quilometragem;Litros;Filtro de óleo;Filtro cabine;Observação\n" +
        "Maria Souza;+55 (11) 91234-5678;529.982.247-25;abc-1d23;Fiat;Uno;2015/2016;45.000 km;3,5 L;psl 55;n/t;cliente antigo",
    );
    expect(r.colunasIgnoradas).toEqual(["Observação"]);
    const [l] = r.linhas;
    expect(l.erros).toEqual([]);
    expect(l.numero).toBe(2);
    expect(l.cliente).toEqual({ nome: "Maria Souza", cpf: "52998224725", telefone: "11912345678", email: null, endereco: null });
    expect(l.veiculo).toMatchObject({ placa: "ABC1D23", marca: "Fiat", modelo: "Uno", ano: 2015, kmAtual: 45000, capacidadeOleoL: 3.5, filtroOleo: "PSL 55", filtroArCabine: "NAO_TEM", motor: "Não informado", cor: "Não informado" });
  });

  it("cliente sem carro é aceito; carro sem placa, não", () => {
    const r = ok("Nome;Telefone;Placa;Marca;Modelo;Ano\nJOAO SILVA;11 3333-4444;;;;\nANA LIMA;;;Fiat;Uno;2015");
    expect(r.linhas[0].veiculo).toBeNull();
    expect(r.linhas[0].erros).toEqual([]);
    expect(r.linhas[1].erros).toContain("Veículo sem placa.");
  });

  it("aponta cada problema da linha", () => {
    const r = ok("Nome;CPF;Telefone;E-mail;Placa;Marca;Modelo;Ano;Km\nAB;111.111.111-11;1234;ana@;XX1;Fiat;;1800;-5");
    expect(r.linhas[0].erros).toEqual([
      "Nome vazio ou muito curto.",
      "CPF inválido: “111.111.111-11”.",
      "Telefone inválido: “1234” (use DDD + número).",
      "E-mail inválido: “ana@”.",
      "Placa inválida: “XX1”.",
      "Veículo sem modelo.",
      "Ano inválido: “1800”.",
      "Km inválido: “-5”.",
    ]);
  });

  it("completa o zero que o Excel tira do CPF e lê o apóstrofo da exportação", () => {
    const r = ok("Nome;CPF;Placa;Marca;Modelo;Ano\nCARLA;1234567890;'ABC1234;VW;Gol;2010");
    // 01234567890 é um CPF válido sem o zero da frente
    expect(r.linhas[0].cliente.cpf).toBe("01234567890");
    expect(r.linhas[0].veiculo?.placa).toBe("ABC1234");
  });

  it("recusa planilha sem coluna de nome", () => {
    const r = lerCadastros("Placa;Modelo\nABC1234;Uno");
    expect(r.ok).toBe(false);
  });

  it("chave do cliente: CPF, ou nome + telefone", () => {
    expect(chaveCliente({ nome: "Ana", cpf: "52998224725", telefone: null })).toBe("cpf:52998224725");
    expect(chaveCliente({ nome: "Ána  Lima", cpf: null, telefone: "11912345678" })).toBe(chaveCliente({ nome: "ANA LIMA", cpf: null, telefone: "11912345678" }));
  });

  it("filtros saem na planilha de um jeito que volta igual", () => {
    expect(filtroParaPlanilha("NAO_TEM")).toBe("Não tem");
    expect(filtroParaPlanilha("INTERNO")).toBe("Interno");
    const r = ok(`Nome;Placa;Marca;Modelo;Ano;Filtro de combustível;Filtro de ar da cabine\nANA;ABC1234;VW;Gol;2010;${filtroParaPlanilha("INTERNO")};${filtroParaPlanilha("NAO_TEM")}`);
    expect(r.linhas[0].veiculo).toMatchObject({ filtroCombustivel: "INTERNO", filtroArCabine: "NAO_TEM" });
  });
});
