# CLAUDE.md — Gestionnaire d'Équipes Hockey Subaquatique

## Project overview

Single-page web app for managing underwater hockey team rosters and generating balanced teams. Two clubs are supported: Grenoble and Jeeves. Data is persisted in Supabase with local fallback (offline mode).

**Stack**: Vanilla HTML/CSS/JS — no build step, no bundler, no framework.
**Backend**: Supabase (PostgreSQL + REST API via `@supabase/supabase-js@2` from CDN).
**Hosting**: Netlify (static) + Supabase (database).
**Language**: French (UI, comments, variable names).

---

## File structure

```
index.html                  Entry point, layout, script loading order
assets/
  css/
    main.css                Base styles, layout, status bar, toasts
    components.css          Cards, buttons, inputs, player cards, team cards
    responsive.css          Mobile breakpoints
  js/
    core.js                 Global state + config + utility functions → window.AppCore
    storage.js              Supabase CRUD, club/player loading, sync → window.AppStorage
    clubs.js                Club switching, app init() function → window.AppClubs
    players.js              Player CRUD (add/edit/delete), CSV import/export → window.AppPlayers
    ui.js                   Player list rendering, search/sort, event listeners → window.AppUI
    teams.js                Team creation algorithm, team display → window.AppTeams
database-schema.md          Full SQL schema for Supabase setup
README.md                   Setup and deployment instructions
```

---

## Module architecture

All JS is loaded as plain `<script>` tags in `index.html`. There is no ES module system. Modules communicate through the `window` global namespace.

**Namespace objects** (each JS file exports one):

| Namespace | Source file | Contents |
|---|---|---|
| `window.AppCore` | `core.js` | Config, global state variables, `updateStatus()`, `showToast()` |
| `window.AppStorage` | `storage.js` | `chargerClubs()`, `chargerJoueurs()`, `synchroniser()`, `getTableName()` |
| `window.AppClubs` | `clubs.js` | `changerClub()`, `init()` |
| `window.AppPlayers` | `players.js` | `ajouterJoueur()`, `supprimerJoueur()`, `modifierJoueur()`, `exporterJoueurs()`, `importerJoueurs()` |
| `window.AppUI` | `ui.js` | `afficherJoueurs()`, `attachEventListeners()`, sort/search/filter helpers |
| `window.AppTeams` | `teams.js` | `creerEquipes()`, `afficherEquipes()`, `changerEquipe()` |

**Compatibility aliases** (set at the bottom of some files):
- `window.afficherJoueurs = afficherJoueurs` (ui.js)
- `window.afficherEquipes = afficherEquipes` (teams.js)
- `window.attachEventListeners = attachEventListeners` (ui.js)

**Script load order matters** — `core.js` must be first (others read `window.AppCore`).

---

## Global state (window.AppCore)

| Variable | Type | Description |
|---|---|---|
| `supabaseClient` | object | Supabase JS client instance |
| `joueurs` | array | Currently loaded players for active club |
| `equipes` | array | Generated teams (cleared on next generation) |
| `clubs` | array | All clubs loaded from `clubs` table |
| `clubActuel` | object | Active club (`{ id, nom }`) |
| `isOnline` | boolean | Whether Supabase connection succeeded |
| `afficherTotal` | boolean | Toggle score display in team cards |
| `triJoueurs` | string | `'alpha'` or `'niveau'` |
| `triEquipes` | string | `'alpha'` or `'niveau'` |
| `searchTerm` | string | Current player list search filter |

---

## Database (Supabase)

**Project URL**: `https://vfowenxzpnexcymlruru.supabase.co`
**Anon key**: stored in `assets/js/core.js` as `SUPABASE_ANON_KEY`

**Tables**:
- `clubs` — list of clubs (`id`, `nom`)
- `players_grenoble` — players for Grenoble club
- `players_jeeves` — players for Jeeves club

**Player schema** (same for both player tables):

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | Auto PK |
| `nom` | VARCHAR(255) | Unique |
| `niveau` | INTEGER | 1–10 |
| `poste` | VARCHAR(50) | `'avant'`, `'arriere'`, `'indifferent'`, `'ailier'`, `'centre'`, `'pivot'`, `'arr_centre'` |
| `groupe` | INTEGER | Optional, groups players assigned to same team |
| `actif` | BOOLEAN | Active/inactive toggle |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

RLS is enabled with open anonymous policies (read/insert/update/delete for all).

Table routing in `storage.js`: `getTableName()` returns `'players_grenoble'` or `'players_jeeves'` based on `window.AppCore.clubActuel.nom`.

---

## Initialization flow

```
window.onload (index.html)
  └── init()             (clubs.js) — creates Supabase client, loads clubs, loads players
  └── attachEventListeners()  (ui.js) — wires all buttons and inputs
```

If `init()` fails, `isOnline = false` and the app runs in offline mode (player IDs use `Date.now()`).

---

## Team creation algorithm (teams.js)

1. Filter only active players (`actif === true`).
2. Players with a `groupe` value are assigned together to the weakest team.
3. Remaining players are sorted by `niveau` descending, then assigned one by one to the weakest team (greedy balancing).
4. `indifferent` position is resolved at assignment time: assigned to `avant` if team has fewer avants than arrières, else `arriere`.
5. **Competitive score** formula: `total_top6 × 0.6 + best × 0.25 + second_best × 0.15` (top 6 players only if team > 6).

---

## Key behaviours to be aware of

- **Club persistence**: last selected club is stored in `localStorage` under key `hockeySub_clubActuel`.
- **Inline editing**: player fields in the list are `<input>` elements. Changes trigger `modifierJoueur()` on `change`/`blur`, which syncs to Supabase immediately.
- **Player indices**: `modifierJoueur()` and `supprimerJoueur()` use the index into `window.AppCore.joueurs`. The UI maps displayed (filtered/sorted) players back to original indices via `joueurs.indexOf(j)`.
- **No bundler**: editing a JS file takes effect immediately on page refresh. No build step needed.
