import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, suffix, prefix, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-text-muted text-sm select-none">{prefix}</span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted",
            "transition-colors focus:border-accent-purple/60 focus:outline-none focus:ring-1 focus:ring-accent-purple/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-accent-red/50 focus:border-accent-red/70 focus:ring-accent-red/20",
            prefix && "pl-9",
            suffix && "pr-20",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-text-muted text-sm select-none">{suffix}</span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error          && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";