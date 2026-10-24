-- Glowing Beauty Salon — security pass
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.
--
-- The website already checks everything below, but anyone can talk
-- to the database directly with the public key — so the database has
-- to enforce the rules itself.

-- =========================================================
-- 1. BOOKINGS — the database checks every new booking
-- =========================================================
-- A customer could previously insert a booking with any status, any
-- price, any time (even in the past or outside working hours) and
-- with a stylist who doesn't do that service. This trigger rejects
-- or corrects all of that, and limits how many bookings one customer
-- can make.
create or replace function public.validate_new_booking()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  svc record;
  hrs record;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  now_time time := (now() at time zone 'Asia/Kolkata')::time;
  made_today int;
  upcoming int;
begin
  -- Salon staff are trusted (and may need to fix things up by hand).
  if public.is_admin() then
    return new;
  end if;

  select id, duration_minutes, home_service_available, home_service_charge, active
    into svc
    from public.services
   where id = new.service_id;
  if not found or not svc.active then
    raise exception 'This service is no longer available.';
  end if;

  if not exists (select 1 from public.stylists where id = new.stylist_id and active) then
    raise exception 'This stylist is no longer available.';
  end if;

  if not exists (
    select 1 from public.stylist_services
     where stylist_id = new.stylist_id and service_id = new.service_id
  ) then
    raise exception 'This stylist doesn''t offer that service.';
  end if;

  if new.booking_date < today or new.booking_date > today + 60 then
    raise exception 'Please pick a date within the next 60 days.';
  end if;

  select start_time, end_time
    into hrs
    from public.stylist_working_hours
   where stylist_id = new.stylist_id
     and day_of_week = extract(dow from new.booking_date)::int;
  if not found then
    raise exception 'The stylist isn''t working that day.';
  end if;

  -- The appointment length always comes from the service, never the browser.
  new.end_time := new.start_time + make_interval(mins => svc.duration_minutes);
  if new.start_time < hrs.start_time or new.end_time > hrs.end_time or new.end_time <= new.start_time then
    raise exception 'That time is outside the stylist''s working hours.';
  end if;

  if new.booking_date = today and new.start_time <= now_time then
    raise exception 'That time has already passed — please pick a later slot.';
  end if;

  -- No overlapping appointments (the unique index only catches the exact same start time).
  if exists (
    select 1 from public.bookings b
     where b.stylist_id = new.stylist_id
       and b.booking_date = new.booking_date
       and b.status in ('confirmed', 'completed')
       and b.start_time < new.end_time
       and b.end_time > new.start_time
  ) then
    raise exception 'That slot was just taken by someone else — please pick another time.'
      using errcode = '23505';
  end if;

  -- Price and location come from the service, not the browser.
  if new.location_type = 'home' then
    if not svc.home_service_available then
      raise exception 'At-home service isn''t offered for this treatment.';
    end if;
    if coalesce(btrim(new.address), '') = '' or coalesce(btrim(new.area), '') = '' then
      raise exception 'Please add your address and area for an at-home appointment.';
    end if;
    new.home_service_charge := svc.home_service_charge;
    new.address := left(btrim(new.address), 300);
    new.area := left(btrim(new.area), 120);
    if new.latitude is not null and (new.latitude not between -90 and 90 or new.longitude is null or new.longitude not between -180 and 180) then
      new.latitude := null;
      new.longitude := null;
    end if;
  else
    new.location_type := 'salon';
    new.address := null;
    new.area := null;
    new.latitude := null;
    new.longitude := null;
    new.home_service_charge := 0;
  end if;

  new.status := 'confirmed';
  new.created_at := now();
  new.notes := nullif(left(btrim(coalesce(new.notes, '')), 500), '');

  -- Limits per customer.
  select count(*) into made_today
    from public.bookings
   where customer_id = new.customer_id
     and created_at > now() - interval '24 hours';
  if made_today >= 5 then
    raise exception 'You''ve made several bookings today — please call the salon if you need more.';
  end if;

  select count(*) into upcoming
    from public.bookings
   where customer_id = new.customer_id
     and status = 'confirmed'
     and booking_date >= today;
  if upcoming >= 5 then
    raise exception 'You already have 5 upcoming appointments — please call the salon to book more.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_new_booking on public.bookings;
create trigger validate_new_booking
  before insert on public.bookings
  for each row execute function public.validate_new_booking();

-- Only salon staff can change a booking after it's made (customers
-- could previously edit their own booking's date, price or status —
-- e.g. mark it "completed").
drop policy if exists "bookings_update_own_or_admin" on public.bookings;
drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin" on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- …and even staff only change the status through the website.
revoke update on public.bookings from anon, authenticated;
grant update (status) on public.bookings to authenticated;

-- =========================================================
-- 2. CUSTOMERS — only name, phone and reminder choice are editable
-- =========================================================
-- Previously a customer could rewrite any column of their own row,
-- including which login it belongs to and their "last visit" date.
drop policy if exists "customers_update_own_or_admin" on public.customers;
create policy "customers_update_own_or_admin" on public.customers
  for update
  using (auth.uid() = auth_user_id or public.is_admin())
  with check (auth.uid() = auth_user_id or public.is_admin());

revoke update on public.customers from anon, authenticated;
grant update (full_name, phone, marketing_consent) on public.customers to authenticated;

-- "not valid" = applies to new and changed rows; existing rows are left alone.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_name_length') then
    alter table public.customers
      add constraint customers_name_length check (full_name is null or char_length(full_name) <= 120) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customers_phone_format') then
    alter table public.customers
      add constraint customers_phone_format check (phone is null or phone ~ '^[0-9+() -]{6,20}$') not valid;
  end if;
end $$;

-- =========================================================
-- 3. CHAT — no forged timestamps / read receipts, and a send limit
-- =========================================================
revoke insert on public.messages from anon, authenticated;
grant insert (customer_id, sender, body) on public.messages to authenticated;

create or replace function public.limit_customer_messages()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.sender = 'customer' then
    if (
      select count(*) from public.messages
       where customer_id = new.customer_id
         and sender = 'customer'
         and created_at > now() - interval '10 minutes'
    ) >= 20 then
      raise exception 'You''re sending messages very quickly — please wait a few minutes.';
    end if;
  end if;
  new.read_at := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists limit_customer_messages on public.messages;
create trigger limit_customer_messages
  before insert on public.messages
  for each row execute function public.limit_customer_messages();

-- =========================================================
-- 4. General hygiene
-- =========================================================
-- TRUNCATE ignores row-level security. The website never uses it, so
-- the public roles shouldn't have it at all.
revoke truncate on all tables in schema public from anon, authenticated;
