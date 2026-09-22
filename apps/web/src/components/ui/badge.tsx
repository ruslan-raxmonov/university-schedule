import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
        outline: "border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        destructive:
          "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        info: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
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
