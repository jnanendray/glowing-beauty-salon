-- Glowing Beauty Salon — booking-slot availability
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.

-- The bookings table's RLS policy (see 0001) only lets a customer see
-- their OWN bookings — correct, since a booking row has another
-- customer's name/address/phone-adjacent data. But the booking
-- calendar needs to grey out slots that are already taken by *anyone*,
-- without ever exposing who booked them. This function runs with the
-- table owner's privileges (bypassing RLS) and returns only the two
-- columns that matter for availability — nothing identifying.
create or replace function public.get_booked_slots(p_stylist_id uuid, p_date date)
returns table(start_time time, end_time time)
language sql
security definer set search_path = public
stable
as $$
  select start_time, end_time
  from public.bookings
  where stylist_id = p_stylist_id
    and booking_date = p_date
    and status in ('confirmed', 'completed');
$$;

-- Anyone (signed in or not) can call this — it's the same "is this
-- slot free" check a public booking page needs, and it leaks nothing
-- beyond which minutes are busy.
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;
