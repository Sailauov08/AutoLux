import Image from "next/image";
import { Link } from "@/i18n/navigation";

const BACKDROP = "https://images.unsplash.com/photo-1711546858062-c43fae2a07d3?auto=format&fit=crop&w=2000&q=70";

export function StatusScreen({ code, eyebrow, title, text, children }: { code?: string; eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden bg-obsidian px-6 py-28 text-white md:px-12">
      <Image src={BACKDROP} alt="" fill sizes="100vw" className="-z-20 animate-kenburns object-cover opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-obsidian via-obsidian/80 to-obsidian/30" />
      <div className="mx-auto w-full max-w-[1600px]">
        <Link href="/" className="font-display text-2xl">
          Auto<span className="italic text-champagne">Lux</span>
        </Link>
        {code && <p aria-hidden className="text-metal font-display mt-16 text-[clamp(6rem,22vw,16rem)] leading-none">{code}</p>}
        <p className={`eyebrow text-champagne ${code ? "mt-6" : "mt-16"}`}>{eyebrow}</p>
        <h1 className="display mt-6 max-w-3xl text-[clamp(2.4rem,6vw,5.5rem)]">{title}</h1>
        <p className="mt-6 max-w-md leading-[1.8] text-silver">{text}</p>
        <div className="mt-12 flex flex-wrap gap-4">{children}</div>
      </div>
    </section>
  );
}
