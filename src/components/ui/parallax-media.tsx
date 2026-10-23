"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export function ParallaxMedia({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  imageClassName = "object-cover",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-mist ${className}`}>
      <motion.div style={{ y }} className="absolute inset-x-0 -top-[8%] h-[116%]">
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={imageClassName} />
      </motion.div>
    </div>
  );
}
