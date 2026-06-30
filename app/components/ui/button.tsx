import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-brand-500)] text-white shadow hover:bg-[color:var(--color-brand-600)] focus-visible:ring-[color:var(--color-brand-500)]",
        brand:
          "bg-[image:var(--gradient-brand)] text-white shadow-[var(--shadow-brand)] hover:brightness-105 focus-visible:ring-[color:var(--color-brand-500)]",
        glass:
          "glass-tier-3 text-[color:var(--text-primary)] hover:bg-[color:var(--surface-1)] focus-visible:ring-[color:var(--color-brand-500)]",
        outline:
          "border border-[color:var(--color-brand-500)] text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-brand-500)]/10 focus-visible:ring-[color:var(--color-brand-500)]",
        ghost:
          "hover:bg-[color:var(--surface-3)] focus-visible:ring-[color:var(--color-brand-500)]",
        destructive:
          "bg-[color:var(--semantic-negative)] text-white shadow hover:opacity-90 focus-visible:ring-[color:var(--semantic-negative)]",
        positive:
          "border border-[color:var(--semantic-positive)] text-[color:var(--semantic-positive)] hover:bg-[color:var(--semantic-positive)]/10 focus-visible:ring-[color:var(--semantic-positive)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        ref={ref}
        className={cn("relative", buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center gap-2 transition-opacity",
            loading ? "opacity-0" : "opacity-100",
          )}
        >
          {children}
        </span>
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size={16} />
          </span>
        ) : null}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
