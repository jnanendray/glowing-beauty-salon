-- Glowing Beauty Salon — admin panel support
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.

-- 1. Let signed-in users ask "am I an admin?" — the admin panel calls
--    this to decide whether to let someone in. It only ever answers
--    about the caller themselves (it checks auth.uid()).
grant execute on function public.is_admin() to authenticated;

-- 2. Free up cancelled / no-show slots.
--    0001 made (stylist, date, start_time) unique across ALL bookings,
--    so a cancelled appointment kept blocking its slot forever: the
--    calendar showed it as free, but booking it failed. Only live
--    bookings (confirmed / completed) should hold a slot.
alter table public.bookings
  drop constraint if exists bookings_stylist_id_booking_date_start_time_key;

create unique index if not exists bookings_active_slot_uniq
  on public.bookings (stylist_id, booking_date, start_time)
  where status in ('confirmed', 'completed');

-- 3. Make yourself the admin (run once, with the email you sign in with):
--
--   insert into public.admin_users (auth_user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
