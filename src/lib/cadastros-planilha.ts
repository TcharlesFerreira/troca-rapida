/**
 * Cadastros (clientes e veículos) em planilha: as colunas, como ler cada linha e o que conferir.
 * Uma linha = um veículo com os dados do dono. Cliente sem carro: deixe as colunas do veículo vazias.
 * Não depende do Prisma (os testes rodam sem banco).
 */
import { cpfValido, normalizarCpf } from "./cpf";
import { INTERNO, NAO_TEM, normalizarCodigoFiltro } from "./filtros";
import { chaveColuna, lerCsv } from "./planilha";
import { normalizarPlaca, placaValida } from "./placa";

export const CAMPOS = [
  "nome",
  "cpf",
  "telefone",
  "email",
  "endereco",
  "placa",
  "marca",
  "modelo",
  "motor",
  "ano",
  "cor",
  "km",
  "quantidadeOleo",
  "filtroOleo",
  "filtroCombustivel",
  "filtroAr",
  "filtroArCabine",
] as const;
export type Campo = (typeof CAMPOS)[number];

/** Título de cada coluna na planilha (modelo e exportação). */
export const TITULO: Record<Campo, string> = {
  nome: "Nome",
  cpf: "CPF",
  telefone: "Telefone",
  email: "E-mail",
  endereco: "Endereço",
  placa: "Placa",
  marca: "Marca",
  modelo: "Modelo",
  motor: "Motor",
  ano: "Ano",
  cor: "Cor",
  km: "Km atual",
  quantidadeOleo: "Quantidade de óleo (L)",
  filtroOleo: "Filtro de óleo",
  filtroCombustivel: "Filtro de combustível",
  filtroAr: "Filtro de ar",
  filtroArCabine: "Filtro de ar da cabine",
};

/** Outros nomes que as oficinas costumam usar nas planilhas delas. */
const APELIDOS: Record<Campo, string[]> = {
  nome: ["nome", "cliente", "nomedocliente", "nomecliente", "nomecompleto", "proprietario"],
  cpf: ["cpf", "cpfdocliente"],
  telefone: ["telefone", "celular", "whatsapp", "whats", "fone", "tel", "telefonecelular", "contato"],
  email: ["email", "emaildocliente"],
  endereco: ["endereco", "enderecocompleto", "rua"],
  placa: ["placa", "placadoveiculo", "placadocarro"],
  marca: ["marca", "montadora", "fabricante"],
  modelo: ["modelo", "veiculo", "carro", "modelodoveiculo"],
  motor: ["motor", "motorizacao", "cilindrada"],
  ano: ["ano", "anomodelo", "anofabricacao", "anodoveiculo"],
  cor: ["cor"],
  km: ["kmatual", "km", "quilometragem", "kilometragem", "quilometragematual", "hodometro"],
  quantidadeOleo: ["quantidadedeoleol", "quantidadedeoleo", "quantidadeoleo", "litros", "litrosdeoleo", "capacidadedeoleo", "capacidadeoleo", "oleol"],
  filtroOleo: ["filtrodeoleo", "filtrooleo"],
  filtroCombustivel: ["filtrodecombustivel", "filtrocombustivel"],
  filtroAr: ["filtrodear", "filtroar", "filtrodeardomotor", "filtroardomotor"],
  filtroArCabine: ["filtrodeardacabine", "filtroardacabine", "filtrocabine", "filtroarcabine", "filtrodecabine"],
};

const PARA_CAMPO = new Map<string, Campo>(CAMPOS.flatMap((c) => APELIDOS[c].map((a) => [a, c] as const)));

