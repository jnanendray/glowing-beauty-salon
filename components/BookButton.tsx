"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * "Book an appointment" needs a signed-in customer, so it checks
 * session state first: signed out → /login (remembering /book as
 * where to return to once signed in); signed in → straight to the
 * booking page, with the service preselected when one is given.
 *
 * The salon owner/staff (admins) don't book for themselves — for them
 * the same button becomes "View bookings" and opens the admin
 * calendar instead.
 */
export default function BookButton({
  className,
  onNavigate,
  presetService,
  children = "Book an appointment",
}: {
  className: string;
  onNavigate?: () => void;
  /** The service's exact name, to preselect it on the booking page. */
  presetService?: string;
  children?: React.ReactNode;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function checkAdmin(hasUser: boolean) {
      if (!hasUser) {
        setIsAdmin(false);
        return;
      }
      supabase.rpc("is_admin").then(({ data }) => {
        if (!cancelled) setIsAdmin(data === true);
      });
    }

    supabase.auth.getUser().then(({ data }) => {
      const hasUser = !!data.user;
      setSignedIn(hasUser);
      checkAdmin(hasUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasUser = !!session?.user;
      setSignedIn(hasUser);
      checkAdmin(hasUser);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (isAdmin) {
    return (
      <Link href="/admin/bookings?view=month" onClick={onNavigate} className={className}>
        View bookings
      </Link>
    );
  }

  const bookPath = presetService ? `/book?service=${encodeURIComponent(presetService)}` : "/book";
  const href = signedIn ? bookPath : `/login?next=${encodeURIComponent(bookPath)}`;

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
