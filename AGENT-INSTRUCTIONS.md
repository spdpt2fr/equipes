# Instructions agent — Implémentation des améliorations de constitution des équipes

## Contexte

Projet : gestionnaire d'équipes de hockey subaquatique.  
Stack : HTML/CSS/JS vanilla, Supabase, un seul fichier `index.html`, modules JS dans `assets/js/`.  
Fichiers à modifier : `index.html`, `assets/js/teams.js`, `assets/js/ui.js`, `assets/js/core.js`.  
Fichier à créer : aucun.

---

## Vue d'ensemble des changements

1. **`core.js`** — initialisation de `methodeConstitution`
2. **`teams.js`** — extraction de `scoreEquipe` + SA + correction `autreProposition`
3. **`index.html`** — sélecteur de méthode + nouvel onglet
4. **`ui.js`** — gestion du nouvel onglet + contenu bilingue
5. **CSS** — styles du nouvel onglet

---

## CHANGEMENT 0 — `assets/js/core.js` *(à faire en premier)*

Dans l'objet `AppCore` (ou la variable d'état global), ajouter l'initialisation de la propriété `methodeConstitution` avec sa valeur par défaut.

Localiser le bloc où les propriétés de `AppCore` sont définies (variables comme `equipes`, `joueurs`, `triEquipes`, etc.) et ajouter :

```js
methodeConstitution: 'scoreCompetitif',  // 'scoreCompetitif' | 'niveauTotal'
```

Cela garantit que la propriété n'est jamais `undefined` au premier chargement, avant toute interaction avec le sélecteur radio.

---

## CHANGEMENT 1 — `assets/js/teams.js`

### 1a. Extraire `scoreEquipe` comme fonction de module *(prérequis)*

Actuellement `scoreEquipe` est définie à l'**intérieur** de `afficherEquipes()`. Il faut la déplacer **tout en haut de `teams.js`**, avant `creerEquipes()`.

**Déplacer** cette fonction (la sortir de `afficherEquipes`) :

```js
// === SCORE COMPÉTITIF D'UNE ÉQUIPE (partagé) ===
// Formule B : collectif ×0.15 + décroissance géométrique sur les 4 meilleurs joueurs.
// Sources : SAS DO Loop, Lucifora & Simmons (2003), Sports Gini.function scoreEquipe(equipe) {
    const joueursOrdonnes = [...equipe.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
    if (joueursOrdonnes.length > 6) {
        const joueursPrisEnCompte = joueursOrdonnes.slice(0, 6);
        const joueursIgnores = joueursOrdonnes.slice(6);
        const meilleur = joueursPrisEnCompte[0] ? joueursPrisEnCompte[0].niveau || 0 : 0;
        const second   = joueursPrisEnCompte[1] ? joueursPrisEnCompte[1].niveau || 0 : 0;
        const troisieme = joueursPrisEnCompte[2] ? joueursPrisEnCompte[2].niveau || 0 : 0;
        const quatrieme = joueursPrisEnCompte[3] ? joueursPrisEnCompte[3].niveau || 0 : 0;
        const total    = joueursPrisEnCompte.reduce((acc, j) => acc + (j.niveau || 0), 0);
        return { score: total * 0.15 + meilleur * 0.40 + second * 0.25 + troisieme * 0.13 + quatrieme * 0.07, meilleur, second, troisieme, quatrieme, joueursIgnores };
    }
    const meilleur = joueursOrdonnes[0] ? joueursOrdonnes[0].niveau || 0 : 0;
    const second   = joueursOrdonnes[1] ? joueursOrdonnes[1].niveau || 0 : 0;
    const troisieme = joueursOrdonnes[2] ? joueursOrdonnes[2].niveau || 0 : 0;
    const quatrieme = joueursOrdonnes[3] ? joueursOrdonnes[3].niveau || 0 : 0;
    const total    = equipe.niveauTotal || 0;
    return { score: total * 0.15 + meilleur * 0.40 + second * 0.25 + troisieme * 0.13 + quatrieme * 0.07, meilleur, second, troisieme, quatrieme, joueursIgnores: [] };
}
```

