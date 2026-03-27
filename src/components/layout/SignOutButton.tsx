"use client";

import { signOut } from "@/app/(auth)/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
