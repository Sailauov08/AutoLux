import Image from "next/image";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
  meta?: string;
};

export function PageHero({ eyebrow, title, description, image, meta }: Props) {
  return (
    <section className="relative isolate flex min-h-[72svh] items-end overflow-hidden bg-obsidian pt-40 pb-16 text-white md:min-h-[82svh] md:pb-24">
      {image && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover opacity-55"
          />
        </div>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-obsidian via-obsidian/55 to-obsidian/25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-obsidian/90 via-obsidian/30 to-transparent" />

      <div className="mx-auto grid grid-cols-1 w-full max-w-[1600px] gap-10 px-6 md:px-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow animate-fade text-champagne">{eyebrow}</p>
          <h1 className="display mt-7 max-w-5xl overflow-hidden pb-2 text-[clamp(2.8rem,8vw,7.5rem)]">
            <span className="block animate-rise">{title}</span>
          </h1>
        </div>
        <div className="max-w-sm animate-fade pb-2 lg:text-right">
          <p className="text-base leading-[1.75] text-silver md:text-lg">{description}</p>
          {meta && <p className="mt-5 text-[11px] tracking-[0.28em] uppercase text-white/45">{meta}</p>}
        </div>
      </div>
    </section>
  );
}
