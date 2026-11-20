/**
 * Assistente da base de óleo SEM IA: entende a pergunta por palavras-chave e responde só com
 * registros do banco. Funções puras (sem Prisma), testadas em tests/assistente.test.ts.
 *
 * Regras (as mesmas que valeriam para uma IA):
 *  1. Nunca inventar: todo valor do texto sai de um registro da base, que vai junto com fonte e confiança.
 *  2. Sem registro, diz que não tem a informação.
 *  3. Fontes que discordam: mostra o valor de cada uma e não escolhe.
 *
 * O "entender" (interpretar) fica separado do "responder" (montarResposta): para trocar as
 * palavras-chave por um modelo de linguagem no futuro, basta outra função que devolva a mesma Interpretacao.
 */
import { dominioBase } from "./base-oleo-json";
import { filtrosDoRegistro } from "./filtros";
import { kmBR, litrosBR } from "./formatar";
import { ROTULO_CONFIANCA, type Confianca, type TipoFonte } from "./tipos";

export const MAX_PERGUNTA = 300;

export type Assunto = "OLEO" | "CAPACIDADE" | "INTERVALO" | "FILTROS";

export interface Interpretacao {
  assunto: Assunto | "AJUDA";
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  /** Monta um texto de motor que as regras de filtro entendem: "1.0", "1.0 turbo", "1.6 aspirado"... */
  motor: string | null;
}

/** Marcas e modelos que existem no sistema (base de óleo e catálogo de filtros). */
export type CatalogoNomes = Array<{ marca: string; modelos: string[] }>;

