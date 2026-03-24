-- ============================================================
-- EXPORT SUPABASE - Projet : gestionnaire-equipes
-- ID Projet   : vfowenxzpnexcymlruru
-- Région      : eu-west-1
-- Date export : 2026-03-24
-- Tables      : 8 | Lignes totales : 157
-- ============================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ============================================================
-- SECTION 1 : SUPPRESSION DES TABLES EXISTANTES
-- ============================================================

DROP TABLE IF EXISTS public.match_results CASCADE;
DROP TABLE IF EXISTS public.session_players CASCADE;
DROP TABLE IF EXISTS public.session_teams CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.players_grenoble CASCADE;
DROP TABLE IF EXISTS public.players_jeeves CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;

-- ============================================================
-- SECTION 2 : CRÉATION DES SÉQUENCES
-- ============================================================

DROP SEQUENCE IF EXISTS public.clubs_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.players_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.players_grenoble_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.players_jeeves_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.sessions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.session_teams_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.session_players_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.match_results_id_seq CASCADE;

CREATE SEQUENCE public.clubs_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.players_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.players_grenoble_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.players_jeeves_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.sessions_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.session_teams_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.session_players_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
CREATE SEQUENCE public.match_results_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- ============================================================
-- SECTION 3 : CRÉATION DES TABLES
-- ============================================================

CREATE TABLE public.clubs (
    id integer NOT NULL DEFAULT nextval('clubs_id_seq'::regclass),
    nom character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT clubs_pkey PRIMARY KEY (id),
    CONSTRAINT clubs_nom_key UNIQUE (nom)
);

CREATE TABLE public.players (
    id integer NOT NULL DEFAULT nextval('players_id_seq'::regclass),
    nom character varying(255) NOT NULL,
    niveau integer,
    poste character varying(50),
    groupe integer,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT players_pkey PRIMARY KEY (id),
    CONSTRAINT players_nom_key UNIQUE (nom)
);

CREATE TABLE public.players_grenoble (
    id integer NOT NULL DEFAULT nextval('players_grenoble_id_seq'::regclass),
    nom character varying(255) NOT NULL,
    niveau numeric,
    poste character varying(50),
    groupe integer,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT players_grenoble_pkey PRIMARY KEY (id),
    CONSTRAINT players_grenoble_nom_key UNIQUE (nom)
);

CREATE TABLE public.players_jeeves (
    id integer NOT NULL DEFAULT nextval('players_jeeves_id_seq'::regclass),
    nom character varying(255) NOT NULL,
    niveau numeric,
    poste character varying(50),
    groupe integer,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT players_jeeves_pkey PRIMARY KEY (id),
    CONSTRAINT players_jeeves_nom_key UNIQUE (nom)
);

CREATE TABLE public.sessions (
    id integer NOT NULL DEFAULT nextval('sessions_id_seq'::regclass),
    club_id integer NOT NULL,
    date_session date NOT NULL DEFAULT CURRENT_DATE,
    nb_equipes integer NOT NULL,
    resultats_saisis boolean DEFAULT false,
    ajustements_appliques boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(id)
);