Dans `afficherEquipes()`, **supprimer** la définition locale de `scoreEquipe` (le `function scoreEquipe(equipe) { ... }` qui s'y trouve). Les appels à `scoreEquipe(e)` dans `afficherEquipes` fonctionneront automatiquement sur la version de module.

> ⚠️ Vérifier qu'il ne reste aucune définition locale résiduelle dans `afficherEquipes`. Si la fonction locale n'est pas supprimée, elle masquera la version de module dans cette portée.

---

### 1b. Ajouter les fonctions utilitaires SA

Juste après `scoreEquipe`, ajouter ces deux fonctions :

```js
// === UTILITAIRES OPTIMISATION ===

// Écart-type des scores compétitifs — mesure le déséquilibre global entre équipes.
// Plus la valeur est proche de 0, plus les équipes sont équilibrées.
function _ecartTypeScores(equipes) {
    const scores = equipes.map(e => scoreEquipe(e).score);
    const moy = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.sqrt(scores.reduce((acc, s) => acc + (s - moy) ** 2, 0) / scores.length);
}

// Post-greedy : optimisation par recuit simulé (Simulated Annealing).
// Minimise l'écart-type des scores compétitifs. ~400 itérations, < 3ms.
// Respecte la contrainte des groupes (joueurs avec groupe ne sont jamais échangés).
// Re-résout le poste 'indifferent' après chaque swap (cohérence positionnelle).
function _optimiserEquipes(equipes) {
    let config = JSON.parse(JSON.stringify(equipes));
    let ecart  = _ecartTypeScores(config);
    let T = 1.0;

    for (let iter = 0; iter < 400; iter++) {
        // Sélectionner 2 équipes différentes au hasard
        const nbEq = config.length;
        const i = Math.floor(Math.random() * nbEq);
        let j = Math.floor(Math.random() * (nbEq - 1));
        if (j >= i) j++;

        if (!config[i].joueurs.length || !config[j].joueurs.length) continue;

        const idxA = Math.floor(Math.random() * config[i].joueurs.length);
        const idxB = Math.floor(Math.random() * config[j].joueurs.length);

        // Ne pas échanger les joueurs appartenant à un groupe
        if (config[i].joueurs[idxA].groupe || config[j].joueurs[idxB].groupe) continue;

        // Appliquer le swap sur une copie
        const candidat = JSON.parse(JSON.stringify(config));
        const tmp = candidat[i].joueurs[idxA];
        candidat[i].joueurs[idxA] = candidat[j].joueurs[idxB];
        candidat[j].joueurs[idxB] = tmp;

        // Re-résoudre le poste 'indifferent' pour les joueurs déplacés
        // (un joueur indifferent résolu en 'avant' peut se retrouver dans une équipe
        // qui a déjà trop d'avants — on corrige selon l'équilibre de l'équipe cible)
        const origA = window.AppCore.joueurs.find(x => x.id === candidat[i].joueurs[idxA].id);
        const origB = window.AppCore.joueurs.find(x => x.id === candidat[j].joueurs[idxB].id);

        if (origA && origA.poste === 'indifferent') {
            const nbAv = candidat[i].joueurs.filter((x, k) => k !== idxA && x.poste === 'avant').length;
            const nbAr = candidat[i].joueurs.filter((x, k) => k !== idxA && x.poste === 'arriere').length;
            candidat[i].joueurs[idxA].poste = nbAv <= nbAr ? 'avant' : 'arriere';
        }
        if (origB && origB.poste === 'indifferent') {
            const nbAv = candidat[j].joueurs.filter((x, k) => k !== idxB && x.poste === 'avant').length;
            const nbAr = candidat[j].joueurs.filter((x, k) => k !== idxB && x.poste === 'arriere').length;
            candidat[j].joueurs[idxB].poste = nbAv <= nbAr ? 'avant' : 'arriere';
        }

        // Recalculer niveauTotal et meilleurNiveau des deux équipes
        [i, j].forEach(idx => {
            candidat[idx].niveauTotal = candidat[idx].joueurs
                .reduce((acc, p) => acc + (p.niveau || 0), 0);
            candidat[idx].meilleurNiveau = candidat[idx].joueurs
                .reduce((max, p) => Math.max(max, p.niveau || 0), 0);
        });

        const ecartCandidat = _ecartTypeScores(candidat);
        const delta = ecartCandidat - ecart;

        // Accepter si meilleur, ou probabilistiquement selon la température
        if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
            config = candidat;
            ecart  = ecartCandidat;
        }
        T *= 0.985;
    }
    return config;
}
```

---

### 1c. Modifier `creerEquipes` pour supporter les deux méthodes

#### Critère de tri dans le greedy

Dans `creerEquipes()`, **les deux occurrences** de :
```js
window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
```
doivent être remplacées par le bloc suivant. Pour éviter de recalculer `scoreEquipe` plusieurs fois pendant le même tri (une comparaison appelle la fonction pour chaque paire), **les scores sont mis en cache avant le tri** :

```js
if ((window.AppCore.methodeConstitution || 'scoreCompetitif') === 'scoreCompetitif') {
    // Cache des scores pour éviter N² appels à scoreEquipe pendant le sort
    const cache = new Map(window.AppCore.equipes.map(e => [e, scoreEquipe(e).score]));
    window.AppCore.equipes.sort((a, b) => cache.get(a) - cache.get(b));
} else {
    window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
}
```

#### Passe SA post-greedy

**Après la boucle de distribution** des joueurs sans groupe (juste avant la ligne `window.AppCore.propositionOriginale = JSON.parse(...)`), ajouter :

```js
// Passe d'optimisation SA — uniquement en mode score compétitif
if ((window.AppCore.methodeConstitution || 'scoreCompetitif') === 'scoreCompetitif') {
    window.AppCore.equipes = _optimiserEquipes(window.AppCore.equipes);
}
```

---

### 1d. Corriger `autreProposition`

La correction porte sur **trois points** dans cette fonction :

#### Point 1 — Remplacer le calcul des moyennes par le calcul de l'écart-type de référence

**Supprimer** complètement ce bloc en début de tentative :
```js
const moyennesOriginales = window.AppCore.propositionOriginale.map(e => {
    if (e.joueurs.length === 0) return 0;
    return e.joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0) / e.joueurs.length;
});
```

**Le remplacer par** (une seule ligne, calculée une fois avant la boucle `for tentative`) :
```js
const ecartOriginal = _ecartTypeScores(window.AppCore.propositionOriginale);
```

#### Point 2 — Simplifier le filtre individuel des swaps

Dans la boucle de construction des swaps candidats, **supprimer les 4 lignes** qui calculent `newMoyI`, `newMoyJ` et les deux `if (Math.abs(...) > 0.2) continue` :

```js
// SUPPRIMER ces lignes :
const totalI = candidat[i].joueurs.reduce((acc, x) => acc + (x.niveau || 0), 0);
const totalJ = candidat[j].joueurs.reduce((acc, x) => acc + (x.niveau || 0), 0);
const nbI = candidat[i].joueurs.length;
const nbJ = candidat[j].joueurs.length;
const newTotalI = totalI - (a.niveau || 0) + (b.niveau || 0);
const newTotalJ = totalJ - (b.niveau || 0) + (a.niveau || 0);
const newMoyI = nbI > 0 ? newTotalI / nbI : 0;
const newMoyJ = nbJ > 0 ? newTotalJ / nbJ : 0;
if (Math.abs(newMoyI - moyennesOriginales[i]) > 0.2) continue;
if (Math.abs(newMoyJ - moyennesOriginales[j]) > 0.2) continue;
const deltaMoyenne = Math.abs(newMoyI - moyennesOriginales[i]) + Math.abs(newMoyJ - moyennesOriginales[j]);
```

Et **supprimer** `deltaMoyenne` dans l'objet `swaps.push({ i, j, idxA, idxB, deltaMoyenne })` → remplacer par `swaps.push({ i, j, idxA, idxB })`.

Les seuls pré-filtres à conserver pour chaque swap candidat sont :
- `if (a.groupe || b.groupe) continue;` — groupes intacts
- `if (Math.abs((a.niveau || 0) - (b.niveau || 0)) > 1) continue;` — niveaux proches

#### Point 3 — Remplacer la validation cumulative post-application

**Supprimer** ce bloc (qui suit l'application des swaps) :
```js
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

**Le remplacer par** (validation globale post-application, cohérente avec le critère du SA) :
```js
// Validation globale : le déséquilibre post-swaps ne doit pas dépasser 110% de l'original
if (_ecartTypeScores(candidat) > ecartOriginal * 1.1) continue;
```

> Cette validation est faite **après** application de tous les swaps sur `candidat`, pas swap par swap — elle est donc correcte même quand plusieurs swaps sont combinés.

#### Point 4 — Augmenter le nombre de tentatives

Remplacer `for (let tentative = 0; tentative < 10; tentative++)` par :
```js
for (let tentative = 0; tentative < 30; tentative++)
```

Le critère plus souple permet de trouver plus facilement des alternatives valides, donc 30 tentatives est un bon compromis.

---

### 1e. Mettre à jour l'affichage du score dans `afficherEquipes`

La Formule B retourne désormais `troisieme` et `quatrieme`. Localiser le bloc qui affiche la ligne "Score compétitif" sous chaque équipe et le remplacer par :

```js
html += `<div class="team-total">
    Score compétitif : ${scoresObj[idx].score.toFixed(2)}<br>
    <span style="font-size:12px; color:#666;">
        (Coll.x0.15 : ${(niveauTotal * 0.15).toFixed(2)}
        | 1er x0.40 : ${(scoresObj[idx].meilleur * 0.40).toFixed(2)}
        | 2e x0.25 : ${(scoresObj[idx].second * 0.25).toFixed(2)}
        | 3e x0.13 : ${(scoresObj[idx].troisieme * 0.13).toFixed(2)}
        | 4e x0.07 : ${(scoresObj[idx].quatrieme * 0.07).toFixed(2)})
    </span>
</div>`;
```

> Adapter `niveauTotal` au nom de variable réel dans `afficherEquipes`.

---

### 1f. Export — uniquement les fonctions publiques

Dans `window.AppTeams = { ... }` en bas du fichier, ajouter **uniquement** `scoreEquipe` (les fonctions préfixées `_` restent privées) :

```js
window.AppTeams = {
    creerEquipes,
    afficherEquipes,
    changerEquipe,
    autreProposition,
    scoreEquipe       // ← ajouter uniquement celle-ci
};
```

---

## CHANGEMENT 2 — `index.html`

### 2a. Sélecteur de méthode dans la carte "Composition des Équipes"

Dans la `<div class="form-grid">` de la carte "Composition des Équipes", **ajouter avant le bouton "Créer Équipes"** :

```html
<!-- Sélecteur de méthode — visible admins uniquement (géré par appliquerPermissionsUI) -->
<div class="input-group" id="methodeConstitutionGroup"
     style="display:flex; align-items:center; gap:16px; grid-column: 1 / -1;">
    <span style="font-size:13px; color:#555; white-space:nowrap;">Méthode :</span>
    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px;">
        <input type="radio" name="methodeConstitution" value="scoreCompetitif" checked
               onchange="window.AppCore.methodeConstitution = this.value">
        Score compétitif
        <em style="color:#888; font-size:11px;">(recommandé)</em>
    </label>
    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px;">
        <input type="radio" name="methodeConstitution" value="niveauTotal"
               onchange="window.AppCore.methodeConstitution = this.value">
        Niveau total
    </label>
</div>
```

### 2b. Nouvel onglet dans la navigation

Dans `<nav class="tab-bar">`, ajouter après les 3 boutons existants :

```html
<button class="tab-btn" data-tab="algorithme">ℹ️ Comment ça marche</button>
```

### 2c. Nouvelle section d'onglet

Après `<div id="section-stats" class="tab-section">` et son contenu, ajouter :

```html
<!-- Section "Comment ça marche" — accessible à tous les utilisateurs -->
<div id="section-algorithme" class="tab-section">
    <div id="algorithmeContainer"></div>
</div>
```

---

## CHANGEMENT 3 — `assets/js/ui.js`

### 3a. Masquer le sélecteur de méthode pour les non-admins

Dans `appliquerPermissionsUI()`, ajouter à la fin du corps de la fonction (avant la fermeture) :

```js
const methodeGroup = document.getElementById('methodeConstitutionGroup');
if (methodeGroup) methodeGroup.style.display = canViewNiveaux ? '' : 'none';
```

### 3b. Brancher le nouvel onglet dans `switchTab`

Dans `switchTab(tabName)`, ajouter après les deux blocs `if (tabName === ...)` existants :

```js
if (tabName === 'algorithme') {
    window.AppUI.afficherAlgorithme();
}
```

L'onglet `algorithme` est **accessible à tous les utilisateurs** — ne pas ajouter de vérification `canViewNiveaux`.

### 3c. Ajouter la variable de langue

En tête de `ui.js`, après les commentaires d'en-tête du module, ajouter :

```js
let _langAlgo = 'fr'; // Langue de l'onglet "Comment ça marche" : 'fr' | 'en'
```

### 3d. Ajouter la fonction `afficherAlgorithme`

Ajouter cette fonction **avant** `attachEventListeners()` :

```js
// === ONGLET "COMMENT ÇA MARCHE" ===
function afficherAlgorithme() {
    const container = document.getElementById('algorithmeContainer');
    if (!container) return;

    const isFr = _langAlgo === 'fr';

    const contenus = {
        fr: {
            titre: 'Comment les équipes sont-elles construites ?',
            s1titre: '1. Choix de la méthode',
            s1score: `<strong>Score compétitif (recommandé)</strong><br>
                Chaque équipe reçoit un score qui tient compte de la force collective et des 4 meilleurs joueurs :
                <div class="algo-formula">Score = Σ top 6 × 0,15 + 1er joueur × 0,40 + 2e × 0,25 + 3e × 0,13 + 4e × 0,07</div>
                Une "star" compte davantage qu'un joueur moyen — ce qui reflète mieux la réalité d'un match.
                Les équipes sont constituées en minimisant l'écart entre ces scores.`,
            s1total: `<strong>Niveau total</strong><br>
                L'algorithme équilibre uniquement la somme des niveaux. Plus simple, mais une équipe
                avec un très bon joueur et plusieurs faibles sera traitée comme identique à une
                équipe homogène de même somme.`,
            s2titre: '2. Distribution des joueurs (greedy)',
            s2texte: `Les joueurs sont triés du plus fort au plus faible. Un par un, chaque joueur est affecté
                à l'équipe la plus "faible" à cet instant (selon la méthode choisie).
                Les joueurs d'un même <strong>groupe</strong> sont toujours placés ensemble dans la même équipe.`,
            s3titre: '3. Optimisation (méthode Score compétitif uniquement)',
            s3texte: `Après la distribution initiale, l'algorithme effectue jusqu'à 400 échanges aléatoires
                de joueurs entre équipes. Il accepte un échange s'il réduit le déséquilibre global,
                et peut temporairement accepter un léger déséquilibre pour explorer d'autres configurations.
                Ce processus s'exécute en moins de 3 millisecondes.`,
            s4titre: '4. "Autre proposition"',
            s4texte: `Ce bouton propose une composition différente en échangeant 1 à 3 paires de joueurs
                (sans groupe) entre équipes. Seuls les échanges qui ne dégradent pas l'équilibre
                global de plus de 10 % sont retenus. Chaque composition est mémorisée pour ne jamais
                répéter la même.`,
            s5titre: '5. Évolution des niveaux (Elo)',
            s5texte: `Après chaque soirée validée, les niveaux sont ajustés selon les résultats.
                Une victoire contre une équipe plus forte rapporte davantage qu'une victoire facile.
                Les ajustements restent discrets (facteur K = 0,3) pour ne pas perturber l'équilibre
                sur une soirée atypique. L'administrateur confirme les ajustements depuis l'onglet Historique.`
        },
        en: {
            titre: 'How are teams built?',
            s1titre: '1. Method selection',
            s1score: `<strong>Competitive score (recommended)</strong><br>
                Each team receives a score that accounts for collective strength and the top 4 players:
                <div class="algo-formula">Score = Σ top 6 × 0.15 + 1st player × 0.40 + 2nd × 0.25 + 3rd × 0.13 + 4th × 0.07</div>
                A "star player" carries more weight than an average player — better reflecting match reality.
                Teams are built by minimising the gap between these scores.`,
            s1total: `<strong>Total level</strong><br>
                The algorithm only balances the sum of levels. Simpler, but a team with one very strong
                player and several weak ones is treated identically to a homogeneous team with the same sum.`,
            s2titre: '2. Player distribution (greedy)',
            s2texte: `Players are sorted from strongest to weakest. One by one, each player is assigned
                to the "weakest" team at that moment (according to the chosen method).
                Players in the same <strong>group</strong> are always placed together in the same team.`,
            s3titre: '3. Optimisation (Competitive score method only)',
            s3texte: `After the initial distribution, the algorithm performs up to 400 random player swaps
                between teams. It accepts a swap if it reduces the overall imbalance, and may temporarily
                accept a slight degradation to explore other configurations.
                This runs in under 3 milliseconds.`,
            s4titre: '4. "Another suggestion"',
            s4texte: `This button proposes a different composition by swapping 1 to 3 pairs of players
                (without groups) between teams. Only swaps that do not degrade the overall balance
                by more than 10% are kept. Each composition is memorised so the same one is never repeated.`,
            s5titre: '5. Level evolution (Elo)',
            s5texte: `After each validated session, levels are automatically adjusted based on results.
                Winning against a stronger team earns more than an easy win.
                Adjustments remain subtle (K factor = 0.3) to avoid disrupting balance over a single
                atypical session. The administrator confirms adjustments from the History tab.`
        }
    };

    const c = contenus[_langAlgo];

    container.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">help_outline</span>
                ${c.titre}
                <div style="margin-left:auto; display:flex; align-items:center; gap:8px;
                            font-size:13px; font-weight:400;">
                    <span style="color:${isFr ? '#1976d2' : '#999'};
                                 font-weight:${isFr ? '700' : '400'};">FR</span>
                    <label class="lang-switch">
                        <input type="checkbox" ${isFr ? '' : 'checked'}
                               onchange="window.AppUI.toggleLangAlgo()">
                        <span class="lang-switch__slider"></span>
                    </label>
                    <span style="color:${isFr ? '#999' : '#1976d2'};
                                 font-weight:${isFr ? '400' : '700'};">EN</span>
                </div>
            </h2>

            <div class="algo-section">
                <h3>${c.s1titre}</h3>
                <div class="algo-block">${c.s1score}</div>
                <div class="algo-block algo-block--alt">${c.s1total}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s2titre}</h3>
                <div class="algo-block">${c.s2texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s3titre}</h3>
                <div class="algo-block">${c.s3texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s4titre}</h3>
                <div class="algo-block">${c.s4texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s5titre}</h3>
                <div class="algo-block">${c.s5texte}</div>
            </div>
        </div>
    `;
}

function toggleLangAlgo() {
    _langAlgo = _langAlgo === 'fr' ? 'en' : 'fr';
    afficherAlgorithme();
}
```

### 3e. Exporter les nouvelles fonctions

Dans `window.AppUI = { ... }`, ajouter :

```js
afficherAlgorithme,
toggleLangAlgo
```

---

## CHANGEMENT 4 — CSS (`assets/css/components.css`)

Ajouter à la fin du fichier :

```css
/* === ONGLET "COMMENT ÇA MARCHE" === */
.algo-section {
    margin-bottom: 24px;
}
.algo-section h3 {
    font-size: 15px;
    font-weight: 600;
    color: #1976d2;
    margin-bottom: 10px;
    border-bottom: 1px solid #e3eaf5;
    padding-bottom: 6px;
}
.algo-block {
    background: #f5f7fa;
    border-left: 4px solid #1976d2;
    border-radius: 4px;
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 10px;
}
.algo-block--alt {
    border-left-color: #aaa;
    background: #f9f9f9;
}
.algo-formula {
    font-family: monospace;
    background: #e8edf5;
    border-radius: 4px;
    padding: 8px 12px;
    margin: 10px 0 4px 0;
    font-size: 13px;
    color: #1a1a2e;
}

/* Switch langue FR / EN */
.lang-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
}
.lang-switch input { opacity: 0; width: 0; height: 0; }
.lang-switch__slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: #ccc;
    border-radius: 20px;
    transition: background .3s;
}
.lang-switch__slider::before {
    content: "";
    position: absolute;
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: transform .3s;
}
.lang-switch input:checked + .lang-switch__slider { background: #1976d2; }
.lang-switch input:checked + .lang-switch__slider::before { transform: translateX(16px); }
```

---

## Ordre d'implémentation et vérifications

| Étape | Fichier | Vérification rapide |
|---|---|---|
| 0 | `core.js` | `window.AppCore.methodeConstitution` vaut `'scoreCompetitif'` à l'ouverture |
| 1a | `teams.js` | L'affichage des équipes existant ne régresse pas |
| 1b–1c | `teams.js` | Créer des équipes avec chaque méthode — scores affichés cohérents |
| 1d | `teams.js` | "Autre proposition" génère des variantes sans toast d'erreur |
| 2a | `index.html` | Le sélecteur radio modifie bien `window.AppCore.methodeConstitution` |
| 2b–2c | `index.html` | L'onglet apparaît dans la nav |
| 3a–3e | `ui.js` | L'onglet s'affiche, le switch FR/EN fonctionne, le sélecteur est masqué hors admin |
| 4 | `components.css` | Les blocs et le switch sont bien stylés |

## Périmètre — ce qui n'est PAS dans ces instructions

- L'amélioration du facteur K Elo (K variable selon ancienneté) est **hors périmètre** de cette PR.
- La re-notation en cascade automatique est **hors périmètre**.
- Le rapport de force normalisé Bradley-Terry est **hors périmètre**.
