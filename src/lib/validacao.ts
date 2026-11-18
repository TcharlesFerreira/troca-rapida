import { z } from "zod";
import { cnpjValido, normalizarCnpj } from "./cnpj";
import { TIPOS_FILTRO } from "./filtros";
import { PECAS_CARTER, SERVICOS_OS, montarDescricao } from "./servicos-os";
import { cpfValido, normalizarCpf } from "./cpf";
import { normalizarPlaca, placaValida } from "./placa";

// "" (campo vazio do formulário) vira undefined nos campos opcionais.
const vazioParaUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const texto = (rotulo: string, min = 2, max = 120) =>
  z
    .string({ required_error: `${rotulo} é obrigatório`, invalid_type_error: `${rotulo} é obrigatório` })
    .trim()
    .min(min, min <= 1 ? `${rotulo} é obrigatório` : `${rotulo} precisa ter ao menos ${min} caracteres`)
    .max(max, `${rotulo} aceita até ${max} caracteres`);

const textoOpcional = (rotulo: string, max = 300) =>
  z.preprocess(vazioParaUndefined, z.string().trim().max(max, `${rotulo} aceita até ${max} caracteres`).optional());

const inteiro = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(/\./g, ""))),
    z
      .number({ required_error: `${rotulo} é obrigatório`, invalid_type_error: `${rotulo} precisa ser um número` })
      .int(`${rotulo} precisa ser um número inteiro`)
      .min(min, `${rotulo} não pode ser menor que ${min}`)
      .max(max, `${rotulo} não pode ser maior que ${max}`),
  );

const inteiroOpcional = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(/\./g, ""))),
    z
      .number({ invalid_type_error: `${rotulo} precisa ser um número` })
      .int(`${rotulo} precisa ser um número inteiro`)
      .min(min, `${rotulo} não pode ser menor que ${min}`)
      .max(max, `${rotulo} não pode ser maior que ${max}`)
      .optional(),
  );

const decimal = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))),
    z
      .number({ required_error: `${rotulo} é obrigatório`, invalid_type_error: `${rotulo} precisa ser um número` })
      .min(min, `${rotulo} precisa ser maior que ${min}`)
      .max(max, `${rotulo} não pode passar de ${max}`),
  );

const email = z
  .string({ required_error: "E-mail é obrigatório" })
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido, como nome@exemplo.com");

const cpf = z
  .string({ required_error: "CPF é obrigatório" })
  .trim()
  .refine(cpfValido, "CPF inválido. Confira os 11 números")
  .transform(normalizarCpf);

const telefone = z
  .string({ required_error: "Telefone é obrigatório" })
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido. Use DDD + número, como (11) 91234-5678");

