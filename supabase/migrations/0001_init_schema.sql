-- Glowing Beauty Salon — initial schema + Row Level Security
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run: every object is created with IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================
-- 1. CUSTOMERS
--    One row per signed-in customer, linked to Supabase Auth.
-- =========================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  marketing_consent boolean not null default false, -- DPDP consent checkbox
  last_visit_at timestamptz,                         -- used by the recall/reminder job
  created_at timestamptz not null default now()
);

comment on table public.customers is 'One row per customer, linked 1:1 to auth.users.';
comment on column public.customers.last_visit_at is 'Updated when a booking is marked completed; drives the 4-6 week WhatsApp recall reminder.';

-- Auto-create a customers row the moment someone signs up via
-- Supabase Auth (Google or email) — so the app never has to do it
-- itself and can never forget to.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.customers (auth_user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================
-- 2. ADMIN USERS
--    Marks which auth users are the salon owner/staff (admin panel).
--    Add a row here yourself in the SQL editor after the owner's
--    first sign-in: insert into admin_users (auth_user_id) values ('<uuid>');
-- =========================================================
create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where auth_user_id = auth.uid()
  );
$$;

-- =========================================================
-- 3. STYLISTS
-- =========================================================
create table if not exists public.stylists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Fixed weekly working hours per stylist (simple MVP model —
-- per-date overrides/time off can be added later as a separate table).
create table if not exists public.stylist_working_hours (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references public.stylists(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  unique (stylist_id, day_of_week)
);

-- =========================================================
-- 4. SERVICES
-- =========================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null default 60,
  price numeric(10,2),
  home_service_available boolean not null default false,
  home_service_charge numeric(10,2) not null default 0,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Which stylists offer which services.
create table if not exists public.stylist_services (
  stylist_id uuid not null references public.stylists(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (stylist_id, service_id)
);

-- =========================================================
-- 5. BOOKINGS
-- =========================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  stylist_id uuid not null references public.stylists(id),
  service_id uuid not null references public.services(id),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  location_type text not null default 'salon' check (location_type in ('salon', 'home')),
  address text,
  area text,
  latitude double precision,
  longitude double precision,
  home_service_charge numeric(10,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  -- a stylist can't be double-booked for the same date/time
  unique (stylist_id, booking_date, start_time)
);

create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_stylist_date_idx on public.bookings(stylist_id, booking_date);

-- When a booking is marked completed, bump the customer's last_visit_at
-- so the recall/reminder job sees it.
create or replace function public.handle_booking_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    update public.customers
    set last_visit_at = now()
    where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_booking_completed on public.bookings;
create trigger on_booking_completed
  after update on public.bookings
  for each row execute function public.handle_booking_completed();

-- =========================================================
-- 6. MESSAGES (website chat)
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  sender text not null check (sender in ('customer', 'owner')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_customer_idx on public.messages(customer_id, created_at);

-- =========================================================
-- 7. ROW LEVEL SECURITY
--    Customers see only their own data. Admins (salon owner/staff)
--    see everything. Services/stylists are public read so the
--    landing page can show them to signed-out visitors.
-- =========================================================
alter table public.customers enable row level security;
alter table public.admin_users enable row level security;
alter table public.stylists enable row level security;
alter table public.stylist_working_hours enable row level security;
alter table public.services enable row level security;
alter table public.stylist_services enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;

-- customers: self or admin
drop policy if exists "customers_select_own_or_admin" on public.customers;
create policy "customers_select_own_or_admin" on public.customers
  for select using (auth.uid() = auth_user_id or public.is_admin());

drop policy if exists "customers_update_own_or_admin" on public.customers;
create policy "customers_update_own_or_admin" on public.customers
  for update using (auth.uid() = auth_user_id or public.is_admin());

-- admin_users: admins can see the admin list (to manage staff); no public access
drop policy if exists "admin_users_select_admin_only" on public.admin_users;
create policy "admin_users_select_admin_only" on public.admin_users
  for select using (public.is_admin());

-- stylists / services: public read, admin write
drop policy if exists "stylists_public_read" on public.stylists;
create policy "stylists_public_read" on public.stylists
  for select using (true);

drop policy if exists "stylists_admin_write" on public.stylists;
create policy "stylists_admin_write" on public.stylists
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stylist_working_hours_public_read" on public.stylist_working_hours;
create policy "stylist_working_hours_public_read" on public.stylist_working_hours
  for select using (true);

drop policy if exists "stylist_working_hours_admin_write" on public.stylist_working_hours;
create policy "stylist_working_hours_admin_write" on public.stylist_working_hours
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "services_public_read" on public.services;
create policy "services_public_read" on public.services
  for select using (true);

drop policy if exists "services_admin_write" on public.services;
create policy "services_admin_write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stylist_services_public_read" on public.stylist_services;
create policy "stylist_services_public_read" on public.stylist_services
  for select using (true);

drop policy if exists "stylist_services_admin_write" on public.stylist_services;
create policy "stylist_services_admin_write" on public.stylist_services
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings: a customer can see/create/cancel their own; admin sees all
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin" on public.bookings
  for select using (
    public.is_admin()
    or customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

drop policy if exists "bookings_update_own_or_admin" on public.bookings;
create policy "bookings_update_own_or_admin" on public.bookings
  for update using (
    public.is_admin()
    or customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

-- messages: a customer can see/send their own; admin sees/replies to all
drop policy if exists "messages_select_own_or_admin" on public.messages;
create policy "messages_select_own_or_admin" on public.messages
  for select using (
    public.is_admin()
    or customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

drop policy if exists "messages_insert_own_or_admin" on public.messages;
create policy "messages_insert_own_or_admin" on public.messages
  for insert with check (
    (sender = 'customer' and customer_id in (select id from public.customers where auth_user_id = auth.uid()))
    or (sender = 'owner' and public.is_admin())
  );
