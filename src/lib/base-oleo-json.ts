/**
 * Leitura e validação dos arquivos data/oleo/<marca>.json.
 *
 * Regras (vêm do documento do projeto):
 *  - registro sem fonte não entra;
 *  - fórum, rede social e afins não valem como fonte;
 *  - a confiança NUNCA vem escrita no JSON: ela é calculada aqui a partir das fontes.
 */
import { normalizarCodigo } from "./oleo";
import type { Confianca, TipoFonte } from "./tipos";

export const TIPOS_FONTE: TipoFonte[] = ["MONTADORA", "LUBRIFICANTE", "TECNICA"];
/** Menor número = fonte preferida. */
export const PRIORIDADE_FONTE: Record<TipoFonte, number> = { MONTADORA: 0, LUBRIFICANTE: 1, TECNICA: 2 };

export const CAMPOS = [
  "viscosidade",
  "especificacao",
  "capacidadeComFiltroL",
  "capacidadeSemFiltroL",
  "intervaloKm",
  "intervaloMeses",
] as const;
export type Campo = (typeof CAMPOS)[number];

export interface DadosFonte {
  viscosidade?: string;
  especificacao?: string;
  capacidadeComFiltroL?: number;
  capacidadeSemFiltroL?: number;
  intervaloKm?: number;
  intervaloMeses?: number;
}

export interface FonteValida {
  tipo: TipoFonte;
  url: string;
  consultadaEm: string; // AAAA-MM-DD
  observacao?: string;
  dados: DadosFonte;
}

export interface RegistroValido {
  marca: string;
  modelo: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  fontes: FonteValida[];
}

export interface ResultadoValidacao {
  registros: RegistroValido[];
  erros: string[];
}

const DOMINIOS_BLOQUEADOS = [
  "reddit.com",
  "quora.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "tapatalk.com",
  "answers.yahoo.com",
  "yahoo.com",
  "mercadolivre.com.br",
  "olx.com.br",
];

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** "www.exemplo.com.br" e "exemplo.com.br" são o mesmo site; "a.com" e "b.com" são independentes. */
export function dominioBase(url: string): string {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const partes = host.split(".");
  if (partes.length >= 3) {
    const penultima = partes[partes.length - 2];
    const ultima = partes[partes.length - 1];
    if (["com", "org", "net", "gov", "edu"].includes(penultima) && ultima.length === 2) {
      return partes.slice(-3).join(".");
    }
  }
  return partes.slice(-2).join(".");
}

function validarFonte(bruta: unknown, onde: string): { fonte?: FonteValida; erros: string[] } {
  const erros: string[] = [];
  if (!ehObjeto(bruta)) return { erros: [`${onde}: fonte inválida`] };

  const tipo = bruta.tipo as TipoFonte;
  if (!TIPOS_FONTE.includes(tipo)) erros.push(`${onde}: "tipo" deve ser ${TIPOS_FONTE.join(", ")}`);

  const urlTexto = texto(bruta.url);
  if (!urlTexto) {
    erros.push(`${onde}: "url" é obrigatória (registro sem fonte não entra)`);
  } else {
    try {
      const url = new URL(urlTexto);
      if (url.protocol !== "http:" && url.protocol !== "https:") erros.push(`${onde}: "url" precisa ser http(s)`);
      const host = url.hostname.toLowerCase();
      if (host.includes("forum") || host.includes("forum.")) erros.push(`${onde}: fórum não vale como fonte`);
      if (DOMINIOS_BLOQUEADOS.some((d) => host === d || host.endsWith(`.${d}`))) {
        erros.push(`${onde}: ${host} não vale como fonte (opinião/rede social/anúncio)`);
      }
    } catch {
      erros.push(`${onde}: "url" inválida`);
    }
  }

  const consultadaEm = texto(bruta.consultadaEm);
  if (!consultadaEm || !/^\d{4}-\d{2}-\d{2}$/.test(consultadaEm) || Number.isNaN(Date.parse(consultadaEm))) {
    erros.push(`${onde}: "consultadaEm" deve ser uma data AAAA-MM-DD`);
  }

  if (bruta.observacao !== undefined && texto(bruta.observacao) === null) {
    erros.push(`${onde}: "observacao" deve ser um texto`);
  }

  const dados: DadosFonte = {};
  if (!ehObjeto(bruta.dados)) {
    erros.push(`${onde}: "dados" é obrigatório`);
  } else {
    for (const chave of Object.keys(bruta.dados)) {
      if (!(CAMPOS as readonly string[]).includes(chave)) erros.push(`${onde}: campo desconhecido "dados.${chave}"`);
    }
    for (const campo of ["viscosidade", "especificacao"] as const) {
      const v = bruta.dados[campo];
      if (v === undefined) continue;
      const t = texto(v);
      if (!t || t.length > 160) erros.push(`${onde}: "dados.${campo}" deve ser um texto de até 160 caracteres`);
      else dados[campo] = t;
    }
    const numericos: Array<[keyof DadosFonte, number, number, boolean]> = [
      ["capacidadeComFiltroL", 0.5, 30, false],
      ["capacidadeSemFiltroL", 0.5, 30, false],
      ["intervaloKm", 1000, 100000, true],
      ["intervaloMeses", 1, 60, true],
    ];
    for (const [campo, min, max, inteiro] of numericos) {
      const v = (bruta.dados as Objeto)[campo];
      if (v === undefined) continue;
      if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (inteiro && !Number.isInteger(v))) {
        erros.push(`${onde}: "dados.${campo}" deve ser um número ${inteiro ? "inteiro " : ""}entre ${min} e ${max}`);
      } else {
        (dados as Record<string, number>)[campo] = v;
      }
    }
    if (Object.keys(dados).length === 0 && erros.length === 0) erros.push(`${onde}: a fonte não informa nenhum dado`);
  }

  if (erros.length > 0) return { erros };
  return {
    erros,
    fonte: {
      tipo,
      url: urlTexto as string,
      consultadaEm: consultadaEm as string,
      ...(texto(bruta.observacao) ? { observacao: texto(bruta.observacao) as string } : {}),
      dados,
    },
  };
}

