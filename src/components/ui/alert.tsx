import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alerta = cva("rounded-md border-l-4 px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-primary bg-secondary text-foreground",
      aviso: "border-accent bg-accent/25 text-foreground",
      erro: "border-destructive bg-destructive/10 text-foreground",
      sucesso: "border-success bg-success/10 text-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alerta> {}

export function Alert({ className, variant, role, ...props }: AlertProps) {
  return <div role={role ?? (variant === "erro" ? "alert" : "status")} className={cn(alerta({ variant }), className)} {...props} />;
}
