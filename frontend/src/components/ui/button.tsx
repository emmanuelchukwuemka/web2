import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black rounded-xl shadow-gold-sm hover:shadow-gold hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-bg-elevated border border-border text-text-primary rounded-xl hover:border-border-hover hover:bg-bg-overlay transition-colors",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-colors",
        outline:
          "border border-border text-text-primary rounded-xl hover:border-gold/40 hover:text-gold transition-colors",
        danger:
          "bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-xl hover:bg-accent-red/20 transition-colors",
        success:
          "bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl hover:bg-accent-green/20 transition-colors",
        gold:
          "bg-gold/10 border border-gold/25 text-gold rounded-xl hover:bg-gold/20 hover:border-gold/50 transition-all",
        purple:
          "bg-accent-purple hover:bg-accent-purple/90 text-white rounded-xl shadow-purple-sm hover:shadow-purple active:scale-[0.98]",
      },
      size: {
        xs: "h-7  px-2.5 text-xs rounded-lg",
        sm: "h-9  px-4   text-sm",
        md: "h-11 px-5   text-sm",
        lg: "h-13 px-7   text-base",
        xl: "h-14 px-8   text-lg",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";