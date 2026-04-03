import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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

      return redirect(`${origin}${next}`);
    }
  }

  return redirect(`${origin}/sign-in?error=Authentication+failed`);
}
