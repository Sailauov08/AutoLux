import { Reveal } from "./reveal";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
  index?: string;
};

export function SectionHeading({ eyebrow, title, description, tone = "light", align = "left", index }: Props) {
  const dark = tone === "dark";

  return (
    <Reveal className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <p className={`flex items-center gap-4 text-[11px] font-medium tracking-[0.32em] uppercase ${align === "center" ? "justify-center" : ""} ${dark ? "text-champagne" : "text-accent"}`}>
        {index && <span className="tabular-nums">{index}</span>}
        {index && <span aria-hidden className={`h-px w-10 ${dark ? "bg-champagne/60" : "bg-accent/60"}`} />}
        {eyebrow}
      </p>
      <h2 className={`display mt-6 text-[clamp(2.4rem,5.5vw,5rem)] ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
      {description && (
        <p className={`mt-7 max-w-xl text-base leading-[1.75] md:text-lg ${dark ? "text-silver" : "text-muted"}`}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
