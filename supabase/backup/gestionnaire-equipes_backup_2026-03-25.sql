-- ============================================================
-- EXPORT SQL - Projet : gestionnaire-equipes
-- Supabase Project ID : vfowenxzpnexcymlruru
-- Région               : eu-west-1
-- Date de sauvegarde  : 2026-03-25
-- Généré par          : Claude (tâche planifiée automatique)
-- ============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ============================================================
-- SCHÉMA
-- ============================================================

SET search_path = public, pg_catalog;

-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.clubs_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.players_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.players_grenoble_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.players_jeeves_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.sessions_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.session_teams_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.session_players_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.match_results_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- ============================================================
-- TABLE : clubs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clubs (
    id integer NOT NULL DEFAULT nextval('clubs_id_seq'::regclass),
    nom character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT clubs_pkey PRIMARY KEY (id),
    CONSTRAINT clubs_nom_key UNIQUE (nom)
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.clubs
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE : players
-- ============================================================

CREATE TABLE IF NOT EXISTS public.players (
    id integer NOT NULL DEFAULT nextval('players_id_seq'::regclass),
    nom character varying NOT NULL,
    niveau integer,
    poste character varying,
    groupe integer,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT players_pkey PRIMARY KEY (id),
    CONSTRAINT players_nom_key UNIQUE (nom),
    CONSTRAINT players_niveau_check CHECK (niveau >= 1 AND niveau <= 10),
    CONSTRAINT players_poste_check CHECK (poste::text = ANY (ARRAY['avant'::character varying, 'arriere'::character varying, 'indifferent'::character varying, 'ailier'::character varying, 'centre'::character varying, 'pivot'::character varying, 'arr_centre'::character varying]::text[]))
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.players
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_players_actif ON public.players USING btree (actif);
CREATE INDEX IF NOT EXISTS idx_players_niveau ON public.players USING btree (niveau);

-- ============================================================
-- TABLE : players_grenoble
-- ============================================================

CREATE TABLE IF NOT EXISTS public.players_grenoble (
    id integer NOT NULL DEFAULT nextval('players_grenoble_id_seq'::regclass),
    nom character varying NOT NULL,
    poste character varying,
    groupe integer,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    niveau numeric,
    CONSTRAINT players_grenoble_pkey PRIMARY KEY (id),
    CONSTRAINT players_grenoble_nom_key UNIQUE (nom),
    CONSTRAINT players_grenoble_niveau_check CHECK (niveau >= 1::numeric AND niveau <= 10::numeric),
    CONSTRAINT players_grenoble_poste_check CHECK (poste::text = ANY (ARRAY['indifferent'::character varying, 'avant'::character varying, 'arriere'::character varying, 'ailier'::character varying, 'centre'::character varying, 'pivot'::character varying, 'arr_centre'::character varying]::text[]))
);

ALTER TABLE public.players_grenoble ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.players_grenoble
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE : players_jeeves
-- ============================================================

CREATE TABLE IF NOT EXISTS public.players_jeeves (
    id integer NOT NULL DEFAULT nextval('players_jeeves_id_seq'::regclass),
    nom character varying NOT NULL,
    poste character varying,
    groupe integer,
    niveau numeric,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT players_jeeves_pkey PRIMARY KEY (id),
    CONSTRAINT players_jeeves_nom_key UNIQUE (nom),
    CONSTRAINT players_jeeves_niveau_check CHECK (niveau >= 1::numeric AND niveau <= 10::numeric),
    CONSTRAINT players_jeeves_poste_check CHECK (poste::text = ANY (ARRAY['indifferent'::character varying, 'avant'::character varying, 'arriere'::character varying, 'ailier'::character varying, 'centre'::character varying, 'pivot'::character varying, 'arr_centre'::character varying]::text[]))
);

ALTER TABLE public.players_jeeves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.players_jeeves
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

-- ============================================================
-- TABLE : sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id integer NOT NULL DEFAULT nextval('sessions_id_seq'::regclass),
    club_id integer NOT NULL,
    nb_equipes integer NOT NULL,
    date_session date NOT NULL DEFAULT CURRENT_DATE,
    resultats_saisis boolean DEFAULT false,
    ajustements_appliques boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id)
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on sessions" ON public.sessions
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sessions_club ON public.sessions USING btree (club_id);

-- ============================================================
-- TABLE : session_teams
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_teams (
    id integer NOT NULL DEFAULT nextval('session_teams_id_seq'::regclass),
    session_id integer NOT NULL,
    numero_equipe integer NOT NULL,
    niveau_total numeric DEFAULT 0,
    CONSTRAINT session_teams_pkey PRIMARY KEY (id),
    CONSTRAINT session_teams_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

ALTER TABLE public.session_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on session_teams" ON public.session_teams
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_teams_session ON public.session_teams USING btree (session_id);

-- ============================================================
-- TABLE : session_players
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_players (
    id integer NOT NULL DEFAULT nextval('session_players_id_seq'::regclass),
    session_team_id integer NOT NULL,
    player_id integer,
    player_name character varying NOT NULL,
    poste character varying,
    niveau numeric NOT NULL,
    CONSTRAINT session_players_pkey PRIMARY KEY (id),
    CONSTRAINT session_players_session_team_id_fkey FOREIGN KEY (session_team_id) REFERENCES public.session_teams(id)
);

ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on session_players" ON public.session_players
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_players_team ON public.session_players USING btree (session_team_id);

-- ============================================================
-- TABLE : match_results
-- ============================================================

CREATE TABLE IF NOT EXISTS public.match_results (
    id integer NOT NULL DEFAULT nextval('match_results_id_seq'::regclass),
    session_id integer NOT NULL,
    equipe1_id integer NOT NULL,
    equipe2_id integer NOT NULL,
    gagnant_id integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_results_pkey PRIMARY KEY (id),
    CONSTRAINT match_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
    CONSTRAINT match_results_equipe1_id_fkey FOREIGN KEY (equipe1_id) REFERENCES public.session_teams(id),
    CONSTRAINT match_results_equipe2_id_fkey FOREIGN KEY (equipe2_id) REFERENCES public.session_teams(id),
    CONSTRAINT match_results_gagnant_id_fkey FOREIGN KEY (gagnant_id) REFERENCES public.session_teams(id)
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on match_results" ON public.match_results
    AS PERMISSIVE FOR ALL TO public
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_match_results_session ON public.match_results USING btree (session_id);

-- ============================================================
-- DONNÉES : clubs (2 lignes)
-- ============================================================

INSERT INTO public.clubs (id, nom, created_at) VALUES
(1, 'Grenoble', '2026-02-24 08:14:56.159664'),
(2, 'Jeeves', '2026-02-24 08:14:56.159664');

SELECT setval('public.clubs_id_seq', 2, true);

-- ============================================================
-- DONNÉES : players (0 lignes)
-- ============================================================

-- Table vide au moment de la sauvegarde.

SELECT setval('public.players_id_seq', 1, false);

-- ============================================================
-- DONNÉES : players_grenoble (33 lignes)
-- ============================================================

INSERT INTO public.players_grenoble (id, nom, poste, groupe, actif, created_at, updated_at, niveau) VALUES
(71, 'Loran', 'arriere', NULL, true, '2026-02-24 10:51:46.781033', '2026-03-24 21:57:13.280081', 6.2),
(72, 'Claire', 'avant', NULL, true, '2026-02-24 10:51:46.909514', '2026-03-24 21:57:13.534799', 5.4),
(73, 'Fred', 'avant', NULL, false, '2026-02-24 10:51:47.021262', '2026-02-24 19:43:32.099964', 4.0),
(74, 'Charles', 'avant', NULL, false, '2026-02-24 10:51:47.106645', '2026-03-17 19:52:40.869615', 7.6),
(75, 'Nicolas', 'avant', NULL, false, '2026-02-24 10:51:47.180098', '2026-02-24 19:44:45.586249', 6.0),
(76, 'Soazig', 'avant', NULL, false, '2026-02-24 10:51:47.262907', '2026-02-24 19:44:48.207043', 3.0),
(77, 'Gael', 'indifferent', NULL, true, '2026-02-24 10:51:47.437465', '2026-03-24 21:57:13.751461', 6.0),
(78, 'Favio', 'indifferent', NULL, true, '2026-02-24 10:51:47.509158', '2026-03-24 21:57:13.887559', 7.9),
(79, 'Tif', 'indifferent', NULL, true, '2026-02-24 10:51:47.589056', '2026-03-24 21:57:14.111024', 5.6),
(80, 'Romain', 'arriere', NULL, false, '2026-02-24 10:51:47.680668', '2026-03-03 19:32:29.831315', 5.7),
(81, 'Thomas', 'avant', NULL, false, '2026-02-24 10:51:47.757248', '2026-03-17 19:52:58.717899', 5.5),
(82, 'Doudou', 'avant', NULL, false, '2026-02-24 10:51:47.827163', '2026-03-09 08:24:54.274147', 5.3),
(83, 'Quentin', 'avant', NULL, true, '2026-02-24 10:51:47.904144', '2026-03-24 21:57:14.230698', 6.5),
(84, 'Lison', 'avant', NULL, true, '2026-02-24 10:51:47.98457', '2026-03-24 21:57:14.368344', 6.1),
(85, 'Nico S', 'indifferent', NULL, true, '2026-02-24 10:51:48.055836', '2026-03-24 21:57:14.48658', 4.2),
(86, 'Charly', 'avant', NULL, false, '2026-02-24 10:51:48.127636', '2026-03-24 20:25:55.020587', 6.1),
(87, 'Nanas', 'indifferent', NULL, true, '2026-02-24 10:51:48.207982', '2026-03-24 21:57:14.69991', 6.2),
(88, '11', 'avant', NULL, true, '2026-02-24 10:51:48.280552', '2026-03-24 21:57:14.939039', 7.8),
(89, 'Alanis', 'avant', NULL, false, '2026-02-24 10:51:48.352237', '2026-02-24 19:42:07.109315', 4.0),
(90, 'Alexis', 'indifferent', NULL, false, '2026-02-24 10:51:48.429211', '2026-03-24 20:25:50.211634', 7.0),
(91, 'Blaise', 'arriere', NULL, false, '2026-02-24 10:51:48.503051', '2026-03-10 20:24:53.944505', 5.0),
(92, 'Felix', 'indifferent', NULL, true, '2026-02-24 10:51:48.578158', '2026-03-24 21:57:15.080731', 5.7),
(93, 'Mathilde', 'indifferent', NULL, false, '2026-02-24 10:51:48.648106', '2026-02-24 19:44:26.384598', 2.0),
(94, 'Alex', 'avant', NULL, false, '2026-02-24 10:51:48.716898', '2026-02-24 19:42:26.690875', 9.5),
(95, 'Charlene', 'avant', NULL, true, '2026-02-24 10:51:48.788807', '2026-03-24 21:57:15.296516', 5.6),
(96, 'Arnaud', 'indifferent', NULL, true, '2026-02-24 10:51:48.873406', '2026-03-24 21:57:15.531601', 5.1),
(97, 'Léonie', 'indifferent', NULL, true, '2026-02-24 10:51:48.947421', '2026-03-24 21:57:15.759968', 4.9),
(98, 'LauLau', 'indifferent', NULL, false, '2026-02-24 10:51:49.026413', '2026-03-24 20:26:13.022935', 5.6),
(99, 'Jules', 'indifferent', NULL, false, '2026-02-24 10:51:49.105435', '2026-02-24 19:44:06.624584', 7.0),
(100, 'Lamine', 'indifferent', NULL, false, '2026-02-24 10:51:49.188873', '2026-03-06 09:45:57.133638', 5.1),
(101, 'Florence', 'indifferent', NULL, false, '2026-03-03 19:07:23.971285', '2026-03-10 20:25:00.753627', 6.1),
(102, 'pierre', 'indifferent', NULL, true, '2026-03-03 19:37:44.787249', '2026-03-24 21:57:15.960993', 5.2),
(103, 'Chef Van Rechem', 'pivot', NULL, false, '2026-03-17 19:58:08.846131', '2026-03-24 20:25:56.354425', 6.1);

SELECT setval('public.players_grenoble_id_seq', 103, true);

-- ============================================================
-- DONNÉES : players_jeeves (39 lignes)
-- ============================================================

INSERT INTO public.players_jeeves (id, nom, poste, groupe, niveau, actif, created_at, updated_at) VALUES
(1, 'Adrian', 'arriere', NULL, 3.0, true, '2026-02-24 08:18:53.72724', '2026-02-24 08:18:53.72724'),
(2, 'Andy G', 'indifferent', NULL, 6.0, true, '2026-02-24 08:18:53.81217', '2026-02-24 08:18:53.81217'),
(3, 'Ash', 'arriere', NULL, 6.0, true, '2026-02-24 08:18:53.899668', '2026-02-24 08:18:53.899668'),
(4, 'Becca', 'indifferent', NULL, 1.0, true, '2026-02-24 08:18:53.975445', '2026-02-24 08:18:53.975445'),
(5, 'Becky', 'avant', NULL, 4.0, true, '2026-02-24 08:18:54.055943', '2026-02-24 08:18:54.055943'),
(6, 'Ben E', 'avant', NULL, 8.0, true, '2026-02-24 08:18:54.140508', '2026-02-24 08:18:54.140508'),
(7, 'Ben Q', 'avant', NULL, 7.0, true, '2026-02-24 08:18:54.228758', '2026-02-24 08:18:54.228758'),
(8, 'Ben S', 'indifferent', NULL, 6.0, true, '2026-02-24 08:18:54.30953', '2026-02-24 08:18:54.30953'),
(9, 'Brozen', 'indifferent', NULL, 5.0, true, '2026-02-24 08:18:54.401927', '2026-02-24 08:18:54.401927'),
(10, 'Ed', 'indifferent', NULL, 7.0, true, '2026-02-24 08:18:54.477092', '2026-02-24 08:18:54.477092'),
(11, 'Elliot', 'avant', NULL, 6.0, true, '2026-02-24 08:18:54.601809', '2026-02-24 08:18:54.601809'),
(12, 'Emma G', 'avant', NULL, 8.0, true, '2026-02-24 08:18:54.679777', '2026-02-24 08:18:54.679777'),
(13, 'Emma T', 'avant', NULL, 6.0, true, '2026-02-24 08:18:54.757088', '2026-02-24 08:18:54.757088'),
(14, 'Fred', 'arriere', NULL, 7.0, true, '2026-02-24 08:18:54.834048', '2026-02-24 08:18:54.834048'),
(15, 'George', 'indifferent', NULL, 8.0, true, '2026-02-24 08:18:54.919207', '2026-02-24 08:18:54.919207'),
(16, 'Jack', 'indifferent', NULL, 6.0, true, '2026-02-24 08:18:54.99949', '2026-02-24 08:18:54.99949'),
(17, 'James D', 'avant', NULL, 6.0, true, '2026-02-24 08:18:55.078162', '2026-02-24 08:18:55.078162'),
(18, 'James E', 'avant', NULL, 5.0, true, '2026-02-24 08:18:55.161001', '2026-02-24 08:18:55.161001'),
(19, 'Jamie', 'arriere', NULL, 8.0, true, '2026-02-24 08:18:55.240736', '2026-02-24 08:18:55.240736'),
(20, 'Jasper', 'avant', NULL, 6.0, true, '2026-02-24 08:18:55.317037', '2026-02-24 08:18:55.317037'),
(21, 'Jeeves', 'arriere', NULL, 8.0, true, '2026-02-24 08:18:55.391734', '2026-02-24 08:18:55.391734'),
(22, 'Jen', 'arriere', NULL, 8.0, true, '2026-02-24 08:18:55.471271', '2026-02-24 08:18:55.471271'),
(23, 'Joe', 'indifferent', NULL, 5.0, true, '2026-02-24 08:18:55.54518', '2026-02-24 08:18:55.54518'),
(24, 'Katy', 'arriere', NULL, 5.0, true, '2026-02-24 08:18:55.622239', '2026-02-24 08:18:55.622239'),
(25, 'Kieran', 'arriere', NULL, 7.0, true, '2026-02-24 08:18:55.70119', '2026-02-24 08:18:55.70119'),
(26, 'Lawrence', 'arriere', NULL, 5.0, true, '2026-02-24 08:18:55.798629', '2026-02-24 08:18:55.798629'),
(27, 'Mark', 'indifferent', NULL, 2.0, true, '2026-02-24 08:18:55.875625', '2026-02-24 08:18:55.875625'),
(28, 'Micky', 'arriere', NULL, 3.0, true, '2026-02-24 08:18:55.972457', '2026-02-24 08:18:55.972457'),
(29, 'Nas', 'avant', NULL, 6.0, true, '2026-02-24 08:18:56.057304', '2026-02-24 08:18:56.057304'),
(30, 'Nick', 'indifferent', NULL, 1.0, true, '2026-02-24 08:18:56.136331', '2026-02-24 08:18:56.136331'),
(31, 'Nikyle', 'indifferent', NULL, 4.0, true, '2026-02-24 08:18:56.213894', '2026-02-24 08:18:56.213894'),
(32, 'Phil', 'avant', NULL, 4.0, true, '2026-02-24 08:18:56.293437', '2026-02-24 08:18:56.293437'),
(33, 'Rachel', 'indifferent', NULL, 6.0, true, '2026-02-24 08:18:56.377319', '2026-02-24 08:18:56.377319'),
(34, 'Raisha', 'avant', NULL, 5.0, true, '2026-02-24 08:18:56.455279', '2026-02-24 08:18:56.455279'),
(35, 'Rhiannon', 'avant', NULL, 6.0, true, '2026-02-24 08:18:56.544455', '2026-02-24 08:18:56.544455'),
(36, 'Ricky', 'indifferent', NULL, 6.0, true, '2026-02-24 08:18:56.62885', '2026-02-24 08:18:56.62885'),
(37, 'Rosie', 'arriere', NULL, 7.0, true, '2026-02-24 08:18:56.70843', '2026-02-24 08:18:56.70843'),
(38, 'Will B', 'avant', NULL, 5.0, true, '2026-02-24 08:18:56.785049', '2026-02-24 08:18:56.785049'),
(39, 'Will H', 'avant', NULL, 5.0, true, '2026-02-24 08:18:56.873148', '2026-02-24 08:18:56.873148');

SELECT setval('public.players_jeeves_id_seq', 39, true);

-- ============================================================
-- DONNÉES : sessions (5 lignes)
-- ============================================================

INSERT INTO public.sessions (id, club_id, nb_equipes, date_session, resultats_saisis, ajustements_appliques, created_at) VALUES
(3,  1, 3, '2026-02-24', true, true, '2026-02-24 21:59:19.204306+00'),
(4,  1, 4, '2026-03-03', true, true, '2026-03-03 21:33:50.454315+00'),
(10, 1, 2, '2026-03-10', true, true, '2026-03-10 21:35:58.735615+00'),
(11, 1, 2, '2026-03-17', true, true, '2026-03-17 22:08:18.572495+00'),
(12, 1, 3, '2026-03-24', true, true, '2026-03-24 21:56:08.786834+00');

SELECT setval('public.sessions_id_seq', 12, true);

-- ============================================================
-- DONNÉES : session_teams (14 lignes)
-- ============================================================

INSERT INTO public.session_teams (id, session_id, numero_equipe, niveau_total) VALUES
(7,  3,  1, 30.00),
(8,  3,  2, 26.20),
(9,  3,  3, 29.00),
(10, 4,  1, 29.70),
(11, 4,  2, 24.20),
(12, 4,  3, 26.50),
(13, 4,  4, 29.50),
(30, 10, 1, 37.00),
(31, 10, 2, 37.50),
(32, 11, 1, 40.80),
(33, 11, 2, 36.20),
(34, 12, 1, 29.70),
(35, 12, 2, 29.80),
(36, 12, 3, 29.40);

SELECT setval('public.session_teams_id_seq', 36, true);

-- ============================================================
-- DONNÉES : session_players (62 lignes)
-- ============================================================

INSERT INTO public.session_players (id, session_team_id, player_id, player_name, poste, niveau) VALUES
(37,  7,  90, 'Alexis',         'avant',   7.5),
(38,  7,  83, 'Quentin',        'avant',   6.5),
(39,  7,  92, 'Felix',          'arriere', 6.0),
(40,  7,  72, 'Claire',         'avant',   5.0),
(41,  7,  81, 'Thomas',         'avant',   5.0),
(42,  8,  88, '11',             'avant',   8.5),
(43,  8,  71, 'Loran',          'arriere', 6.0),
(44,  8,  79, 'Tif',            'avant',   5.7),
(45,  8,  84, 'Lison',          'avant',   6.0),
(46,  9,  78, 'Favio',          'avant',   8.0),
(47,  9,  80, 'Romain',         'arriere', 6.0),
(48,  9,  85, 'Nico S',         'arriere', 5.0),
(49,  9,  96, 'Arnaud',         'arriere', 5.0),
(50,  9,  97, 'Léonie',         'arriere', 5.0),
(51,  10, 78, 'Favio',          'avant',   7.7),
(52,  10, 92, 'Felix',          'avant',   6.0),
(53,  10, 81, 'Thomas',         'avant',   5.0),
(54,  10, 72, 'Claire',         'avant',   5.0),
(55,  10, 95, 'Charlene',       'avant',   6.0),
(56,  11, 90, 'Alexis',         'avant',   7.2),
(57,  11, 71, 'Loran',          'arriere', 6.3),
(58,  11, 96, 'Arnaud',         'arriere', 4.7),
(59,  11, 87, 'Nanas',          'arriere', 6.0),
(60,  12, 88, '11',             'avant',   8.8),
(61,  12, 86, 'Charly',         'avant',   5.7),
(62,  12, 102,'pierre',         'arriere', 5.7),
(63,  12, 101,'Florence',       'arriere', 6.3),
(64,  13, 74, 'Charles',        'avant',   7.0),
(65,  13, 84, 'Lison',          'avant',   6.8),
(66,  13, 91, 'Blaise',         'arriere', 5.0),
(67,  13, 85, 'Nico S',         'avant',   4.7),
(68,  13, 77, 'Gael',           'avant',   6.0),
(159, 30, 74, 'Charles',        'avant',   7.4),
(160, 30, 90, 'Alexis',         'arriere', 6.9),
(161, 30, 83, 'Quentin',        'avant',   6.0),
(162, 30, 77, 'Gael',           'arriere', 5.9),
(163, 30, 87, 'Nanas',          'avant',   5.8),
(164, 30, 96, 'Arnaud',         'arriere', 5.0),
(165, 31, 78, 'Favio',          'avant',   7.8),
(166, 31, 84, 'Lison',          'avant',   6.5),
(167, 31, 95, 'Charlene',       'avant',   6.1),
(168, 31, 79, 'Tif',            'arriere', 5.9),
(169, 31, 81, 'Thomas',         'avant',   5.7),
(170, 31, 102,'pierre',         'arriere', 5.5),
(171, 32, 90, 'Alexis',         'avant',   7.1),
(172, 32, 86, 'Charly',         'avant',   6.2),
(173, 32, 87, 'Nanas',          'arriere', 6.0),
(174, 32, 95, 'Charlene',       'avant',   5.9),
(175, 32, 98, 'LauLau',         'arriere', 5.7),
(176, 32, 72, 'Claire',         'avant',   5.2),
(177, 32, 97, 'Léonie',         'arriere', 4.7),
(178, 33, 88, '11',             'avant',   7.9),
(179, 33, 77, 'Gael',           'arriere', 6.1),
(180, 33, 103,'Chef Van Rechem','pivot',   6.0),
(181, 33, 79, 'Tif',            'avant',   5.7),
(182, 33, 102,'pierre',         'arriere', 5.3),
(183, 33, 96, 'Arnaud',         'avant',   5.2),
(184, 34, 88, '11',             'avant',   8.0),
(185, 34, 77, 'Gael',           'arriere', 6.2),
(186, 34, 79, 'Tif',            'avant',   5.8),
(187, 34, 96, 'Arnaud',         'arriere', 5.3),
(188, 34, 85, 'Nico S',         'avant',   4.4),
(189, 35, 71, 'Loran',          'arriere', 6.4),
(190, 35, 84, 'Lison',          'avant',   6.3),
(191, 35, 92, 'Felix',          'avant',   5.9),
(192, 35, 95, 'Charlene',       'avant',   5.8),
(193, 35, 102,'pierre',         'arriere', 5.4),
(194, 36, 78, 'Favio',          'avant',   7.6),
(195, 36, 83, 'Quentin',        'avant',   6.2),
(196, 36, 87, 'Nanas',          'arriere', 5.9),
(197, 36, 97, 'Léonie',         'avant',   4.6),
(198, 36, 72, 'Claire',         'avant',   5.1);

SELECT setval('public.session_players_id_seq', 198, true);

-- ============================================================
-- DONNÉES : match_results (14 lignes)
-- ============================================================

INSERT INTO public.match_results (id, session_id, equipe1_id, equipe2_id, gagnant_id, created_at) VALUES
(7,  3,  7,  8,  8,    '2026-02-24 21:59:47.453756+00'),
(8,  3,  7,  9,  7,    '2026-02-24 21:59:47.453756+00'),
(9,  3,  8,  9,  8,    '2026-02-24 21:59:47.453756+00'),
(28, 4,  10, 11, 10,   '2026-03-06 09:03:52.543011+00'),
(29, 4,  10, 12, NULL, '2026-03-06 09:03:52.543011+00'),
(30, 4,  10, 13, 10,   '2026-03-06 09:03:52.543011+00'),
(31, 4,  11, 12, NULL, '2026-03-06 09:03:52.543011+00'),
(32, 4,  11, 13, NULL, '2026-03-06 09:03:52.543011+00'),
(33, 4,  12, 13, NULL, '2026-03-06 09:03:52.543011+00'),
(36, 10, 30, 31, 30,   '2026-03-10 21:36:11.452679+00'),
(38, 11, 32, 33, 33,   '2026-03-17 22:08:33.999077+00'),
(42, 12, 34, 35, NULL, '2026-03-24 21:57:07.919768+00'),
(43, 12, 34, 36, 36,   '2026-03-24 21:57:07.919768+00'),
(44, 12, 35, 36, 36,   '2026-03-24 21:57:07.919768+00');

SELECT setval('public.match_results_id_seq', 44, true);

-- ============================================================
-- FIN DE L'EXPORT
-- ============================================================
-- Résumé :
--   clubs            :  2 lignes
--   players          :  0 lignes (table vide)
--   players_grenoble : 33 lignes
--   players_jeeves   : 39 lignes
--   sessions         :  5 lignes
--   session_teams    : 14 lignes
--   session_players  : 72 lignes
--   match_results    : 14 lignes
-- ============================================================
