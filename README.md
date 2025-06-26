# Gestionnaire d'Équipes - Version Cloud

Application web de gestion et création d'équipes équilibrées avec synchronisation cloud via Supabase.

## 🚀 Fonctionnalités

- ✅ **Gestion des joueurs** : Ajout, modification, suppression
- ✅ **Recherche et tri** : Recherche temps réel, tri alphabétique/par niveau  
- ✅ **Création d'équipes** : Algorithme d'équilibrage automatique
- ✅ **Synchronisation cloud** : Données sauvegardées avec Supabase
- ✅ **Mode hors ligne** : Fonctionnement en local si pas de connexion
- ✅ **Import/Export** : Fichiers CSV pour importer/exporter les joueurs
- ✅ **Interface responsive** : Optimisée mobile et desktop

## 🛠 Configuration

### 1. Configuration Supabase

Remplacez dans `index.html` :
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'
```

### 2. Structure de base de données

Créez une table `players` dans Supabase :
```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) UNIQUE NOT NULL,
  niveau INTEGER CHECK (niveau >= 1 AND niveau <= 10),
  poste VARCHAR(50) CHECK (poste IN ('avant', 'arriere', 'indifferent')),
  groupe INTEGER,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Déploiement

1. **GitHub** : Code source
2. **Netlify** : Hébergement statique
3. **Supabase** : Base de données et API

## 📱 Utilisation

1. **Ajouter des joueurs** avec nom, niveau (1-10), poste
2. **Créer des équipes** en spécifiant le nombre souhaité
3. **Équilibrage automatique** basé sur niveaux et postes
4. **Synchronisation** automatique toutes les 30 secondes

---

Développé avec ❤️ pour une gestion d'équipes optimale !