export interface ClienteLido {
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

export interface VeiculoLido {
  placa: string;
  marca: string;
  modelo: string;
  motor: string;
  ano: number;
  cor: string;
  kmAtual: number;
  capacidadeOleoL: number | null;
  filtroOleo: string | null;
  filtroCombustivel: string | null;
  filtroAr: string | null;
  filtroArCabine: string | null;
}

export interface LinhaLida {
  /** Número da linha na planilha (o cabeçalho é a 1). */
  numero: number;
  cliente: ClienteLido;
  veiculo: VeiculoLido | null;
  erros: string[];
}

export type Leitura = { ok: true; linhas: LinhaLida[]; colunasIgnoradas: string[] } | { ok: false; erro: string };

export const MAX_LINHAS = 5000;
const NAO_INFORMADO = "Não informado";
/** Nome da linha de exemplo do modelo (nunca é importada). */
export const NOME_EXEMPLO = "Exemplo (apague esta linha)";

const so = (s: string) => s.replace(/\D/g, "");

/** Mesmo cliente dentro da planilha e no banco: pelo CPF; sem CPF, por nome + telefone. */
export function chaveCliente(c: { nome: string; cpf: string | null; telefone: string | null }): string {
  if (c.cpf) return `cpf:${c.cpf}`;
  return `nt:${chaveColuna(c.nome)}|${c.telefone ?? ""}`;
}

function numero(bruto: string): number | null {
  // "45.000", "45000 km", "3,5", "3.5"
  const t = bruto.toLowerCase().replace(/km|l$|litros?/g, "").trim();
  if (!t) return null;
  const limpo = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t.replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Lê a planilha inteira. Não grava nada: só diz o que cada linha tem e o que está errado. */
export function lerCadastros(texto: string, anoMaximo = new Date().getFullYear() + 1): Leitura {
  const tabela = lerCsv(texto);
  if (tabela.length === 0) return { ok: false, erro: "A planilha está vazia." };

  const cabecalho = tabela[0];
  const indice = new Map<Campo, number>();
  const colunasIgnoradas: string[] = [];
  cabecalho.forEach((titulo, i) => {
    const campo = PARA_CAMPO.get(chaveColuna(titulo));
    if (campo && !indice.has(campo)) indice.set(campo, i);
    else if (titulo.trim()) colunasIgnoradas.push(titulo.trim());
  });
  if (!indice.has("nome")) {
    return { ok: false, erro: "Não achei a coluna “Nome” no cabeçalho (primeira linha). Use o modelo para ver os nomes das colunas." };
  }
  if (tabela.length - 1 > MAX_LINHAS) {
    return { ok: false, erro: `A planilha tem ${tabela.length - 1} linhas; o máximo é ${MAX_LINHAS} por vez. Divida em partes.` };
  }

  const linhas = tabela.slice(1).map((celulas, i): LinhaLida => {
    // O apóstrofo da frente é o que a exportação põe para o Excel não ler como fórmula.
    const v = (campo: Campo) => {
      const pos = indice.get(campo);
      return pos === undefined ? "" : (celulas[pos] ?? "").trim().replace(/^'/, "").trim();
    };
    const erros: string[] = [];

    const nome = v("nome").replace(/\s+/g, " ");
    if (nome.length < 3) erros.push("Nome vazio ou muito curto.");
    if (nome.toLowerCase().startsWith(NOME_EXEMPLO.toLowerCase().slice(0, 16))) erros.push("É a linha de exemplo do modelo: apague-a.");

    const cpfBruto = v("cpf");
    let cpf: string | null = null;
    if (cpfBruto) {
      // O Excel costuma comer o zero da frente do CPF: completa até 11 números.
      const d = so(cpfBruto).padStart(11, "0");
      if (cpfValido(d)) cpf = normalizarCpf(d);
      else erros.push(`CPF inválido: “${cpfBruto}”.`);
    }

    const telBruto = v("telefone");
    let telefone: string | null = null;
    if (telBruto) {
      let d = so(telBruto);
      if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
      if (d.length === 10 || d.length === 11) telefone = d;
      else erros.push(`Telefone inválido: “${telBruto}” (use DDD + número).`);
    }

    const emailBruto = v("email").toLowerCase();
    let email: string | null = null;
    if (emailBruto) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBruto)) email = emailBruto;
      else erros.push(`E-mail inválido: “${emailBruto}”.`);
    }

    const cliente: ClienteLido = { nome, cpf, telefone, email, endereco: v("endereco") || null };

    // Veículo: só quando alguma coluna do veículo tem algo.
    const camposVeiculo: Campo[] = ["placa", "marca", "modelo", "motor", "ano", "cor", "km", "quantidadeOleo", "filtroOleo", "filtroCombustivel", "filtroAr", "filtroArCabine"];
    let veiculo: VeiculoLido | null = null;
    if (camposVeiculo.some((c) => v(c))) {
      const placaBruta = v("placa");
      if (!placaBruta) erros.push("Veículo sem placa.");
      else if (!placaValida(placaBruta)) erros.push(`Placa inválida: “${placaBruta}”.`);
      if (!v("marca")) erros.push("Veículo sem marca.");
      if (!v("modelo")) erros.push("Veículo sem modelo.");

      // "2015/2016" (fabricação/modelo): fica o primeiro.
      const ano = numero(v("ano").match(/^(\d{4})\s*\/\s*\d{2,4}$/)?.[1] ?? v("ano"));
      if (ano === null || !Number.isInteger(ano) || ano < 1950 || ano > anoMaximo) erros.push(`Ano inválido: “${v("ano")}”.`);

      const kmBruto = v("km");
      const km = kmBruto ? numero(kmBruto) : 0;
      if (km === null || !Number.isInteger(km) || km < 0 || km > 2_000_000) erros.push(`Km inválido: “${kmBruto}”.`);

      const litrosBruto = v("quantidadeOleo");
      const litros = litrosBruto ? numero(litrosBruto) : null;
      if (litrosBruto && (litros === null || litros < 0.5 || litros > 30)) erros.push(`Quantidade de óleo inválida: “${litrosBruto}”.`);

      veiculo = {
        placa: normalizarPlaca(placaBruta),
        marca: v("marca"),
        modelo: v("modelo"),
        motor: v("motor") || NAO_INFORMADO,
        ano: ano ?? 0,
        cor: v("cor") || NAO_INFORMADO,
        kmAtual: km ?? 0,
        capacidadeOleoL: litros,
        filtroOleo: normalizarCodigoFiltro(v("filtroOleo")),
        filtroCombustivel: normalizarCodigoFiltro(v("filtroCombustivel")),
        filtroAr: normalizarCodigoFiltro(v("filtroAr")),
        filtroArCabine: normalizarCodigoFiltro(v("filtroArCabine")),
      };
    }

    return { numero: i + 2, cliente, veiculo, erros };
  });

  return { ok: true, linhas, colunasIgnoradas };
}

/** Filtro como sai na planilha (o contrário de normalizarCodigoFiltro). */
export function filtroParaPlanilha(codigo: string | null | undefined): string {
  if (!codigo) return "";
  if (codigo === NAO_TEM) return "Não tem";
  if (codigo === INTERNO) return "Interno";
  return codigo;
}
