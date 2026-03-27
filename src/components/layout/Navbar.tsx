import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/layout/NavLinks";
import { AvatarDropdown } from "@/components/layout/AvatarDropdown";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", user.id)
          .single()
      ).data
    : null;

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/LitterLink_logo-horizontal.png"
            alt="LitterLink"
            width={358}
            height={83}
            priority
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        <div className="flex items-center gap-4">
          <NavLinks className="flex" />

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/events/create"
                className="hidden sm:inline-block rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
              >
                + Create event
              </Link>
              <AvatarDropdown
                avatarUrl={profile?.avatar_url}
                displayName={profile?.display_name}
                initials={initials}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
              >
                Join free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
