import Link from "next/link";
import "./globals.css";

export default function RootNotFound() {
  return (
    <html lang="kk" data-theme="dark">
      <body className="flex min-h-svh flex-col items-center justify-center gap-8 bg-obsidian px-6 text-center text-ivory">
        <p className="text-[clamp(5rem,20vw,12rem)] leading-none text-champagne" style={{ fontFamily: "Georgia, serif" }}>
          404
        </p>
        <Link href="/kk" className="border border-champagne/70 px-8 py-4 text-[11px] tracking-[0.24em] uppercase text-champagne">
          AutoLux
        </Link>
      </body>
    </html>
  );
}
