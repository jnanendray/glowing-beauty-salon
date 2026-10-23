-- Glowing Beauty Salon — website chat
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.
--
-- The messages table and its read/send rules already exist (0001).
-- This adds: a length limit, a safe way to mark messages as read,
-- and live updates (Supabase Realtime — included free).

-- 1. Keep messages to a sensible size (1–2000 characters, not blank).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_body_length'
  ) then
    alter table public.messages
      add constraint messages_body_length
      check (char_length(btrim(body)) between 1 and 2000);
  end if;
end $$;

-- 2. Mark a conversation as read.
--    There is deliberately no UPDATE policy on messages — nobody can
--    edit a message's text. This function only ever sets read_at, and
--    only on the other side's messages:
--      • salon admin → marks the customer's messages read
--      • customer    → marks the salon's replies to them read
create or replace function public.mark_messages_read(p_customer_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    update public.messages
       set read_at = now()
     where customer_id = p_customer_id
       and sender = 'customer'
       and read_at is null;
  elsif exists (
    select 1 from public.customers
     where id = p_customer_id and auth_user_id = auth.uid()
  ) then
    update public.messages
       set read_at = now()
     where customer_id = p_customer_id
       and sender = 'owner'
       and read_at is null;
  end if;
end;
$$;

revoke all on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- 3. Live updates: new messages appear without refreshing.
--    Realtime still applies the RLS rules above, so each customer
--    only ever receives their own conversation.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
