import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { daysSince, todayKey, whatsappNumber } from "@/lib/admin/format";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_consent: boolean;
  last_visit_at: string;
};

const WEEK_OPTIONS = [4, 6, 8] as const;

export default async function AdminRecallPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>;
}) {
  const { weeks: weeksParam } = await searchParams;
  const weeks = WEEK_OPTIONS.find((w) => String(w) === weeksParam) ?? 4;
  const cutoff = new Date(Date.now() - weeks * 7 * 86_400_000).toISOString();

  const { supabase } = await requireAdmin();

  const [customersRes, upcomingRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, email, phone, marketing_consent, last_visit_at")
      .not("last_visit_at", "is", null)
      .lte("last_visit_at", cutoff)
      .order("last_visit_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("customer_id")
      .eq("status", "confirmed")
      .gte("booking_date", todayKey()),
  ]);

  // Someone who already has an appointment coming up doesn't need a nudge.
  const alreadyBooked = new Set(((upcomingRes.data ?? []) as { customer_id: string }[]).map((b) => b.customer_id));
  const due = ((customersRes.data ?? []) as CustomerRow[]).filter((c) => !alreadyBooked.has(c.id));

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">Recall list</h1>
          <p className="font-body mt-1 max-w-[620px] text-sm text-[#5c4038]">
            Customers whose last completed visit was {weeks}+ weeks ago and who have nothing booked yet. A
            visit counts once you mark a booking <strong>Done</strong> on the Bookings page.
          </p>
        </div>

        <div className="flex rounded-full border border-[#3a241f]/15 bg-white p-1">
          {WEEK_OPTIONS.map((w) => (
            <Link
              key={w}
              href={`/admin/recall?weeks=${w}`}
              className={`font-body rounded-full px-4 py-1.5 text-sm font-medium ${
                w === weeks ? "bg-[#3a241f] text-[#fdf5f1]" : "text-[#5c4038]"
              }`}
            >
              {w}+ weeks
            </Link>
          ))}
        </div>
      </div>

      {/* Automatic reminders need the paid WhatsApp Business API — shown, but switched off. */}
      <div className="disabled-option mt-6 flex flex-col gap-1 rounded-2xl border border-dashed border-[#3a241f]/25 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-body text-sm font-semibold text-[#3a241f]">Send automatic WhatsApp reminders</p>
          <p className="font-body text-xs text-[#5c4038]">
            Requires a paid service (WhatsApp Business API). For now, use the manual buttons below — they open
            WhatsApp or email on your own phone, at no cost.
          </p>
        </div>
        <span className="font-body mt-2 rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 md:mt-0">
          Off
        </span>
      </div>

      {customersRes.error && (
        <p className="font-body mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&rsquo;t load the recall list: {customersRes.error.message}
        </p>
      )}

      {due.length === 0 ? (
        <p className="font-body mt-8 text-sm text-[#5c4038]">Nobody is due for a reminder right now.</p>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {due.map((c) => {
            const name = c.full_name || c.email?.split("@")[0] || "there";
            const firstName = name.split(" ")[0];
            const message = `Hi ${firstName}! It's been a while since your last visit to Glowing Beauty Salon. Would you like to book your next appointment? Reply here or book online anytime.`;
            const wa = whatsappNumber(c.phone);
            const days = daysSince(c.last_visit_at);

            return (
              <li key={c.id} className="rounded-2xl border border-[#3a241f]/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-body font-semibold text-[#3a241f]">{c.full_name || name}</p>
                    <p className="font-body text-xs text-[#806155]">
                      Last visit {days} days ago ({Math.floor(days / 7)} weeks)
                    </p>
                  </div>
                  {c.marketing_consent ? (
                    <span className="font-body shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                      Opted in
                    </span>
                  ) : (
                    <span className="font-body shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                      Not opted in
                    </span>
                  )}
                </div>

                {c.marketing_consent ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="font-body disabled-option rounded-full border border-[#3a241f]/15 px-3 py-1.5 text-xs text-[#5c4038]">
                        WhatsApp · no phone
                      </span>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}?subject=${encodeURIComponent("We miss you at Glowing Beauty Salon")}&body=${encodeURIComponent(message)}`}
                        className="font-body rounded-full border border-[#3a241f]/15 px-3 py-1.5 text-xs font-semibold text-[#3a241f]"
                      >
                        Email
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="font-body mt-3 text-xs text-[#806155]">
                    This customer hasn&rsquo;t agreed to reminder messages, so no outreach buttons are shown.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
