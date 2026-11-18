import { CircleCheck, CircleDot, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROTULO_CONFIANCA, ROTULO_STATUS, type Confianca, type StatusOS } from "@/lib/tipos";

const VARIANTE_STATUS = {
  AGUARDANDO: "contorno",
  EM_ANDAMENTO: "primary",
  PRONTO_RETIRADA: "ambar",
  ENTREGUE: "sucesso",
  CANCELADO: "perigo",
} as const;

export function StatusBadge({ status }: { status: StatusOS }) {
  return <Badge variant={VARIANTE_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>;
}

/** Confiança sempre com ícone + texto: nunca só pela cor. */
export function ConfiancaBadge({ confianca }: { confianca: Confianca }) {
  if (confianca === "CONFIRMADO") {
    return (
      <Badge variant="sucesso">
        <CircleCheck aria-hidden className="size-4" />
        {ROTULO_CONFIANCA[confianca]}
      </Badge>
    );
  }
  if (confianca === "DIVERGENTE") {
    return (
      <Badge variant="perigo">
        <TriangleAlert aria-hidden className="size-4" />
        {ROTULO_CONFIANCA[confianca]}
      </Badge>
    );
  }
  return (
    <Badge variant="ambar">
      <CircleDot aria-hidden className="size-4" />
      {ROTULO_CONFIANCA[confianca]}
    </Badge>
  );
}
