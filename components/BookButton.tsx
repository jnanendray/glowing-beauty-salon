"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * "Book an appointment" needs a signed-in customer, so it checks
 * session state first: signed out → /login (remembering #booking as
 * where to return to once signed in); signed in → straight to the
 * booking section once it exists.
 */
export default function BookButton({
  className,
  onNavigate,
  children = "Book an appointment",
}: {
  className: string;
  onNavigate?: () => void;
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

  const href = signedIn ? "#booking" : "/login?next=%2F%23booking";

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