/** "Olá, Fiat Uno 1.0!" -> "ola fiat uno 1.0". Mantém ponto e vírgula entre números (1.0, 1,4). */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d)[.,](\d)/g, "$1.$2")
    .replace(/[^a-z0-9.\s]+/g, " ")
    .replace(/\.(?!\d)|(?<!\d)\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "HR-V" -> "hrv", "T-Cross" -> "tcross", "Corolla Cross" -> "corolla cross". */
const chaveNome = (nome: string) => normalizarTexto(nome.replace(/-/g, ""));

const APELIDOS_MARCA: Record<string, string[]> = {
  Volkswagen: ["vw", "volks", "volkswagen"],
  Chevrolet: ["chevrolet", "chevy", "gm"],
};

function contem(frase: string, trecho: string): boolean {
  return ` ${frase} `.includes(` ${trecho} `);
}

/** Acha o modelo citado (o nome mais comprido que aparece) e a marca, pelo nome ou apelido. */
function acharCarro(frase: string, catalogo: CatalogoNomes): { marca: string | null; modelo: string | null } {
  // "hr v" e "t cross" escritos separados também valem.
  const semEspaco = frase.replace(/\b(hr|t) (v|cross)\b/g, "$1$2");
  let melhor: { marca: string; modelo: string; tamanho: number } | null = null;
  for (const { marca, modelos } of catalogo) {
    for (const modelo of modelos) {
      for (const variante of modelo.split("/")) {
        const chave = chaveNome(variante);
        if (chave && contem(semEspaco, chave) && (!melhor || chave.length > melhor.tamanho)) {
          melhor = { marca, modelo, tamanho: chave.length };
        }
      }
    }
  }
  if (melhor) return { marca: melhor.marca, modelo: melhor.modelo };

  for (const { marca } of catalogo) {
    const apelidos = APELIDOS_MARCA[marca] ?? [chaveNome(marca)];
    if (apelidos.some((a) => contem(frase, a))) return { marca, modelo: null };
  }
  return { marca: null, modelo: null };
}

function acharMotor(frase: string): string | null {
  const cc = frase.match(/\b([1-6]\.\d)\b/)?.[1] ?? (/\b(mil|1000)\b/.test(frase) ? "1.0" : null);
  const turbo = /\b(turbo|tsi|tgdi|t200|t270|\d{3}tsi)\b/.test(frase);
  const aspirado = /\baspirado\b/.test(frase);
  const partes = [cc, turbo ? "turbo" : aspirado ? "aspirado" : null].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

function acharAssunto(frase: string): Assunto {
  if (/\bfiltros?\b/.test(frase)) return "FILTROS";
  if (/\b(quantos? litros?|litragem|capacidade|quantidade|quanto (de )?oleo (vai|leva|cabe|precisa)|leva quanto|vai quanto)\b/.test(frase)) return "CAPACIDADE";
  if (/\b(quando trocar|quando troca|intervalo|a cada|de quanto em quanto|quantos km|validade|durabilidade|prazo)\b/.test(frase)) return "INTERVALO";
  return "OLEO";
}

export function interpretar(pergunta: string, catalogo: CatalogoNomes): Interpretacao {
  const frase = normalizarTexto(pergunta.slice(0, MAX_PERGUNTA));
  const { marca, modelo } = acharCarro(frase, catalogo);
  const ano = Number(frase.match(/\b(19[5-9]\d|20[0-4]\d)\b/)?.[1]) || null;
  const saudacao = /^(oi|ola|ajuda|help|bom dia|boa tarde|boa noite|e ai|opa|menu|inicio)\b/.test(frase);
  return {
    assunto: !frase || (saudacao && !marca) ? "AJUDA" : acharAssunto(frase),
    marca,
    modelo,
    ano,
    motor: acharMotor(frase),
  };
}

// ---------------------------------------------------------------- resposta

export interface FonteRegistro {
  id: string;
  tipo: TipoFonte;
  url: string;
  consultadaEm: Date;
  observacao: string | null;
  viscosidade: string | null;
  especificacao: string | null;
  capacidadeComFiltroL: number | null;
  capacidadeSemFiltroL: number | null;
  intervaloKm: number | null;
  intervaloMeses: number | null;
}

/** Um registro da base de óleo como sai do banco (mesmo formato que o cartão da tela usa). */
export interface RegistroOleo {
  id: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  viscosidade: string;
  especificacao: string;
  capacidadeComFiltroL: number | null;
  capacidadeSemFiltroL: number | null;
  intervaloKm: number | null;
  intervaloMeses: number | null;
  confianca: Confianca;
  divergencias: string[];
  fontes: FonteRegistro[];
}

export interface AplicacaoFiltro {
  fabricante: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  tipo: "OLEO" | "COMBUSTIVEL" | "AR" | "AR_CABINE";
  codigo: string;
  url: string;
  consultadaEm: Date;
  observacao: string | null;
}

export interface DadosDoCarro {
  /** Registros de óleo do modelo (todos os motores e anos). */
  registros: RegistroOleo[];
  /** Aplicações do catálogo de filtros do modelo. */
  filtros: AplicacaoFiltro[];
}

export type TipoResposta = "AJUDA" | "NAO_ENTENDI" | "NAO_ENCONTRADO" | "ESCLARECER" | "ENCONTRADO";

export interface Resposta {
  tipo: TipoResposta;
  texto: string;
  /** Registros que sustentam a resposta: a tela mostra cada um com fontes e confiança. */
  registros: RegistroOleo[];
  filtros: AplicacaoFiltro[];
  /** Botões de resposta rápida (ex.: escolher o motor). */
  opcoes: Array<{ rotulo: string; pergunta: string }>;
}

const anos = (r: { anoInicial: number; anoFinal: number }) => (r.anoInicial === r.anoFinal ? `${r.anoInicial}` : `${r.anoInicial} a ${r.anoFinal}`);

export const EXEMPLOS = ["Qual óleo do Gol 1.0 2015?", "Quantos litros leva o HB20 1.0 turbo 2021?", "Filtros do Onix 1.0 turbo 2022", "Quando trocar o óleo do Renegade 2020?"];

const ROTULO_CAMPO: Record<string, string> = {
  viscosidade: "viscosidade",
  especificacao: "especificação",
  capacidadeComFiltroL: "quantidade com filtro",
  capacidadeSemFiltroL: "quantidade sem filtro",
  intervaloKm: "intervalo em km",
  intervaloMeses: "intervalo em meses",
};

function valorFonte(f: FonteRegistro, campo: string): string | null {
  const v = (f as unknown as Record<string, unknown>)[campo];
  if (v === null || v === undefined) return null;
  if (campo.startsWith("capacidade")) return litrosBR(v as number);
  if (campo === "intervaloKm") return kmBR(v as number);
  if (campo === "intervaloMeses") return `${v} meses`;
  return String(v);
}

/** Frase com o valor de cada fonte nos campos em que elas discordam (sem escolher nenhum). */
function textoDivergencia(r: RegistroOleo): string {
  if (r.confianca !== "DIVERGENTE" || r.divergencias.length === 0) return "";
  const partes = r.divergencias.map((campo) => {
    const porSite = new Map<string, string>();
    for (const f of r.fontes) {
      const v = valorFonte(f, campo);
      if (v && !porSite.has(dominioBase(f.url))) porSite.set(dominioBase(f.url), v);
    }
    return `${ROTULO_CAMPO[campo] ?? campo}: ${[...porSite].map(([site, v]) => `${site} diz ${v}`).join("; ")}`;
  });
  return ` Atenção, as fontes discordam (${partes.join(". ")}). Não escolho entre elas: confira no manual do veículo.`;
}

function sitesDe(r: RegistroOleo): string {
  const sites = [...new Set(r.fontes.map((f) => dominioBase(f.url)))];
  return `${sites.length > 1 ? "fontes" : "fonte"}: ${sites.join(", ")}`;
}

function textoDoRegistro(carro: string, r: RegistroOleo, assunto: Assunto): string {
  const titulo = `${carro} ${r.motor}, ${anos(r)}`;
  let principal: string;
  if (assunto === "CAPACIDADE") {
    const com = r.capacidadeComFiltroL !== null ? `${litrosBR(r.capacidadeComFiltroL)} quando troca o filtro` : null;
    const sem = r.capacidadeSemFiltroL !== null ? `${litrosBR(r.capacidadeSemFiltroL)} sem trocar o filtro` : null;
    principal = com || sem ? `leva óleo ${r.viscosidade}: ${[com, sem].filter(Boolean).join(", ou ")}` : `a base não tem a quantidade de óleo deste motor (o óleo indicado é ${r.viscosidade})`;
  } else if (assunto === "INTERVALO") {
    principal =
      r.intervaloKm !== null || r.intervaloMeses !== null
        ? `troca a cada ${[r.intervaloKm !== null ? kmBR(r.intervaloKm) : null, r.intervaloMeses !== null ? `${r.intervaloMeses} meses` : null].filter(Boolean).join(" ou ")}, o que vier primeiro`
        : `a base não tem o intervalo de troca deste motor (o óleo indicado é ${r.viscosidade})`;
  } else {
    const qtd = r.capacidadeComFiltroL !== null ? `, ${litrosBR(r.capacidadeComFiltroL)} com filtro` : "";
    principal = `óleo ${r.viscosidade}, norma ${r.especificacao}${qtd}`;
  }
  return `${titulo}: ${principal}. Confiança: ${ROTULO_CONFIANCA[r.confianca]} (${sitesDe(r)}).${textoDivergencia(r)}`;
}

/** Registros do motor e ano perguntados (a mesma regra de cilindrada e turbo dos filtros). */
function registrosQueServem(i: Interpretacao, registros: RegistroOleo[]): RegistroOleo[] {
  return filtrosDoRegistro({ motor: i.motor ?? "", anoInicial: i.ano ?? 0, anoFinal: i.ano ?? 9999 }, registros);
}

export function montarResposta(i: Interpretacao, dados: DadosDoCarro | null, catalogo: CatalogoNomes): Resposta {
  const vazia = { registros: [], filtros: [], opcoes: [] };
  const exemplos = EXEMPLOS.map((p) => ({ rotulo: p, pergunta: p }));

  if (i.assunto === "AJUDA") {
    return {
      ...vazia,
      tipo: "AJUDA",
      texto: "Pergunte sobre óleo, quantidade, intervalo de troca ou filtros de um carro, com modelo, motor e ano. Respondo só com o que está na base, sempre com a fonte.",
      opcoes: exemplos,
    };
  }

  if (!i.modelo) {
    if (i.marca) {
      const modelos = catalogo.find((c) => c.marca === i.marca)?.modelos ?? [];
      return {
        ...vazia,
        tipo: "ESCLARECER",
        texto: `Qual modelo da ${i.marca}? Estes estão no sistema:`,
        opcoes: modelos.slice(0, 12).map((m) => ({ rotulo: m, pergunta: `${perguntaBase(i.assunto)} ${m}${i.motor ? ` ${i.motor}` : ""}${i.ano ? ` ${i.ano}` : ""}` })),
      };
    }
    return { ...vazia, tipo: "NAO_ENTENDI", texto: "Não reconheci o carro na pergunta. Escreva o modelo, o motor e o ano, como nos exemplos:", opcoes: exemplos };
  }

  const carro = `${i.marca} ${i.modelo}`;
  const registros = dados?.registros ?? [];
  const filtros = dados?.filtros ?? [];

  if (i.assunto === "FILTROS") return respostaFiltros(i, carro, filtros);

  if (registros.length === 0) {
    return {
      ...vazia,
      tipo: "NAO_ENCONTRADO",
      texto: `Não tenho essa informação: o ${carro} não está na base de óleo, e eu não respondo sem uma fonte.${filtros.length ? " Tenho os filtros dele no catálogo." : ""}`,
      opcoes: filtros.length ? [{ rotulo: `Filtros do ${i.modelo}`, pergunta: `Filtros do ${i.modelo}${i.motor ? ` ${i.motor}` : ""}${i.ano ? ` ${i.ano}` : ""}` }] : [],
    };
  }

  const servem = registrosQueServem(i, registros);
  if (servem.length === 0) {
    return {
      ...vazia,
      tipo: "NAO_ENCONTRADO",
      texto: `Não tenho essa informação para o ${carro}${i.motor ? ` ${i.motor}` : ""}${i.ano ? ` ${i.ano}` : ""}. A base tem estes motores e anos:`,
      opcoes: opcoesDeRegistros(i, registros),
    };
  }
  if (servem.length > 1) {
    return {
      ...vazia,
      tipo: "ESCLARECER",
      texto: `O ${carro}${i.ano ? ` ${i.ano}` : ""} tem ${servem.length} opções na base. Qual é o motor${i.ano ? "" : " e o ano"}?`,
      opcoes: opcoesDeRegistros(i, servem),
    };
  }

  const r = servem[0];
  return { ...vazia, tipo: "ENCONTRADO", texto: textoDoRegistro(carro, r, i.assunto), registros: [r] };
}

function perguntaBase(assunto: Interpretacao["assunto"]): string {
  return assunto === "FILTROS" ? "Filtros do" : assunto === "CAPACIDADE" ? "Quantos litros leva o" : assunto === "INTERVALO" ? "Quando trocar o óleo do" : "Qual óleo do";
}

function opcoesDeRegistros(i: Interpretacao, registros: RegistroOleo[]): Resposta["opcoes"] {
  return registros.slice(0, 10).map((r) => {
    const ano = i.ano && i.ano >= r.anoInicial && i.ano <= r.anoFinal ? i.ano : r.anoFinal;
    return { rotulo: `${r.motor}, ${anos(r)}`, pergunta: `${perguntaBase(i.assunto)} ${i.modelo} ${r.motor} ${ano}` };
  });
}

const ROTULO_FILTRO_CURTO = { OLEO: "óleo", COMBUSTIVEL: "combustível", AR: "ar do motor", AR_CABINE: "ar da cabine" } as const;

function respostaFiltros(i: Interpretacao, carro: string, filtros: AplicacaoFiltro[]): Resposta {
  const vazia = { registros: [], filtros: [], opcoes: [] };
  if (filtros.length === 0) {
    return { ...vazia, tipo: "NAO_ENCONTRADO", texto: `Não tenho essa informação: o ${carro} ainda não foi conferido no catálogo de filtros.` };
  }
  if (!i.ano) {
    const faixas = [...new Map(filtros.map((f) => [`${f.motor}|${f.anoInicial}|${f.anoFinal}`, f])).values()];
    return {
      ...vazia,
      tipo: "ESCLARECER",
      texto: `De que ano é o ${carro}? Os filtros mudam conforme o ano e o motor.`,
      opcoes: faixas.slice(0, 10).map((f) => ({ rotulo: `${f.motor}, ${anos(f)}`, pergunta: `Filtros do ${i.modelo} ${f.motor} ${f.anoFinal}` })),
    };
  }
  const servem = filtrosDoRegistro({ motor: i.motor ?? "", anoInicial: i.ano, anoFinal: i.ano }, filtros);
  if (servem.length === 0) {
    return { ...vazia, tipo: "NAO_ENCONTRADO", texto: `Não tenho essa informação: o catálogo não tem filtros do ${carro}${i.motor ? ` ${i.motor}` : ""} ${i.ano}.` };
  }
  const versoes = new Set(servem.map((f) => `${f.motor}|${f.anoInicial}|${f.anoFinal}|${f.observacao ?? ""}`)).size;
  const resumo = (["OLEO", "COMBUSTIVEL", "AR", "AR_CABINE"] as const)
    .map((t) => {
      const codigos = [...new Set(servem.filter((f) => f.tipo === t).map((f) => f.codigo))];
      return codigos.length ? `${ROTULO_FILTRO_CURTO[t]} ${codigos.join(" ou ")}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const fabricante = servem[0].fabricante;
  return {
    ...vazia,
    tipo: "ENCONTRADO",
    texto: `${carro}${i.motor ? ` ${i.motor}` : ""} ${i.ano}, filtros indicados pelo catálogo ${fabricante}: ${resumo}.${versoes > 1 ? ` O catálogo tem ${versoes} versões para este carro; veja qual é a sua abaixo.` : ""} Fonte: catálogo ${fabricante}.`,
    filtros: servem,
  };
}
