create unique index if not exists user_subscriptions_stripe_subscription_id_key
on public.user_subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

create index if not exists user_subscriptions_stripe_customer_id_idx
on public.user_subscriptions (stripe_customer_id)
where stripe_customer_id is not null;
