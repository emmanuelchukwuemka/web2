import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/60",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-purple hover:bg-accent-purple/90 text-white shadow-glow-sm hover:shadow-glow active:scale-[0.98]",
        secondary:
          "bg-bg-elevated hover:bg-border text-text-primary border border-border hover:border-border-hover",
        ghost:
          "hover:bg-bg-elevated text-text-secondary hover:text-text-primary",
        danger:
          "bg-accent-red/10 hover:bg-accent-red/20 text-accent-red border border-accent-red/20",
        success:
          "bg-accent-green/10 hover:bg-accent-green/20 text-accent-green border border-accent-green/20",
        outline:
          "border border-border hover:border-border-hover text-text-primary hover:bg-bg-elevated",
      },
      size: {
        sm:   "h-8  px-3 text-sm",
        md:   "h-10 px-4 text-sm",
        lg:   "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
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
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";