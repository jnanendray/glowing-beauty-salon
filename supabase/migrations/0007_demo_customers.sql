-- Glowing Beauty Salon — demo app support
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.
--
-- The demo app signs people in as Supabase "anonymous" users (free,
-- built in — turn it on under Authentication → Sign In / Providers →
-- "Allow anonymous sign-ins"). Each demo visitor gets their own
-- private account, and every existing rule (RLS, booking checks,
-- rate limits) applies to them exactly as to real customers.
--
-- This marks those accounts as demo customers so the admin panel can
-- label them and keep them out of the recall list.

alter table public.customers
  add column if not exists is_demo boolean not null default false;

comment on column public.customers.is_demo is
  'True for guest accounts created by the demo app (anonymous sign-in). Set by the database, never by the customer.';

-- Same as before, plus: anonymous (demo) sign-ups are flagged.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.customers (auth_user_id, full_name, email, is_demo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.is_anonymous, false)
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- Customers can't change this flag themselves: the column-level
-- grants from 0006 only allow full_name, phone and marketing_consent.
