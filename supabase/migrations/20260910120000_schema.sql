-- Credit Count · 0001 schema, RLS and grants
-- Design: docs/TDD.md §3 (data model) and §4 (access control).
-- Principle: the database is the security boundary. Every rule below holds for
-- the app, for direct API calls and for anything built later.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 2 and 40),
  role                text not null default 'enthusiast' check (role in ('enthusiast', 'admin')),
  show_on_leaderboard boolean not null default false,
  created_at          timestamptz not null default now()
);
comment on table public.profiles is
  'One row per auth user, created by trigger. role is granted manually by SQL; show_on_leaderboard is opt-in (default false).';

create table public.coasters (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  park         text not null check (char_length(park) between 1 and 120),
  country      text not null check (char_length(country) between 2 and 80),
  manufacturer text not null check (char_length(manufacturer) between 1 and 80),
  type         text not null check (type in ('steel', 'wooden', 'hybrid')),
  rcdb_id      integer unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.coasters is
  'Shared catalogue, admin-managed. rcdb_id is reserved for a future RCDB sync (out of scope in v1).';

-- Duplicates are the main data-quality risk (SOW §7): block them at the source.
create unique index coasters_name_park_unique on public.coasters (lower(name), lower(park));

create table public.rides (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  coaster_id uuid not null references public.coasters (id) on delete restrict,
  -- One day of tolerance: the database runs in UTC, users do not.
  ridden_on  date not null default current_date check (ridden_on <= current_date + 1),
  note       text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now()
);
comment on table public.rides is
  'One row per ride. Credits = count(distinct coaster_id) per user; rides = count(*). Both are derived, never stored.';

-- Indexes: RLS predicate column, per-user stats, and the FK used by merge/delete.
create index rides_user_id_idx      on public.rides (user_id);
create index rides_user_coaster_idx on public.rides (user_id, coaster_id);
create index rides_coaster_id_idx   on public.rides (coaster_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger coasters_set_updated_at
  before update on public.coasters
  for each row execute function public.set_updated_at();

-- Create the profile when a user signs up. display_name comes from the sign-up
-- metadata; it is clamped to the column constraint so a bad value can never
-- break sign-up. security definer: runs as the owner, so it can insert into
-- profiles regardless of RLS. Not callable through the API (trigger only).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40);
  if char_length(v_name) < 2 then
    v_name := 'Enthusiast';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name);

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helper
-- ---------------------------------------------------------------------------

-- Reads the caller's role. security definer so policies on other tables can
-- use it without recursing into profiles' own policies; the check is always
-- against auth.uid(), never a parameter. A role change applies on the next
-- request, no JWT refresh needed.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Least privilege: strip the default grants, re-grant only what the TDD allows
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.coasters, public.rides from anon, authenticated;

-- Visitors (anon) get nothing on tables. Their only entry point is get_leaderboard().

-- Signed-in users
grant select on public.profiles to authenticated;
grant update (display_name, show_on_leaderboard) on public.profiles to authenticated; -- role is not writable via the API
grant select, insert, update, delete on public.coasters to authenticated;               -- writes are gated by RLS below
grant select, insert, update, delete on public.rides to authenticated;                  -- own rows only, by RLS below

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.coasters enable row level security;
alter table public.rides    enable row level security;

-- profiles: a user sees and edits only their own row (column grant limits which columns).
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- coasters: every signed-in user can read the catalogue; only admins can change it (FR8).
create policy "coasters: read when signed in"
  on public.coasters for select
  to authenticated
  using (true);

create policy "coasters: admin insert"
  on public.coasters for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "coasters: admin update"
  on public.coasters for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "coasters: admin delete"
  on public.coasters for delete
  to authenticated
  using ((select public.is_admin()));

-- rides: own rows only, for every operation (FR6, FR9). Deliberately no admin
-- policy: admins cannot read other users' ride histories (SOW §3).
create policy "rides: own rows"
  on public.rides for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
