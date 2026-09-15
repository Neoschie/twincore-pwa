create or replace function public.is_twincore_crew_member(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and exists (
      select 1
      from public.crew_members cm
      where cm.crew_id = p_crew_id
        and cm.user_id = auth.uid()
    );
$fn$;

create or replace function public.is_twincore_crew_owner(p_crew_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and exists (
      select 1
      from public.crews c
      where c.id = p_crew_id
        and c.owner_id = auth.uid()
    );
$fn$;

revoke all on function public.is_twincore_crew_member(uuid) from public;
revoke all on function public.is_twincore_crew_owner(uuid) from public;
grant execute on function public.is_twincore_crew_member(uuid) to authenticated;
grant execute on function public.is_twincore_crew_owner(uuid) to authenticated;
grant execute on function public.is_twincore_crew_member(uuid) to service_role;
grant execute on function public.is_twincore_crew_owner(uuid) to service_role;

alter table public.crews enable row level security;

revoke all privileges on table public.crews from anon;
revoke all privileges on table public.crews from authenticated;
grant select, update, delete on table public.crews to authenticated;
grant all privileges on table public.crews to service_role;

drop policy if exists "crew members can read crew" on public.crews;
drop policy if exists "crew owners can update crew" on public.crews;
drop policy if exists "crew owners can delete crew" on public.crews;

create policy "crew members can read crew"
on public.crews for select to authenticated
using (public.is_twincore_crew_member(id));

create policy "crew owners can update crew"
on public.crews for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "crew owners can delete crew"
on public.crews for delete to authenticated
using (owner_id = auth.uid());

revoke all privileges on function public.create_twincore_crew(text,text) from anon;
grant execute on function public.create_twincore_crew(text,text) to authenticated;
grant execute on function public.create_twincore_crew(text,text) to service_role;

drop policy if exists "allow insert crew_members" on public.crew_members;
drop policy if exists "allow read crew_members" on public.crew_members;
drop policy if exists "public_insert_crew_members" on public.crew_members;
drop policy if exists "public_read_crew_members" on public.crew_members;

revoke all privileges on table public.crew_members from anon;
revoke all privileges on table public.crew_members from authenticated;
revoke all privileges on sequence public.crew_members_id_seq from anon;
revoke all privileges on sequence public.crew_members_id_seq from authenticated;
grant select, delete on table public.crew_members to authenticated;
grant all privileges on table public.crew_members to service_role;
grant all privileges on sequence public.crew_members_id_seq to service_role;

create policy "crew members can read members"
on public.crew_members for select to authenticated
using (public.is_twincore_crew_member(crew_id));

create policy "users can leave their crew"
on public.crew_members for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "public can insert crew_status" on public.crew_status;
drop policy if exists "public can read crew_status" on public.crew_status;
drop policy if exists "public can update crew_status" on public.crew_status;

revoke all privileges on table public.crew_status from anon;
revoke all privileges on table public.crew_status from authenticated;
grant select, insert, update on table public.crew_status to authenticated;
grant all privileges on table public.crew_status to service_role;

drop policy if exists "Crew members can read crew status" on public.crew_status;
create policy "Crew members can read crew status"
on public.crew_status for select to authenticated
using (
  user_id = auth.uid()
  or public.is_twincore_crew_member(crew_id)
);

revoke all privileges on table public.crew_checkins from anon;
revoke all privileges on table public.crew_checkins from authenticated;
grant select, insert on table public.crew_checkins to authenticated;
grant all privileges on table public.crew_checkins to service_role;

drop policy if exists "Allow public invite creation" on public.crew_invites;
drop policy if exists "allow public insert" on public.crew_invites;
drop policy if exists "allow public read" on public.crew_invites;
drop policy if exists "allow public update" on public.crew_invites;
drop policy if exists "allow read crew_invites" on public.crew_invites;
drop policy if exists "allow update crew_invites" on public.crew_invites;

revoke all privileges on table public.crew_invites from anon;
revoke all privileges on table public.crew_invites from authenticated;
grant select, insert on table public.crew_invites to authenticated;
grant all privileges on table public.crew_invites to service_role;

create policy "crew owners can read invites"
on public.crew_invites for select to authenticated
using (user_id = auth.uid() and public.is_twincore_crew_owner(crew_id));

create policy "crew owners can create invites"
on public.crew_invites for insert to authenticated
with check (
  user_id = auth.uid()
  and crew_owner_id = auth.uid()
  and public.is_twincore_crew_owner(crew_id)
);

create or replace function public.accept_twincore_crew_invite(
  p_code text,
  p_member_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_invite public.crew_invites%rowtype;
  v_existing_member_id bigint;
  v_existing_crew_id uuid;
  v_now timestamptz := now();
  v_next_use_count integer;
  v_next_is_active boolean;
  v_joined boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if nullif(trim(p_code), '') is null then
    raise exception 'Invite code is required.';
  end if;

  select *
  into v_invite
  from public.crew_invites
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Invite not found.';
  end if;

  if v_invite.crew_id is null or v_invite.crew_owner_id is null then
    raise exception 'Invite is not attached to a valid crew.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < v_now then
    raise exception 'This invite has expired.';
  end if;

  select id, crew_id
  into v_existing_member_id, v_existing_crew_id
  from public.crew_members
  where user_id = v_user_id
    and crew_id is not null
  order by joined_at desc nulls last, id desc
  limit 1;

  if v_existing_member_id is not null
     and v_existing_crew_id <> v_invite.crew_id then
    raise exception 'Leave your current crew before joining another.';
  end if;

  if v_existing_member_id is not null
     and v_existing_crew_id = v_invite.crew_id then
    return jsonb_build_object(
      'joined', false,
      'already_member', true,
      'crew_id', v_invite.crew_id,
      'crew_owner_id', v_invite.crew_owner_id,
      'crew_name', coalesce(v_invite.crew_name, 'TwinCore Crew'),
      'inviter_name', coalesce(v_invite.inviter_name, 'Crew Owner'),
      'accepted_at', v_invite.accepted_at,
      'use_count', coalesce(v_invite.use_count, 0),
      'max_uses', coalesce(v_invite.max_uses, 50),
      'is_active', coalesce(v_invite.is_active, true)
    );
  end if;

  if coalesce(v_invite.is_active, true) = false then
    raise exception 'This invite is no longer active.';
  end if;

  if coalesce(v_invite.use_count, 0) >= coalesce(v_invite.max_uses, 50) then
    raise exception 'This invite has reached its join limit.';
  end if;

  insert into public.crew_members (
    user_id,
    crew_id,
    crew_owner_id,
    crew_owner,
    member_name,
    joined_at
  )
  values (
    v_user_id,
    v_invite.crew_id,
    v_invite.crew_owner_id,
    coalesce(nullif(trim(v_invite.inviter_name), ''), 'Crew Owner'),
    coalesce(nullif(trim(p_member_name), ''), 'Crew Member'),
    v_now
  );

  v_joined := true;
  v_next_use_count := coalesce(v_invite.use_count, 0) + 1;
  v_next_is_active :=
    v_next_use_count < coalesce(v_invite.max_uses, 50);

  update public.crew_invites
  set
    use_count = v_next_use_count,
    is_active = v_next_is_active,
    status = 'accepted',
    accepted_at = v_now
  where id = v_invite.id;

  return jsonb_build_object(
    'joined', v_joined,
    'already_member', false,
    'crew_id', v_invite.crew_id,
    'crew_owner_id', v_invite.crew_owner_id,
    'crew_name', coalesce(v_invite.crew_name, 'TwinCore Crew'),
    'inviter_name', coalesce(v_invite.inviter_name, 'Crew Owner'),
    'accepted_at', v_now,
    'use_count', v_next_use_count,
    'max_uses', coalesce(v_invite.max_uses, 50),
    'is_active', v_next_is_active
  );
end;
$fn$;

revoke all privileges on function public.accept_twincore_crew_invite(text,text) from public;
revoke all privileges on function public.accept_twincore_crew_invite(text,text) from anon;
grant execute on function public.accept_twincore_crew_invite(text,text) to authenticated;
grant execute on function public.accept_twincore_crew_invite(text,text) to service_role;

create or replace function public.get_twincore_public_invite(p_code text)
returns table (
  code text,
  inviter_name text,
  inviter_avatar_url text,
  crew_name text,
  created_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  status text,
  max_uses integer,
  use_count integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    ci.code,
    ci.inviter_name,
    ci.inviter_avatar_url,
    ci.crew_name,
    ci.created_at,
    ci.accepted_at,
    ci.expires_at,
    ci.status,
    ci.max_uses,
    ci.use_count,
    ci.is_active
  from public.crew_invites ci
  where ci.code = upper(trim(p_code))
  limit 1;
$fn$;

revoke all privileges on function public.get_twincore_public_invite(text) from public;
grant execute on function public.get_twincore_public_invite(text) to anon;
grant execute on function public.get_twincore_public_invite(text) to authenticated;
grant execute on function public.get_twincore_public_invite(text) to service_role;

