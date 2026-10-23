"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Shows "Sign in" when logged out, or the customer's name/email plus
 * a Sign out button when logged in. Reads the session on mount and
 * keeps itself in sync via onAuthStateChange, so it updates instantly
 * after a magic-link or Google sign-in redirect lands back on the
 * site — no page reload needed.
 */
export default function AuthButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setLabel(displayName(data.user));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLabel(displayName(session?.user ?? null));
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setLabel(null);
    window.location.href = "/";
  }

  const base =
    variant === "desktop"
      ? "font-body text-sm font-medium text-[#5c4038] hover:text-[#3a241f]"
      : "font-body rounded-lg px-2 py-2.5 text-sm font-medium text-[#5c4038] hover:bg-[#f1d9cf]/50";

  if (loading) {
    // Reserve space so the header doesn't jump once we know the state.
    return <span className={`${base} opacity-0`} aria-hidden="true">Sign in</span>;
  }

  if (label) {
    return (
      <div className={variant === "desktop" ? "flex items-center gap-4" : "flex flex-col gap-1"}>
        <span className={`${base} text-[#3a241f]`}>Hi, {label}</span>
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

function displayName(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) {
  if (!user) return null;
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim().split(" ")[0];
  return user.email ?? "there";
}
