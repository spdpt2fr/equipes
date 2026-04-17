# Changements à implémenter

## Contexte
Suite de la session du 05/03/2026. Fonctionnalités planifiées et validées, pas encore codées.

---

## [TODO] Header Banner Illustration — 2026-03-25

### Décisions validées
- Remplacer le `<div class="card">` du titre par un `<header class="header-banner">` sémantique.
- Fond en dégradé bleu→crème (`linear-gradient 105deg`) intégrant une illustration aquarelle PNG à fond transparent.
- L'illustration est masquée en fondu via `mask-image` (côté gauche) pour une transition naturelle avec le dégradé.
- En mobile ≤ 768 px : colonne, illustration masquée (`display: none`), dégradé simplifié.
- Image **non commitable** : placée manuellement par l'utilisateur.

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `index.html` | Remplacer le bloc `<div class="card"><h1>…</h1></div>` par `<header class="header-banner">…</header>` |
| `assets/css/main.css` | Ajouter le bloc `/* === HEADER BANNER === */` après la règle `.card:hover` |
| `assets/css/responsive.css` | Ajouter les overrides mobiles dans la `@media (max-width: 768px)` existante |

### Tâches

- [x] **index.html** — Remplacer le `<div class="card">` entourant le `<h1>` (lignes ~20-25) par :
  ```html
  <header class="header-banner">
      <div class="header-banner__text">
          <h1 class="header-banner__title">Gestionnaire d'Équipes</h1>
          <p class="header-banner__subtitle">Hockey Subaquatique · Grenoble &amp; Jeeves</p>
      </div>
      <div class="header-banner__illustration" aria-hidden="true">
          <img src="assets/images/diver-hockey.png"
               alt=""
               class="header-banner__img">
      </div>
  </header>
  ```

- [x] **assets/css/main.css** — Ajouter après `.card:hover { … }` le bloc complet `.header-banner` avec ses 6 règles BEM :
  `.header-banner`, `.header-banner__text`, `.header-banner__title`, `.header-banner__subtitle`,
  `.header-banner__illustration`, `.header-banner__img`
  (dégradé `105deg`, `min-height: 120px`, `mask-image` + préfixe `-webkit-mask-image`)

- [x] **assets/css/responsive.css** — Dans la `@media (max-width: 768px)` existante, ajouter le bloc `/* === HEADER BANNER MOBILE === */` :
  `flex-direction: column`, `display: none` sur l'illustration, `font-size` réduit pour titre et sous-titre

- [ ] **[MANUEL]** Créer le dossier `assets/images/` et y placer l'illustration `diver-hockey.png`
  (PNG à fond transparent, hauteur recommandée ≥ 160 px, orientation portrait ou format libre)

### Points d'attention

- **Fond transparent obligatoire** : sans transparence, le `mask-image` sera sans effet et le dégradé du bandeau sera occulté.
- **Fallback sans image** : si `diver-hockey.png` est absent, le bandeau reste cohérent (le côté droit affiche simplement la teinte crème du dégradé). Aucun `onerror` JS nécessaire.
- **Compatibilité Safari/iOS** : le préfixe `-webkit-mask-image` doit être écrit **avant** `mask-image` dans le CSS.
- **`<header>` sémantique** : vérifier qu'aucun style global `header { … }` existant dans `main.css` ou `components.css` n'entre en conflit avec `.header-banner`.
- **Namespace** : aucune modification JS, aucun export `window.App*` requis pour cette feature.

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

---

## 9. Préparation du commit ranking Stats 3/1/0

**Décisions validées** :
- Périmètre limité à la feature ranking Stats avec barème 3/1/0
- Aucun changement de code métier dans cette étape, uniquement l'isolement du diff à committer
- Inclure `assets/js/sessions.js` et `tests/tests.js` seulement si ce sont les seuls fichiers réellement nécessaires

---

## 10. Maquette visuelle SVG isolée

**Décisions validées** :
- Produire une maquette en SVG autonome uniquement pour validation visuelle
- Représenter les zones clés : header, tabs, contexte club, formulaire, liste joueurs, stats
- Ne modifier aucun fichier applicatif existant ni aucun code métier
- Placer la maquette hors du flux applicatif réel dans un emplacement dédié

**Fichiers à modifier** :
- Nouveau fichier SVG isolé à créer dans un dossier de mockup dédié

**Tâches** :
- [ ] Créer un unique fichier SVG autonome présentant le nouveau look and feel global
- [ ] Structurer la maquette en sections distinctes pour les 6 zones produit attendues
- [ ] Prévoir un nommage et un emplacement explicites de type mockup/validation pour éviter toute confusion avec l'application réelle
- [ ] Limiter la maquette à un usage de revue visuelle, sans branchement HTML, CSS ou JS dans l'application

**Points d'attention** :
- Aucun import de la maquette dans [index.html](index.html)
- Aucun ajout dans [assets/js/core.js](assets/js/core.js), [assets/js/ui.js](assets/js/ui.js) ou les feuilles CSS existantes
- Le livrable doit rester facilement supprimable après validation d'UI

### Fichiers à modifier
- `CHANGELOG-TODO.md`

### Tâches

- [ ] **`assets/js/sessions.js`**  isoler le périmètre ranking
  - Vérifier que le diff retenu couvre uniquement calcul des points, tri, affichage Stats et export CSV Stats liés au ranking 3/1/0

- [ ] **`tests/tests.js`**  inclure uniquement les tests liés au ranking
  - Garder ce fichier hors du commit si aucun test ranking n'est requis

- [ ] **Staging Git**  exclure les changements non liés
  - Sortir du staging tout fichier hors périmètre
  - Utiliser un staging fin si un même fichier mélange ranking et changements non liés

- [ ] **Validation finale du diff stage**
  - Contrôler que le diff indexé ne contient que la feature ranking Stats 3/1/0 avant création du commit

- [ ] **Commit**  préparer le message
  - `feat: rank player stats with 3-1-0 scoring`

### Points d'attention

- Ne pas embarquer des ajustements adjacents sur l'historique, l'UI générale ou d'autres formules de score
- Si `assets/js/sessions.js` contient des changements mixtes, découper précisément le hunk au staging au lieu d'élargir le commit
- Vérifier la cohérence entre code indexé et tests indexés avant le commit
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

---

## 10. Ranking Stats en 3/1/0 (Pts prioritaire)

**Décisions validées** :
- Nouveau ranking Stats basé sur `points = victoires * 3 + nuls`
- `historiqueNiveau` reste inchangé dans `calculerStats()`
- La métrique principale affichée et exportée devient **Pts** ; `%V` reste secondaire si conservé dans le tableau
- Le tri final doit être déterministe : points décroissants d'abord, puis départages stables
- `assets/css/components.css` ne doit être modifié que si le tableau devient moins lisible après ajout/remplacement de colonne

### Fichiers à modifier : `assets/js/sessions.js`, `tests/tests.js`, `assets/css/components.css` si nécessaire

### Tâches

- [ ] `assets/js/sessions.js`  `calculerStats()` : ajouter la métrique points sans casser les stats existantes
  - Calculer `points = victoires * 3 + nuls` dans l'objet agrégé retourné pour chaque joueur
  - Conserver `victoires`, `nuls`, `defaites`, `matchs`, `pct` et `historiqueNiveau` pour compatibilité UI/export/tests
  - Ne pas modifier la construction de `historiqueNiveau[]`

- [ ] `assets/js/sessions.js`  `calculerStats()` : remplacer le tri final par un ranking Pts d'abord
  - Remplacer le `.sort()` actuel basé sur `pct` par un tri déterministe : `points` décroissants, puis `pct` décroissant, puis `matchs` décroissants, puis `nom.localeCompare(..., 'fr')`
  - Vérifier qu'un nul départage correctement devant une défaite à volume de matchs équivalent

- [ ] `assets/js/sessions.js`  `afficherStats()` : faire de Pts la métrique principale du tableau
  - Mettre à jour l'en-tête pour afficher `Pts` comme colonne de ranking prioritaire
  - Réordonner les cellules pour aligner l'affichage sur le nouveau tri et l'export
  - Vérifier les valeurs de `colspan` et la ligne d'historique repliée après changement de colonnes
  - Mettre à jour tout libellé textuel faisant encore référence à `%V` comme indicateur principal

- [ ] `assets/js/sessions.js`  `afficherStats()` : aligner la coloration des lignes avec la métrique principale
  - Remplacer la logique `rowClass` basée uniquement sur `pct`, devenue incohérente avec un ranking par points
  - Soit basculer la coloration sur une logique liée aux points, soit neutraliser la coloration si aucun seuil métier clair n'est retenu
  - Éviter un état où l'ordre du tableau dit "Pts" mais la couleur dit encore "%V"

- [ ] `assets/js/sessions.js`  `exporterStats()` : exporter Pts et garder l'ordre de colonnes cohérent avec l'UI
  - Ajouter la colonne `Points` au CSV exporté
  - Aligner l'ordre des colonnes sur celui affiché par `afficherStats()`
  - Conserver le champ `Historique niveau` au format actuel
  - Vérifier que le BOM UTF-8 et le nom de fichier existants restent inchangés

- [ ] `tests/tests.js`  ajouter une suite dédiée au ranking 3/1/0 dans les stats
  - Tester que `calculerStats()` calcule bien `points = victoires * 3 + nuls`
  - Tester que le tri final classe d'abord par points, puis applique les départages déterministes attendus
  - Couvrir un cas métier simple : un joueur avec `1V 0N 1D` passe devant un joueur avec `0V 2N 0D`

- [ ] `tests/tests.js`  ajouter un test de rendu minimal pour `afficherStats()`
  - Vérifier que le tableau rendu affiche une colonne ou cellule `Pts`
  - Vérifier que la ligne détaillée d'historique utilise toujours le bon `colspan`
  - Vérifier que le rendu ne dépend pas d'une coloration `%V` obsolète pour rester cohérent

