import { DemoNotice } from "@/components/forms/form-status";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthShell({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto grid min-h-svh max-w-[1600px] grid-cols-1 items-center gap-16 px-6 pt-36 pb-24 md:px-12 lg:grid-cols-2 lg:gap-28">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-7 text-[clamp(3rem,7vw,6.5rem)]">{title}</h1>
        <p className="mt-8 max-w-md text-lg leading-[1.8] text-muted">{text}</p>
      </div>
      <div className="border border-line bg-card p-8 md:p-14">
        {!isSupabaseConfigured() && <DemoNotice />}
        {children}
      </div>
    </section>
  );
}
