import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn("flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base aria-[invalid=true]:border-destructive", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
