# Changements à implémenter

## Contexte
Suite de la session du 05/03/2026. Fonctionnalités planifiées et validées, pas encore codées.

---

## 1. Navigation par onglets (mobile-first)

**Fichiers** : `index.html`, `assets/css/main.css`, `assets/js/ui.js`

### index.html
- Ajouter `<nav class="tab-bar">` juste après le `<h1>` avec 3 boutons :
  `data-tab="gestion"` , `data-tab="historique"` , `data-tab="stats"` 
- Envelopper tout le contenu existant dans `<div id="section-gestion" class="tab-section active">`
- Créer `<div id="section-historique" class="tab-section">` contenant `<div id="historiqueContainer">`
- Créer `<div id="section-stats" class="tab-section">` contenant `<div id="statsContainer">`
- Retirer l'ancien `<div id="historiqueContainer">` du bas de page

### assets/css/main.css  ajouter :

```css
.tab-bar { display:flex; background:white; border-radius:12px; padding:6px; gap:6px;
  box-shadow:0 2px 8px rgba(0,0,0,0.1); position:sticky; top:48px; z-index:100; }
.tab-btn { flex:1; padding:10px 8px; border:none; border-radius:8px; background:transparent;
  font-size:14px; font-weight:500; cursor:pointer; color:#555; transition:all 0.2s; min-height:44px; }
.tab-btn:hover { background:#f0f4f8; }
.tab-btn.active { background:#1976d2; color:white; }
.tab-section { display:none; }
.tab-section.active { display:contents; }
@media (max-width:768px) { .tab-bar { top:44px; } .tab-btn { font-size:12px; padding:10px 4px; } }
```

### assets/js/ui.js  ajouter :

```js
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-section').forEach(s =>
    s.classList.toggle('active', s.id === `section-${tabName}`));
  if (tabName === 'historique' && window.AppSessions) window.AppSessions.chargerHistorique();
  if (tabName === 'stats' && window.AppSessions) window.AppSessions.afficherStats();
}
```

Dans `attachEventListeners()`, ajouter :

```js
document.querySelectorAll('.tab-btn').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
```

Exporter `switchTab` dans `window.AppUI`.

---

## 2. Historique complet sans limite

**Fichier** : `assets/js/sessions.js`

Supprimer `.limit(10)` dans `chargerHistorique()`.

---

## 3. Page Statistiques joueurs

**Fichier** : `assets/js/sessions.js`

### 3a. `calculerStats()`  agrège V/N/D + historique de niveau par player_name
- Parcourt `window.AppCore.historiqueSessions[]`
- Pour chaque `session_teams[].session_players[]`, accumule V/N/D par `player_name`
- Stocke `{ date: session.date_session, niveau: player.niveau }` dans `historiqueNiveau[]`
- Retourne tableau trié par % victoires décroissant

### 3b. `afficherStats()`  injecte dans `#statsContainer`
- Tableau colonnes : Joueur / V / N / D / Matchs / %V
- Ligne verte si %V > 50%, rouge si < 40%
- Clic sur une ligne  toggle du bloc historique de niveau (masqué par défaut)
- Bouton "Exporter CSV" en haut

### 3c. `exporterStats()`  télécharge CSV
- Colonnes : `Joueur,Victoires,Nuls,Defaites,Matchs,%Victoires,Historique niveau`
- Champ historique : `date1:niveau1|date2:niveau2|...`
- BOM UTF-8 (`\uFEFF`) pour compatibilité Excel Windows
- Nom fichier : `stats_{club}_{YYYY-MM-DD}.csv`

Exporter les 3 dans `window.AppSessions`.

---

## 4. CSS pour les stats

**Fichier** : `assets/css/components.css`

Ajouter :

