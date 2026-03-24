-- ===================================================================
-- STEP 2 - LEVEL SECURITY (progressive rollout)
-- Project: Gestionnaire d'Equipes Hockey Subaquatique
-- Date: 2026-03-12
--
-- Prerequis: step1_auth_roles.sql deja applique.
--
-- Objectif:
-- 1) Preparer le verrouillage des niveaux pour non-admin
-- 2) Ajouter des RPC "safe" (sans niveau) pour operateur
-- 3) Permettre un deploiement progressif via flag SQL
-- ===================================================================

begin;

-- ---------------------------------------------------------------
-- Feature flag SQL pour activer le verrouillage sans downtime
-- ---------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value_text text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value_text)
values ('enforce_level_security', 'false')
on conflict (key) do nothing;

create or replace function public.app_setting_bool(p_key text, p_default boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        case lower(trim(value_text))
          when 'true' then true
          when '1' then true
          when 'yes' then true
          when 'on' then true
          when 'false' then false
          when '0' then false
          when 'no' then false
          when 'off' then false
          else p_default
        end
      from public.app_settings
      where key = p_key
      limit 1
    ),
    p_default
  )
$$;

create or replace function public.is_level_security_enforced()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_setting_bool('enforce_level_security', false)
$$;

-- ---------------------------------------------------------------
-- Helpers club -> table players_xxx
-- ---------------------------------------------------------------
create or replace function public.club_to_players_table(p_club text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v text;
begin
  v := lower(trim(coalesce(p_club, '')));
  if v in ('grenoble', 'players_grenoble') then
    return 'players_grenoble';
  elsif v in ('jeeves', 'players_jeeves') then
    return 'players_jeeves';
  else
    raise exception 'Club invalide: %', p_club using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- RLS: players_grenoble / players_jeeves
-- - Admin: full access
-- - Legacy mode (flag=false): comportement ouvert preserve
-- - Secure mode (flag=true): non-admin passe par RPC safe
-- ---------------------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['players_grenoble', 'players_jeeves']
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Supprimer policies existantes pour repartir proprement
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- Admin: lecture/ecriture complete
    execute format(
      'create policy %I on public.%I for select using (public.is_admin())',
      t || '_admin_select',
      t
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.is_admin())',
      t || '_admin_insert',
      t
    );
    execute format(
      'create policy %I on public.%I for update using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_update',
      t
    );
    execute format(
      'create policy %I on public.%I for delete using (public.is_admin())',
      t || '_admin_delete',
      t
    );

    -- Legacy: on preserve temporairement le comportement actuel tant que
    -- enforce_level_security = false (evite une coupure brutale)
    execute format(
      'create policy %I on public.%I for all using (not public.is_level_security_enforced()) with check (not public.is_level_security_enforced())',
      t || '_legacy_open_mode',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------
-- RPC SAFE (non-admin): lecture/CRUD SANS colonne niveau
-- ---------------------------------------------------------------
create or replace function public.api_players_list_safe(p_club text)
returns table (
  id integer,
  nom text,
  poste text,
  groupe integer,
  actif boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  tbl := public.club_to_players_table(p_club);
  return query execute format(
    'select id, nom, poste, groupe, actif, created_at, updated_at from public.%I order by nom',
    tbl
  );
end;
$$;

create or replace function public.api_players_insert_safe(
  p_club text,
  p_nom text,
  p_poste text default 'indifferent',
  p_groupe integer default null,
  p_actif boolean default true
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
  v_id integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Nom joueur obligatoire' using errcode = '22023';
  end if;

  tbl := public.club_to_players_table(p_club);
  execute format(
    'insert into public.%I (nom, niveau, poste, groupe, actif) values ($1, 5, $2, $3, $4) returning id',
    tbl
  )
  into v_id
  using trim(p_nom), coalesce(nullif(trim(p_poste), ''), 'indifferent'), p_groupe, coalesce(p_actif, true);

  return v_id;
end;
$$;

create or replace function public.api_players_update_safe(
  p_club text,
  p_id integer,
  p_nom text,
  p_poste text,
  p_groupe integer,
  p_actif boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if p_id is null then
    raise exception 'ID joueur obligatoire' using errcode = '22023';
  end if;

  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Nom joueur obligatoire' using errcode = '22023';
  end if;

  tbl := public.club_to_players_table(p_club);
  execute format(
    'update public.%I set nom = $1, poste = $2, groupe = $3, actif = $4 where id = $5',
    tbl
  )
  using trim(p_nom), coalesce(nullif(trim(p_poste), ''), 'indifferent'), p_groupe, coalesce(p_actif, true), p_id;
end;
$$;

create or replace function public.api_players_delete_safe(
  p_club text,
  p_id integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if p_id is null then
    raise exception 'ID joueur obligatoire' using errcode = '22023';
  end if;

  tbl := public.club_to_players_table(p_club);
  execute format('delete from public.%I where id = $1', tbl)
  using p_id;
end;
$$;

grant execute on function public.api_players_list_safe(text) to authenticated;
grant execute on function public.api_players_insert_safe(text, text, text, integer, boolean) to authenticated;
grant execute on function public.api_players_update_safe(text, integer, text, text, integer, boolean) to authenticated;
grant execute on function public.api_players_delete_safe(text, integer) to authenticated;

commit;

-- ===================================================================
-- Activation finale (a faire seulement apres adaptation front):
--
-- update public.app_settings
-- set value_text = 'true', updated_at = now()
-- where key = 'enforce_level_security';
--
-- Effet:
-- - direct table access players_* -> admin uniquement
-- - non-admin -> RPC safe sans niveau
-- ===================================================================
