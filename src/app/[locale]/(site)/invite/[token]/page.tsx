import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AcceptInvitation } from "@/components/account/accept-invitation";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/invite/[token]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "invite" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function InvitePage({ params }: PageProps<"/[locale]/invite/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/invite/${token}`);
  const [t, tRoles] = await Promise.all([getTranslations("invite"), getTranslations("roles")]);
  const supabase = await createSupabaseServerClient();
  const valid = /^[0-9a-f]{64}$/.test(token);
  const { data } = valid && supabase ? await supabase.rpc("invitation_preview", { p_token: token }) : { data: null };
  const invitation = (data as { dealership_name: string; role: string; email: string; status: string }[] | null)?.[0] ?? null;
  const emailMatches = invitation && invitation.email.toLowerCase() === user.email.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-6 pt-36 pb-28 md:px-12">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="display mt-6 text-[clamp(2.4rem,5vw,4rem)]">{t("title")}</h1>
      {!invitation ? (
        <p className="mt-8 text-muted">{t("invalid")}</p>
      ) : invitation.status !== "pending" ? (
        <p className="mt-8 text-muted">{t(`status.${invitation.status}`)}</p>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="leading-[1.8] text-muted">{t("description", { dealership: invitation.dealership_name, role: tRoles(invitation.role) })}</p>
          {!emailMatches ? (
            <p className="border-l-2 border-red-500 pl-4 text-sm">{t("wrongEmail", { email: invitation.email })}</p>
          ) : !user.emailConfirmed ? (
            <p className="border-l-2 border-champagne pl-4 text-sm">{t("confirmEmail")}</p>
          ) : (
            <AcceptInvitation token={token} />
          )}
        </div>
      )}
      <div className="mt-12">
        <ButtonLink href="/account" variant="outline">
          {t("account")}
        </ButtonLink>
      </div>
    </div>
  );
}