CREATE TABLE public.session_teams (
    id integer NOT NULL DEFAULT nextval('session_teams_id_seq'::regclass),
    session_id integer NOT NULL,
    numero_equipe integer NOT NULL,
    niveau_total numeric DEFAULT 0,
    CONSTRAINT session_teams_pkey PRIMARY KEY (id),
    CONSTRAINT session_teams_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

CREATE TABLE public.session_players (
    id integer NOT NULL DEFAULT nextval('session_players_id_seq'::regclass),
    session_team_id integer NOT NULL,
    player_id integer,
    player_name character varying(255) NOT NULL,
    niveau numeric NOT NULL,
    poste character varying(50),
    CONSTRAINT session_players_pkey PRIMARY KEY (id),
    CONSTRAINT session_players_session_team_id_fkey FOREIGN KEY (session_team_id) REFERENCES public.session_teams(id)
);

CREATE TABLE public.match_results (
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

-- ============================================================
-- SECTION 4 : INSERTION DES DONNÉES
-- ============================================================

-- ---- clubs (2 lignes) ----
INSERT INTO public.clubs (id, nom, created_at) VALUES
(1, 'Grenoble', '2026-02-24 08:14:56.159664'),
(2, 'Jeeves', '2026-02-24 08:14:56.159664');

-- ---- players (0 lignes - table vide) ----

-- ---- players_grenoble (33 lignes) ----
INSERT INTO public.players_grenoble (id, nom, niveau, poste, groupe, actif, created_at, updated_at) VALUES
(71, 'Loran', 6.4, 'arriere', NULL, false, '2026-02-24 10:51:46.781033', '2026-03-10 20:25:07.460845'),
(72, 'Claire', 5.1, 'avant', NULL, true, '2026-02-24 10:51:46.909514', '2026-03-18 06:23:11.039946'),
(73, 'Fred', 4.0, 'avant', NULL, false, '2026-02-24 10:51:47.021262', '2026-02-24 19:43:32.099964'),
(74, 'Charles', 7.6, 'avant', NULL, false, '2026-02-24 10:51:47.106645', '2026-03-17 19:52:40.869615'),
(75, 'Nicolas', 6.0, 'avant', NULL, false, '2026-02-24 10:51:47.180098', '2026-02-24 19:44:45.586249'),
(76, 'Soazig', 3.0, 'avant', NULL, false, '2026-02-24 10:51:47.262907', '2026-02-24 19:44:48.207043'),
(77, 'Gael', 6.2, 'indifferent', NULL, true, '2026-02-24 10:51:47.437465', '2026-03-18 06:23:11.228144'),
(78, 'Favio', 7.6, 'indifferent', NULL, false, '2026-02-24 10:51:47.509158', '2026-03-17 20:13:38.161498'),
(79, 'Tif', 5.8, 'indifferent', NULL, true, '2026-02-24 10:51:47.589056', '2026-03-18 06:23:11.368907'),
(80, 'Romain', 5.7, 'arriere', NULL, false, '2026-02-24 10:51:47.680668', '2026-03-03 19:32:29.831315'),
(81, 'Thomas', 5.5, 'avant', NULL, false, '2026-02-24 10:51:47.757248', '2026-03-17 19:52:58.717899'),
(82, 'Doudou', 5.3, 'avant', NULL, false, '2026-02-24 10:51:47.827163', '2026-03-09 08:24:54.274147'),
(83, 'Quentin', 6.2, 'avant', NULL, false, '2026-02-24 10:51:47.904144', '2026-03-17 19:52:55.983001'),
(84, 'Lison', 6.3, 'avant', NULL, false, '2026-02-24 10:51:47.98457', '2026-03-17 19:52:51.349555'),
(85, 'Nico S', 4.4, 'indifferent', NULL, false, '2026-02-24 10:51:48.055836', '2026-03-10 20:25:10.081187'),
(86, 'Charly', 6.1, 'avant', NULL, true, '2026-02-24 10:51:48.127636', '2026-03-18 06:23:11.590157'),
(87, 'Nanas', 5.9, 'indifferent', NULL, true, '2026-02-24 10:51:48.207982', '2026-03-18 06:23:11.735698'),
(88, '11', 8.0, 'avant', NULL, true, '2026-02-24 10:51:48.280552', '2026-03-18 06:23:11.877554'),
(89, 'Alanis', 4.0, 'avant', NULL, false, '2026-02-24 10:51:48.352237', '2026-02-24 19:42:07.109315'),
(90, 'Alexis', 7.0, 'indifferent', NULL, true, '2026-02-24 10:51:48.429211', '2026-03-18 06:23:12.027023'),
(91, 'Blaise', 5.0, 'arriere', NULL, false, '2026-02-24 10:51:48.503051', '2026-03-10 20:24:53.944505'),
(92, 'Felix', 5.9, 'indifferent', NULL, false, '2026-02-24 10:51:48.578158', '2026-03-10 20:25:00.139199'),
(93, 'Mathilde', 2.0, 'indifferent', NULL, false, '2026-02-24 10:51:48.648106', '2026-02-24 19:44:26.384598'),
(94, 'Alex', 9.5, 'avant', NULL, false, '2026-02-24 10:51:48.716898', '2026-02-24 19:42:26.690875'),
(95, 'Charlene', 5.8, 'avant', NULL, true, '2026-02-24 10:51:48.788807', '2026-03-18 06:23:12.170902'),
(96, 'Arnaud', 5.3, 'indifferent', NULL, true, '2026-02-24 10:51:48.873406', '2026-03-18 06:23:12.304316'),
(97, 'Léonie', 4.6, 'indifferent', NULL, true, '2026-02-24 10:51:48.947421', '2026-03-18 06:23:12.435499'),
(98, 'LauLau', 5.6, 'indifferent', NULL, true, '2026-02-24 10:51:49.026413', '2026-03-18 06:23:12.628699'),
(99, 'Jules', 7.0, 'indifferent', NULL, false, '2026-02-24 10:51:49.105435', '2026-02-24 19:44:06.624584'),
(100, 'Lamine', 5.1, 'indifferent', NULL, false, '2026-02-24 10:51:49.188873', '2026-03-06 09:45:57.133638'),
(101, 'Florence', 6.1, 'indifferent', NULL, false, '2026-03-03 19:07:23.971285', '2026-03-10 20:25:00.753627'),
(102, 'pierre', 5.4, 'indifferent', NULL, true, '2026-03-03 19:37:44.787249', '2026-03-18 06:23:12.762514'),
(103, 'Chef Van Rechem', 6.1, 'pivot', NULL, true, '2026-03-17 19:58:08.846131', '2026-03-18 06:23:12.920352');

-- ---- players_jeeves (39 lignes) ----
INSERT INTO public.players_jeeves (id, nom, niveau, poste, groupe, actif, created_at, updated_at) VALUES
(1, 'Adrian', 3.0, 'arriere', NULL, true, '2026-02-24 08:18:53.72724', '2026-02-24 08:18:53.72724'),
(2, 'Andy G', 6.0, 'indifferent', NULL, true, '2026-02-24 08:18:53.81217', '2026-02-24 08:18:53.81217'),
(3, 'Ash', 6.0, 'arriere', NULL, true, '2026-02-24 08:18:53.899668', '2026-02-24 08:18:53.899668'),
(4, 'Becca', 1.0, 'indifferent', NULL, true, '2026-02-24 08:18:53.975445', '2026-02-24 08:18:53.975445'),
(5, 'Becky', 4.0, 'avant', NULL, true, '2026-02-24 08:18:54.055943', '2026-02-24 08:18:54.055943'),
(6, 'Ben E', 8.0, 'avant', NULL, true, '2026-02-24 08:18:54.140508', '2026-02-24 08:18:54.140508'),
(7, 'Ben Q', 7.0, 'avant', NULL, true, '2026-02-24 08:18:54.228758', '2026-02-24 08:18:54.228758'),
(8, 'Ben S', 6.0, 'indifferent', NULL, true, '2026-02-24 08:18:54.30953', '2026-02-24 08:18:54.30953'),
(9, 'Brozen', 5.0, 'indifferent', NULL, true, '2026-02-24 08:18:54.401927', '2026-02-24 08:18:54.401927'),
(10, 'Ed', 7.0, 'indifferent', NULL, true, '2026-02-24 08:18:54.477092', '2026-02-24 08:18:54.477092'),
(11, 'Elliot', 6.0, 'avant', NULL, true, '2026-02-24 08:18:54.601809', '2026-02-24 08:18:54.601809'),
(12, 'Emma G', 8.0, 'avant', NULL, true, '2026-02-24 08:18:54.679777', '2026-02-24 08:18:54.679777'),
(13, 'Emma T', 6.0, 'avant', NULL, true, '2026-02-24 08:18:54.757088', '2026-02-24 08:18:54.757088'),
(14, 'Fred', 7.0, 'arriere', NULL, true, '2026-02-24 08:18:54.834048', '2026-02-24 08:18:54.834048'),
(15, 'George', 8.0, 'indifferent', NULL, true, '2026-02-24 08:18:54.919207', '2026-02-24 08:18:54.919207'),
(16, 'Jack', 6.0, 'indifferent', NULL, true, '2026-02-24 08:18:54.99949', '2026-02-24 08:18:54.99949'),
(17, 'James D', 6.0, 'avant', NULL, true, '2026-02-24 08:18:55.078162', '2026-02-24 08:18:55.078162'),
(18, 'James E', 5.0, 'avant', NULL, true, '2026-02-24 08:18:55.161001', '2026-02-24 08:18:55.161001'),
(19, 'Jamie', 8.0, 'arriere', NULL, true, '2026-02-24 08:18:55.240736', '2026-02-24 08:18:55.240736'),
(20, 'Jasper', 6.0, 'avant', NULL, true, '2026-02-24 08:18:55.317037', '2026-02-24 08:18:55.317037'),
(21, 'Jeeves', 8.0, 'arriere', NULL, true, '2026-02-24 08:18:55.391734', '2026-02-24 08:18:55.391734'),
(22, 'Jen', 8.0, 'arriere', NULL, true, '2026-02-24 08:18:55.471271', '2026-02-24 08:18:55.471271'),
(23, 'Joe', 5.0, 'indifferent', NULL, true, '2026-02-24 08:18:55.54518', '2026-02-24 08:18:55.54518'),
(24, 'Katy', 5.0, 'arriere', NULL, true, '2026-02-24 08:18:55.622239', '2026-02-24 08:18:55.622239'),
(25, 'Kieran', 7.0, 'arriere', NULL, true, '2026-02-24 08:18:55.70119', '2026-02-24 08:18:55.70119'),
(26, 'Lawrence', 5.0, 'arriere', NULL, true, '2026-02-24 08:18:55.798629', '2026-02-24 08:18:55.798629'),
(27, 'Mark', 2.0, 'indifferent', NULL, true, '2026-02-24 08:18:55.875625', '2026-02-24 08:18:55.875625'),
(28, 'Micky', 3.0, 'arriere', NULL, true, '2026-02-24 08:18:55.972457', '2026-02-24 08:18:55.972457'),
(29, 'Nas', 6.0, 'avant', NULL, true, '2026-02-24 08:18:56.057304', '2026-02-24 08:18:56.057304'),
(30, 'Nick', 1.0, 'indifferent', NULL, true, '2026-02-24 08:18:56.136331', '2026-02-24 08:18:56.136331'),
(31, 'Nikyle', 4.0, 'indifferent', NULL, true, '2026-02-24 08:18:56.213894', '2026-02-24 08:18:56.213894'),
(32, 'Phil', 4.0, 'avant', NULL, true, '2026-02-24 08:18:56.293437', '2026-02-24 08:18:56.293437'),
(33, 'Rachel', 6.0, 'indifferent', NULL, true, '2026-02-24 08:18:56.377319', '2026-02-24 08:18:56.377319'),
(34, 'Raisha', 5.0, 'avant', NULL, true, '2026-02-24 08:18:56.455279', '2026-02-24 08:18:56.455279'),
(35, 'Rhiannon', 6.0, 'avant', NULL, true, '2026-02-24 08:18:56.544455', '2026-02-24 08:18:56.544455'),
(36, 'Ricky', 6.0, 'indifferent', NULL, true, '2026-02-24 08:18:56.62885', '2026-02-24 08:18:56.62885'),
(37, 'Rosie', 7.0, 'arriere', NULL, true, '2026-02-24 08:18:56.70843', '2026-02-24 08:18:56.70843'),
(38, 'Will B', 5.0, 'avant', NULL, true, '2026-02-24 08:18:56.785049', '2026-02-24 08:18:56.785049'),
(39, 'Will H', 5.0, 'avant', NULL, true, '2026-02-24 08:18:56.873148', '2026-02-24 08:18:56.873148');

-- ---- sessions (4 lignes) ----
INSERT INTO public.sessions (id, club_id, date_session, nb_equipes, resultats_saisis, ajustements_appliques, created_at) VALUES
(3,  1, '2026-02-24', 3, true, true, '2026-02-24 21:59:19.204306+00'),
(4,  1, '2026-03-03', 4, true, true, '2026-03-03 21:33:50.454315+00'),
(10, 1, '2026-03-10', 2, true, true, '2026-03-10 21:35:58.735615+00'),
(11, 1, '2026-03-17', 2, true, true, '2026-03-17 22:08:18.572495+00');

-- ---- session_teams (11 lignes) ----
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
(33, 11, 2, 36.20);

-- ---- session_players (57 lignes) ----
INSERT INTO public.session_players (id, session_team_id, player_id, player_name, niveau, poste) VALUES
(37, 7,  90, 'Alexis',          7.5, 'avant'),
(38, 7,  83, 'Quentin',         6.5, 'avant'),
(39, 7,  92, 'Felix',           6.0, 'arriere'),
(40, 7,  72, 'Claire',          5.0, 'avant'),
(41, 7,  81, 'Thomas',          5.0, 'avant'),
(42, 8,  88, '11',              8.5, 'avant'),
(43, 8,  71, 'Loran',           6.0, 'arriere'),
(44, 8,  79, 'Tif',             5.7, 'avant'),
(45, 8,  84, 'Lison',           6.0, 'avant'),
(46, 9,  78, 'Favio',           8.0, 'avant'),
(47, 9,  80, 'Romain',          6.0, 'arriere'),
(48, 9,  85, 'Nico S',          5.0, 'arriere'),
(49, 9,  96, 'Arnaud',          5.0, 'arriere'),
(50, 9,  97, 'Léonie',          5.0, 'arriere'),
(51, 10, 78, 'Favio',           7.7, 'avant'),
(52, 10, 92, 'Felix',           6.0, 'avant'),
(53, 10, 81, 'Thomas',          5.0, 'avant'),
(54, 10, 72, 'Claire',          5.0, 'avant'),
(55, 10, 95, 'Charlene',        6.0, 'avant'),
(56, 11, 90, 'Alexis',          7.2, 'avant'),
(57, 11, 71, 'Loran',           6.3, 'arriere'),
(58, 11, 96, 'Arnaud',          4.7, 'arriere'),
(59, 11, 87, 'Nanas',           6.0, 'arriere'),
(60, 12, 88, '11',              8.8, 'avant'),
(61, 12, 86, 'Charly',          5.7, 'avant'),
(62, 12, 102,'pierre',          5.7, 'arriere'),
(63, 12, 101,'Florence',        6.3, 'arriere'),
(64, 13, 74, 'Charles',         7.0, 'avant'),
(65, 13, 84, 'Lison',           6.8, 'avant'),
(66, 13, 91, 'Blaise',          5.0, 'arriere'),
(67, 13, 85, 'Nico S',          4.7, 'avant'),
(68, 13, 77, 'Gael',            6.0, 'avant'),
(159,30, 74, 'Charles',         7.4, 'avant'),
(160,30, 90, 'Alexis',          6.9, 'arriere'),
(161,30, 83, 'Quentin',         6.0, 'avant'),
(162,30, 77, 'Gael',            5.9, 'arriere'),
(163,30, 87, 'Nanas',           5.8, 'avant'),
(164,30, 96, 'Arnaud',          5.0, 'arriere'),
(165,31, 78, 'Favio',           7.8, 'avant'),
(166,31, 84, 'Lison',           6.5, 'avant'),
(167,31, 95, 'Charlene',        6.1, 'avant'),
(168,31, 79, 'Tif',             5.9, 'arriere'),
(169,31, 81, 'Thomas',          5.7, 'avant'),
(170,31, 102,'pierre',          5.5, 'arriere'),
(171,32, 90, 'Alexis',          7.1, 'avant'),
(172,32, 86, 'Charly',          6.2, 'avant'),
(173,32, 87, 'Nanas',           6.0, 'arriere'),
(174,32, 95, 'Charlene',        5.9, 'avant'),
(175,32, 98, 'LauLau',          5.7, 'arriere'),
(176,32, 72, 'Claire',          5.2, 'avant'),
(177,32, 97, 'Léonie',          4.7, 'arriere'),
(178,33, 88, '11',              7.9, 'avant'),
(179,33, 77, 'Gael',            6.1, 'arriere'),
(180,33, 103,'Chef Van Rechem', 6.0, 'pivot'),
(181,33, 79, 'Tif',             5.7, 'avant'),
(182,33, 102,'pierre',          5.3, 'arriere'),
(183,33, 96, 'Arnaud',          5.2, 'avant');

-- ---- match_results (11 lignes) ----
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
(38, 11, 32, 33, 33,   '2026-03-17 22:08:33.999077+00');

-- ============================================================
-- SECTION 5 : RÉINITIALISATION DES SÉQUENCES
-- ============================================================

SELECT setval('public.clubs_id_seq',           2,   true);
SELECT setval('public.players_id_seq',         1,   false);
SELECT setval('public.players_grenoble_id_seq',103, true);
SELECT setval('public.players_jeeves_id_seq',  39,  true);
SELECT setval('public.sessions_id_seq',        11,  true);
SELECT setval('public.session_teams_id_seq',   33,  true);
SELECT setval('public.session_players_id_seq', 183, true);
SELECT setval('public.match_results_id_seq',   38,  true);

-- ============================================================
-- FIN DE L'EXPORT
-- ============================================================
