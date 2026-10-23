"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";

export function CarGallery({ images, alt, photoNote }: { images: string[]; alt: string; photoNote: "photoRepresentative" | "photoPending" | null }) {
  const t = useTranslations("car");
  const tCard = useTranslations("card");
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden bg-mist md:aspect-[16/10]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={images[active]}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[active]}
              alt={t("photoOf", { alt, n: active + 1, total: images.length })}
              fill
              priority
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <p className="absolute top-4 right-4 bg-obsidian/60 px-3 py-1.5 text-[11px] tracking-[0.2em] text-white tabular-nums backdrop-blur">
          {String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </p>
        {photoNote && (
          <p className="absolute bottom-4 left-4 bg-obsidian/60 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-white/80 backdrop-blur">
            {tCard(photoNote)}
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            aria-label={t("photo", { n: index + 1 })}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className="group relative aspect-[16/10] overflow-hidden bg-mist"
          >
            <Image src={src} alt="" fill sizes="20vw" className={`object-cover transition-all duration-700 ${index === active ? "opacity-100" : "opacity-45 group-hover:opacity-90"}`} />
            <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-champagne transition-transform duration-700 ${index === active ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
