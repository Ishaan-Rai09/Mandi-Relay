import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-[5px] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-45 active:translate-y-px select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-forest text-white hover:bg-forest-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  gold: "bg-gold text-charcoal hover:bg-[#e9ab2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
  outline:
    "border border-forest/25 text-forest-800 bg-white/60 hover:bg-white hover:border-forest/45",
  ghost: "text-charcoal-500 hover:text-charcoal hover:bg-charcoal/5",
  danger: "bg-danger text-white hover:bg-[#8f2c24]",
  dark: "bg-charcoal text-ivory hover:bg-charcoal-800",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  icon,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