```css
.stats-table-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.stats-table { width:100%; border-collapse:collapse; font-size:14px; }
.stats-table thead th { background:#1976d2; color:white; padding:10px 12px; text-align:center;
  font-weight:600; position:sticky; top:0; }
.stats-table thead th:first-child { text-align:left; }
.stats-table tbody td { padding:10px 12px; text-align:center; }
.stats-table tbody td:first-child { text-align:left; font-weight:500; }
.stats-row { cursor:pointer; transition:background 0.15s; }
.stats-row:hover { background:#f0f4f8; }
.stats-row.stats-win { background:#f1f8e9; }
.stats-row.stats-lose { background:#fce4ec; }
.stats-v { color:#2e7d32; font-weight:600; }
.stats-n { color:#f57f17; font-weight:600; }
.stats-d { color:#c62828; font-weight:600; }
.history-toggle { font-size:11px; color:#1976d2; margin-left:6px; }
.niveau-history { padding:8px 12px; background:#f8f9fa; border-radius:6px; }
.niveau-history-row { padding:4px 0; font-size:13px; border-bottom:1px solid #eee; color:#555; }
.niveau-history-row:last-child { border-bottom:none; }
@media (max-width:768px) { .stats-table { font-size:13px; } }
```

---

## 5. Points d'attention

- `calculerStats()` compte les matchs **par match joué** (3 matchs/soirée = 3 entrées par joueur)
- `window.toggleHistorique` est réaffecté à chaque appel `afficherStats()`  pas de fuite mémoire
- Appeler `afficherStats()` à chaque switch vers l'onglet stats (pas de cache)
- Sans `.limit()`, `chargerHistorique()` peut être lent  envisager un spinner
- BOM `\uFEFF` indispensable pour Excel Windows avec UTF-8

---

## 6. Tests à ajouter (tests/tests.js)

- `calculerStats()` avec données mockées : V/N/D corrects
- `exporterStats()` appelable sans erreur
- Toggle historique niveau : show/hide correct
- Compatibilité import : ancien format (`gagnant_numero` numérique) et nouveau (`null`)


---

## 7. Re-notation des résultats de matchs (à implémenter)

**Décisions validées** :
- Correction nette : `correction = nouveau_delta - ancien_delta` appliqué sur le niveau actuel du joueur
- Cascade : les sessions ultérieures du même club sont remises à `ajustements_appliques = false`
- UX : bouton " Modifier résultats" visible sur toutes les sessions de l'historique

### Fichiers à modifier : `assets/js/sessions.js`, `assets/css/components.css`

### Tâches

- [ ] **`calculerDeltaSession(session)`**  nouvelle fonction utilitaire
  - Prend une session complète (avec `session_teams`, `session_players`, `match_results`)
  - Applique exactement la même formule que `calculerAjustements()` mais depuis le snapshot `session_players.niveau`
  - Retourne un objet `{ player_name: delta }` pour tous les joueurs de la session
  - Réutilisable pour comparer ancien et nouveau delta

- [ ] **`renoterResultats(sessionId)`**  point d'entrée UX
  - Récupère la session depuis `window.AppCore.historiqueSessions`
  - Calcule et mémorise l'ancien delta via `calculerDeltaSession()`
  - Affiche l'UI de saisie des résultats (réutilise `afficherInterfaceResultats()`) dans un panneau sous la session card
  - Si la session n'a pas encore de résultats : se comporte comme un "Saisir résultats"

- [ ] **`sauvegarderRenotation(sessionId)`**  sauvegarde et correction
  - DELETE + INSERT des nouveaux `match_results` (déjà idempotent dans `sauvegarderResultats`)
  - Calcule le nouveau delta via `calculerDeltaSession()`
  - Pour chaque joueur : `correction = nouveau_delta - ancien_delta`
  - UPDATE `players_xxx.niveau += correction` (clampé 110, arrondi à 1 décimale)
  - Marque la session : `resultats_saisis = true`, `ajustements_appliques = true`
  - **Cascade** : récupère toutes les sessions du même club avec `date_session > session.date_session` ET `ajustements_appliques = true`  UPDATE `ajustements_appliques = false`
  - Reload `chargerHistorique()`
  - Toast : "Résultats corrigés. X session(s) ultérieure(s) remise(s) en attente."

- [ ] **`afficherHistorique()`**  ajouter bouton Modifier
  - Ajouter un bouton **" Modifier résultats"** (classe `btn-edit-outline`) sur **toutes** les session cards
  - Le placer à côté du bouton supprimer (trash)
  - Visible uniquement si `window.AppCore.isOnline`
  - Appel : `window.AppSessions.renoterResultats(session.id)`

