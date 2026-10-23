import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { updateBookingStatus } from "@/app/admin/actions";
import {
  addDays,
  addMonths,
  formatClock,
  formatDateLong,
  formatDateShort,
  formatMonth,
  isDateKey,
  monthStart,
  one,
  todayKey,
  weekStart,
} from "@/lib/admin/format";

type View = "month" | "day" | "week" | "list";

const VIEW_LABELS: Record<View, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  list: "Booked list",
};

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  location_type: "salon" | "home";
  address: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
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

const BOOKING_SELECT =
  "id, booking_date, start_time, end_time, location_type, address, area, latitude, longitude, status, notes, stylist_id, customer:customers(full_name, email, phone), stylist:stylists(name), service:services(name)";

function parseView(value: string | undefined): View {
  return value === "day" || value === "week" || value === "list" ? value : "month";
}

/** Bookings that occupy a slot (shown as "booked" on the calendar). */
function isLive(b: BookingRow) {
  return b.status === "confirmed" || b.status === "completed";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const today = todayKey();
  const date = isDateKey(params.date) ? params.date : today;

  // The date range each view needs. Month shows a full 6-week grid
  // (including the edges of the neighbouring months).
  let rangeStart = date;
  let rangeEnd: string | null = date;
  if (view === "week") {
    rangeStart = weekStart(date);
    rangeEnd = addDays(rangeStart, 6);
  } else if (view === "month") {
    rangeStart = weekStart(monthStart(date));
    rangeEnd = addDays(rangeStart, 41);
  } else if (view === "list") {
    rangeStart = today;
    rangeEnd = null;
  }

  const { supabase } = await requireAdmin();

  let bookingsQuery = supabase.from("bookings").select(BOOKING_SELECT).gte("booking_date", rangeStart);
  if (rangeEnd) bookingsQuery = bookingsQuery.lte("booking_date", rangeEnd);
  if (view === "list") bookingsQuery = bookingsQuery.eq("status", "confirmed").limit(300);

  const [bookingsRes, stylistsRes] = await Promise.all([
    bookingsQuery.order("booking_date", { ascending: true }).order("start_time", { ascending: true }),
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

  const href = (v: View, d: string) => `/admin/bookings?view=${v}&date=${d}`;
  const prevDate =
    view === "month" ? addMonths(date, -1) : addDays(date, view === "week" ? -7 : -1);
  const nextDate = view === "month" ? addMonths(date, 1) : addDays(date, view === "week" ? 7 : 1);

  let title: string;
  if (view === "month") title = formatMonth(date);
  else if (view === "day") title = formatDateLong(date);
  else if (view === "week") title = `${formatDateShort(rangeStart)} – ${formatDateShort(rangeEnd ?? rangeStart)}`;
  else title = "Upcoming bookings";

  let summary: string;
  if (view === "list") {
    summary = bookings.length === 0 ? "Nothing booked from today onwards." : `${bookings.length} booked from today onwards`;
  } else if (view === "month") {
    const inMonth = bookings.filter((b) => b.booking_date.slice(0, 7) === date.slice(0, 7) && isLive(b));
    summary = `${inMonth.length} booking${inMonth.length === 1 ? "" : "s"} this month · tap a date to see its list`;
  } else {
    const liveCount = bookings.filter((b) => b.status === "confirmed").length;
    const completedCount = bookings.filter((b) => b.status === "completed").length;
    summary =
      bookings.length === 0
        ? "No bookings in this period."
        : `${liveCount} upcoming · ${completedCount} completed · ${bookings.length} total`;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">{title}</h1>
          <p className="font-body mt-1 text-sm text-[#5c4038]">{summary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-full border border-[#3a241f]/15 bg-white p-1">
            {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
              <Link
                key={v}
                href={href(v, date)}
                className={`font-body whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                  view === v ? "bg-[#3a241f] text-[#fdf5f1]" : "text-[#5c4038]"
                }`}
              >
                {VIEW_LABELS[v]}
              </Link>
            ))}
          </div>
          {view !== "list" && (
            <>
              <Link
                href={href(view, prevDate)}
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
                href={href(view, nextDate)}
                aria-label="Next"
                className="font-body rounded-full border border-[#3a241f]/15 bg-white px-3 py-1.5 text-sm text-[#3a241f]"
              >
                →
              </Link>
            </>
          )}
        </div>
      </div>

      {bookingsRes.error && (
        <p className="font-body mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&rsquo;t load bookings: {bookingsRes.error.message}
        </p>
      )}

      {view === "month" && (
        <MonthView bookings={bookings} gridStart={rangeStart} selected={date} today={today} />
      )}
      {view === "day" && <DayView bookings={bookings} stylists={stylists} />}
      {view === "week" && <WeekView bookings={bookings} start={rangeStart} today={today} />}
      {view === "list" && <ListView bookings={bookings} today={today} />}
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Month calendar. Dates with bookings are greyed out with a count;
 * tapping any date shows that day's bookings underneath.
 */
function MonthView({
  bookings,
  gridStart,
  selected,
  today,
}: {
  bookings: BookingRow[];
  gridStart: string;
  selected: string;
  today: string;
}) {
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = selected.slice(0, 7);
  const countByDate = new Map<string, number>();
  for (const b of bookings) {
    if (isLive(b)) countByDate.set(b.booking_date, (countByDate.get(b.booking_date) ?? 0) + 1);
  }
  const dayBookings = bookings.filter((b) => b.booking_date === selected);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-[#3a241f]/10 bg-white p-3 md:p-4">
        <div className="grid grid-cols-7 gap-1 pb-2">
          {WEEKDAYS.map((d) => (
            <p key={d} className="font-body text-center text-[11px] font-semibold uppercase tracking-wide text-[#8a6b61]">
              {d}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day) => {
            const count = countByDate.get(day) ?? 0;
            const inMonth = day.slice(0, 7) === currentMonth;
            const isSelected = day === selected;
            const isToday = day === today;
            const isPast = day < today;

            let tone = "bg-white text-[#3a241f] hover:bg-[#fdf5f1]";
            if (count > 0) tone = "bg-stone-200 text-stone-600 hover:bg-stone-300";
            if (!inMonth) tone += " opacity-40";
            else if (isPast && count === 0) tone += " text-[#8a6b61]";

            return (
              <Link
                key={day}
                href={`/admin/bookings?view=month&date=${day}`}
                aria-label={`${formatDateLong(day)}${count ? `, ${count} booked` : ""}`}
                aria-current={isSelected ? "date" : undefined}
                className={`font-body flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition-colors md:aspect-auto md:h-20 ${tone} ${
                  isSelected ? "border-[#b8765f] ring-2 ring-[#b8765f]/40" : isToday ? "border-[#b8765f]/60" : "border-transparent"
                }`}
              >
                <span className={isToday ? "font-bold text-[#b8765f]" : "font-medium"}>{Number(day.slice(8))}</span>
                {count > 0 && (
                  <span className="mt-0.5 text-[10px] leading-tight md:text-[11px]">{count} booked</span>
                )}
              </Link>
            );
          })}
        </div>
        <div className="font-body mt-3 flex flex-wrap gap-4 px-1 text-xs text-[#8a6b61]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-stone-200" /> Has bookings
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-[#b8765f]/60 bg-white" /> Today
          </span>
        </div>
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-[#3a241f]">{formatDateLong(selected)}</h2>
          <Link
            href={`/admin/bookings?view=day&date=${selected}`}
            className="font-body shrink-0 text-xs text-[#b8765f] underline-offset-2 hover:underline"
          >
            By stylist →
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {dayBookings.length === 0 ? (
            <p className="font-body rounded-2xl border border-dashed border-[#3a241f]/15 bg-white/60 p-6 text-center text-sm text-[#8a6b61]">
              No bookings on this day.
            </p>
          ) : (
            dayBookings.map((b) => <BookingCard key={b.id} booking={b} showStylist />)
          )}
        </div>
      </section>
    </div>
  );
}

/** Every upcoming confirmed booking, grouped by date. */
function ListView({ bookings, today }: { bookings: BookingRow[]; today: string }) {
  if (bookings.length === 0) {
    return <p className="font-body mt-8 text-sm text-[#5c4038]">No upcoming bookings yet.</p>;
  }

  const groups: { date: string; items: BookingRow[] }[] = [];
  for (const b of bookings) {
    const last = groups[groups.length - 1];
    if (last && last.date === b.booking_date) last.items.push(b);
    else groups.push({ date: b.booking_date, items: [b] });
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="font-display text-base font-semibold text-[#3a241f]">
            {formatDateLong(g.date)}
            {g.date === today && <span className="font-body ml-2 text-xs font-normal text-[#b8765f]">today</span>}
            <span className="font-body ml-2 text-xs font-normal text-[#8a6b61]">
              {g.items.length} booking{g.items.length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((b) => (
              <BookingCard key={b.id} booking={b} showStylist />
            ))}
          </div>
        </section>
      ))}
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
        <div className="font-body mt-1.5 rounded-lg bg-[#fdf5f1] px-2 py-1 text-xs text-[#8a4a37]">
          <p>At home{compact ? "" : ` — ${[b.address, b.area].filter(Boolean).join(", ")}`}</p>
          {b.latitude !== null && b.longitude !== null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block font-semibold underline underline-offset-2"
            >
              Open in Maps ↗
            </a>
          )}
        </div>
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
