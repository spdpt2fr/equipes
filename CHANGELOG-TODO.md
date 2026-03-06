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
