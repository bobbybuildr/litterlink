import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Token-hash flow (used by password-reset and magic-link email templates)
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return redirect(`${origin}${next}`);
    }
    if (type === "recovery") {
      return redirect(
        `${origin}/forgot-password?error=${encodeURIComponent("Your password reset link has expired. Please request a new one.")}`
      );
    }
    // signup / email_change / etc. — send to sign-in with a clear message
    return redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Your confirmation link has expired. Enter your email and password below to receive a new one.")}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure profile row exists (created by DB trigger, but upsert as safety net)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            display_name:
              user.user_metadata?.display_name ??
              user.user_metadata?.full_name ??
              null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

        // Apply email preferences captured during sign-up
        const emailPrefs = user.user_metadata?.email_prefs;
        if (emailPrefs) {
          await supabase.from("email_preferences").upsert(
            {
              user_id: user.id,
              event_notifications: emailPrefs.event_notifications ?? true,
              new_nearby_events: emailPrefs.new_nearby_events ?? false,
              newsletter: emailPrefs.newsletter ?? false,
            },
            { onConflict: "user_id" }
          );
        }
      }

      const cookieStore = await cookies();
      const oauthRedirect = cookieStore.get("oauth_redirect")?.value;
      cookieStore.delete("oauth_redirect");
      const destination =
        oauthRedirect && oauthRedirect.startsWith("/") && !oauthRedirect.startsWith("//")
          ? oauthRedirect
          : next;

      return redirect(`${origin}${destination}`);
    }
  }

  return redirect(`${origin}/sign-in?error=Authentication+failed`);
}
