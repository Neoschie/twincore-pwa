-- R21-F03.6
-- Bridge permanent crews.invite_code authority into the existing
-- public invite lookup + authenticated acceptance contracts.
--
-- Existing crew_invites continue to support generated/temporary invites.
-- Canonical crews.invite_code becomes a fallback authority.

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

  union all

  select
    c.invite_code as code,
    coalesce(
      nullif(trim(owner_member.member_name), ''),
      nullif(trim(owner_member.crew_owner), ''),
      'Crew Owner'
    ) as inviter_name,
    null::text as inviter_avatar_url,
    c.name as crew_name,
    c.created_at,
    null::timestamptz as accepted_at,
    null::timestamptz as expires_at,
    'pending'::text as status,
    50::integer as max_uses,
    0::integer as use_count,
    true as is_active
  from public.crews c
  left join public.crew_members owner_member
    on owner_member.crew_id = c.id
   and owner_member.user_id = c.owner_id
  where c.invite_code = upper(trim(p_code))
    and not exists (
      select 1
      from public.crew_invites ci2
      where ci2.code = upper(trim(p_code))
    )

  limit 1;
$fn$;

revoke all privileges
on function public.get_twincore_public_invite(text)
from public;

grant execute
on function public.get_twincore_public_invite(text)
to anon, authenticated, service_role;


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
  v_canonical_crew public.crews%rowtype;
  v_existing_member_id bigint;
  v_existing_crew_id uuid;
  v_now timestamptz := now();
  v_next_use_count integer;
  v_next_is_active boolean;
  v_joined boolean := false;
  v_is_canonical boolean := false;
  v_target_crew_id uuid;
  v_target_owner_id uuid;
  v_target_crew_name text;
  v_target_inviter_name text;
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

  if found then
    if v_invite.crew_id is null or v_invite.crew_owner_id is null then
      raise exception 'Invite is not attached to a valid crew.';
    end if;

    if v_invite.expires_at is not null and v_invite.expires_at < v_now then
      raise exception 'This invite has expired.';
    end if;

    if coalesce(v_invite.is_active, true) = false then
      raise exception 'This invite is no longer active.';
    end if;

    if coalesce(v_invite.use_count, 0) >= coalesce(v_invite.max_uses, 50) then
      raise exception 'This invite has reached its join limit.';
    end if;

    v_target_crew_id := v_invite.crew_id;
    v_target_owner_id := v_invite.crew_owner_id;
    v_target_crew_name := coalesce(v_invite.crew_name, 'TwinCore Crew');
    v_target_inviter_name := coalesce(v_invite.inviter_name, 'Crew Owner');
  else
    select *
    into v_canonical_crew
    from public.crews
    where invite_code = upper(trim(p_code))
    limit 1;

    if not found then
      raise exception 'Invite not found.';
    end if;

    v_is_canonical := true;
    v_target_crew_id := v_canonical_crew.id;
    v_target_owner_id := v_canonical_crew.owner_id;
    v_target_crew_name := coalesce(v_canonical_crew.name, 'TwinCore Crew');

    select coalesce(
      nullif(trim(cm.member_name), ''),
      nullif(trim(cm.crew_owner), ''),
      'Crew Owner'
    )
    into v_target_inviter_name
    from public.crew_members cm
    where cm.crew_id = v_canonical_crew.id
      and cm.user_id = v_canonical_crew.owner_id
    limit 1;

    v_target_inviter_name :=
      coalesce(v_target_inviter_name, 'Crew Owner');
  end if;

  select id, crew_id
  into v_existing_member_id, v_existing_crew_id
  from public.crew_members
  where user_id = v_user_id
    and crew_id is not null
  order by joined_at desc nulls last, id desc
  limit 1;

  if v_existing_member_id is not null
     and v_existing_crew_id <> v_target_crew_id then
    raise exception 'Leave your current crew before joining another.';
  end if;

  if v_existing_member_id is not null
     and v_existing_crew_id = v_target_crew_id then
    return jsonb_build_object(
      'joined', false,
      'already_member', true,
      'crew_id', v_target_crew_id,
      'crew_owner_id', v_target_owner_id,
      'crew_name', v_target_crew_name,
      'inviter_name', v_target_inviter_name,
      'accepted_at',
        case when v_is_canonical then null else v_invite.accepted_at end,
      'use_count',
        case when v_is_canonical then 0 else coalesce(v_invite.use_count, 0) end,
      'max_uses',
        case when v_is_canonical then 50 else coalesce(v_invite.max_uses, 50) end,
      'is_active',
        case when v_is_canonical then true else coalesce(v_invite.is_active, true) end
    );
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
    v_target_crew_id,
    v_target_owner_id,
    v_target_inviter_name,
    coalesce(nullif(trim(p_member_name), ''), 'Crew Member'),
    v_now
  );

  v_joined := true;

  if not v_is_canonical then
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
  else
    v_next_use_count := 0;
    v_next_is_active := true;
  end if;

  return jsonb_build_object(
    'joined', v_joined,
    'already_member', false,
    'crew_id', v_target_crew_id,
    'crew_owner_id', v_target_owner_id,
    'crew_name', v_target_crew_name,
    'inviter_name', v_target_inviter_name,
    'accepted_at', v_now,
    'use_count', v_next_use_count,
    'max_uses',
      case when v_is_canonical then 50 else coalesce(v_invite.max_uses, 50) end,
    'is_active', v_next_is_active
  );
end;
$fn$;

revoke all privileges
on function public.accept_twincore_crew_invite(text,text)
from public;

revoke all privileges
on function public.accept_twincore_crew_invite(text,text)
from anon;

grant execute
on function public.accept_twincore_crew_invite(text,text)
to authenticated, service_role;
