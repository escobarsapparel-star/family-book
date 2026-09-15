-- ============================================================
-- FAMILY BOOK
-- Marriage dates for spouse relationships
-- Run once in the Supabase SQL Editor.
-- ============================================================

alter table public.relationships
  add column if not exists marriage_date date;

create or replace function public.get_relationship_marriage_dates()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select fm.family_id
    into v_family_id
  from public.family_memberships fm
  where fm.user_id = auth.uid()
    and fm.status = 'active'
  limit 1;

  if v_family_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'from', r.from_person_id,
        'to', r.to_person_id,
        'type', r.relationship_type,
        'marriageDate', r.marriage_date
      )
      order by r.from_person_id, r.to_person_id
    )
    from public.relationships r
    where r.family_id = v_family_id
      and r.relationship_type = 'spouse_of'
      and r.marriage_date is not null
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_relationship_marriage_dates() from public, anon;
grant execute on function public.get_relationship_marriage_dates() to authenticated;

create or replace function public.set_relationship_marriage_dates(p_relationships jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_role text;
  v_item jsonb;
  v_from uuid;
  v_to uuid;
  v_date date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select fm.family_id, fm.role
    into v_family_id, v_role
  from public.family_memberships fm
  where fm.user_id = auth.uid()
    and fm.status = 'active'
  limit 1;

  if v_family_id is null then
    raise exception 'No active family membership was found.';
  end if;

  if v_role <> 'admin' then
    raise exception 'Only a Family Admin can change marriage details.';
  end if;

  if p_relationships is null then
    return true;
  end if;

  if jsonb_typeof(p_relationships) <> 'array' then
    raise exception 'Marriage relationship payload must be an array.';
  end if;

  for v_item in select value from jsonb_array_elements(p_relationships)
  loop
    if coalesce(v_item->>'type', '') <> 'spouse_of' then
      continue;
    end if;

    begin
      v_from := (v_item->>'from')::uuid;
      v_to := (v_item->>'to')::uuid;
      v_date := nullif(v_item->>'marriageDate', '')::date;
    exception when others then
      raise exception 'Invalid marriage relationship payload.';
    end;

    update public.relationships r
       set marriage_date = v_date
     where r.family_id = v_family_id
       and r.from_person_id = v_from
       and r.to_person_id = v_to
       and r.relationship_type = 'spouse_of';
  end loop;

  return true;
end;
$$;

revoke all on function public.set_relationship_marriage_dates(jsonb) from public, anon;
grant execute on function public.set_relationship_marriage_dates(jsonb) to authenticated;

select 'Family Book marriage dates installed' as status;
