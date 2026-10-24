"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useViewer, viewerFirstName } from "@/lib/viewer";

/**
 * Shows "Sign in" when logged out, or "Hi, {name}" plus Sign out when
 * logged in. Reads the shared viewer state, so it updates instantly
 * after a sign-in redirect lands back on the site.
 */
export default function AuthButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const viewer = useViewer();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const base =
    variant === "desktop"
      ? "font-body text-sm font-medium text-[#5c4038] hover:text-[#3a241f]"
      : "font-body rounded-lg px-2 py-2.5 text-sm font-medium text-[#5c4038] hover:bg-[#f1d9cf]/50";

  if (viewer.status === "loading") {
    // Reserve space so the header doesn't jump once we know the state.
    return (
      <span className={`${base} opacity-0`} aria-hidden="true">
        Sign in
      </span>
    );
  }

  if (viewer.status === "signed-in") {
    return (
      <div className={variant === "desktop" ? "flex items-center gap-4" : "flex flex-col gap-1"}>
        <span className={`${base} text-[#3a241f]`}>Hi, {viewerFirstName(viewer.user)}</span>
        <button type="button" onClick={signOut} className={base}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link href="/login" className={base}>
      Sign in
    </Link>
  );
}
