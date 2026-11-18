import { cn } from "@/lib/utils";
import { formatarPlaca, normalizarPlaca, tipoPlaca } from "@/lib/placa";

/**
 * A placa desenhada como placa: é o elemento de identidade do sistema, porque a placa
 * é o jeito como a oficina reconhece o carro.
 */
export function Placa({ valor, tamanho = "md", className }: { valor: string; tamanho?: "sm" | "md" | "lg"; className?: string }) {
  const placa = normalizarPlaca(valor);
  const mercosul = tipoPlaca(placa) === "MERCOSUL";
  const texto = formatarPlaca(placa);

  return (
    <span
      role="img"
      aria-label={`Placa ${texto}`}
      className={cn(
        "inline-flex flex-col overflow-hidden rounded-[6px] border-2 border-[#101828] bg-white align-middle shadow-sm",
        !mercosul && "bg-[#d9dde3]",
        className,
      )}
    >
      <span aria-hidden className={cn("px-2 text-center font-sans font-bold leading-4 tracking-widest text-white", mercosul ? "bg-[#1d3f94]" : "bg-[#5b6573]", tamanho === "sm" ? "text-[8px]" : "text-[10px]")}>
        BRASIL
      </span>
      <span
        aria-hidden
        className={cn(
          "px-3 text-center font-placa font-bold leading-none tracking-[0.14em] text-[#101828]",
          tamanho === "sm" && "py-0.5 text-lg",
          tamanho === "md" && "py-1 text-2xl",
          tamanho === "lg" && "py-1.5 text-4xl",
        )}
      >
        {texto}
      </span>
    </span>
  );
}