export function validarMarcaJson(entrada: unknown, arquivo = "arquivo"): ResultadoValidacao {
  const erros: string[] = [];
  const registros: RegistroValido[] = [];

  if (!ehObjeto(entrada)) return { registros, erros: [`${arquivo}: o conteúdo precisa ser um objeto`] };
  const marca = texto(entrada.marca);
  if (!marca) return { registros, erros: [`${arquivo}: falta o campo "marca"`] };
  if (!Array.isArray(entrada.modelos)) return { registros, erros: [`${arquivo}: falta a lista "modelos"`] };

  const faixas = new Map<string, Array<[number, number]>>();

  entrada.modelos.forEach((m: unknown, i: number) => {
    if (!ehObjeto(m)) {
      erros.push(`${arquivo}: modelos[${i}] inválido`);
      return;
    }
    const modelo = texto(m.nome);
    if (!modelo) {
      erros.push(`${arquivo}: modelos[${i}] sem "nome"`);
      return;
    }
    if (!Array.isArray(m.motores)) {
      erros.push(`${arquivo}: ${modelo} sem lista "motores"`);
      return;
    }

    m.motores.forEach((mt: unknown, j: number) => {
      const onde = `${arquivo} > ${marca} ${modelo} > motores[${j}]`;
      if (!ehObjeto(mt)) {
        erros.push(`${onde}: inválido`);
        return;
      }
      const motor = texto(mt.motor);
      if (!motor) {
        erros.push(`${onde}: falta "motor"`);
        return;
      }
      const ondeMotor = `${arquivo} > ${marca} ${modelo} ${motor}`;

      const anos = mt.anos;
      if (
        !Array.isArray(anos) ||
        anos.length !== 2 ||
        !anos.every((a) => Number.isInteger(a) && a >= 1950 && a <= 2100) ||
        anos[0] > anos[1]
      ) {
        erros.push(`${ondeMotor}: "anos" deve ser [anoInicial, anoFinal]`);
        return;
      }
      const [anoInicial, anoFinal] = anos as [number, number];

      if (!Array.isArray(mt.fontes) || mt.fontes.length === 0) {
        erros.push(`${ondeMotor} (${anoInicial}-${anoFinal}): sem fonte, não entra na base`);
        return;
      }

      const fontes: FonteValida[] = [];
      const errosFontes: string[] = [];
      mt.fontes.forEach((f: unknown, k: number) => {
        const r = validarFonte(f, `${ondeMotor} (${anoInicial}-${anoFinal}) > fontes[${k}]`);
        if (r.fonte) fontes.push(r.fonte);
        errosFontes.push(...r.erros);
      });
      if (errosFontes.length > 0) {
        erros.push(...errosFontes);
        return;
      }

      const temCampo = (c: "viscosidade" | "especificacao") => fontes.some((f) => f.dados[c] !== undefined);
      if (!temCampo("viscosidade") || !temCampo("especificacao")) {
        erros.push(`${ondeMotor} (${anoInicial}-${anoFinal}): nenhuma fonte informa viscosidade e especificação`);
        return;
      }

      const chaveFaixa = `${normalizarCodigo(modelo)}|${normalizarCodigo(motor)}`;
      const existentes = faixas.get(chaveFaixa) ?? [];
      if (existentes.some(([a, b]) => anoInicial <= b && anoFinal >= a)) {
        erros.push(`${ondeMotor}: a faixa ${anoInicial}-${anoFinal} se sobrepõe a outra do mesmo motor`);
        return;
      }
      faixas.set(chaveFaixa, [...existentes, [anoInicial, anoFinal]]);

      registros.push({ marca, modelo, motor, anoInicial, anoFinal, fontes });
    });
  });

  return { registros, erros };
}