- [ ] `tests/tests.js`  ajouter un test d'export minimal pour `exporterStats()`
  - Vérifier que le CSV contient la colonne `Points`
  - Vérifier que l'ordre des colonnes exportées correspond à l'ordre retenu dans l'UI

- [ ] `assets/css/components.css`  n'ajouter un ajustement que si le tableau stats devient illisible
  - Ajuster seulement la largeur, l'alignement ou le comportement responsive des colonnes stats si l'ajout de `Pts` dégrade la lecture
  - Ne pas modifier les styles stats existants sans besoin constaté dans le rendu

### Points d'attention

- **Compatibilité fonctionnelle** : `pct` peut rester calculé pour information, mais il ne doit plus piloter le ranking principal ni contredire la hiérarchie visuelle
- **Cohérence UI / export** : mêmes colonnes, même ordre logique, même notion de métrique principale entre tableau HTML et CSV
- **Départages** : documenter dans le code l'ordre exact retenu pour éviter les régressions silencieuses au prochain ajustement du ranking
- **Colspan** : la ligne d'historique détaillée dans `afficherStats()` doit suivre automatiquement le nombre réel de colonnes après ajout/remplacement de `Pts`
- **CSS optionnel** : si aucun problème de lisibilité n'apparaît, ne pas ouvrir un chantier visuel inutile dans `assets/css/components.css`

---

## 11. "Autre proposition" — alternatives d'équipes équilibrées

**Décisions validées** :
- Après génération des équipes, un bouton "Autre proposition" permet de générer une configuration alternative
- L'alternative est obtenue par swaps de joueurs de niveaux proches (|delta| ≤ 1) entre équipes
- Chaque alternative repart de la proposition initiale (pas de dérive en cascade)
- La variation de moyenne par équipe ne doit pas excéder ±0.2 vs la configuration originale
- Unicité garantie via signature (max 10 tentatives, puis toast informatif)
- Un déplacement manuel via `changerEquipe()` invalide le mécanisme de proposition

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `assets/js/core.js` | 2 nouvelles variables globales + export `window.AppCore` |
| `assets/js/teams.js` | Nouvelle fonction `autreProposition()`, modifications de `creerEquipes()`, `afficherEquipes()`, `changerEquipe()` + export |
| `assets/css/components.css` | Flex layout pour le conteneur des boutons d'action équipes |

### Tâches

- [x] **`assets/js/core.js`**  déclarer 2 nouvelles variables globales
  - `let propositionOriginale = null;` (array|null) — copie profonde des équipes issues de `creerEquipes()`
  - `let historiquePropositions = [];` (array) — liste des signatures de configurations déjà proposées
  - Placer après les variables globales existantes (`historiqueSessions`, `currentUser`, etc.)

- [x] **`assets/js/core.js`**  ajouter les 2 variables dans l'export `window.AppCore = { … }`
  - Ajouter `propositionOriginale` et `historiquePropositions` dans l'objet exporté

- [x] **`assets/js/teams.js`**  nouvelle fonction utilitaire `_signatureEquipes(equipes)`
  - Fonction privée (non exportée), préfixée `_`
  - Pour chaque équipe : trier les IDs joueurs, concaténer en string
  - Trier les strings d'équipes entre elles pour rendre la signature indépendante de l'ordre des équipes
  - Retourner la concaténation finale (ex: `"1,3,5|2,4,6"`)
  - Déclarer avec `function` pour bénéficier du hoisting

- [x] **`assets/js/teams.js`**  modifier `creerEquipes()` : sauvegarder la proposition originale
  - Après le `forEach(sansGroupe)` et avant `afficherEquipes()` :
    - `window.AppCore.propositionOriginale = JSON.parse(JSON.stringify(window.AppCore.equipes));`
    - `window.AppCore.historiquePropositions = [_signatureEquipes(window.AppCore.equipes)];`

- [x] **`assets/js/teams.js`**  nouvelle fonction `autreProposition()`
  - **Garde** : si `!window.AppCore.propositionOriginale` ou `propositionOriginale.length < 2` → toast "Aucune alternative disponible", return
  - **Boucle max 10 tentatives** pour trouver une configuration unique :
    1. Deep-copy `propositionOriginale` dans une variable locale `candidat`
    2. Construire la liste de swaps candidats :
       - Pour chaque paire d'équipes (i, j) avec i < j
       - Pour chaque joueur `a` de `candidat[i]` et joueur `b` de `candidat[j]`
       - Exclure les joueurs avec `groupe` non null/undefined
       - Vérifier `|a.niveau - b.niveau| ≤ 1`
       - Simuler le swap : recalculer la moyenne de chaque équipe après échange
       - Vérifier que la variation de moyenne par équipe reste ≤ 0.2 vs `propositionOriginale`
       - Si valide, stocker le candidat `{ i, j, idxA, idxB, deltaMoyenne }`
    3. Si aucun candidat → toast "Aucune alternative disponible", return
    4. Trier les candidats par `deltaMoyenne` ascending
    5. Sélectionner aléatoirement 1 à 3 swaps non conflictuels (un joueur ne peut être swappé qu'une fois)
    6. Appliquer les swaps sur `candidat`
    7. Générer la signature via `_signatureEquipes(candidat)`
    8. Si signature déjà dans `historiquePropositions` → recommencer (tentative suivante)
    9. Sinon → configuration unique trouvée, sortir de la boucle
  - **Si 10 tentatives échouent** → toast "Toutes les variantes proches ont été explorées", return
  - **Appliquer** la configuration retenue :
    - Recalculer pour chaque équipe : `niveauTotal`, `meilleurNiveau`, tous les compteurs de postes (`avant`, `arriere`, `ailier`, `centre`, `pivot`, `arr_centre`, `indifferent`)
    - Stocker dans `window.AppCore.equipes`
    - Ajouter la signature dans `window.AppCore.historiquePropositions`
    - Mettre `window.AppCore.sessionValidee = null`
    - Vider `resultatsContainer` si existant
    - Appeler `afficherEquipes()`

- [x] **`assets/js/teams.js`**  dans `autreProposition()`, gérer la résolution du poste `indifferent` après swap
  - Quand un joueur avec poste original `indifferent` arrive dans une nouvelle équipe, recalculer son poste résolu (`avant` ou `arriere`) en fonction de la composition de l'équipe cible
  - Mettre à jour le compteur de poste de l'équipe source (décrémenter l'ancien poste) et de l'équipe cible (incrémenter le nouveau poste)

- [x] **`assets/js/teams.js`**  modifier `afficherEquipes()` : ajouter le bouton "Autre proposition"
  - Localiser le bloc `if (!window.AppCore.sessionValidee)` qui génère le bouton "Valider cette soirée"
  - Remplacer le `<div>` wrapper par un conteneur flex : `<div class="equipes-actions">`
  - Ajouter le bouton "Autre proposition" avec icône `shuffle` :
    ```html
    <button onclick="window.AppTeams.autreProposition()" class="btn btn-secondary" style="font-size: 16px; padding: 14px 32px;">
        <span class="material-icons">shuffle</span>
        Autre proposition
    </button>
    ```
  - Le bouton "Valider cette soirée" reste inchangé à côté
  - Les deux boutons sont dans le même conteneur `.equipes-actions`

- [x] **`assets/js/teams.js`**  modifier `changerEquipe()` : invalider le mécanisme de proposition
  - Après le déplacement manuel d'un joueur, ajouter :
    - `window.AppCore.propositionOriginale = null;`
    - `window.AppCore.historiquePropositions = [];`
  - Effet : le bouton "Autre proposition" disparaît au prochain `afficherEquipes()` car `propositionOriginale` est null

- [x] **`assets/js/teams.js`**  ajouter `autreProposition` dans l'export `window.AppTeams = { … }`

- [x] **`assets/css/components.css`**  ajouter le style du conteneur d'actions équipes
  ```css
  .equipes-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  ```

### Points d'attention

- **Pas de dérive** : chaque alternative repart de `propositionOriginale`, jamais de la proposition courante. Empêche l'accumulation de micro-variations qui pourraient déséquilibrer les équipes.
- **Boucle infinie** : la limite de 10 tentatives et le toast informatif couvrent le cas où le pool de swaps est trop restreint (peu de joueurs, niveaux très hétérogènes).
- **1 seule équipe** : si `propositionOriginale.length < 2`, aucun swap possible. La garde en entrée de `autreProposition()` le couvre.
- **Résolution `indifferent`** : un joueur `indifferent` qui change d'équipe doit voir son poste résolu recalculé selon la composition de l'équipe cible. Les compteurs de poste des deux équipes doivent être mis à jour.
- **`changerEquipe()` invalide** : tout déplacement manuel rend `propositionOriginale` obsolète. Réinitialiser les deux variables et cacher le bouton empêche des alternatives incohérentes.
- **Signature indépendante de l'ordre des équipes** : trier les strings d'équipes entre elles, pas seulement les joueurs à l'intérieur. Sinon deux configurations identiques avec des équipes permutées seraient vues comme différentes.
- **Pas de test unitaire explicite dans ce plan** : envisager d'ajouter des tests pour `_signatureEquipes()` et `autreProposition()` avec données mockées dans une future section tests.
- **Performance** : la double boucle sur les paires de joueurs est O(n² × k²) avec k = nb joueurs/équipe. Acceptable pour ≤ 30 joueurs / 4 équipes mais non optimisée au-delà.

---

## 12. Bugfix "Autre proposition" — correctifs post code-review

**Contexte** : code-review de la §11 — 2 bugs MAJOR (M1, M2) et 3 MINOR (m1, m2, m3) identifiés dans `assets/js/teams.js`.

**Décisions validées** :
- Tous les correctifs portent sur `assets/js/teams.js`, fonction `autreProposition()` et `afficherEquipes()`
- Ordre d'application : M2+m1 → M1 → m2 → m3
- Aucun nouveau fichier, aucun nouvel export, aucune modification de schéma DB

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `assets/js/teams.js` | Correctifs M1, M2, m1, m2, m3 dans `autreProposition()` et `afficherEquipes()` |

### Tâches

