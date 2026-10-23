"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";

const ALLOWED_STATUSES = ["completed", "cancelled", "no_show"] as const;
type NewStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: string): value is NewStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

/**
 * Mark a confirmed booking completed / cancelled / no-show.
 * Marking "completed" fires the DB trigger that bumps the customer's
 * last_visit_at, which is what feeds the recall list.
 */
export async function updateBookingStatus(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!bookingId || !isAllowedStatus(status)) return;

  await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("status", "confirmed"); // only act on live bookings

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/recall");
}
