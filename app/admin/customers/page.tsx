import { requireAdmin } from "@/lib/admin/guard";
import { daysSince, todayKey } from "@/lib/admin/format";

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_consent: boolean;
  last_visit_at: string | null;
  created_at: string;
  is_demo: boolean;
};

type BookingLite = { customer_id: string; status: string; booking_date: string };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const { supabase } = await requireAdmin();

  let customersQuery = supabase
    .from("customers")
    .select("id, full_name, email, phone, marketing_consent, last_visit_at, created_at, is_demo")
    .order("created_at", { ascending: false })
    .limit(500);

  if (query) {
    // Strip characters that have meaning inside a PostgREST or() filter.
    const safe = query.replace(/[%,()*]/g, " ").trim();
    if (safe) {
      customersQuery = customersQuery.or(
        `full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`
      );
    }
  }

  const [customersRes, bookingsRes] = await Promise.all([
    customersQuery,
    supabase.from("bookings").select("customer_id, status, booking_date"),
  ]);

  const customers = (customersRes.data ?? []) as CustomerRow[];
  const bookings = (bookingsRes.data ?? []) as BookingLite[];
  const today = todayKey();

  const stats = new Map<string, { total: number; upcoming: number }>();
  for (const b of bookings) {
    const s = stats.get(b.customer_id) ?? { total: 0, upcoming: 0 };
    if (b.status !== "cancelled") s.total += 1;
    if (b.status === "confirmed" && b.booking_date >= today) s.upcoming += 1;
    stats.set(b.customer_id, s);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">Customers</h1>
          <p className="font-body mt-1 text-sm text-[#5c4038]">
            {customers.length} {query ? "matching" : "signed up"}
          </p>
        </div>

        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, email or phone"
            className="font-body w-full rounded-full border border-[#3a241f]/15 bg-white px-4 py-2 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f] md:w-72"
          />
          <button
            type="submit"
            className="font-body rounded-full bg-[#3a241f] px-4 py-2 text-sm font-semibold text-[#fdf5f1]"
          >
            Search
          </button>
        </form>
      </div>

      {customersRes.error && (
        <p className="font-body mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&rsquo;t load customers: {customersRes.error.message}
        </p>
      )}

      {customers.length === 0 ? (
        <p className="font-body mt-8 text-sm text-[#5c4038]">
          {query ? "No customers match that search." : "No customers yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#3a241f]/10 bg-white">
          <table className="font-body w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#3a241f]/10 text-xs uppercase tracking-wide text-[#806155]">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Last visit</th>
                <th className="px-4 py-3 font-medium">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const s = stats.get(c.id) ?? { total: 0, upcoming: 0 };
                return (
                  <tr key={c.id} className="border-b border-[#3a241f]/5 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#3a241f]">
                        {c.full_name || <span className="text-[#806155]">No name yet</span>}
                        {c.is_demo && <span className="ml-1.5 rounded-full bg-[#3a241f] px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-[#fdf5f1]">Demo</span>}
                      </p>
                      <p className="text-xs text-[#806155]">
                        Joined {new Date(c.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#5c4038]">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="block underline-offset-2 hover:underline">
                          {c.email}
                        </a>
                      )}
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="block underline-offset-2 hover:underline">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="block text-xs text-[#806155]">No phone</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#3a241f]">
                      {s.total}
                      {s.upcoming > 0 && (
                        <span className="ml-2 rounded-full bg-[#f6e3dc] px-2 py-0.5 text-[11px] text-[#8a4a37]">
                          {s.upcoming} upcoming
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#5c4038]">
                      {c.last_visit_at ? (
                        <>
                          {new Date(c.last_visit_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                          <span className="block text-xs text-[#806155]">{daysSince(c.last_visit_at)} days ago</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#806155]">No completed visit</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.marketing_consent ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Opted in</span>
                      ) : (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">Not opted in</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
