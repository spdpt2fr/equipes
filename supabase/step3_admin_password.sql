-- ===================================================================
-- STEP 3 — Protection admin par mot de passe + reset email
-- ===================================================================
-- AVANT DE LANCER CE SCRIPT :
-- 1. Activer l'extension pgcrypto : Supabase Dashboard → Database → Extensions → pgcrypto → Enable
-- 2. Activer l'extension pg_net : Supabase Dashboard → Database → Extensions → pg_net → Enable
-- 3. Créer un compte Resend (resend.com), obtenir une API key
--
-- APRÈS LE SCRIPT :
-- 4. INSERT INTO app_secrets VALUES ('resend_api_key', 're_VOTRE_CLE');
-- 5. UPDATE admin_auth SET password_hash = crypt('VOTRE_VRAI_MOT_DE_PASSE', gen_salt('bf'));
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table admin_auth (une seule ligne)
CREATE TABLE IF NOT EXISTS public.admin_auth (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    password_hash text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_auth (password_hash)
VALUES (crypt('changeme', gen_salt('bf')))
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;
-- Pas de policy = deny all pour anon

-- Table password_reset_tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id serial PRIMARY KEY,
    code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
    used boolean NOT NULL DEFAULT false
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Table app_secrets (clé API Resend)
CREATE TABLE IF NOT EXISTS public.app_secrets (
    key text PRIMARY KEY,
    value text NOT NULL
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Table login_attempts (rate limit check_admin_password)
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id serial PRIMARY KEY,
    attempted_at timestamptz NOT NULL DEFAULT now(),
    success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RPC: check_admin_password
CREATE OR REPLACE FUNCTION public.check_admin_password(pwd text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_failures integer;
    v_result boolean;
BEGIN
    -- Compter les échecs dans les 5 dernières minutes
    SELECT count(*) INTO v_failures
    FROM login_attempts
    WHERE attempted_at > now() - interval '5 minutes'
      AND success = false;

    -- Lockout après 5 échecs
    IF v_failures >= 5 THEN
        RETURN false;
    END IF;

    -- Vérifier le mot de passe
    SELECT (password_hash = crypt(pwd, password_hash)) INTO v_result
    FROM admin_auth WHERE id = 1;

    -- Enregistrer la tentative
    INSERT INTO login_attempts (success) VALUES (COALESCE(v_result, false));

    -- Nettoyer les tentatives > 1 heure
    DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 hour';

    RETURN COALESCE(v_result, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_password(text) TO anon;

-- RPC: request_password_reset
CREATE OR REPLACE FUNCTION public.request_password_reset()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code text;
    v_api_key text;
    v_last_created timestamptz;
BEGIN
    -- Nettoyer les tokens expirés ou utilisés (> 1 jour)
    DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' OR (used = true AND created_at < now() - interval '1 day');
    
    -- Invalider les tokens précédents non utilisés
    UPDATE password_reset_tokens SET used = true WHERE used = false;

    -- Rate limit: 1 requête par 60 secondes
    SELECT created_at INTO v_last_created
    FROM password_reset_tokens
    ORDER BY created_at DESC LIMIT 1;

    IF v_last_created IS NOT NULL AND v_last_created > now() - interval '60 seconds' THEN
        RETURN 'rate_limited';
    END IF;

    -- Générer un code 6 chiffres
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');

    INSERT INTO password_reset_tokens (code) VALUES (v_code);

    -- Lire la clé API Resend
    SELECT value INTO v_api_key FROM app_secrets WHERE key = 'resend_api_key';
    IF v_api_key IS NULL THEN
        RETURN 'no_api_key';
    END IF;

    -- Envoyer l'email via Resend
    PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_api_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'from', 'Hockey Sub <onboarding@resend.dev>',
            'to', jsonb_build_array('bernardi_l@outlook.fr'),
            'subject', 'Code de reinitialisation - Hockey Sub',
            'text', 'Votre code de reinitialisation est : ' || v_code || E'\n\nCe code expire dans 15 minutes.'
        )
    );

    RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_password_reset() TO anon;

-- RPC: reset_admin_password
CREATE OR REPLACE FUNCTION public.reset_admin_password(code text, new_pwd text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_id integer;
    v_recent_failures integer;
BEGIN
    -- Vérifier longueur minimale
    IF length(new_pwd) < 6 THEN
        RETURN false;
    END IF;

    -- Compter les tentatives échouées récentes (5 dernières minutes)
    SELECT count(*) INTO v_recent_failures
    FROM login_attempts
    WHERE attempted_at > now() - interval '5 minutes'
      AND success = false;

    -- Après 5 échecs, invalider tous les tokens
    IF v_recent_failures >= 5 THEN
        UPDATE password_reset_tokens SET used = true WHERE used = false;
        RETURN false;
    END IF;

    -- Trouver un token valide
    SELECT id INTO v_token_id
    FROM password_reset_tokens
    WHERE password_reset_tokens.code = reset_admin_password.code
      AND used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_token_id IS NULL THEN
        -- Enregistrer l'échec
        INSERT INTO login_attempts (success) VALUES (false);
        RETURN false;
    END IF;

    -- Mettre à jour le mot de passe
    UPDATE admin_auth
    SET password_hash = crypt(new_pwd, gen_salt('bf')),
        updated_at = now()
    WHERE id = 1;

    -- Marquer TOUS les tokens comme utilisés
    UPDATE password_reset_tokens SET used = true WHERE used = false;

    -- Enregistrer le succès
    INSERT INTO login_attempts (success) VALUES (true);

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_admin_password(text, text) TO anon;
