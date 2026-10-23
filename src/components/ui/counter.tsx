"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

export function Counter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => Math.round(latest).toLocaleString("en-US"));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2.4, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, count, value]);

  return (
    <div ref={ref} className="border-t border-white/15 pt-8">
      <p className="display text-[clamp(3.5rem,7vw,6.5rem)] text-white tabular-nums">
        <motion.span>{display}</motion.span>
        <span className="text-champagne">{suffix}</span>
      </p>
      <p className="mt-5 text-[11px] tracking-[0.26em] uppercase text-silver">{label}</p>
    </div>
  );
}