export interface Consolidado {
  viscosidade: string;
  especificacao: string;
  capacidadeComFiltroL: number | null;
  capacidadeSemFiltroL: number | null;
  intervaloKm: number | null;
  intervaloMeses: number | null;
  confianca: Confianca;
  /** Campos em que fontes independentes discordam. */
  divergencias: Campo[];
}

/**
 * Calcula os valores e a confiança de um registro.
 *  - Fontes do mesmo site contam como UMA (não são independentes).
 *  - DIVERGENTE: dois sites independentes informam valores diferentes para o mesmo campo.
 *  - CONFIRMADO: viscosidade e especificação vêm de ao menos dois sites independentes e concordam.
 *  - FONTE_UNICA: o resto.
 * O valor "oficial" de cada campo vem da fonte de maior prioridade que o informa
 * (montadora > lubrificante > técnica); as demais continuam visíveis.
 */
export function consolidar(registro: Pick<RegistroValido, "fontes">): Consolidado {
  const ordenadas = registro.fontes
    .map((fonte, indice) => ({ fonte, indice }))
    .sort((a, b) => PRIORIDADE_FONTE[a.fonte.tipo] - PRIORIDADE_FONTE[b.fonte.tipo] || a.indice - b.indice)
    .map((x) => x.fonte);

  const valor = <C extends Campo>(campo: C): DadosFonte[C] | undefined => {
    for (const f of ordenadas) if (f.dados[campo] !== undefined) return f.dados[campo];
    return undefined;
  };

  // Um "voto" por site e por campo (o primeiro, na ordem de prioridade).
  const porSite = new Map<string, DadosFonte>();
  for (const f of ordenadas) {
    const site = dominioBase(f.url);
    const atual = porSite.get(site) ?? {};
    for (const campo of CAMPOS) {
      if (atual[campo] === undefined && f.dados[campo] !== undefined) {
        (atual as Record<string, unknown>)[campo] = f.dados[campo];
      }
    }
    porSite.set(site, atual);
  }

  const chave = (campo: Campo, v: unknown): string => (typeof v === "string" ? normalizarCodigo(v) : String(v));
  const divergencias: Campo[] = [];
  const confirmados = new Set<Campo>();
  for (const campo of CAMPOS) {
    const votos = [...porSite.values()].map((d) => d[campo]).filter((v) => v !== undefined);
    if (votos.length < 2) continue;
    const distintos = new Set(votos.map((v) => chave(campo, v)));
    if (distintos.size > 1) divergencias.push(campo);
    else confirmados.add(campo);
  }

  let confianca: Confianca = "FONTE_UNICA";
  if (divergencias.length > 0) confianca = "DIVERGENTE";
  else if (confirmados.has("viscosidade") && confirmados.has("especificacao")) confianca = "CONFIRMADO";

  return {
    viscosidade: valor("viscosidade") as string,
    especificacao: valor("especificacao") as string,
    capacidadeComFiltroL: valor("capacidadeComFiltroL") ?? null,
    capacidadeSemFiltroL: valor("capacidadeSemFiltroL") ?? null,
    intervaloKm: valor("intervaloKm") ?? null,
    intervaloMeses: valor("intervaloMeses") ?? null,
    confianca,
    divergencias,
  };
}
