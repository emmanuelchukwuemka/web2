import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function Card({ className, hover = false, glow = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-bg-card",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.5)]",
        hover && "transition-all duration-300 hover:border-gold/20 hover:shadow-card-hover cursor-pointer",
        glow  && "border-gold/15 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_8px_40px_rgba(0,0,0,0.6),0_0_40px_rgba(245,158,11,0.06)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-5 py-4 border-b border-border/60", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-text-primary tracking-tight", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-5 py-4 border-t border-border/60", className)}
      {...props}
    />
  );
}