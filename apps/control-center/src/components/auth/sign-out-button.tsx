"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const onSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-300/70 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