- [x] **M2 — `autreProposition()` : corriger la résolution du poste `indifferent` après swap**
  - Les variables `origA` / `origB` lisent le poste depuis `propositionOriginale`, qui contient déjà des postes résolus (`avant`/`arriere`) et jamais `indifferent`
  - Remplacer les lookups `origA = window.AppCore.propositionOriginale[swap.i].joueurs[swap.idxA]` et `origB = ...` par des lookups dans `window.AppCore.joueurs` via l'ID du joueur :
    ```js
    const origA = window.AppCore.joueurs.find(x => x.id === joueurA.id);
    const origB = window.AppCore.joueurs.find(x => x.id === joueurB.id);
    ```
  - Utiliser `origB.poste === 'indifferent'` et `origA.poste === 'indifferent'` pour les conditions de re-résolution
  - Concerne les deux blocs de résolution `indifferent` après `candidat[swap.i].joueurs[swap.idxA] = { ...joueurB }` et `candidat[swap.j].joueurs[swap.idxB] = { ...joueurA }`

- [x] **m1 — `autreProposition()` : supprimer les conditions `if` externes mortes**
  - Les deux outer `if` autour de la re-résolution `indifferent` :
    - `if (origB.poste === 'indifferent' || joueurB.poste === 'avant' || joueurB.poste === 'arriere')`
    - `if (origA.poste === 'indifferent' || joueurA.poste === 'avant' || joueurA.poste === 'arriere')`
  - Ces conditions sont toujours vraies (tout joueur a un poste parmi ces valeurs ou d'autres qui sont couvertes) et masquent la vraie logique
  - Supprimer ces deux `if` externes, ne conserver que les `if (origB.poste === 'indifferent')` et `if (origA.poste === 'indifferent')` internes
  - **Appliquer en même temps que M2** car même bloc de code

- [x] **M1 — `autreProposition()` : ajouter une validation cumulative de moyenne après application des swaps**
  - Après la boucle `for (const swap of choisis) { … }` (application des swaps) et **avant** le check de signature `_signatureEquipes(candidat)` :
  - Insérer un bloc de validation :
    ```js
    // Validation cumulative : toutes les moyennes doivent rester dans ±0.2
    let moyennesOk = true;
    for (let e = 0; e < candidat.length; e++) {
        const moy = candidat[e].joueurs.length > 0
            ? candidat[e].joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0) / candidat[e].joueurs.length
            : 0;
        if (Math.abs(moy - moyennesOriginales[e]) > 0.2) {
            moyennesOk = false;
            break;
        }
    }
    if (!moyennesOk) continue;
    ```
  - Ce bloc couvre le cas où 2–3 swaps individuellement valides produisent une dérive cumulative dépassant le seuil ±0.2 sur une équipe

- [x] **m2 — `autreProposition()` : unifier le check `groupe` avec `creerEquipes()`**
  - Ligne actuelle : `if (a.groupe != null || b.groupe != null) continue;`
  - Remplacer par : `if (a.groupe || b.groupe) continue;`
  - Aligne le comportement avec `creerEquipes()` qui utilise un truthy check (`if (j.groupe)`)
  - Empêche aussi le cas `groupe === 0` (qui serait falsy) de casser la logique — cohérent car `0` n'est pas un numéro de groupe valide

- [x] **m3 — `afficherEquipes()` : corriger la faille XSS sur `joueursIgnores`**
  - Ligne actuelle dans le bloc `if (scoresObj[idx].joueursIgnores.length > 0)` :
    ```js
    scoresObj[idx].joueursIgnores.map(j => j.nom).join(', ')
    ```
  - Remplacer par :
    ```js
    scoresObj[idx].joueursIgnores.map(j => window.AppCore.escapeHtml(j.nom)).join(', ')
    ```
  - Les noms de joueurs dans le reste de `afficherEquipes()` sont déjà échappés via `window.AppCore.escapeHtml(j.nom)` — ce point était un oubli isolé

### Points d'attention

- **M2 dépend de `window.AppCore.joueurs`** : ce tableau contient les joueurs actifs ET inactifs chargés pour le club courant. Un joueur actif participant aux équipes y sera toujours présent. Pas de risque de `find()` retournant `undefined` tant que les données sont cohérentes.
- **M1 — Ordre d'insertion** : le bloc de validation cumulative doit se trouver APRÈS la boucle d'application des swaps et la résolution `indifferent`, mais AVANT le calcul de signature. Le `continue` renvoie à la boucle `for (let tentative ...)`.
- **m1 — Ne pas supprimer les blocs internes** : seules les conditions `if` _externes_ sont mortes. Les blocs `if (origX.poste === 'indifferent')` internes restent indispensables.
- **m2 — Valeur `0`** : `groupe === 0` est théoriquement possible en DB (INTEGER). Le truthy check le traite comme "pas de groupe", cohérent avec le reste du code.
- **m3 — Surface XSS limitée** : les noms sont saisis par l'utilisateur ou importés via CSV. Le risque est réel en contexte multi-utilisateur (Supabase partagé).
- **Pas de test unitaire ajouté dans ce plan** : les correctifs portent sur de la logique interne de `autreProposition()` difficile à tester unitairement sans mock complet. Envisager un test d'intégration dans une future section.

---

## 13. Score compétitif, optimisation SA et onglet "Comment ça marche"

**Décisions validées** :
- Deux méthodes de constitution : `scoreCompetitif` (par défaut, recommandé) et `niveauTotal` (ancien comportement)
- `scoreEquipe()` extrait hors de `afficherEquipes()` → fonction de module, exportée dans `window.AppTeams`
- Optimisation par recuit simulé (SA, 400 itérations) en post-greedy, uniquement en mode `scoreCompetitif`
- `autreProposition()` simplifié : remplacement de la validation par moyennes (±0.2) par validation par écart-type (≤ 110% de l'original), tentatives portées à 30
- Sélecteur de méthode visible admin uniquement, masqué via `appliquerPermissionsUI()`
- Nouvel onglet "Comment ça marche" accessible à tous, contenu bilingue FR/EN
- Fonctions privées préfixées `_` : `_ecartTypeScores`, `_optimiserEquipes` — non exportées

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `assets/js/core.js` | Ajout `methodeConstitution` dans état global + export |
| `assets/js/teams.js` | Extraction `scoreEquipe`, ajout SA (`_ecartTypeScores`, `_optimiserEquipes`), refactor `creerEquipes` et `autreProposition`, export |
| `index.html` | Sélecteur radio méthode, 4e onglet, section `#section-algorithme` |
| `assets/js/ui.js` | Masquage sélecteur non-admin, branchement onglet algorithme, contenu bilingue, exports |
| `assets/css/components.css` | Styles `.algo-section`, `.algo-block`, `.algo-formula`, `.lang-switch` |

### Tâches

**Étape 0 — `assets/js/core.js`**

- [x] **0.1** Ajouter `let methodeConstitution = 'scoreCompetitif';` dans le bloc de variables globales (après `historiquePropositions`)
- [x] **0.2** Ajouter `methodeConstitution` dans l'objet `window.AppCore = { … }` (export)

**Étape 1 — `assets/js/teams.js`** *(implémenter 1.1→1.9 en un seul passage pour éviter la dérive de lignes)*

- [x] **1.1** Extraire `scoreEquipe(equipe)` de l'intérieur de `afficherEquipes()` (actuellement lignes ~106-135) vers le module level, après `_signatureEquipes`, avant `creerEquipes()`
- [x] **1.2** Supprimer la définition locale de `scoreEquipe` à l'intérieur de `afficherEquipes()` — les appels `scoreEquipe(e)` dans `afficherEquipes` utiliseront automatiquement la version module-level
- [x] **1.3** Ajouter `_ecartTypeScores(equipes)` après `scoreEquipe` — calcule l'écart-type des scores compétitifs (mesure du déséquilibre global)
- [x] **1.4** Ajouter `_optimiserEquipes(equipes)` après `_ecartTypeScores` — recuit simulé 400 itérations, respecte les groupes, re-résout les postes `indifferent`, recalcule `niveauTotal` et `meilleurNiveau` des équipes swappées
- [x] **1.5** Dans `creerEquipes()` : remplacer les **deux** `window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal)` (tri groupes ~ligne 59, tri sansGroupe ~ligne 75) par un tri conditionnel : si `methodeConstitution === 'scoreCompetitif'`, trier par `scoreEquipe().score` avec cache `Map` ; sinon conserver `niveauTotal`
- [x] **1.6** Dans `creerEquipes()` : insérer l'appel `window.AppCore.equipes = _optimiserEquipes(window.AppCore.equipes)` après la distribution sansGroupe et **avant** `propositionOriginale = JSON.parse(...)` (~ligne 87), conditionné sur `methodeConstitution === 'scoreCompetitif'`
- [x] **1.7** Refactorer `autreProposition()` — remplacer `moyennesOriginales` par `const ecartOriginal = _ecartTypeScores(window.AppCore.propositionOriginale)` (calculé une fois avant la boucle `for tentative`)
- [x] **1.8** Refactorer `autreProposition()` — dans la boucle de construction des swaps candidats : supprimer les 10 lignes de simulation de moyenne (`totalI`, `totalJ`, `nbI`, `nbJ`, `newTotalI`, `newTotalJ`, `newMoyI`, `newMoyJ`, les deux `if (Math.abs(...) > 0.2) continue`, `deltaMoyenne`). Conserver uniquement les filtres `groupe` et `|niveau diff| ≤ 1`. Supprimer `deltaMoyenne` de `swaps.push(...)` → `swaps.push({ i, j, idxA, idxB })`
- [x] **1.9** Refactorer `autreProposition()` — remplacer le bloc de validation cumulative par moyennes (7 lignes `moyennesOk`) par : `if (_ecartTypeScores(candidat) > ecartOriginal * 1.1) continue;`
- [x] **1.10** Refactorer `autreProposition()` — augmenter la boucle de tentatives de 10 à 30
- [x] **1.11** Ajouter `scoreEquipe` dans l'export `window.AppTeams = { … }` (ne PAS exporter `_ecartTypeScores` ni `_optimiserEquipes`)

**Étape 2 — `index.html`**

- [x] **2.1** Dans la `<div class="form-grid">` de la carte "Composition des Équipes" (après l'input `nombreEquipes`, avant le bouton `creerBtn`) : ajouter le bloc radio `<div class="input-group" id="methodeConstitutionGroup">` avec 2 labels radio (`scoreCompetitif` checked, `niveauTotal`) et `onchange="window.AppCore.methodeConstitution = this.value"`
- [x] **2.2** Dans `<nav class="tab-bar">` : ajouter `<button class="tab-btn" data-tab="algorithme">ℹ️ Comment ça marche</button>` après le bouton Stats
- [x] **2.3** Après `<div id="section-stats" class="tab-section">…</div>` et avant la fermeture de `</div>` conteneur : ajouter `<div id="section-algorithme" class="tab-section"><div id="algorithmeContainer"></div></div>`

**Étape 3 — `assets/js/ui.js`**

- [x] **3.1** Dans `appliquerPermissionsUI()` : ajouter à la fin `const methodeGroup = document.getElementById('methodeConstitutionGroup'); if (methodeGroup) methodeGroup.style.display = canViewNiveaux ? '' : 'none';`
- [x] **3.2** Dans `switchTab(tabName)` : ajouter `if (tabName === 'algorithme') window.AppUI.afficherAlgorithme();` après les blocs `historique` et `stats`
- [x] **3.3** Ajouter `let _langAlgo = 'fr';` en début de fichier (après commentaires d'en-tête, avant les fonctions)
- [x] **3.4** Ajouter la fonction `afficherAlgorithme()` avant `attachEventListeners()` — contenu bilingue FR/EN dans un objet `contenus`, génère le HTML dans `#algorithmeContainer`, inclut switch langue FR/EN via checkbox toggle
- [x] **3.5** Ajouter la fonction `toggleLangAlgo()` juste après `afficherAlgorithme()` — bascule `_langAlgo` et rappelle `afficherAlgorithme()`
- [x] **3.6** Ajouter `afficherAlgorithme` et `toggleLangAlgo` dans l'export `window.AppUI = { … }`

**Étape 4 — `assets/css/components.css`**

- [x] **4.1** Ajouter en fin de fichier le bloc `/* === ONGLET "COMMENT ÇA MARCHE" === */` avec les styles : `.algo-section`, `.algo-section h3`, `.algo-block`, `.algo-block--alt`, `.algo-formula`
- [x] **4.2** Ajouter dans le même bloc les styles du switch langue : `.lang-switch`, `.lang-switch input`, `.lang-switch__slider`, `.lang-switch__slider::before`, `.lang-switch input:checked + .lang-switch__slider`, `.lang-switch input:checked + .lang-switch__slider::before`

### Points d'attention

- **Dérive de lignes** : les tâches 1.1→1.11 modifient toutes `teams.js` — les implémenter en un seul passage séquentiel ; ne pas se fier aux numéros de lignes entre deux tâches
- **Shadowing `scoreEquipe`** : après 1.1 + 1.2, vérifier qu'il ne reste AUCUNE définition locale de `scoreEquipe` dans `afficherEquipes()` ; une définition locale masquerait la version module-level dans cette portée
- **Compteurs de postes après SA** : `_optimiserEquipes` recalcule `niveauTotal` et `meilleurNiveau` mais PAS les compteurs de postes par équipe (`avant`, `arriere`, etc.). Ce n'est pas bloquant car `afficherEquipes()` lit les postes depuis `joueur.poste` et `autreProposition()` recalcule tous les compteurs en fin de traitement. Toutefois, `changerEquipe()` ne les recalcule pas non plus — incohérence pré-existante, hors périmètre de cette feature
- **4e onglet sur mobile** : la `tab-bar` passe de 3 à 4 boutons — vérifier visuellement que les labels ne sont pas tronqués sous 400px ; si besoin, raccourcir le texte en `ℹ️ Algo` dans `responsive.css` (hors périmètre, à valider visuellement)
- **Encodage UTF-8** : les contenus FR/EN dans `afficherAlgorithme()` contiennent des accents et le symbole `Σ` — s'assurer que `ui.js` est bien sauvegardé en UTF-8 (pas ANSI)
- **Onglet algorithme accessible à tous** : ne PAS ajouter de vérification `canViewNiveaux` dans `switchTab` pour cet onglet — seul le sélecteur de méthode est masqué pour les non-admins
- **Fichiers hors périmètre** : ne modifier AUCUN fichier dans `.claude/worktrees/` — travailler uniquement dans la racine du workspace
- **Pas de test unitaire** dans ce plan : `scoreEquipe` étant désormais exporté, un test pourra être ajouté dans une future section `tests/tests.js`
- **Ordre d'implémentation** : 0 → 1 → 2 → 3 → 4 (les étapes 2-4 sont indépendantes entre elles mais toutes dépendent de l'étape 1 pour la cohérence fonctionnelle)

---

## 14. Vue Sélectionneur (`?mode=selecteur`)

**Décisions validées** :
- Le mode sélectionneur est activé par le paramètre URL `?mode=selecteur`
- Le sélectionneur peut toggler actif/inactif sur les joueurs
- Le drag & drop remplace le `prompt()` pour déplacer des joueurs entre équipes — pour tous les rôles (admin inclus)
- Le sélectionneur peut re-noter les résultats de matchs (onglet Historique accessible)
- L'onglet Stats est visible et accessible pour le sélectionneur, mais sans niveaux, historique de niveau, ni export CSV
- Restriction UI-only : la sécurité n'est pas renforcée côté Supabase (les niveaux restent dans les réponses API)
- Spec fonctionnelle complète : `docs/selecteur-fonctionnel.md`

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `assets/js/core.js` | Lecture `?mode=selecteur` → `currentRole`, ajout `isSelecteur()`, export |
| `assets/js/storage.js` | Early return dans `chargerProfilUtilisateur()` si mode selecteur |
| `index.html` | Ajout `id` sur les cartes Saisie Joueurs et Import/Export |
| `assets/js/ui.js` | `appliquerPermissionsUI()` étendu, `switchTab()` modifié, `afficherJoueurs()` mode lecture seule, masquage tri niveau |
| `assets/js/teams.js` | Drag & drop remplace `prompt()` dans `changerEquipe()` / `afficherEquipes()` |
| `assets/js/sessions.js` | `afficherStats()` adapté, `afficherHistorique()` adapté, `exporterTout()` gardé |
| `assets/js/players.js` | Guards `isAdmin()` sur ajout/suppression/modification |
| `assets/js/clubs.js` | Affichage rôle dans status bar, forçage méthode constitution |
| `assets/css/components.css` | Styles drag & drop |

### Tâches

**Étape 0 — `assets/js/core.js` (rôle depuis URL)**

- [x] **0.1** Lire `?mode=selecteur` depuis `window.location.search` au top-level (après la déclaration de `currentRole`)
  - Si `new URLSearchParams(window.location.search).get('mode') === 'selecteur'`, alors `currentRole = 'selecteur'`
  - Sinon, conserver la valeur par défaut `'admin'`
  - Placer ce code AVANT l'export `window.AppCore` pour que la valeur soit disponible dès le chargement

- [x] **0.2** Ajouter la fonction `isSelecteur()` après `isAdmin()`
  - `function isSelecteur() { return window.AppCore.currentRole === 'selecteur'; }`

- [x] **0.3** Ajouter `isSelecteur` dans l'export `window.AppCore = { … }`

**Étape 1 — `assets/js/storage.js` (préservation du rôle URL)**

- [x] **1.1** Dans `chargerProfilUtilisateur()`, ajouter un early return en tout début de fonction (avant le try/catch existant) :
  ```js
  if (window.AppCore.currentRole === 'selecteur') {
      window.AppCore.currentUser = null;
      return { role: 'selecteur', user: null };
  }
  ```
  - Empêche `chargerProfilUtilisateur()` de réécrire `currentRole` à `'admin'` quand il n'y a pas de session auth

**Étape 2 — `index.html` (IDs sur les cartes)**

- [x] **2.1** Ajouter `id="saisieJoueursCard"` sur le `<div class="card">` qui contient "Saisie des Joueurs" (actuellement ligne ~62)
  - `<div class="card" id="saisieJoueursCard">`

- [x] **2.2** Ajouter `id="importExportCard"` sur le `<div class="card">` qui contient "Import / Export et Actions" (actuellement ligne ~165)
  - `<div class="card" id="importExportCard">`

**Étape 3 — `assets/js/ui.js` (permissions UI — partie la plus volumineuse)**

- [x] **3.1** `appliquerPermissionsUI()` : masquer la carte de saisie joueurs si !isAdmin
  - Ajouter : `const saisieCard = document.getElementById('saisieJoueursCard'); if (saisieCard) saisieCard.style.display = window.AppCore.isAdmin() ? '' : 'none';`

- [x] **3.2** `appliquerPermissionsUI()` : masquer la carte Import/Export entière si !isAdmin
  - Ajouter : `const importExportCard = document.getElementById('importExportCard'); if (importExportCard) importExportCard.style.display = window.AppCore.isAdmin() ? '' : 'none';`
  - Le bouton Sync (s'il existe séparément) doit rester visible — vérifier qu'il n'est pas dans cette carte

- [x] **3.3** `appliquerPermissionsUI()` : rendre l'onglet Stats visible pour le sélectionneur
  - Modifier le bloc `statsTabBtn` existant : remplacer `statsTabBtn.style.display = canViewNiveaux ? '' : 'none'` par une logique qui masque uniquement si le rôle l'exclut explicitement
  - Le sélectionneur n'a PAS `canViewNiveaux()` mais doit quand même VOIR l'onglet Stats
  - Condition : `statsTabBtn.style.display = (window.AppCore.isAdmin() || window.AppCore.isSelecteur()) ? '' : 'none'`

- [x] **3.4** `switchTab()` : retirer le bloc en tête de fonction qui bloque l'accès Stats pour non-admin
  - Supprimer les lignes `if (tabName === 'stats' && window.AppCore.canViewNiveaux && !window.AppCore.canViewNiveaux()) { … tabName = 'gestion'; }`
  - L'accès Stats est désormais contrôlé par la visibilité du bouton onglet (tâche 3.3), pas par un guard dans switchTab

- [x] **3.5** `appliquerPermissionsUI()` : masquer entièrement le bouton tri-par-niveau si !canViewNiveaux
  - Remplacer le bloc `triNiveauBtn` existant qui utilise `disabled` + `opacity` par un simple `display: none` quand `!canViewNiveaux`
  - Le bouton tri-niveau ne doit pas apparaître du tout (pas de bouton grisé visible)

- [x] **3.6** `afficherJoueurs()` : mode lecture seule pour les champs si !isAdmin
  - Quand `!window.AppCore.isAdmin()` :
    - Nom : remplacer `<input type="text">` par un `<span>` contenant le nom (non éditable)
    - Poste : remplacer `<select>` par un `<span>` affichant le poste en texte (non éditable)
    - Groupe : remplacer `<input type="number">` par un `<span>` affichant le groupe ou vide (non éditable)
    - Niveau : ne pas afficher du tout le champ (ni input, ni badge "Masqué") — il est déjà masqué via `canViewNiveaux`, mais confirmer que la section entière disparaît, pas un badge
    - Bouton delete : ne pas rendre le bouton `<button class="btn btn-danger">` du tout
    - Checkbox actif : RESTER éditable (le sélectionneur peut toggler actif/inactif)

- [x] **3.7** `afficherJoueurs()` : ajuster le rendu du badge "Masqué" pour le mode sélectionneur
  - Actuellement, quand `!canViewNiveaux`, le niveau affiche un badge "Masqué" — remplacer par un masquage total (`display:none` ou ne pas générer le HTML du tout)
  - Le sélectionneur ne doit pas savoir qu'un champ niveau existe

**Étape 4 — `assets/js/teams.js` (Drag & Drop)**

- [x] **4.1** Dans `afficherEquipes()` : ajouter `draggable="true"` sur chaque `<li class="team-player">`
  - Modifier le template literal : `<li class="team-player" draggable="true" data-equipe="${idx}" data-joueur="${e.joueurs.indexOf(j)}">`
  - Supprimer le `onclick="window.AppTeams.changerEquipe(…)"` existant sur le `<li>`

- [x] **4.2** Dans `afficherEquipes()` : ajouter un attribut `data-equipe="${idx}"` sur chaque `.team-card`
  - Modifier le template literal : `<div class="team-card" data-equipe="${idx}">`

- [x] **4.3** Dans `afficherEquipes()` : après `container.innerHTML = html`, attacher les événements drag & drop via delegation ou boucle manuelle
  - **dragstart** sur chaque `.team-player[draggable]` : `e.dataTransfer.setData('text/plain', JSON.stringify({ equipeIdx, joueurIdx }))`, ajouter classe `.dragging`
  - **dragend** sur chaque `.team-player[draggable]` : retirer classe `.dragging`
  - **dragover** sur chaque `.team-card` : `e.preventDefault()`, ajouter classe `.drag-over`
  - **dragleave** sur chaque `.team-card` : retirer classe `.drag-over`
  - **drop** sur chaque `.team-card` : `e.preventDefault()`, retirer `.drag-over`, lire source depuis `dataTransfer`, déterminer l'équipe cible via `e.currentTarget.dataset.equipe`, appeler la logique de déplacement existante de `changerEquipe()`

- [x] **4.4** Refactorer `changerEquipe()` : extraire la logique de déplacement dans une sous-fonction ou adapter la signature
  - Actuellement `changerEquipe(equipeIdx, joueurIdx)` utilise un `prompt()` pour lire la destination
  - Remplacer le `prompt()` : la fonction reçoit directement `equipeIdx` (source), `joueurIdx`, et le `numEquipe` (cible) depuis le handler `drop`
  - Nouvelle signature possible : `changerEquipe(equipeIdxSource, joueurIdx, equipeIdxCible)`
  - Supprimer le `prompt()` et le `parseInt()` associé
  - Conserver toute la logique existante : splice, push, recalcul `niveauTotal`, invalidation `propositionOriginale`, invalidation `sessionValidee`, appel `afficherEquipes()`

- [x] **4.5** S'assurer que le drag & drop fonctionne pour admin ET sélectionneur (pas de guard `isAdmin()` sur le drop)

**Étape 5 — `assets/js/sessions.js` (Stats et Historique)**

- [x] **5.1** `afficherStats()` : supprimer le guard `canViewNiveaux` en tête de fonction
  - Retirer le bloc L1199-1204 qui fait `showToast('Stats reservees admin')` et redirige vers `gestion`
  - L'onglet Stats est désormais accessible au sélectionneur

- [x] **5.2** `afficherStats()` : masquer le bouton "Exporter CSV" quand `!canViewNiveaux`
  - Conditionner le rendu du bouton export CSV dans le HTML généré : `if (canViewNiveaux) { … bouton Exporter CSV … }`
  - NB : La variable `canViewNiveaux` existe déjà ou doit être évaluée en tête de `afficherStats()`

- [x] **5.3** `afficherStats()` : masquer le toggle `▼` d'historique de niveau quand `!canViewNiveaux`
  - Ne pas rendre le `<span class="history-toggle">▼</span>` si `!canViewNiveaux`
  - Ne pas rendre les lignes `<tr>` d'historique de niveau repliées si `!canViewNiveaux`
  - Ne pas ajouter le `onclick` de toggle sur les `<tr>` de stats si `!canViewNiveaux`
  - Les lignes du tableau restent cliquables pour rien (pas de toggle), ou retirer le curseur `pointer`

- [x] **5.4** `afficherHistorique()` : masquer le bouton "Supprimer session" quand `!isAdmin()`
  - Conditionner le rendu du bouton trash/supprimer dans le HTML généré par `afficherHistorique()`
  - Le bouton "Modifier résultats" reste visible pour le sélectionneur (décision validée)

- [x] **5.5** `exporterTout()` : ajouter un guard `isAdmin()` en tête de fonction
  - `if (!window.AppCore.isAdmin()) { window.AppCore.showToast('Export reserve admin', true); return; }`
  - Défense en profondeur : même si le bouton est masqué, la fonction doit refuser l'exécution

**Étape 6 — `assets/js/players.js` (Guards CRUD)**

- [x] **6.1** `ajouterJoueur()` : ajouter un guard en tête de fonction
  - `if (!window.AppCore.isAdmin()) { window.AppCore.showToast('Ajout reserve admin', true); return; }`

- [x] **6.2** `supprimerJoueur()` : ajouter un guard en tête de fonction
  - `if (!window.AppCore.isAdmin()) { window.AppCore.showToast('Suppression reservee admin', true); return; }`

- [x] **6.3** `modifierJoueur()` : ajouter un guard pour les champs autres que `actif`
  - Avant le code existant (après le check `!joueur`) : `if (!window.AppCore.isAdmin() && champ !== 'actif') { window.AppCore.showToast('Modification reservee admin', true); if (window.afficherJoueurs) window.afficherJoueurs(); return; }`
  - Le sélectionneur peut modifier uniquement le champ `actif` (toggler actif/inactif)

**Étape 7 — `assets/js/clubs.js` (init et forçage méthode)**

- [x] **7.1** `init()` : afficher le rôle `selecteur` dans la status bar
  - Modifier le `roleTag` existant : ajouter le cas `'selecteur'`
  - `const roleTag = window.AppCore.currentRole === 'admin' ? 'admin' : (window.AppCore.currentRole === 'selecteur' ? 'selecteur' : 'operateur');`

- [x] **7.2** `init()` : si `!isAdmin()`, forcer `methodeConstitution = 'scoreCompetitif'`
  - Après `chargerProfilUtilisateur()` et avant `chargerJoueurs()` : `if (!window.AppCore.isAdmin()) window.AppCore.methodeConstitution = 'scoreCompetitif';`
  - Le sélectionneur ne voit pas le sélecteur de méthode (masqué en 3.2/appliquerPermissionsUI) mais l'algorithme doit quand même utiliser la bonne méthode

**Étape 8 — `assets/css/components.css` (Drag & Drop)**

- [x] **8.1** Ajouter le style `cursor: grab` pour les éléments draggable
  - `.team-player[draggable="true"] { cursor: grab; }`

- [x] **8.2** Ajouter le style de l'élément en cours de drag
  - `.team-player.dragging { opacity: 0.4; background: #e3f2fd; }`

- [x] **8.3** Ajouter le style de la zone de drop
  - `.team-card.drag-over { border: 2px dashed #1976d2; background: rgba(25, 118, 210, 0.05); }`

### Points d'attention

- **Ordre d'exécution critique** : `core.js` lit `?mode=selecteur` au top-level et fixe `currentRole` AVANT que `storage.js` ne soit chargé. Puis `chargerProfilUtilisateur()` dans `init()` est court-circuité par le early return (tâche 1.1). Si le early return est manqué, le rôle sera écrasé à `'admin'` (car pas de session auth → fallback admin dans `chargerProfilUtilisateur`).
- **Sécurité UI-only** : les niveaux sont toujours retournés par l'API Supabase (RLS ouvert). Un utilisateur technique peut lire les niveaux via DevTools/Network. La spec accepte cette limitation. Pour une vraie sécurité, il faudrait une colonne-level RLS ou des vues PostgreSQL filtrées — hors périmètre.
- **Drag & drop mobile** : les événements `dragstart`/`dragover`/`drop` ne fonctionnent PAS nativement sur les appareils tactiles (iOS, Android). Un polyfill touch → drag (ex: `mobile-drag-drop` ou listeners `touchstart`/`touchmove`/`touchend` custom) sera nécessaire dans un futur plan. À défaut, le sélectionneur sur mobile ne pourra pas déplacer de joueurs entre équipes.
- **Admin aussi en drag & drop** : le plan remplace `prompt()` par DnD pour tous les rôles. L'admin perd la possibilité de taper un numéro d'équipe. Vérifier que ce n'est pas une régression UX (équipes nombreuses → DnD peut être plus long que prompt).
- **Badge "Masqué" vs masquage total** : actuellement `!canViewNiveaux` affiche un badge "Masqué" dans la player card. La spec demande que le sélectionneur ne sache même pas qu'un champ niveau existe → masquer toute la zone (tâches 3.6 et 3.7). Ce changement impacte aussi le layout vertical de la player card si le champ niveau occupait de la place.
- **`afficherStats()` dual-mode** : la garde actuelle redirige vers gestion si `!canViewNiveaux`. La supprimer (tâche 5.1) permet au sélectionneur d'accéder aux stats. Mais `calculerStats()` utilise `session_players.niveau` pour `historiqueNiveau` — ces données sont dans la réponse API. Côté rendu, s'assurer que `afficherStats()` n'injecte aucune valeur numérique de niveau dans le DOM quand `!canViewNiveaux`.
- **Historique de niveau dans Stats** : `calculerStats()` construit `historiqueNiveau[]` pour chaque joueur. Quand `!canViewNiveaux`, `afficherStats()` ne doit pas rendre les lignes d'historique (tâche 5.3) ni le toggle `▼`. Toutefois, `calculerStats()` continue de calculer ces données — c'est acceptable car elles ne transitent pas vers le DOM.
- **Cohérence tri-niveau masqué** : la tâche 3.5 masque le bouton tri-niveau en `display:none` au lieu de le griser. Cela change le layout du `.tri-toggle` (un seul bouton visible au lieu de deux). Vérifier visuellement que le bouton "A → Z" seul n'a pas un rendu bizarre (il occupe potentiellement toute la largeur).
- **`changerEquipe()` signature breaking** : la tâche 4.4 change la signature de `changerEquipe()`. Si un autre fichier appelle `changerEquipe(equipeIdx, joueurIdx)` avec 2 args, il faudra le mettre à jour. Vérifier qu'aucun autre caller n'existe (grep confirmé : seul `teams.js` l'appelle via onclick inline, qui est supprimé en 4.1).
- **Export `window.AppTeams`** : aucun nouvel export n'est nécessaire — `changerEquipe` est déjà exporté, sa signature change mais le nom reste.
- **Tests** : aucun test unitaire dans ce plan. Envisager d'ajouter ultérieurement : test que `isSelecteur()` retourne `true` avec `?mode=selecteur`, test que `modifierJoueur('actif')` fonctionne en mode sélectionneur, test que `modifierJoueur('niveau')` est bloqué.
- **`methodeConstitution` default** : actuellement `'niveauTotal'` dans `core.js` (ligne 29). Le forçage en 7.2 écrase cette valeur pour le sélectionneur. Le sélecteur HTML dans `index.html` a `niveauTotal` en selected → comme le sélecteur est masqué, pas d'incohérence visuelle.
- **Import/Export vs Sync** : la tâche 3.2 masque la carte Import/Export entière. Vérifier si le bouton Sync (synchroniser) est dans cette carte ou ailleurs. S'il est dans la carte, il faut soit le sortir de la carte, soit ne masquer que les boutons individuels. Le plan original mentionne "keep only syncBtn" — à vérifier dans le HTML.

---

## 15. Protection admin par mot de passe + reset email

**Décisions validées** :
- L'accès admin est protégé par un mot de passe vérifié côté serveur via RPC Supabase (`check_admin_password`)
- Toutes les opérations sensibles (hash, vérification, reset) sont en `SECURITY DEFINER` — aucun accès direct aux tables `admin_auth`, `password_reset_tokens`, `app_secrets` pour le rôle `anon`
- La réinitialisation du mot de passe passe par un code 6 chiffres envoyé par email via Resend (appel HTTP depuis `pg_net`)
- Le mode `?mode=selecteur` court-circuite l'authentification (pas de modale)
- `localStorage` (`ADMIN_AUTH_KEY`) persiste la session admin entre rechargements
- La détection URL du mode sélectionneur (actuellement inline dans `core.js`) est déplacée dans `init()` pour centraliser le flow d'authentification
- Mot de passe initial : `changeme` (à changer impérativement après déploiement)

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `supabase/step3_admin_password.sql` | **Nouveau fichier** — extensions, tables, RPC, RLS |
| `index.html` | Modale de login (2 étapes) + bouton logout |
| `assets/css/components.css` | Styles modale (overlay, box, steps, actions, link, info) |
| `assets/js/core.js` | Constante `ADMIN_AUTH_KEY`, suppression détection URL inline, default role `'selecteur'`, export |
| `assets/js/clubs.js` | Fonction `demanderAuthentification()`, refonte auth dans `init()`, export |
| `assets/js/storage.js` | Guard dans `chargerProfilUtilisateur()` pour ne pas écraser le rôle |
| `assets/js/ui.js` | Branchement logout, affichage/masquage bouton logout |

### Tâches

**Étape 1 — `supabase/step3_admin_password.sql` (nouveau fichier)**

- [x] **1.1** En-tête : commentaire d'instructions de setup (activer `pgcrypto` et `pg_net` dans le Dashboard Supabase avant exécution, créer un compte Resend, insérer la clé API dans `app_secrets`, changer le mot de passe par défaut)
- [x] **1.2** `CREATE EXTENSION IF NOT EXISTS pgcrypto;` et `CREATE EXTENSION IF NOT EXISTS pg_net;`
- [x] **1.3** Table `admin_auth` : `id integer PRIMARY KEY CHECK (id = 1)`, `password_hash text NOT NULL`, `updated_at timestamptz DEFAULT now()`. INSERT initial : `crypt('changeme', gen_salt('bf'))`
- [x] **1.4** RLS sur `admin_auth` : `ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;` — aucune policy pour `anon` (deny all)
- [x] **1.5** Table `password_reset_tokens` : `id serial PRIMARY KEY`, `code text NOT NULL`, `created_at timestamptz DEFAULT now()`, `expires_at timestamptz DEFAULT (now() + interval '15 minutes')`, `used boolean DEFAULT false`
- [x] **1.6** RLS sur `password_reset_tokens` : `ENABLE ROW LEVEL SECURITY;` — aucune policy pour `anon`
- [x] **1.7** Table `app_secrets` : `key text PRIMARY KEY`, `value text NOT NULL`. RLS enabled, aucune policy pour `anon`. L'utilisateur insère manuellement `INSERT INTO app_secrets VALUES ('resend_api_key', 're_...');`
- [x] **1.8** RPC `check_admin_password(pwd text) RETURNS boolean` : `SECURITY DEFINER`, `SET search_path = public`, compare `crypt(pwd, password_hash) = password_hash` sur la ligne `id = 1` de `admin_auth`. `GRANT EXECUTE ON FUNCTION check_admin_password TO anon;`
- [x] **1.9** RPC `request_password_reset() RETURNS text` : `SECURITY DEFINER`, génère un code 6 chiffres (`lpad(floor(random() * 1000000)::text, 6, '0')`), rate-limit (pas de token non-utilisé créé dans les 60 dernières secondes → sinon raise exception), insère dans `password_reset_tokens`, lit `resend_api_key` depuis `app_secrets`, appelle `net.http_post('https://api.resend.com/emails', ...)` avec JSON body (`to: bernardi_l@outlook.fr`, `from: onboarding@resend.dev`, `subject: Code de réinitialisation`), retourne `'ok'`. `GRANT EXECUTE TO anon;`
- [x] **1.10** RPC `reset_admin_password(code text, new_pwd text) RETURNS boolean` : `SECURITY DEFINER`, valide le code (exists, `used = false`, `expires_at > now()`), vérifie `length(new_pwd) >= 6` (sinon raise exception), met à jour `admin_auth.password_hash = crypt(new_pwd, gen_salt('bf'))`, marque le code `used = true`, retourne `true`. `GRANT EXECUTE TO anon;`

**Étape 2 — `index.html` (modale login + bouton logout)**

- [x] **2.1** Avant `</body>` (et avant les `<script>` tags) : ajouter le HTML de la modale `#loginModal`
  - `<div id="loginModal" class="modal-overlay" style="display:none">`
  - Contient `<div class="modal-box">`
  - **loginStep** (`<div id="loginStep" class="modal-step">`) : `<h2>Accès Administration</h2>`, input password `#loginPassword`, bouton submit `#loginSubmitBtn` (classe `btn btn-primary`), bouton annuler `#loginCancelBtn` (classe `btn btn-secondary`, texte "Continuer en sélectionneur"), lien "Mot de passe oublié ?" `#forgotPasswordLink` (classe `modal-link`)
  - **resetStep** (`<div id="resetStep" class="modal-step" style="display:none">`) : `<p class="modal-info">Un code a été envoyé par email</p>`, input text `#resetCode` (placeholder "Code à 6 chiffres"), input password `#resetNewPassword` (placeholder "Nouveau mot de passe"), input password `#resetConfirmPassword` (placeholder "Confirmer mot de passe"), bouton submit `#resetSubmitBtn` (classe `btn btn-primary`), bouton retour `#resetBackBtn` (classe `btn btn-secondary`)
- [x] **2.2** Dans `.club-selector`, après `#clubInfo` : ajouter `<button id="logoutBtn" class="btn btn-danger-outline" style="display:none" title="Déconnexion"><span class="material-icons">logout</span></button>`

**Étape 3 — `assets/css/components.css` (styles modale)**

- [x] **3.1** Ajouter le bloc `/* === MODALE LOGIN === */` en fin de fichier :
  - `.modal-overlay` : `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;`
  - `.modal-box` : `background: white; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);`
  - `.modal-box h2` : `margin: 0 0 20px; font-size: 20px; text-align: center;`
  - `.modal-step .input-group` : `margin-bottom: 16px;`
  - `.modal-step .input-group input` : `width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;`
  - `.modal-actions` : `display: flex; gap: 12px; margin-top: 20px;`
  - `.modal-actions .btn` : `flex: 1;`
  - `.modal-link` : `display: block; text-align: center; margin-top: 16px; color: #1976d2; font-size: 13px; cursor: pointer; text-decoration: underline;`
  - `.modal-info` : `background: #e3f2fd; color: #1565c0; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px;`

**Étape 4 — `assets/js/core.js` (constante + suppression inline URL + default role)**

- [x] **4.1** Ajouter `const ADMIN_AUTH_KEY = 'hockeySub_adminAuth';` après le bloc de constantes Supabase (après `SUPABASE_ANON_KEY`), avant les variables globales
- [x] **4.2** Changer `let currentRole = 'admin';` → `let currentRole = 'selecteur';` — le rôle admin sera attribué dynamiquement par le flow auth dans `init()`
- [x] **4.3** Supprimer les lignes de détection URL inline :
  ```js
  // Lecture du mode URL (vue sélectionneur)
  const _urlMode = new URLSearchParams(window.location.search).get('mode');
  if (_urlMode === 'selecteur') currentRole = 'selecteur';
  ```
  Cette logique est déplacée dans `init()` (tâche 5.2)
- [x] **4.4** Ajouter `ADMIN_AUTH_KEY` dans l'export `window.AppCore = { … }`

**Étape 5 — `assets/js/clubs.js` (authentification + refonte init)**

- [x] **5.1** Ajouter `async function demanderAuthentification()` avant `init()` :
  - Retourne une `Promise` qui se résout quand l'utilisateur s'est authentifié ou a annulé
  - Affiche `#loginModal` (`style.display = 'flex'`)
  - **loginSubmitBtn click** : lit `#loginPassword.value`, appelle `window.AppCore.supabaseClient.rpc('check_admin_password', { pwd })`, si `true` → `currentRole = 'admin'`, `localStorage.setItem(ADMIN_AUTH_KEY, 'ok')`, masquer modale, resolve ; si `false` → toast erreur, vider le champ password
  - **loginCancelBtn click** : masquer modale, `currentRole = 'selecteur'`, resolve
  - **forgotPasswordLink click** : appelle `supabaseClient.rpc('request_password_reset')`, si OK → masquer `#loginStep`, afficher `#resetStep` ; si erreur → toast erreur (rate limit ou autre)
  - **resetSubmitBtn click** : valide que `#resetCode` non vide, `#resetNewPassword.value === #resetConfirmPassword.value`, `length >= 6`, appelle `supabaseClient.rpc('reset_admin_password', { code, new_pwd })`, si `true` → toast succès, auto-login (appel `check_admin_password` avec `new_pwd`), `currentRole = 'admin'`, `localStorage.setItem(ADMIN_AUTH_KEY, 'ok')`, masquer modale, resolve ; si `false` → toast erreur
  - **resetBackBtn click** : masquer `#resetStep`, afficher `#loginStep`
  - **Enter key** : sur `#loginPassword` → trigger loginSubmitBtn click ; sur `#resetConfirmPassword` → trigger resetSubmitBtn click
  - **Disable pendant RPC** : désactiver `loginSubmitBtn` / `resetSubmitBtn` pendant l'appel, réactiver après

- [x] **5.2** Modifier `init()` : insérer le flow d'authentification entre `supabaseClient = createClient(...)` et `chargerProfilUtilisateur()` :
  1. `const urlMode = new URLSearchParams(window.location.search).get('mode');`
  2. Si `urlMode === 'selecteur'` → `window.AppCore.currentRole = 'selecteur'` (skip auth)
  3. Sinon si `localStorage.getItem(window.AppCore.ADMIN_AUTH_KEY) === 'ok'` → `window.AppCore.currentRole = 'admin'`
  4. Sinon → `await demanderAuthentification()`
  5. Continuer avec `chargerProfilUtilisateur()` et le reste d'`init()` existant

- [x] **5.3** Ajouter `demanderAuthentification` dans l'export `window.AppClubs = { … }`

**Étape 6 — `assets/js/storage.js` (préservation du rôle)**

- [x] **6.1** Dans `chargerProfilUtilisateur()`, modifier le fallback "no auth user" :
  - Ligne actuelle (dans le bloc `if (!user)`) : `window.AppCore.currentRole = 'admin';`
  - Remplacer par : `if (!window.AppCore.isSelecteur()) window.AppCore.currentRole = window.AppCore.currentRole;`
  - Ou plus simplement : ne pas toucher au rôle si déjà défini par le flow auth — supprimer la ligne `window.AppCore.currentRole = 'admin';` dans le bloc `if (!user)` et la remplacer par un commentaire expliquant que le rôle est déjà fixé par init()
  - Le bloc `if (!user)` doit se contenter de `return { role: window.AppCore.currentRole, user: null };`

**Étape 7 — `assets/js/ui.js` (logout + affichage bouton)**

- [x] **7.1** Dans `attachEventListeners()` : brancher `#logoutBtn`
  ```js
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
          localStorage.removeItem(window.AppCore.ADMIN_AUTH_KEY);
          location.reload();
      });
  }
  ```

- [x] **7.2** Dans `appliquerPermissionsUI()` : afficher/masquer `#logoutBtn` selon le rôle
  ```js
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.style.display = window.AppCore.isAdmin() ? '' : 'none';
  ```

### Points d'attention

- **Fallback offline** : si `supabaseClient` n'est pas disponible ou si le RPC `check_admin_password` échoue (réseau), accepter `localStorage` tel quel. Dans `demanderAuthentification()`, wraper l'appel RPC dans un try/catch : en cas d'erreur réseau, si `localStorage.getItem(ADMIN_AUTH_KEY) === 'ok'` → accorder admin avec toast "Mode hors ligne, authentification locale". Sinon → forcer sélectionneur.
- **Enter key** : brancher `keydown` avec `event.key === 'Enter'` sur `#loginPassword`, `#resetCode`, `#resetNewPassword`, `#resetConfirmPassword` pour éviter de forcer l'utilisateur à cliquer.
- **Overlay bloquant** : la modale `z-index: 9999` avec `inset: 0` bloque toute interaction avec le reste de la page. Vérifier qu'aucun élément n'a un z-index supérieur.
- **Vidage des champs** : après un échec de login, vider `#loginPassword.value`. Après un échec de reset, ne PAS vider le code (l'utilisateur peut avoir une typo).
- **Double-clic** : désactiver les boutons submit pendant les appels RPC (`btn.disabled = true`), réactiver en `finally`. Empêche les appels multiples.
- **Adresse expéditeur Resend** : `onboarding@resend.dev` fonctionne uniquement en mode sandbox Resend (100 emails/jour, uniquement vers l'email du compte). Pour la production, l'utilisateur devra vérifier un domaine et mettre à jour l'adresse `from` dans la RPC.
- **Rate limit** : la RPC `request_password_reset` vérifie qu'aucun token n'a été créé dans les 60 dernières secondes. Si rate-limité, le toast doit afficher un message clair ("Veuillez patienter 60 secondes").
- **Mot de passe initial** : `changeme` est volontairement faible. Le commentaire en tête du SQL et un toast au premier login doivent rappeler de le changer. Optionnel : détecter `check_admin_password('changeme')` dans `init` et afficher un avertissement.
- **Ordre de chargement** : `core.js` déclare `currentRole = 'selecteur'` par défaut. `clubs.js > init()` détermine le rôle réel. Entre le chargement de `core.js` et l'appel `init()`, tous les modules voient `currentRole = 'selecteur'`. Ce comportement est correct car aucun module ne lit `currentRole` avant `init()`.
- **Compatibilité §14** : la §14 déplaçait la détection URL dans `core.js` top-level. La §15 la redéplace dans `init()`. Le code inline de la §14 (lignes 27-28 de `core.js`) doit être supprimé (tâche 4.3). Vérifier qu'il n'y a pas de double détection.
- **`chargerProfilUtilisateur` ne doit plus écraser le rôle** : la tâche 6.1 est critique. Si le fallback `currentRole = 'admin'` subsiste dans le bloc `if (!user)` de `storage.js`, il annulera le rôle `'selecteur'` fixé par la modale (Cancel) ou par l'URL `?mode=selecteur`. Bien supprimer cette ligne.
- **Pas de test unitaire** dans ce plan : les RPC sont testables uniquement côté Supabase (pas de mock JS). Envisager des tests manuels documentés : login OK, login KO, cancel → sélectionneur, reset flow complet, rate limit, offline fallback.

---

## 16. Envoi sélecteur / validation admin

**Décisions validées** :
- Le sélecteur peut uniquement « envoyer » une session — sauvegarder les équipes et saisir les résultats de matchs, mais PAS déclencher les ajustements de niveaux
- L'admin « valide » les sessions envoyées et contrôle l'étape d'ajustement des niveaux
- Nouvelle colonne `statut` sur la table `sessions` (`'envoyee'` ou `'validee'`, défaut `'validee'`)
- Les sessions existantes restent en `'validee'` (rétro-compatible)
- Le bouton d'action en bas des équipes affiche un libellé/icône différent selon le rôle
- L'historique affiche un badge de statut et des boutons conditionnels par rôle et par statut

### Fichiers à modifier

| Fichier | Nature de la modification |
|---|---|
| `database-schema.md` | Documenter la colonne `statut` sur `sessions` |
| `assets/js/sessions.js` | `validerSession()`, `sauvegarderResultats()`, `validerSessionEnvoyee()` (nouvelle), `afficherHistorique()`, `sauvegarderRenotation()` — logique conditionnelle par rôle/statut |
| `assets/js/teams.js` | `afficherEquipes()` — libellé et icône du bouton selon le rôle |
| `assets/css/components.css` | Style `.badge-envoyee` (orange/ambre) pour badge "Envoyée" |

### Tâches

**Étape 0 — Migration SQL + documentation**

- [x] **0.1** Exécuter manuellement sur Supabase :
  ```sql
  ALTER TABLE sessions ADD COLUMN statut VARCHAR(20) NOT NULL DEFAULT 'validee';
  ```
  Les sessions existantes reçoivent automatiquement `'validee'`.

- [x] **0.2** `database-schema.md` — ajouter la colonne `statut` dans le `CREATE TABLE sessions` et dans le tableau récapitulatif `Structure des tables de sessions`
  - Type : `VARCHAR(20) NOT NULL DEFAULT 'validee'`
  - Valeurs possibles : `'envoyee'`, `'validee'`
  - Description : Statut du workflow — `'envoyee'` = enregistrée par un sélecteur, `'validee'` = confirmée par un admin

**Étape 1 — `assets/js/sessions.js` — `validerSession()`**

- [x] **1.1** Dans l'objet inséré dans `sessions` (le premier `INSERT`), ajouter le champ `statut` :
  ```js
  statut: window.AppCore.isAdmin() ? 'validee' : 'envoyee'
  ```
  Placer après `nb_equipes`.

- [x] **1.2** Adapter le message `confirm()` selon le rôle :
  - Admin : `'Valider ces équipes comme soirée de jeu ?'` (texte actuel, inchangé)
  - Sélecteur : `'Envoyer ces équipes pour validation admin ?'`

- [x] **1.3** Adapter le toast de succès selon le rôle :
  - Admin : `'✅ Soirée validée et sauvegardée !'` (texte actuel, inchangé)
  - Sélecteur : `'📤 Soirée envoyée — en attente de validation admin'`

**Étape 2 — `assets/js/sessions.js` — `sauvegarderResultats()`**

- [x] **2.1** Après le toast `'✅ Résultats sauvegardés !'` (ligne ~259), conditionner l'appel `calculerAjustements` + `afficherAjustements` sur `isAdmin()` :
  ```js
  if (window.AppCore.isAdmin()) {
      const ajustements = await calculerAjustements(sessionId);
      afficherAjustements(sessionId, ajustements);
  } else {
      window.AppCore.showToast('Résultats sauvegardés ! L\'admin pourra appliquer les ajustements.');
  }
  ```
  Supprimer les deux lignes actuelles non conditionnées :
  ```js
  const ajustements = await calculerAjustements(sessionId);
  afficherAjustements(sessionId, ajustements);
  ```

**Étape 3 — `assets/js/sessions.js` — nouvelle fonction `validerSessionEnvoyee(sessionId)`**

- [x] **3.1** Ajouter une nouvelle fonction `async function validerSessionEnvoyee(sessionId)` avant `afficherHistorique()` :
  - Guard `isAdmin()` : `if (!window.AppCore.isAdmin()) { showToast('Réservé admin', true); return; }`
  - Guard connexion : `if (!window.AppCore.isOnline) { showToast('Connexion requise', true); return; }`
  - `confirm('Valider cette session envoyée ?')` — retourner si annulé
  - UPDATE `sessions` : `{ statut: 'validee' }` WHERE `id = sessionId`
  - Si erreur → toast + return
  - Récupérer la session depuis `window.AppCore.historiqueSessions.find(s => s.id === sessionId)`
  - Si la session a `resultats_saisis === true` et `ajustements_appliques === false` → calculer et afficher les ajustements : `const ajustements = await calculerAjustements(sessionId); afficherAjustements(sessionId, ajustements);`
  - Toast succès : `'✅ Session validée par l\'admin'`
  - Recharger l'historique : `await chargerHistorique()`

- [x] **3.2** Ajouter `validerSessionEnvoyee` dans l'export `window.AppSessions = { … }`

**Étape 4 — `assets/js/sessions.js` — `afficherHistorique()`**

- [x] **4.1** Dans le bloc `session-badges`, ajouter un badge de statut entre la date et les badges existants :
  - Si `session.statut === 'envoyee'` : `<span class="badge badge-envoyee">Envoyée ⏳</span>`
  - Si `session.statut === 'validee'` : `<span class="badge badge-success">Validée ✓</span>`
  - Note : les sessions existantes sans `statut` (null/undefined) doivent être traitées comme `'validee'` — utiliser `(session.statut || 'validee')`

- [x] **4.2** Ajouter un bouton "Valider" pour l'admin sur les sessions `envoyee` :
  - Dans le bloc `session-actions`, avant le premier `if (!session.resultats_saisis)` :
    ```js
    if ((session.statut || 'validee') === 'envoyee' && window.AppCore.isAdmin()) {
        html += `
            <button onclick="window.AppSessions.validerSessionEnvoyee(${session.id})" class="btn btn-primary btn-sm">
                <span class="material-icons">check_circle</span>
                Valider
            </button>
        `;
    }
    ```

- [x] **4.3** Conditionner le bouton "Appliquer ajustements" pour n'apparaître que sur les sessions `validee` :
  - Modifier la condition actuelle `} else if (!session.ajustements_appliques && canEditNiveaux) {` en ajoutant le check statut :
    ```js
    } else if (!session.ajustements_appliques && canEditNiveaux && (session.statut || 'validee') === 'validee') {
    ```

- [x] **4.4** Conditionner le bouton "Modifier résultats" (renoterResultats) : bloquer si `statut !== 'validee'` pour le sélecteur
  - Le sélecteur peut re-noter uniquement les sessions `'validee'`
  - L'admin peut re-noter toutes les sessions
  - Modifier la condition existante `if (window.AppCore.isOnline)` :
    ```js
    const canRenoter = window.AppCore.isOnline && (window.AppCore.isAdmin() || (session.statut || 'validee') === 'validee');
    if (canRenoter) {
    ```

**Étape 5 — `assets/js/sessions.js` — `sauvegarderRenotation()`**

- [x] **5.1** Ajouter un guard de statut en tête de `sauvegarderRenotation(sessionId)` (après le `try {`) :
  - Récupérer la session : `const session = (window.AppCore.historiqueSessions || []).find(s => s.id === sessionId);`
  - Si `session && (session.statut || 'validee') !== 'validee' && !window.AppCore.isAdmin()` → toast `'Re-notation réservée aux sessions validées'`, return
  - L'admin peut re-noter même une session `envoyee` (il la passera en `validee` via le bouton dédié)

**Étape 6 — `assets/js/teams.js` — `afficherEquipes()`**

- [x] **6.1** Modifier le bouton dans le bloc `if (!window.AppCore.sessionValidee)` :
  - Si `isAdmin()` : libellé = `'Valider cette soirée'`, icône = `check_circle` (comportement actuel)
  - Si `isSelecteur()` : libellé = `'Envoyer cette soirée'`, icône = `send`
  - Les deux appellent `window.AppSessions.validerSession()`
  - Remplacer le HTML statique du bouton par :
    ```js
    const isAdmin = window.AppCore.isAdmin();
    const btnLabel = isAdmin ? 'Valider cette soirée' : 'Envoyer cette soirée';
    const btnIcon = isAdmin ? 'check_circle' : 'send';
    ```
    puis utiliser `${btnIcon}` et `${btnLabel}` dans le template literal

**Étape 7 — `assets/css/components.css` — badge envoyée**

- [x] **7.1** Ajouter le style `.badge-envoyee` après `.badge-pending` (ligne ~60 actuelle) :
  ```css
  .badge-envoyee { background: #fff3e0; color: #e65100; }
  ```
  Note : la palette est identique à `.badge-pending` ; si une distinction visuelle est souhaitée, utiliser `background: #fff8e1; color: #f57f17;` (ambre plus clair). Décision laissée à l'implémenteur.

### Points d'attention

- **`chargerHistorique()` utilise `SELECT *`** : la nouvelle colonne `statut` sera automatiquement incluse dans les données chargées. Aucune modification de la requête nécessaire.
- **Rétrocompatibilité** : toujours utiliser `(session.statut || 'validee')` dans le JS pour gérer les sessions créées avant la migration (si `statut` est null/undefined en cache local ou en transit).
- **`appliquerAjustements()` — guard existant** : la fonction vérifie déjà `canEditNiveaux()` (qui retourne `isAdmin()`). Ce guard reste en place comme défense en profondeur. Pas besoin d'ajouter un check `statut` dans `appliquerAjustements()` car le bouton est déjà masqué côté UI (tâche 4.3).
- **`recalculerEtAfficherAjustements()`** : cette fonction est appelée par le bouton "Appliquer ajustements" dans l'historique. Elle appelle `calculerAjustements()` puis `afficherAjustements()`. Comme le bouton est conditionné au statut `'validee'` (tâche 4.3), pas de guard supplémentaire nécessaire dans la fonction elle-même.
- **`validerSession()` insert** : la colonne `statut` avec `DEFAULT 'validee'` en SQL signifie qu'omettre le champ dans l'insert donnerait `'validee'`. La tâche 1.1 le rend explicite côté JS pour que le sélecteur écrive `'envoyee'`. Le DEFAULT SQL sert de filet de sécurité.
- **Bouton "Saisir résultats"** : le sélecteur qui a envoyé une session doit pouvoir saisir les résultats sans attendre la validation admin. Le bouton "Saisir résultats" existant n'est pas conditionné au `statut` — il reste visible si `!session.resultats_saisis`. C'est le comportement voulu.
- **Pas de guard `isSelecteur()` dans `sauvegarderResultats()`** : le sélecteur peut sauvegarder les résultats (c'est son rôle). Seul l'appel aux ajustements est bloqué (tâche 2.1).
- **Pas de test unitaire** dans ce plan : envisager un test vérifiant que `validerSession()` insère `statut: 'envoyee'` quand `currentRole === 'selecteur'`, et un test que `sauvegarderResultats()` n'appelle pas `calculerAjustements` quand `!isAdmin()`.
- **`validerSessionEnvoyee()` cascade** : cette fonction ne déclenche PAS la cascade de `sauvegarderRenotation()` (pas de recalcul des sessions ultérieures). Elle se contente de promouvoir le statut. Si des résultats sont déjà saisis, elle propose les ajustements.
- **Pas de modification `core.js`** : `isAdmin()` et `isSelecteur()` existent déjà et suffisent. Aucune nouvelle variable globale nécessaire.
- **Pas de modification `storage.js`** : la requête `chargerHistorique()` charge déjà tout avec `SELECT *`.
