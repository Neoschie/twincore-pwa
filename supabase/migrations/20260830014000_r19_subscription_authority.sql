alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can insert their own subscription" on public.user_subscriptions;
drop policy if exists "Users can update their own subscription" on public.user_subscriptions;

revoke insert, update, delete on table public.user_subscriptions from anon;
revoke insert, update, delete on table public.user_subscriptions from authenticated;

grant select on table public.user_subscriptions to authenticated;
grant all on table public.user_subscriptions to service_role;

drop policy if exists "Users can read their own subscription" on public.user_subscriptions;

create policy "Users can read their own subscription"
on public.user_subscriptions
for select
to authenticated
using (auth.uid() = user_id);
