-- ============================================================
-- FAMILY BOOK
-- Step 5.1 - Frontend Auth Bridge
-- Run after Step 3D + Step 4B.
-- ============================================================

grant usage on schema public to authenticated;
grant select on public.families to authenticated;
grant select on public.persons to authenticated;
grant select on public.family_memberships to authenticated;
grant select on public.family_invites to authenticated;

create or replace function public.create_family_invite(
  p_expires_hours integer default 168,
  p_max_uses integer default 10
)
returns table (invite_id uuid,invite_code text,expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;v_family_id uuid;v_code text;v_hash text;v_invite_id uuid;v_expires timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'You must be signed in.'; end if;

  select fm.family_id into v_family_id
  from public.family_memberships fm
  where fm.user_id=v_user_id and fm.status='active' and fm.role='admin'
  limit 1;

  if v_family_id is null then raise exception 'Only a Family Admin can create invitations.'; end if;
  if p_expires_hours<1 or p_expires_hours>720 then raise exception 'Invite expiry must be between 1 and 720 hours.'; end if;
  if p_max_uses<1 or p_max_uses>100 then raise exception 'Invite max uses must be between 1 and 100.'; end if;

  loop
    v_code := 'FB-' ||
      upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,4)) || '-' ||
      upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,4));
    v_hash := private.hash_invite_code(v_code);
    exit when not exists(select 1 from public.family_invites fi where fi.code_hash=v_hash);
  end loop;

  v_expires := now()+make_interval(hours=>p_expires_hours);

  insert into public.family_invites(family_id,created_by_user_id,code_hash,expires_at,max_uses)
  values(v_family_id,v_user_id,v_hash,v_expires,p_max_uses)
  returning id into v_invite_id;

  return query select v_invite_id,v_code,v_expires;
end;
$$;

revoke all on function public.create_family_invite(integer,integer) from public,anon;
grant execute on function public.create_family_invite(integer,integer) to authenticated;

create or replace function public.get_current_family_context()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_membership public.family_memberships%rowtype;
  v_family public.families%rowtype;
  v_person public.persons%rowtype;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;

  select fm.* into v_membership
  from public.family_memberships fm
  where fm.user_id=auth.uid() and fm.status='active'
  limit 1;

  if v_membership.id is null then
    return jsonb_build_object('has_membership',false);
  end if;

  select f.* into v_family from public.families f where f.id=v_membership.family_id;
  select p.* into v_person from public.persons p where p.id=v_membership.person_id;

  return jsonb_build_object(
    'has_membership',true,
    'membership_id',v_membership.id,
    'family_id',v_membership.family_id,
    'family_name',v_family.name,
    'person_id',v_membership.person_id,
    'first_name',v_person.first_name,
    'surname',v_person.surname,
    'photo_path',v_person.photo_path,
    'role',v_membership.role
  );
end;
$$;

revoke all on function public.get_current_family_context() from public,anon;
grant execute on function public.get_current_family_context() to authenticated;

create or replace function public.set_family_member_role(p_membership_id uuid,p_role text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.family_memberships%rowtype;
begin
  if p_role not in ('admin','member') then raise exception 'Invalid family role.'; end if;

  select fm.* into v_target
  from public.family_memberships fm
  where fm.id=p_membership_id and fm.status='active';

  if v_target.id is null then raise exception 'Family account not found.'; end if;
  if not private.is_family_admin(v_target.family_id) then raise exception 'Only a Family Admin can change account roles.'; end if;
  if v_target.user_id=auth.uid() then raise exception 'You cannot change your own Family Admin role here.'; end if;

  update public.family_memberships set role=p_role where id=p_membership_id;
  return true;
end;
$$;

revoke all on function public.set_family_member_role(uuid,text) from public,anon;
grant execute on function public.set_family_member_role(uuid,text) to authenticated;

create or replace function public.remove_family_access(p_membership_id uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.family_memberships%rowtype;
begin
  select fm.* into v_target
  from public.family_memberships fm
  where fm.id=p_membership_id and fm.status='active';

  if v_target.id is null then raise exception 'Family account not found.'; end if;
  if not private.is_family_admin(v_target.family_id) then raise exception 'Only a Family Admin can remove family access.'; end if;
  if v_target.user_id=auth.uid() then raise exception 'You cannot remove your own Family Admin access here.'; end if;

  delete from public.family_memberships where id=p_membership_id;
  return true;
end;
$$;

revoke all on function public.remove_family_access(uuid) from public,anon;
grant execute on function public.remove_family_access(uuid) to authenticated;

select 'Family Book Build 5.1 auth bridge installed' as status;
