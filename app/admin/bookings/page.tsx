import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { updateBookingStatus } from "@/app/admin/actions";
import {
  addDays,
  formatClock,
  formatDateLong,
  formatDateShort,
  isDateKey,
  one,
  todayKey,
  weekStart,
} from "@/lib/admin/format";

type View = "day" | "week";

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  location_type: "salon" | "home";
  address: string | null;
  area: string | null;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  stylist_id: string;
  customer: { full_name: string | null; email: string | null; phone: string | null } | null;
  stylist: { name: string } | null;
  service: { name: string } | null;
};

type StylistRow = { id: string; name: string };

const STATUS_STYLE: Record<BookingRow["status"], { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-[#f6e3dc] text-[#8a4a37]" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", className: "bg-stone-100 text-stone-500" },
  no_show: { label: "No-show", className: "bg-amber-50 text-amber-700" },
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view: View = params.view === "week" ? "week" : "day";
  const today = todayKey();
  const date = isDateKey(params.date) ? params.date : today;

  const rangeStart = view === "week" ? weekStart(date) : date;
  const rangeEnd = view === "week" ? addDays(rangeStart, 6) : date;
  const step = view === "week" ? 7 : 1;

  const { supabase } = await requireAdmin();

  const [bookingsRes, stylistsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, booking_date, start_time, end_time, location_type, address, area, status, notes, stylist_id, customer:customers(full_name, email, phone), stylist:stylists(name), service:services(name)"
      )
      .gte("booking_date", rangeStart)
      .lte("booking_date", rangeEnd)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase.from("stylists").select("id, name").eq("active", true).order("name"),
  ]);

  const rawBookings = (bookingsRes.data ?? []) as unknown as Array<
    Omit<BookingRow, "customer" | "stylist" | "service"> & {
      customer: BookingRow["customer"] | BookingRow["customer"][];
      stylist: BookingRow["stylist"] | BookingRow["stylist"][];
      service: BookingRow["service"] | BookingRow["service"][];
    }
  >;
  const bookings: BookingRow[] = rawBookings.map((b) => ({
    ...b,
    customer: one(b.customer),
    stylist: one(b.stylist),
    service: one(b.service),
  }));
  const stylists = (stylistsRes.data ?? []) as StylistRow[];

  const liveCount = bookings.filter((b) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const href = (v: View, d: string) => `/admin/bookings?view=${v}&date=${d}`;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">
            {view === "day"
              ? formatDateLong(date)
              : `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd)}`}
          </h1>
          <p className="font-body mt-1 text-sm text-[#5c4038]">
            {bookings.length === 0
              ? "No bookings in this period."
              : `${liveCount} upcoming · ${completedCount} completed · ${bookings.length} total`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#3a241f]/15 bg-white p-1">
            {(["day", "week"] as const).map((v) => (
              <Link
                key={v}
                href={href(v, date)}
                className={`font-body rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
                  view === v ? "bg-[#3a241f] text-[#fdf5f1]" : "text-[#5c4038]"
                }`}
              >
                {v}
              </Link>
            ))}
          </div>
          <Link
            href={href(view, addDays(date, -step))}
            aria-label="Previous"
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-3 py-1.5 text-sm text-[#3a241f]"
          >
            ←
          </Link>
          <Link
            href={href(view, today)}
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-4 py-1.5 text-sm text-[#3a241f]"
          >
            Today
          </Link>
          <Link
            href={href(view, addDays(date, step))}
            aria-label="Next"
            className="font-body rounded-full border border-[#3a241f]/15 bg-white px-3 py-1.5 text-sm text-[#3a241f]"
          >
            →
          </Link>
        </div>
      </div>

      {bookingsRes.error && (
        <p className="font-body mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&rsquo;t load bookings: {bookingsRes.error.message}
        </p>
      )}

      {view === "day" ? (
        <DayView bookings={bookings} stylists={stylists} />
      ) : (
        <WeekView bookings={bookings} start={rangeStart} today={today} />
      )}
    </div>
  );
}

/** One column per stylist, bookings in time order. */
function DayView({ bookings, stylists }: { bookings: BookingRow[]; stylists: StylistRow[] }) {
  // Include any stylist who has a booking today even if since deactivated.
  const columns: StylistRow[] = [...stylists];
  for (const b of bookings) {
    if (!columns.some((s) => s.id === b.stylist_id)) {
      columns.push({ id: b.stylist_id, name: b.stylist?.name ?? "Stylist" });
    }
  }

  if (columns.length === 0) {
    return <p className="font-body mt-8 text-sm text-[#5c4038]">No active stylists yet.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div
        className="grid min-w-full gap-4"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))` }}
      >
        {columns.map((stylist) => {
          const own = bookings.filter((b) => b.stylist_id === stylist.id);
          return (
            <section key={stylist.id} className="rounded-2xl border border-[#3a241f]/10 bg-white/70 p-3">
              <h2 className="font-display px-1 pb-2 text-base font-semibold text-[#3a241f]">
                {stylist.name}
                <span className="font-body ml-2 text-xs font-normal text-[#8a6b61]">
                  {own.length} booking{own.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {own.length === 0 ? (
                  <p className="font-body px-1 py-4 text-xs text-[#8a6b61]">Free all day</p>
                ) : (
                  own.map((b) => <BookingCard key={b.id} booking={b} showStylist={false} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Seven day columns, Monday to Sunday. */
function WeekView({ bookings, start, today }: { bookings: BookingRow[]; start: string; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div className="grid min-w-[1120px] grid-cols-7 gap-3">
        {days.map((day) => {
          const own = bookings.filter((b) => b.booking_date === day);
          const isToday = day === today;
          return (
            <section
              key={day}
              className={`rounded-2xl border p-2.5 ${
                isToday ? "border-[#b8765f] bg-white" : "border-[#3a241f]/10 bg-white/70"
              }`}
            >
              <Link
                href={`/admin/bookings?view=day&date=${day}`}
                className="font-body block px-1 pb-2 text-sm font-semibold text-[#3a241f] hover:underline"
              >
                {formatDateShort(day)}
                {isToday && <span className="ml-1.5 text-xs font-normal text-[#b8765f]">today</span>}
              </Link>
              <div className="flex flex-col gap-2">
                {own.length === 0 ? (
                  <p className="font-body px-1 py-3 text-xs text-[#8a6b61]">—</p>
                ) : (
                  own.map((b) => <BookingCard key={b.id} booking={b} showStylist compact />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BookingCard({
  booking: b,
  showStylist,
  compact = false,
}: {
  booking: BookingRow;
  showStylist: boolean;
  compact?: boolean;
}) {
  const status = STATUS_STYLE[b.status];
  const customerName = b.customer?.full_name || b.customer?.email?.split("@")[0] || "Customer";
  const faded = b.status === "cancelled" || b.status === "no_show";

  return (
    <article
      className={`rounded-xl border border-[#3a241f]/10 bg-white p-3 ${faded ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-sm font-semibold text-[#3a241f]">
          {formatClock(b.start_time)}
          {!compact && <span className="font-normal text-[#8a6b61]"> – {formatClock(b.end_time)}</span>}
        </p>
        <span className={`font-body shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="font-body mt-1 text-sm text-[#3a241f]">{b.service?.name ?? "Service"}</p>
      <p className="font-body text-xs text-[#5c4038]">
        {customerName}
        {showStylist && b.stylist?.name ? ` · with ${b.stylist.name}` : ""}
      </p>

      {!compact && b.customer?.phone && (
        <p className="font-body mt-1 text-xs text-[#5c4038]">
          <a href={`tel:${b.customer.phone}`} className="underline-offset-2 hover:underline">
            {b.customer.phone}
          </a>
        </p>
      )}

      {b.location_type === "home" && (
        <p className="font-body mt-1.5 rounded-lg bg-[#fdf5f1] px-2 py-1 text-xs text-[#8a4a37]">
          At home{compact ? "" : ` — ${[b.address, b.area].filter(Boolean).join(", ")}`}
        </p>
      )}

      {!compact && b.notes && (
        <p className="font-body mt-1.5 text-xs italic text-[#8a6b61]">&ldquo;{b.notes}&rdquo;</p>
      )}

      {b.status === "confirmed" && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <StatusButton id={b.id} status="completed" label="Done" tone="primary" />
          <StatusButton id={b.id} status="no_show" label="No-show" />
          <StatusButton id={b.id} status="cancelled" label="Cancel" />
        </div>
      )}
    </article>
  );
}

function StatusButton({
  id,
  status,
  label,
  tone = "plain",
}: {
  id: string;
  status: "completed" | "cancelled" | "no_show";
  label: string;
  tone?: "primary" | "plain";
}) {
  return (
    <form action={updateBookingStatus}>
      <input type="hidden" name="bookingId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`font-body rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          tone === "primary"
            ? "bg-[#b8765f] text-[#fdf5f1] hover:bg-[#c48670]"
            : "border border-[#3a241f]/15 text-[#5c4038] hover:bg-[#fdf5f1]"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
