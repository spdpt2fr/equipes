# Structure de base de données Supabase pour le Gestionnaire d'Équipes

## Table : players

```sql
-- Création de la table players
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) UNIQUE NOT NULL,
  niveau INTEGER CHECK (niveau >= 1 AND niveau <= 10) NOT NULL,
  poste VARCHAR(50) CHECK (poste IN ('avant', 'arriere', 'indifferent')) NOT NULL DEFAULT 'indifferent',
  groupe INTEGER,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_players_nom ON players(nom);
CREATE INDEX idx_players_actif ON players(actif);
CREATE INDEX idx_players_niveau ON players(niveau);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politique de sécurité (Row Level Security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture à tous (anonyme)
CREATE POLICY "Allow read access to all users" ON players
    FOR SELECT USING (true);

-- Permettre l'insertion à tous (anonyme)
CREATE POLICY "Allow insert access to all users" ON players
    FOR INSERT WITH CHECK (true);

-- Permettre la mise à jour à tous (anonyme)
CREATE POLICY "Allow update access to all users" ON players
    FOR UPDATE USING (true);

-- Permettre la suppression à tous (anonyme)
CREATE POLICY "Allow delete access to all users" ON players
    FOR DELETE USING (true);
```

## Structure des données

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | Identifiant unique auto-incrémenté |
| `nom` | VARCHAR(255) | Nom du joueur (unique) |
| `niveau` | NUMERIC(3,1) | Niveau du joueur (1.0–10.0) |
| `poste` | VARCHAR(50) | Poste : 'avant', 'arriere', 'indifferent' |
| `groupe` | INTEGER | Numéro de groupe (optionnel) |
| `actif` | BOOLEAN | Statut actif/inactif |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de dernière modification |

## Configuration requise dans Supabase

1. **Créer le projet Supabase**
2. **Exécuter le script SQL** ci-dessus dans l'éditeur SQL
3. **Récupérer les clés API** depuis Settings > API
4. **Configurer l'application** avec l'URL et la clé anon

## Notes importantes

- La table utilise Row Level Security pour un accès public contrôlé
- Le nom du joueur doit être unique
- Le niveau est contraint entre 1 et 10
- Le poste doit être une des trois valeurs autorisées
- La colonne `updated_at` est mise à jour automatiquement

## Table : sessions (soirées de jeu)

```sql
-- Sessions de jeu (une par soirée)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    date_session DATE NOT NULL DEFAULT CURRENT_DATE,
    nb_equipes INTEGER NOT NULL,
    resultats_saisis BOOLEAN DEFAULT false,
    ajustements_appliques BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_club ON sessions(club_id);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
```

## Table : session_teams (équipes d'une soirée)

```sql
-- Équipes validées pour une session
CREATE TABLE session_teams (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    numero_equipe INTEGER NOT NULL,
    niveau_total NUMERIC(6,2) DEFAULT 0
);

CREATE INDEX idx_session_teams_session ON session_teams(session_id);

-- RLS
ALTER TABLE session_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on session_teams" ON session_teams FOR ALL USING (true) WITH CHECK (true);
```

## Table : session_players (joueurs dans une équipe de session)

```sql
-- Joueurs affectés à une équipe lors d'une session
CREATE TABLE session_players (
    id SERIAL PRIMARY KEY,
    session_team_id INTEGER NOT NULL REFERENCES session_teams(id) ON DELETE CASCADE,
    player_id INTEGER,          -- référence vers players_xxx (peut être NULL si joueur supprimé)
    player_name VARCHAR(255) NOT NULL,
    niveau INTEGER NOT NULL,
    poste VARCHAR(50)
);

CREATE INDEX idx_session_players_team ON session_players(session_team_id);

-- RLS
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on session_players" ON session_players FOR ALL USING (true) WITH CHECK (true);
```

## Table : match_results (résultats des matchs)

```sql
-- Résultats de chaque match (paire d'équipes)
CREATE TABLE match_results (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    equipe1_id INTEGER NOT NULL REFERENCES session_teams(id),
    equipe2_id INTEGER NOT NULL REFERENCES session_teams(id),
    gagnant_id INTEGER REFERENCES session_teams(id),  -- NULL si match nul
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_results_session ON match_results(session_id);

-- RLS
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on match_results" ON match_results FOR ALL USING (true) WITH CHECK (true);
```

## Structure des tables de sessions

| Table | Colonne | Type | Description |
|-------|---------|------|-------------|
| `sessions` | `id` | SERIAL | Identifiant unique |
| | `club_id` | INTEGER | Référence vers clubs |
| | `date_session` | DATE | Date de la soirée |
| | `nb_equipes` | INTEGER | Nombre d'équipes |
| | `resultats_saisis` | BOOLEAN | Résultats enregistrés ? |
| | `ajustements_appliques` | BOOLEAN | Niveaux ajustés ? |
| `session_teams` | `id` | SERIAL | Identifiant unique |
| | `session_id` | INTEGER | Référence vers sessions |
| | `numero_equipe` | INTEGER | Numéro de l'équipe (1, 2, 3…) |
| | `niveau_total` | NUMERIC | Somme des niveaux |
| `session_players` | `id` | SERIAL | Identifiant unique |
| | `session_team_id` | INTEGER | Référence vers session_teams |
| | `player_id` | INTEGER | Référence vers joueur (nullable) |
| | `player_name` | VARCHAR | Nom du joueur (snapshot) |
| | `niveau` | INTEGER | Niveau au moment de la session |
| | `poste` | VARCHAR | Poste au moment de la session |
| `match_results` | `id` | SERIAL | Identifiant unique |
| | `session_id` | INTEGER | Référence vers sessions |
| | `equipe1_id` | INTEGER | Équipe 1 du match |
| | `equipe2_id` | INTEGER | Équipe 2 du match |
| | `gagnant_id` | INTEGER | Équipe gagnante (nullable) |