- [ ] **`components.css`**  ajouter style bouton modifier
  ```css
  .btn-edit-outline { background: transparent; color: #1565c0; border: 1px solid #1565c0;
    padding: 6px; border-radius: 8px; cursor: pointer; display: inline-flex;
    align-items: center; transition: all 0.2s; }
  .btn-edit-outline:hover { background: #1565c0; color: white; }
  ```

- [ ] **`window.AppSessions`**  exporter `renoterResultats`, `sauvegarderRenotation`, `calculerDeltaSession`

### Points d'attention

- `calculerDeltaSession()` doit reproduire **exactement** la formule de `calculerAjustements()` : `DELTA_BASE * (1 + (oppAvg - myAvg) / 10)` pour une victoire, inverse pour une défaite, 0 pour un nul
- La correction nette préserve les ajustements des sessions intermédiaires légitimes
- Tester : session avec ajust. appliqués  modifier  vérifier correction nette sur `players.niveau`
- Tester cascade : 3 sessions en ordre, corriger la première  les 2 suivantes passent en attente
- Tester session sans résultats (doit se comporter comme "Saisir résultats")
- Le bouton "Modifier" ne doit pas apparaître en mode hors ligne (`isOnline = false`)

---

## 8. Formule Elo simplifié (remplace DELTA_BASE)

**Décisions validées** : `ELO_K = 0.3`, `ELO_DIVISOR = 4`, nuls donnent un delta , max ~0.23 par match vs équipe égale

### Fichiers à modifier : `assets/js/sessions.js`, `tests/tests.js`

### Tâches

- [x] `sessions.js`  constantes : remplacer `DELTA_BASE`
  - Supprimer : `const DELTA_BASE = 0.15;`
  - Ajouter : `const ELO_K = 0.3;` et `const ELO_DIVISOR = 4;`
  - Ces deux constantes remplacent intégralement DELTA_BASE dans toute la logique

- [x] `sessions.js`  `_calculerDeltaMatch(myAvg, oppAvg, resultat)` : nouvelle fonction privée
  - Déclarer avec `function` (pas `const`) immédiatement après les constantes, avant toute autre fonction
  - `resultat` : 1 = victoire, 0 = défaite, 0.5 = nul
  - Formule : `const expected = 1 / (1 + Math.pow(10, (oppAvg - myAvg) / ELO_DIVISOR));`
  - Retourne : `ELO_K * (resultat - expected)`
  - **Ne pas exporter**  fonction interne uniquement (préfixe `_`)

- [x] `sessions.js`  `calculerAjustements(sessionId)` : remplacer formule DELTA_BASE
  - **Supprimer** le `if (result.gagnant_id == null) return;`  les nuls ont maintenant un delta
  - Remplacer le bloc `if (gagnant_id === myTeamId) { totalDelta += ... } else { totalDelta -= ... }` par :
    ```js
    const res = result.gagnant_id == null ? 0.5
              : result.gagnant_id === myTeamId ? 1 : 0;
    totalDelta += _calculerDeltaMatch(myAvg, oppAvg, res);
    ```
  - `myAvg` et `oppAvg` calculés depuis `niveau_total / nb_joueurs` des équipes concernées

- [x] `sessions.js`  `calculerDeltaSession(session)` : même remplacement
  - Même suppression du `return` anticipé sur nul
  - Même remplacement du bloc DELTA_BASE par appel à `_calculerDeltaMatch`
  - Formule identique à `calculerAjustements` mais depuis snapshots `session_players.niveau`

- [x] `tests/tests.js`  vérifier et mettre à jour les tests impactés
  - Aucune valeur numérique `0.15` trouvée dans les tests existants  pas de valeur à changer
  - Ajouter une suite **"Formule Elo simplifié"** avec tests unitaires de `_calculerDeltaMatch` si elle est exposée, sinon tester via `calculerAjustements` mocké
  - Cas à couvrir : victoire équipes égales (+0.15), défaite équipes égales (0.15), victoire contre plus fort (+>0.15), nul entre égaux (0)

### Points d'attention

