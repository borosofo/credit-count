-- Credit Count · 0004 leaderboard marks the caller's own row
-- Adds is_you: true only on the row that belongs to the signed-in caller, so
-- the page can highlight "you" without the function ever returning user ids.
-- Visitors get false everywhere. Return type changes, so drop and recreate.

drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
returns table (
  rank         bigint,
  display_name text,
  credits      bigint,
  rides        bigint,
  is_you       boolean
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
    count(r.id)                  as rides,
    coalesce(p.id = (select auth.uid()), false) as is_you
  from public.profiles p
  left join public.rides r on r.user_id = p.id
  where p.show_on_leaderboard
  group by p.id, p.display_name
  order by credits desc, rides desc, p.display_name asc;
$$;
revoke execute on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
