import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-brand-500)] text-white shadow hover:bg-[color:var(--color-brand-600)] focus-visible:ring-[color:var(--color-brand-500)]",
        glass:
          "glass-light text-[color:var(--color-charcoal-900)] hover:bg-white/80 focus-visible:ring-[color:var(--color-brand-500)]",
        outline:
          "border border-[color:var(--color-brand-500)] text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-brand-50)] focus-visible:ring-[color:var(--color-brand-500)]",
        ghost: "hover:bg-white/40 focus-visible:ring-[color:var(--color-brand-500)]",
        destructive:
          "bg-[color:var(--color-negative)] text-white shadow hover:bg-red-700 focus-visible:ring-[color:var(--color-negative)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
