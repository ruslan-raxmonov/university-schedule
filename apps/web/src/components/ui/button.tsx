import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--maroon)] text-white hover:bg-[var(--maroon-soft)]",
        secondary:
          "bg-[var(--ink)] text-[#f7f8fa] hover:bg-[var(--ink-soft)]",
        outline:
          "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-white/70 dark:hover:bg-white/5",
        ghost: "text-[var(--ink)] hover:bg-[var(--mist)]",
        destructive:
          "bg-[var(--error)] text-white hover:opacity-90",
        success: "bg-[var(--success)] text-white hover:opacity-90",
        gold: "bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold-soft)]",
        link: "text-[var(--maroon)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
