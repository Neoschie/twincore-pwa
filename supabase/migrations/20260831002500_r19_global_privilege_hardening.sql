revoke all privileges on table public.alerts from anon, authenticated;
revoke all privileges on table public.arrival_timers from anon, authenticated;
revoke all privileges on table public.checkins from anon, authenticated;
revoke all privileges on table public.crew_activity from anon, authenticated;
revoke all privileges on table public.crew_alerts from anon, authenticated;
revoke all privileges on table public.escalations from anon, authenticated;
revoke all privileges on table public.panic_events from anon, authenticated;
revoke all privileges on table public.safe_zones from anon, authenticated;
revoke all privileges on table public.trusted_contacts from anon, authenticated;
revoke all privileges on table public.twin_memory from anon, authenticated;
revoke all privileges on table public.user_places from anon, authenticated;

revoke all privileges on sequence public.crew_activity_id_seq from anon, authenticated;
revoke all privileges on sequence public.trusted_contacts_id_seq from anon, authenticated;

revoke all privileges on function public.rls_auto_enable() from anon, authenticated;
revoke all privileges on function public.set_updated_at_checkins() from anon, authenticated;
revoke all privileges on function public.set_updated_at_user_places() from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;
