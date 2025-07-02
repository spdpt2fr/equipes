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
| `niveau` | INTEGER | Niveau du joueur (1-10) |
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

## Table : licenses

```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  software VARCHAR(255) NOT NULL,
  vendor VARCHAR(255),
  version VARCHAR(100),
  type VARCHAR(50),
  quantity INTEGER,
  purchaseDate DATE,
  expirationDate DATE,
  renewalDate DATE,
  initialCost NUMERIC,
  renewalCost NUMERIC,
  contacts TEXT,
  assignedTo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access" ON licenses
    FOR ALL USING (true) WITH CHECK (true);
```

Cette table stocke toutes les licences logicielles gérées par l'application.
