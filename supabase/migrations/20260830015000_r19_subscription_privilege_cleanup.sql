revoke all privileges on table public.user_subscriptions from anon;
revoke all privileges on table public.user_subscriptions from authenticated;

grant select on table public.user_subscriptions to authenticated;
grant all privileges on table public.user_subscriptions to service_role;
