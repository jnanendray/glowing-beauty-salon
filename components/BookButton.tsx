"use client";

import Link from "next/link";
import { useViewer } from "@/lib/viewer";

/**
 * "Book an appointment" needs a signed-in customer: signed out → /login
 * (remembering /book as where to return); signed in → straight to the
 * booking page, with the service preselected when one is given.
 *
 * Salon staff (admins) don't book for themselves — for them the same
 * button becomes "View bookings" and opens the admin calendar.
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
  const viewer = useViewer();

  if (viewer.status === "signed-in" && viewer.isAdmin) {
    return (
      <Link href="/admin/bookings?view=month" onClick={onNavigate} className={className}>
        View bookings
      </Link>
    );
  }

  const bookPath = presetService ? `/book?service=${encodeURIComponent(presetService)}` : "/book";
  const href = viewer.status === "signed-in" ? bookPath : `/login?next=${encodeURIComponent(bookPath)}`;

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
