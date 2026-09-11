-- Credit Count · 0002 server-side functions
-- Design: docs/TDD.md §4.

-- ---------------------------------------------------------------------------
-- get_leaderboard(): the only path by which a visitor touches data (FR1, FR7)
-- ---------------------------------------------------------------------------
-- security definer on purpose: it must read rides (which anon cannot) and
-- return only an aggregate. It exposes display_name, credits and rides; never
-- user ids or coaster ids, so it cannot reveal what anyone has ridden. Only
-- opted-in profiles appear; opting out takes effect on the next call.
-- Ranking: credits desc, then rides desc, then display name (TDD §7, Q3).
create or replace function public.get_leaderboard()
returns table (
  rank         bigint,
  display_name text,
  credits      bigint,
  rides        bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rank() over (
      order by count(distinct r.coaster_id) desc, count(r.id) desc, p.display_name asc
    ) as rank,
    p.display_name,
    count(distinct r.coaster_id) as credits,
    count(r.id)                  as rides
  from public.profiles p
  left join public.rides r on r.user_id = p.id
  where p.show_on_leaderboard
  group by p.id, p.display_name
  order by credits desc, rides desc, p.display_name asc;
$$;
revoke execute on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- merge_coaster(from, into): admin removes a duplicate without losing anyone's credits
-- ---------------------------------------------------------------------------
-- Rides logged against the duplicate are re-pointed to the surviving coaster,
-- then the duplicate is deleted. security definer because re-pointing other
-- users' rides is exactly what RLS forbids everyone, admins included; the
-- admin check is therefore repeated inside the function.
create or replace function public.merge_coaster(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Only admins can merge coasters' using errcode = '42501';
  end if;
  if p_from = p_into then
    raise exception 'A coaster cannot be merged into itself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.coasters where id = p_into) then
    raise exception 'Target coaster not found' using errcode = 'P0002';
  end if;

  update public.rides set coaster_id = p_into where coaster_id = p_from;

  delete from public.coasters where id = p_from;
  if not found then
    raise exception 'Source coaster not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.merge_coaster(uuid, uuid) from public, anon;
grant execute on function public.merge_coaster(uuid, uuid) to authenticated;
