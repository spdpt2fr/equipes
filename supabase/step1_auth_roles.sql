-- ===================================================================
-- STEP 1 - AUTH + ROLES (non-breaking migration)
-- Project: Gestionnaire d'Equipes Hockey Subaquatique
-- Date: 2026-03-12
--
-- Objectif:
-- 1) Garder Supabase Auth pour les mots de passe (hashes en base auth.users)
-- 2) Ajouter un profil applicatif avec role (admin / operateur)
-- 3) Rester non cassant: on ne verrouille PAS encore les tables players_*
-- ===================================================================

begin;

-- ---------------------------------------------------------------
-- Fonction utilitaire updated_at
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Profils utilisateurs applicatifs (lies a auth.users)
-- ---------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operateur' check (role in ('admin', 'operateur')),
  club_id integer references public.clubs(id),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_club on public.user_profiles(club_id);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- Lecture: un utilisateur lit son propre profil
drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

-- Update: interdit par defaut aux utilisateurs (pas d'elevation de role)
-- Les updates admin se font via SQL editor / service role.

-- ---------------------------------------------------------------
-- Provision automatique du profil a l'inscription
-- ---------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, actif)
  values (new.id, 'operateur', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();

-- ---------------------------------------------------------------
-- Helpers SQL pour policies futures (step 2)
-- ---------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.id = auth.uid()
    and up.actif = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- ---------------------------------------------------------------
-- Bootstrap admin (A ADAPTER AVANT EXECUTION)
-- Remplacer l'email ci-dessous puis executer la section.
-- ---------------------------------------------------------------
-- update public.user_profiles
-- set role = 'admin'
-- where id = (
--   select id from auth.users where email = 'admin@exemple.com'
-- );

commit;

-- ===================================================================
-- ETAPE 2 (a venir, volontairement non appliquee ici):
-- - verrouiller players_grenoble / players_jeeves via RLS
-- - interdire lecture/ecriture de niveau pour operateur
-- - exposer une source "safe" sans niveau pour le front non-admin
-- ===================================================================
