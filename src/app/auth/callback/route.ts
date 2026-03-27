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
      }

      return redirect(`${origin}${next}`);
    }
  }

  return redirect(`${origin}/sign-in?error=Authentication+failed`);
}
