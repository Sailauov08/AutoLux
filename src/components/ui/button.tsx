import type { ComponentProps } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Variant = "solid" | "white" | "outline" | "outline-white" | "champagne";

const base =
  "group relative inline-flex h-13 items-center justify-center gap-3 px-8 text-[11px] font-medium tracking-[0.24em] uppercase transition-all duration-500 ease-out focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  solid: "bg-ink text-page shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:bg-champagne hover:text-obsidian",
  white: "metal text-obsidian shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_10px_30px_-12px_rgb(212_220_227/0.45)] hover:brightness-110",
  outline: "border border-line text-ink hover:border-accent hover:text-accent",
  "outline-white": "border border-silver/35 text-white hover:border-champagne hover:text-champagne",
  champagne: "border border-champagne/70 text-champagne hover:bg-champagne hover:text-obsidian",
};

export function buttonClass(variant: Variant = "solid", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

const Arrow = () => (
  <ArrowRight className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden />
);

export function ButtonLink({
  variant,
  className,
  arrow = false,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; arrow?: boolean }) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}
