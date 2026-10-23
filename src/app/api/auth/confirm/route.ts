import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/kk/account");

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const locale = next.split("/")[1] || "kk";
  const failure = NextResponse.redirect(new URL(`/${locale}/auth/sign-in?error=link`, url.origin));

  const supabase = await createSupabaseServerClient();
  if (!supabase) return failure;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  return error ? failure : NextResponse.redirect(new URL(next, url.origin));
}
