// Small date/time helpers for the admin panel. Dates are handled as
// plain "YYYY-MM-DD" keys (what Postgres `date` columns return), and
// "today" is always the salon's local day in India, not the server's
// UTC day — Vercel runs in UTC, which would flip the date at 5:30am.

export const SALON_TZ = "Asia/Kolkata";

export function todayKey(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: SALON_TZ }).format(new Date());
}

export function isDateKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First day of the month containing `key`. */
export function monthStart(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** First day of the month `n` months after the one containing `key`. */
export function addMonths(key: string, n: number): string {
  const d = new Date(`${monthStart(key)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function formatMonth(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(key, diff);
}

export function formatDateLong(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "14:30:00" → "2:30 PM" */
export function formatClock(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** PostgREST returns a to-one embed as an object, but be tolerant of arrays. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Digits only, with India's 91 prefix added to a bare 10-digit number — for wa.me links. */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}
