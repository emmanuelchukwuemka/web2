import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-bg-overlay text-text-secondary border border-border px-2.5 py-0.5",
        gold:    "bg-gold/10 text-gold border border-gold/25 px-2.5 py-0.5",
        purple:  "bg-accent-purple/10 text-accent-purple-light border border-accent-purple/20 px-2.5 py-0.5",
        green:   "bg-accent-green/10 text-accent-green-light border border-accent-green/20 px-2.5 py-0.5",
        red:     "bg-accent-red/10 text-accent-red border border-accent-red/20 px-2.5 py-0.5",
        cyan:    "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 px-2.5 py-0.5",
        amber:   "bg-gold/10 text-gold border border-gold/20 px-2.5 py-0.5",
        live:    "bg-accent-green/10 text-accent-green-light border border-accent-green/20 px-2.5 py-0.5",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}