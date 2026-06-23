import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?:  string;
  hint?:   string;
  error?:  string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, suffix, prefix, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-text-muted text-sm select-none z-10">{prefix}</span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl bg-bg-surface border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted",
            "transition-all duration-200",
            "focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/10 focus:bg-bg-card",
            "disabled:cursor-not-allowed disabled:opacity-40",
            error  && "border-accent-red/50 focus:border-accent-red/70 focus:ring-accent-red/10",
            prefix && "pl-10",
            suffix && "pr-20",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-text-muted text-sm select-none">{suffix}</span>
        )}
      </div>
      {hint  && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error          && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";