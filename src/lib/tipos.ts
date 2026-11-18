// Tipos e rótulos compartilhados. Não importam nada do Prisma, para poderem
// ser usados em telas, serviços e testes.
export type Papel = "SUPERADMIN" | "ADMIN" | "CLIENTE";

export const STATUS_OS = ["AGUARDANDO", "EM_ANDAMENTO", "PRONTO_RETIRADA", "ENTREGUE", "CANCELADO"] as const;
export type StatusOS = (typeof STATUS_OS)[number];

export const ROTULO_STATUS: Record<StatusOS, string> = {
  AGUARDANDO: "Aguardando",
  EM_ANDAMENTO: "Em andamento",
  PRONTO_RETIRADA: "Pronto para retirada",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

/** Status em que a OS ainda está "aberta" para o cliente. */
export const STATUS_ABERTOS: StatusOS[] = ["AGUARDANDO", "EM_ANDAMENTO", "PRONTO_RETIRADA"];

export type Confianca = "CONFIRMADO" | "FONTE_UNICA" | "DIVERGENTE";
export const ROTULO_CONFIANCA: Record<Confianca, string> = {
  CONFIRMADO: "Confirmado",
  FONTE_UNICA: "Fonte única",
  DIVERGENTE: "Divergente",
};

export type TipoFonte = "MONTADORA" | "LUBRIFICANTE" | "TECNICA";
export const ROTULO_TIPO_FONTE: Record<TipoFonte, string> = {
  MONTADORA: "Montadora / manual",
  LUBRIFICANTE: "Fabricante de lubrificante",
  TECNICA: "Fonte técnica",
};
