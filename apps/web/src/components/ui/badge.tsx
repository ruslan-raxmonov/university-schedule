import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--ink)] text-white",
        secondary:
          "border-transparent bg-[var(--mist)] text-[var(--ink-soft)]",
        outline: "border-[var(--line)] text-[var(--stone)]",
        success:
          "border-transparent bg-teal-50 text-[var(--success)]",
        warning:
          "border-transparent bg-amber-50 text-[var(--warning)]",
        destructive:
          "border-transparent bg-red-50 text-[var(--error)]",
        info: "border-transparent bg-[color-mix(in_oklab,var(--navy)_10%,white)] text-[var(--navy)]",
        gold: "border-transparent bg-[color-mix(in_oklab,var(--gold)_28%,white)] text-[var(--navy)]",
        maroon:
          "border-transparent bg-[color-mix(in_oklab,var(--maroon)_12%,white)] text-[var(--maroon)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
