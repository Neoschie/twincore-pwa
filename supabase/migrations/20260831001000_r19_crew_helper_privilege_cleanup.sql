revoke all privileges on function public.is_twincore_crew_member(uuid) from anon;
revoke all privileges on function public.is_twincore_crew_owner(uuid) from anon;

grant execute on function public.is_twincore_crew_member(uuid) to authenticated;
grant execute on function public.is_twincore_crew_owner(uuid) to authenticated;
grant execute on function public.is_twincore_crew_member(uuid) to service_role;
grant execute on function public.is_twincore_crew_owner(uuid) to service_role;
