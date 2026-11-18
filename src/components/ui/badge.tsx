import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const selo = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold", {
  variants: {
    variant: {
      default: "border-transparent bg-secondary text-secondary-foreground",
      primary: "border-transparent bg-primary text-primary-foreground",
      ambar: "border-transparent bg-accent text-accent-foreground",
      sucesso: "border-transparent bg-success text-success-foreground",
      perigo: "border-transparent bg-destructive text-destructive-foreground",
      contorno: "bg-card text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof selo> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(selo({ variant }), className)} {...props} />;
}
