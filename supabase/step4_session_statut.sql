-- ===================================================================
-- STEP 4 : Ajout du statut de session (envoyée / validée)
-- À exécuter manuellement dans l'éditeur SQL Supabase
-- ===================================================================

ALTER TABLE sessions ADD COLUMN statut VARCHAR(20) NOT NULL DEFAULT 'validee' CHECK (statut IN ('envoyee', 'validee'));
-- Les sessions existantes reçoivent automatiquement 'validee'.
-- Valeurs possibles : 'envoyee' (enregistrée par un sélecteur), 'validee' (confirmée par un admin).
