alter table public.user_subscriptions
add constraint user_subscriptions_user_id_key unique (user_id);