const dataISO = (rotulo: string) =>
  z
    .string({ required_error: `${rotulo} é obrigatória` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${rotulo} inválida`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${rotulo} inválida`)
    .transform((v) => new Date(`${v}T00:00:00.000Z`));

const dataISOOpcional = (rotulo: string) => z.preprocess(vazioParaUndefined, dataISO(rotulo).optional());

export const loginSchema = z.object({
  email,
  senha: z.string({ required_error: "Informe a senha" }).min(1, "Informe a senha"),
});

const senhaNova = z
  .string({ required_error: "Senha é obrigatória" })
  .min(8, "A senha precisa ter ao menos 8 caracteres")
  .max(72, "A senha aceita até 72 caracteres")
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Use letras e números na senha");

const cnpjOpcional = z.preprocess(
  vazioParaUndefined,
  z.string().trim().refine(cnpjValido, "CNPJ inválido. Confira os 14 números").transform(normalizarCnpj).optional(),
);

export const empresaSchema = z.object({
  nome: texto("Nome da empresa", 2, 120),
  cnpj: cnpjOpcional,
});

/** Nova empresa já com o seu administrador (por enquanto, um por empresa). */
export const novaEmpresaSchema = empresaSchema.extend({
  adminNome: texto("Nome do administrador", 3),
  adminEmail: email,
  adminSenha: senhaNova,
});

export const cadastroSchema = z
  .object({
    nome: texto("Nome", 3),
    email,
    senha: z
      .string({ required_error: "Senha é obrigatória" })
      .min(8, "A senha precisa ter ao menos 8 caracteres")
      .max(72, "A senha aceita até 72 caracteres")
      .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Use letras e números na senha"),
    confirmarSenha: z.string({ required_error: "Repita a senha" }),
    cpf,
    telefone,
  })
  .refine((d) => d.senha === d.confirmarSenha, { path: ["confirmarSenha"], message: "As senhas não são iguais" });

export const clienteSchema = z.object({
  nome: texto("Nome", 3),
  cpf,
  telefone,
  email,
  endereco: textoOpcional("Endereço"),
});

export const veiculoSchema = z.object({
  clienteId: texto("Cliente", 1, 60),
  placa: z
    .string({ required_error: "Placa é obrigatória" })
    .refine(placaValida, "Placa inválida. Use ABC1234 ou ABC1D23 (com ou sem hífen)")
    .transform(normalizarPlaca),
  marca: texto("Marca", 2, 60),
  modelo: texto("Modelo", 1, 80),
  motor: texto("Motor", 1, 80),
  ano: inteiro("Ano", 1950, new Date().getFullYear() + 1),
  cor: texto("Cor", 2, 40),
  kmAtual: inteiro("Quilometragem atual", 0, 2_000_000),
});

const caixa = z.preprocess((v) => v === "on" || v === "true", z.boolean());

/**
 * Abrir OS: o serviço é escolhido numa lista.
 *  - Troca de óleo completa: pode marcar bujão e/ou arruela.
 *  - Troca de óleo incompleta: marca filtros, bujão/arruela e/ou escreve o que foi trocado (ao menos um).
 *  - Troca de filtros: ao menos um filtro.
 *  - Outro serviço: texto obrigatório.
 * Tudo vira a descrição da OS.
 */
export const ordemSchema = z
  .object({
    veiculoId: texto("Veículo", 1, 60),
    dataEntrada: dataISO("Data de entrada"),
    kmEntrada: inteiro("Quilometragem na entrada", 0, 2_000_000),
    tipoServico: z.enum(SERVICOS_OS, { errorMap: () => ({ message: "Escolha o serviço" }) }),
    detalheServico: textoOpcional("Detalhe do serviço", 2000),
    filtroTrocado_OLEO: caixa,
    filtroTrocado_COMBUSTIVEL: caixa,
    filtroTrocado_AR: caixa,
    filtroTrocado_AR_CABINE: caixa,
    pecaTrocada_BUJAO: caixa,
    pecaTrocada_ARRUELA: caixa,
    observacoes: textoOpcional("Observações", 2000),
  })
  .superRefine((d, ctx) => {
    const filtros = TIPOS_FILTRO.some((t) => d[`filtroTrocado_${t}`]);
    const pecas = PECAS_CARTER.some((p) => d[`pecaTrocada_${p}`]);
    const texto = !!d.detalheServico && d.detalheServico.length >= 3;
    if (d.tipoServico === "OUTRO" && !texto) ctx.addIssue({ code: "custom", path: ["detalheServico"], message: "Escreva qual é o serviço" });
    if (d.tipoServico === "TROCA_FILTROS" && !filtros) ctx.addIssue({ code: "custom", path: ["filtrosTrocados"], message: "Marque ao menos um filtro" });
    if (d.tipoServico === "TROCA_OLEO_INCOMPLETA" && TIPOS_FILTRO.every((t) => d[`filtroTrocado_${t}`])) {
      ctx.addIssue({ code: "custom", path: ["filtrosTrocados"], message: "Todos os filtros foram trocados: escolha troca de óleo completa ou desmarque o que não foi trocado" });
    }
    if (d.tipoServico === "TROCA_OLEO_INCOMPLETA" && !filtros && !pecas && !texto) {
      ctx.addIssue({ code: "custom", path: ["detalheServico"], message: "Marque o que foi trocado ou escreva aqui" });
    }
  })
  .transform((d) => ({
    veiculoId: d.veiculoId,
    dataEntrada: d.dataEntrada,
    kmEntrada: d.kmEntrada,
    descricao: montarDescricao(
      d.tipoServico,
      d.detalheServico,
      TIPOS_FILTRO.filter((t) => d[`filtroTrocado_${t}`]),
      PECAS_CARTER.filter((p) => d[`pecaTrocada_${p}`]),
    ),
    observacoes: d.observacoes,
  }));

const decimalOpcional = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))),
    z
      .number({ invalid_type_error: `${rotulo} precisa ser um número` })
      .min(min, `${rotulo} precisa ser maior que ${min}`)
      .max(max, `${rotulo} não pode passar de ${max}`)
      .optional(),
  );

/** Correção do último óleo usado, direto na tela do veículo (a norma pode ficar em branco).
 *  A quantidade não entra aqui: é a do motor do carro (capacidadeOleoSchema). */
export const ultimoOleoSchema = z.object({
  oleoMarca: texto("Marca do óleo", 2, 80),
  oleoViscosidade: texto("Viscosidade", 2, 20),
  oleoEspecificacao: textoOpcional("Especificação", 80),
});

/** Quanto óleo vai no motor do carro. Vazio = usar o da base. */
export const capacidadeOleoSchema = z.object({
  capacidadeOleoL: decimalOpcional("Quantidade de óleo", 0.5, 30),
});

const filtro = (rotulo: string) =>
  z.preprocess(vazioParaUndefined, z.string().trim().max(40, `${rotulo} aceita até 40 caracteres`).optional());

/** Filtros que a oficina usa no carro. Vazio = não informado; "não tem" = o carro não tem esse filtro. */
export const filtrosSchema = z.object({
  filtroOleo: filtro("Filtro de óleo"),
  filtroCombustivel: filtro("Filtro de combustível"),
  filtroAr: filtro("Filtro de ar do motor"),
  filtroArCabine: filtro("Filtro de ar da cabine"),
});

export const trocaOleoSchema = z.object({
  oleoMarca: texto("Marca do óleo", 2, 80),
  oleoViscosidade: texto("Viscosidade", 2, 20),
  oleoEspecificacao: texto("Especificação", 2, 80),
  quantidadeLitros: decimal("Quantidade", 0.1, 30),
  filtroTrocado: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  proximaTrocaKm: inteiroOpcional("Próxima troca (km)", 1, 3_000_000),
  proximaTrocaData: dataISOOpcional("Data da próxima troca"),
});
