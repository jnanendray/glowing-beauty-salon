"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * "Book an appointment" needs a signed-in customer, so it checks
 * session state first: signed out → /login (remembering /book as
 * where to return to once signed in); signed in → straight to the
 * booking page, with the service preselected when one is given.
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

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const bookPath = presetService ? `/book?service=${encodeURIComponent(presetService)}` : "/book";
  const href = signedIn ? bookPath : `/login?next=${encodeURIComponent(bookPath)}`;

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
