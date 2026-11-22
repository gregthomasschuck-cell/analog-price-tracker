-- Run once in Supabase → SQL Editor. Safe to re-run.

-- One row per signed-in user who has started checkout. Written only by the
-- server (service role) from Stripe webhooks; users can read their own row.
create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  email                 text,
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  status                text not null default 'none',   -- Stripe status: active, trialing, past_due, canceled, ...
  current_period_end    timestamptz,
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Storage: "paid" is private (dashboard.html, tracker.xlsx, observations.csv; only the
-- server reads it, after checking the subscription). "public" holds teaser.json.
insert into storage.buckets (id, name, public)
values ('paid', 'paid', false), ('public', 'public', true)
on conflict (id) do update set public = excluded.public;