- **Ordre de déclaration** : `_calculerDeltaMatch` doit être déclarée avec `function` (hoisting) ou placée AVANT les deux fonctions appelantes dans le fichier
- **Suppression du `return` anticipé** : le `if (result.gagnant_id == null) return;` existe dans `calculerAjustements` ET `calculerDeltaSession`  supprimer dans les DEUX
- **Affichage des ajustements** : `afficherAjustements()` affiche désormais des deltas pour les nuls (ex: +0.02)  le rendu visuel changera légèrement, pas de modification CSS requise mais à valider visuellement
- **Note section 7 obsolète** : la section 7 de ce fichier mentionne la formule `DELTA_BASE * (1 + (oppAvg - myAvg) / 10)`  elle sera remplacée par Elo mais les sessions déjà sauvegardées en DB ne sont pas recalculées (comportement attendu)
- **Valeurs Elo de référence** pour validation manuelle :
  - Équipes égales : `expected = 0.5`  victoire `+0.15`, défaite `0.15`, nul `0`
  - Opp. +2 niveaux (`myAvg=5, oppAvg=7`) : `expected  0.24`  victoire `+0.23`, défaite `0.07`
  - Opp. 2 niveaux (`myAvg=7, oppAvg=5`) : `expected  0.76`  victoire `+0.07`, défaite `0.23`
- **Pas de modification CSS** requise pour cette feature
- **Pas de modification Supabase**  logique purement JS côté client

---

## 9. Toggle tri joueurs (alphabétique / niveau décroissant)

**Décision validée** : toggle visible en haut de la liste joueurs (onglet Gestion), bascule entre tri alpha et tri niveau décroissant, état persisté dans `window.AppCore.triJoueurs`.

### Fichiers à modifier : `index.html`, `assets/js/ui.js`, `assets/css/components.css`

### Tâches

- [x] `index.html`  ajouter le toggle au-dessus de `#joueursContainer` (dans `#section-gestion`)
  - Deux boutons segmentés : "AZ" (`data-tri="alpha"`) et "Niveau " (`data-tri="niveau"`)
  - Placer après la barre de recherche, avant la liste des joueurs
  - Le bouton actif reçoit la classe `active`
  - HTML :
    ```html
    <div class="tri-toggle">
      <button class="tri-btn active" data-tri="alpha">A  Z</button>
      <button class="tri-btn" data-tri="niveau">Niveau </button>
    </div>
    ```

- [x] `assets/js/ui.js`  `afficherJoueurs()` : vérifier et compléter le tri
  - Si `triJoueurs === 'alpha'` : trier par `nom` (`localeCompare`)
  - Si `triJoueurs === 'niveau'` : trier par `niveau` décroissant, puis `nom` en cas d'égalité
  - Trier sur une copie du tableau  ne pas muter `window.AppCore.joueurs`

- [x] `assets/js/ui.js`  `attachEventListeners()` : brancher le toggle
  - Écouter `click` sur `.tri-btn`
  - `window.AppCore.triJoueurs = btn.dataset.tri`
  - Mettre à jour la classe `active` sur les boutons
  - Appeler `afficherJoueurs()`
  - Initialiser le bouton actif au chargement depuis `window.AppCore.triJoueurs`

- [x] `assets/css/components.css`  ajouter style `.tri-toggle` / `.tri-btn`
  ```css
  .tri-toggle { display: flex; gap: 4px; margin-bottom: 8px; }
  .tri-btn { flex: 1; padding: 6px 12px; border: 1px solid #1976d2; border-radius: 8px;
    background: transparent; color: #1976d2; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.2s; }
  .tri-btn:hover { background: #e3f0fb; }
  .tri-btn.active { background: #1976d2; color: white; }
  ```

### Points d'attention

- **Initialisation** : lire `window.AppCore.triJoueurs` dans `attachEventListeners()` pour activer le bon bouton dès le chargement (valeur par défaut `'alpha'`)
- **Changement de club** : `changerClub()`  `afficherJoueurs()` relit `triJoueurs` automatiquement  aucune action supplémentaire
- **Recherche combinée** : le tri s'applique APRÈS le filtre `searchTerm` dans `afficherJoueurs()`  vérifier l'ordre filtre  tri  rendu
- **Pas de doublon** : `triJoueurs` existe déjà dans `window.AppCore`  ne pas redéclarer
- **Pas d'export supplémentaire** : `afficherJoueurs` et `attachEventListeners` sont déjà dans `window.AppUI`
