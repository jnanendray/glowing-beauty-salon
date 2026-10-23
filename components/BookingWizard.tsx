"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string | null; // numeric columns come back as strings from PostgREST
  home_service_available: boolean;
  home_service_charge: string;
};

type Stylist = {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
};

type WorkingHours = {
  stylist_id: string;
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
};

type BookedSlot = {
  start_time: string;
  end_time: string;
};

type TimeSlot = {
  startTime: string; // "HH:MM:SS"
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  booked: boolean;
  past: boolean;
};

type Step = "service" | "location" | "stylist" | "datetime" | "confirm" | "done";
type LocationType = "salon" | "home";

function formatPrice(value: string | null): string {
  if (value === null) return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part: string) => parseInt(part, 10));
  return h * 60 + m;
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}:00`;
}

function formatClock(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingWizard({ presetServiceName }: { presetServiceName: string | null }) {
  const [step, setStep] = useState<Step>("service");

  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [locationType, setLocationType] = useState<LocationType>("salon");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");

  const [stylistOptions, setStylistOptions] = useState<Stylist[]>([]);
  const [stylistsLoading, setStylistsLoading] = useState(false);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load active services, and who the signed-in customer is.
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("services")
      .select("id, name, description, duration_minutes, price, home_service_available, home_service_charge")
      .eq("active", true)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          const rows = (data ?? []) as Service[];
          setServices(rows);
          if (presetServiceName) {
            const match = rows.find((s: Service) => s.name === presetServiceName);
            if (match) {
              setSelectedService(match);
              setStep("location");
            }
          }
        }
        setLoadingServices(false);
      });

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        setCustomerLoading(false);
        return;
      }
      supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()
        .then(({ data: customerRow }) => {
          setCustomerId(customerRow ? (customerRow as { id: string }).id : null);
          setCustomerLoading(false);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once a service is chosen (and, if home service isn't offered or
  // the location step is done), load the stylists who perform it.
  useEffect(() => {
    if (!selectedService) return;
    if (step !== "stylist") return;

    setStylistsLoading(true);
    setSelectedStylist(null);
    const supabase = createClient();

    supabase
      .from("stylist_services")
      .select("stylist_id")
      .eq("service_id", selectedService.id)
      .then(async ({ data: links, error: linkError }) => {
        if (linkError || !links || links.length === 0) {
          setStylistOptions([]);
          setStylistsLoading(false);
          return;
        }
        const ids = (links as { stylist_id: string }[]).map((l) => l.stylist_id);
        const { data: stylistRows } = await supabase
          .from("stylists")
          .select("id, name, role, photo_url")
          .in("id", ids)
          .eq("active", true)
          .order("name", { ascending: true });
        setStylistOptions((stylistRows ?? []) as Stylist[]);
        setStylistsLoading(false);
      });
  }, [selectedService, step]);

  // Once a stylist is chosen, load their weekly working hours.
  useEffect(() => {
    if (!selectedStylist) return;
    setHoursLoading(true);
    setSelectedDateKey(null);
    setSlots([]);
    setSelectedSlot(null);
    const supabase = createClient();

    supabase
      .from("stylist_working_hours")
      .select("stylist_id, day_of_week, start_time, end_time")
      .eq("stylist_id", selectedStylist.id)
      .then(({ data }) => {
        setWorkingHours((data ?? []) as WorkingHours[]);
        setHoursLoading(false);
      });
  }, [selectedStylist]);

  // Next 14 days, each marked with whether the stylist works that day.
  const days = useMemo(() => {
    const out: { key: string; date: Date; dayOfWeek: number; works: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const works = workingHours.some((wh: WorkingHours) => wh.day_of_week === dayOfWeek);
      out.push({ key: dateToKey(d), date: d, dayOfWeek, works });
    }
    return out;
  }, [workingHours]);

  // Once a date is picked, fetch that day's booked slots and build
  // the list of bookable time slots from the stylist's working hours.
  useEffect(() => {
    if (!selectedDateKey || !selectedStylist || !selectedService) return;

    const dayInfo = days.find((d) => d.key === selectedDateKey);
    const hoursForDay = workingHours.find((wh: WorkingHours) => wh.day_of_week === dayInfo?.dayOfWeek);
    if (!dayInfo || !hoursForDay) {
      setSlots([]);
      return;
    }

    const stylistId = selectedStylist.id;
    const dateKey = selectedDateKey;
    const duration = selectedService.duration_minutes;
    const startMin = timeToMinutes(hoursForDay.start_time);
    const endMin = timeToMinutes(hoursForDay.end_time);

    setSlotsLoading(true);
    setSelectedSlot(null);
    const supabase = createClient();

    supabase
      .rpc("get_booked_slots", { p_stylist_id: stylistId, p_date: dateKey })
      .then(({ data: bookedRows }) => {
        const booked = (bookedRows ?? []) as BookedSlot[];

        const now = new Date();
        const isToday = dateKey === dateToKey(now);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const built: TimeSlot[] = [];
        for (let m = startMin; m + duration <= endMin; m += duration) {
          const slotStartMin = m;
          const slotEndMin = m + duration;
          const isBooked = booked.some((b: BookedSlot) => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            return slotStartMin < bEnd && bStart < slotEndMin;
          });
          built.push({
            startTime: minutesToTimeString(slotStartMin),
            endTime: minutesToTimeString(slotEndMin),
            startMinutes: slotStartMin,
            endMinutes: slotEndMin,
            booked: isBooked,
            past: isToday && slotStartMin <= nowMinutes,
          });
        }
        setSlots(built);
        setSlotsLoading(false);
      });
  }, [selectedDateKey, selectedStylist, selectedService, workingHours, days, slotsRefreshKey]);

  async function handleConfirm() {
    if (!selectedService || !selectedStylist || !selectedDateKey || !selectedSlot) return;
    if (!customerId) {
      setSubmitError("We couldn't find your customer profile. Try refreshing the page.");
      return;
    }
    if (locationType === "home" && (!address.trim() || !area.trim())) {
      setSubmitError("Please add your address and area for an at-home appointment.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const supabase = createClient();

    const { error } = await supabase.from("bookings").insert({
      customer_id: customerId,
      stylist_id: selectedStylist.id,
      service_id: selectedService.id,
      booking_date: selectedDateKey,
      start_time: selectedSlot.startTime,
      end_time: selectedSlot.endTime,
      location_type: locationType,
      address: locationType === "home" ? address.trim() : null,
      area: locationType === "home" ? area.trim() : null,
      home_service_charge: locationType === "home" ? selectedService.home_service_charge : 0,
      status: "confirmed",
      notes: notes.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setSubmitError("That slot was just taken by someone else — please pick another time.");
        setSelectedSlot(null);
        setStep("datetime");
        // Force the slots effect to refetch for the same date, since
        // the date itself hasn't changed (setting state to its own
        // value wouldn't retrigger it).
        setSlotsRefreshKey((n) => n + 1);
      } else {
        setSubmitError(error.message);
      }
      return;
    }

    setStep("done");
  }

  const totalPrice = useMemo(() => {
    if (!selectedService) return null;
    const base = Number(selectedService.price ?? 0);
    const extra = locationType === "home" ? Number(selectedService.home_service_charge ?? 0) : 0;
    return base + extra;
  }, [selectedService, locationType]);

  if (loadingServices) {
    return <p className="font-body text-sm text-[#5c4038]">Loading services…</p>;
  }

  if (loadError) {
    return <p className="font-body text-sm text-red-600">Couldn&rsquo;t load services: {loadError}</p>;
  }

  return (
    <div className="max-w-[720px]">
      <StepIndicator step={step} />

      {step === "service" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {services.map((s: Service) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedService(s);
                setLocationType("salon");
                setStep("location");
              }}
              className="rounded-2xl border border-[#3a241f]/10 bg-white p-5 text-left shadow-[0_8px_24px_rgba(58,36,31,0.05)] transition hover:border-[#b8765f]"
            >
              <h3 className="font-display text-base font-semibold text-[#3a241f]">{s.name}</h3>
              {s.description && (
                <p className="font-body mt-1 text-sm text-[#6b4c42]">{s.description}</p>
              )}
              <div className="font-body mt-3 flex items-center gap-3 text-sm text-[#9a5a46]">
                <span className="font-semibold">{formatPrice(s.price)}</span>
                <span>· {s.duration_minutes} min</span>
                {s.home_service_available && <span>· at-home available</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "location" && selectedService && (
        <div className="mt-6">
          {!selectedService.home_service_available ? (
            <AutoAdvanceToStylist onReady={() => setStep("stylist")} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLocationType("salon")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    locationType === "salon"
                      ? "border-[#b8765f] bg-white shadow-[0_8px_24px_rgba(58,36,31,0.08)]"
                      : "border-[#3a241f]/10 bg-white/60"
                  }`}
                >
                  <h3 className="font-display text-base font-semibold text-[#3a241f]">At our salon</h3>
                  <p className="font-body mt-1 text-sm text-[#6b4c42]">
                    Visit our studio for this appointment.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("home")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    locationType === "home"
                      ? "border-[#b8765f] bg-white shadow-[0_8px_24px_rgba(58,36,31,0.08)]"
                      : "border-[#3a241f]/10 bg-white/60"
                  }`}
                >
                  <h3 className="font-display text-base font-semibold text-[#3a241f]">At your home</h3>
                  <p className="font-body mt-1 text-sm text-[#6b4c42]">
                    We come to you for an extra {formatPrice(selectedService.home_service_charge)}.
                  </p>
                </button>
              </div>

              {locationType === "home" && (
                <div className="mt-5 flex flex-col gap-3">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address (house/flat, street)"
                    className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
                  />
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Area / neighbourhood"
                    className="font-body rounded-full border border-[#3a241f]/15 bg-white px-5 py-3 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
                  />
                  <p className="font-body text-xs text-[#8a6b61]">
                    Map pin and &ldquo;use my location&rdquo; are coming soon — for now, just describe your
                    address and area.
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <BackButton onClick={() => setStep("service")} />
                <button
                  type="button"
                  disabled={locationType === "home" && (!address.trim() || !area.trim())}
                  onClick={() => setStep("stylist")}
                  className="font-body rounded-full bg-[#b8765f] px-6 py-2.5 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "stylist" && (
        <div className="mt-6">
          {stylistsLoading ? (
            <p className="font-body text-sm text-[#5c4038]">Loading stylists…</p>
          ) : stylistOptions.length === 0 ? (
            <p className="font-body text-sm text-[#5c4038]">
              No stylist currently offers this service — please try another service.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {stylistOptions.map((st: Stylist) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setSelectedStylist(st);
                    setStep("datetime");
                  }}
                  className="rounded-2xl border border-[#3a241f]/10 bg-white p-5 text-left shadow-[0_8px_24px_rgba(58,36,31,0.05)] transition hover:border-[#b8765f]"
                >
                  <h3 className="font-display text-base font-semibold text-[#3a241f]">{st.name}</h3>
                  {st.role && <p className="font-body mt-1 text-sm text-[#6b4c42]">{st.role}</p>}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <BackButton
              onClick={() =>
                setStep(selectedService?.home_service_available ? "location" : "service")
              }
            />
          </div>
        </div>
      )}

      {step === "datetime" && selectedStylist && (
        <div className="mt-6">
          {hoursLoading ? (
            <p className="font-body text-sm text-[#5c4038]">Loading availability…</p>
          ) : (
            <>
              <h3 className="font-display text-sm font-semibold text-[#3a241f]">Pick a date</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {days.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    disabled={!d.works}
                    onClick={() => setSelectedDateKey(d.key)}
                    className={`font-body rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      !d.works
                        ? "cursor-not-allowed border-[#3a241f]/8 bg-[#3a241f]/5 text-[#8a6b61]/60"
                        : selectedDateKey === d.key
                          ? "border-[#b8765f] bg-[#b8765f] text-[#fdf5f1]"
                          : "border-[#3a241f]/15 bg-white text-[#3a241f] hover:border-[#b8765f]"
                    }`}
                  >
                    <div>{DAY_LABELS[d.dayOfWeek]}</div>
                    <div>{d.date.getDate()}</div>
                  </button>
                ))}
              </div>

              {selectedDateKey && (
                <div className="mt-6">
                  <h3 className="font-display text-sm font-semibold text-[#3a241f]">Pick a time</h3>
                  {slotsLoading ? (
                    <p className="font-body mt-3 text-sm text-[#5c4038]">Checking available times…</p>
                  ) : slots.length === 0 ? (
                    <p className="font-body mt-3 text-sm text-[#5c4038]">No time slots that day.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {slots.map((slot: TimeSlot) => {
                        const disabled = slot.booked || slot.past;
                        const selected = selectedSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot)}
                            title={slot.booked ? "Already booked" : slot.past ? "This time has passed" : undefined}
                            className={`font-body rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                              disabled
                                ? "cursor-not-allowed border-[#3a241f]/8 bg-[#3a241f]/5 text-[#8a6b61]/50 line-through"
                                : selected
                                  ? "border-[#b8765f] bg-[#b8765f] text-[#fdf5f1]"
                                  : "border-[#3a241f]/15 bg-white text-[#3a241f] hover:border-[#b8765f]"
                            }`}
                          >
                            {formatClock(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <BackButton onClick={() => setStep("stylist")} />
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep("confirm")}
                  className="font-body rounded-full bg-[#b8765f] px-6 py-2.5 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "confirm" && selectedService && selectedStylist && selectedDateKey && selectedSlot && (
        <div className="mt-6">
          <div className="rounded-2xl border border-[#3a241f]/10 bg-white p-6">
            <dl className="font-body flex flex-col gap-2 text-sm text-[#3a241f]">
              <Row label="Service" value={selectedService.name} />
              <Row label="Stylist" value={selectedStylist.name} />
              <Row
                label="Where"
                value={locationType === "salon" ? "At our salon" : `At home — ${address}, ${area}`}
              />
              <Row label="Date" value={new Date(`${selectedDateKey}T00:00:00`).toDateString()} />
              <Row label="Time" value={formatClock(selectedSlot.startTime)} />
              <Row label="Total" value={totalPrice !== null ? `₹${totalPrice.toLocaleString("en-IN")}` : "—"} />
            </dl>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know? (optional)"
              rows={3}
              className="font-body mt-4 w-full rounded-2xl border border-[#3a241f]/15 bg-white px-4 py-3 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
            />

            {submitError && <p className="font-body mt-3 text-xs text-red-600">{submitError}</p>}
            {customerLoading && (
              <p className="font-body mt-3 text-xs text-[#8a6b61]">Loading your profile…</p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <BackButton onClick={() => setStep("datetime")} />
            <button
              type="button"
              disabled={submitting || customerLoading}
              onClick={handleConfirm}
              className="font-body rounded-full bg-[#b8765f] px-6 py-2.5 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-2xl border border-[#b8765f]/30 bg-white p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-[#3a241f]">You&rsquo;re booked!</h2>
          <p className="font-body mt-2 text-sm text-[#5c4038]">
            We&rsquo;ve confirmed your appointment. See you soon.
          </p>
          <Link
            href="/"
            className="font-body mt-5 inline-block rounded-full bg-[#b8765f] px-6 py-2.5 text-sm font-semibold text-[#fdf5f1]"
          >
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#3a241f]/8 py-1.5 last:border-0">
      <dt className="text-[#8a6b61]">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-body rounded-full border border-[#3a241f]/15 px-6 py-2.5 text-sm font-semibold text-[#3a241f]"
    >
      Back
    </button>
  );
}

// A service with no at-home option has nothing to choose on the
// location step, so skip straight to picking a stylist.
function AutoAdvanceToStylist({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "service", label: "Service" },
    { key: "location", label: "Where" },
    { key: "stylist", label: "Stylist" },
    { key: "datetime", label: "Date & time" },
    { key: "confirm", label: "Confirm" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <span
          key={s.key}
          className={`font-body rounded-full px-3 py-1 text-xs font-semibold ${
            i <= activeIndex && activeIndex >= 0
              ? "bg-[#b8765f] text-[#fdf5f1]"
              : "bg-[#3a241f]/8 text-[#8a6b61]"
          }`}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}
