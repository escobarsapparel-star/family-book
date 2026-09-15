-- ============================================================
-- FAMILY BOOK
-- Optional Family Prayer / Scripture shared note support
-- ============================================================

create table if not exists public.family_inspiration (
  family_id uuid primary key references public.families(id) on delete cascade,
  kind text not null default 'encouragement',
  body text not null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint family_inspiration_kind_check check (kind in ('prayer','encouragement')),
  constraint family_inspiration_body_check check (char_length(body) between 1 and 500)
);

alter table public.family_inspiration enable row level security;
revoke all on table public.family_inspiration from anon, authenticated;

create or replace function public.get_current_family_inspiration()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_row public.family_inspiration%rowtype;
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
    return null;
  end if;

  select fi.*
    into v_row
  from public.family_inspiration fi
  where fi.family_id = v_family_id;

  if v_row.family_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'kind', v_row.kind,
    'body', v_row.body,
    'updatedAt', v_row.updated_at
  );
end;
$$;

create or replace function public.save_current_family_inspiration(
  p_kind text,
  p_body text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_body text;
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
    raise exception 'No active family membership was found.';
  end if;

  if p_kind not in ('prayer','encouragement') then
    raise exception 'Choose Prayer request or Encouragement.';
  end if;

  v_body := btrim(coalesce(p_body,''));
  if char_length(v_body) < 1 or char_length(v_body) > 500 then
    raise exception 'Family prayer or encouragement must be between 1 and 500 characters.';
  end if;

  insert into public.family_inspiration(family_id,kind,body,updated_by_user_id,updated_at)
  values(v_family_id,p_kind,v_body,auth.uid(),now())
  on conflict (family_id) do update
    set kind = excluded.kind,
        body = excluded.body,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now();

  return true;
end;
$$;

create or replace function public.clear_current_family_inspiration()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_role text;
  v_updated_by uuid;
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

  select fi.updated_by_user_id
    into v_updated_by
  from public.family_inspiration fi
  where fi.family_id = v_family_id;

  if v_updated_by is null then
    return true;
  end if;

  if v_role <> 'admin' and v_updated_by <> auth.uid() then
    raise exception 'Only the person who shared this note or a Family Admin can clear it.';
  end if;

  delete from public.family_inspiration where family_id = v_family_id;
  return true;
end;
$$;

revoke all on function public.get_current_family_inspiration() from public, anon;
revoke all on function public.save_current_family_inspiration(text,text) from public, anon;
revoke all on function public.clear_current_family_inspiration() from public, anon;

grant execute on function public.get_current_family_inspiration() to authenticated;
grant execute on function public.save_current_family_inspiration(text,text) to authenticated;
grant execute on function public.clear_current_family_inspiration() to authenticated;
