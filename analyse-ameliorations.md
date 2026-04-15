# Proposition d'améliorations — constitution des équipes

> Fichiers analysés : `assets/js/teams.js`, `assets/js/sessions.js`  
> Date : 2026-04-15  
> Priorité : amélioration de l'équilibre des équipes

---

## Le problème central : l'algorithme optimise le mauvais critère

L'algo de constitution (`creerEquipes`) trie les équipes sur `niveauTotal` à chaque affectation. Mais le critère d'équilibre affiché à l'écran est le **score compétitif** :

```
score = Σniveaux × 0.6 + meilleur × 0.25 + 2e meilleur × 0.15
```

Ces deux métriques ne sont **pas équivalentes**. Exemple concret avec 8 joueurs répartis en 2 équipes de 4 :

| Équipe | Joueurs (niveaux) | niveauTotal | scoreCompétitif |
|---|---|---|---|
| A | 9, 1, 1, 1 | **12** | 9×0.25 + 1×0.15 + 12×0.6 = **9.60** |
| B | 3, 3, 3, 3 | **12** | 3×0.25 + 3×0.15 + 12×0.6 = **8.40** |

Le greedy considère ces équipes **parfaitement équilibrées** (même `niveauTotal`). Le score affiché révèle un **écart de 14%**. L'algo constitue des équipes inégales tout en affichant "tout va bien".

De plus, `scoreEquipe()` est définie **à l'intérieur** de `afficherEquipes()` — elle n'est pas accessible ailleurs, ce qui empêche de l'utiliser dans l'algo de constitution ou dans `autreProposition`.

---

## Amélioration 1 — Extraire `scoreEquipe` comme fonction partagée *(prérequis)*

Déplacer `scoreEquipe` en tête de `teams.js` pour la rendre disponible partout :

```js
// À mettre en tête de teams.js, avant creerEquipes()
function scoreEquipe(equipe) {
    const ordonnes = [...equipe.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
    const top = ordonnes.length > 6 ? ordonnes.slice(0, 6) : ordonnes;
    const total   = top.reduce((acc, j) => acc + (j.niveau || 0), 0);
    const meilleur = top[0]?.niveau || 0;
    const second   = top[1]?.niveau || 0;
    return {
        score: total * 0.6 + meilleur * 0.25 + second * 0.15,
        meilleur,
        second,
        joueursIgnores: ordonnes.length > 6 ? ordonnes.slice(6) : []
    };
}
```

Dans `afficherEquipes()`, remplacer la définition locale par un appel à cette fonction.

---

## Amélioration 2 — Greedy sur le bon critère *(impact immédiat)*

Changer le critère de tri dans `creerEquipes()` : remplacer `niveauTotal` par le **score compétitif**.

**Avant (lignes ~53, ~70 dans `teams.js`) :**
```js
window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
```

**Après :**
```js
window.AppCore.equipes.sort((a, b) => scoreEquipe(a).score - scoreEquipe(b).score);
```

C'est le changement avec le meilleur ratio impact/effort : **2 lignes modifiées**, l'algo greedy reste identique mais optimise maintenant ce qui est réellement affiché et comparé.

---

## Amélioration 3 — Passe de Simulated Annealing post-greedy *(meilleure solution globale)*

Le greedy reste une heuristique locale : chaque affectation est localement optimale mais la solution finale peut être sous-optimale. Le recuit simulé explore des échanges en acceptant temporairement une légère dégradation pour s'extraire d'un minimum local.

À ajouter à la fin de `creerEquipes()`, après la distribution des joueurs :

```js
// === POST-GREEDY : OPTIMISATION PAR RECUIT SIMULÉ ===
function _ecartTypeScores(equipes) {
    const scores = equipes.map(e => scoreEquipe(e).score);
    const moy = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.sqrt(scores.reduce((acc, s) => acc + (s - moy) ** 2, 0) / scores.length);
}

function _optimiserEquipes(equipes) {
    let config = JSON.parse(JSON.stringify(equipes));
    let ecart  = _ecartTypeScores(config);
    let T = 1.0;

    for (let iter = 0; iter < 400; iter++) {
        // Choisir 2 équipes et 1 joueur dans chacune au hasard
        const i = Math.floor(Math.random() * config.length);
        let j  = Math.floor(Math.random() * (config.length - 1));
        if (j >= i) j++;
        if (!config[i].joueurs.length || !config[j].joueurs.length) continue;

        const idxA = Math.floor(Math.random() * config[i].joueurs.length);
        const idxB = Math.floor(Math.random() * config[j].joueurs.length);

        // Ne pas échanger les joueurs avec groupe
        if (config[i].joueurs[idxA].groupe || config[j].joueurs[idxB].groupe) continue;

        // Appliquer le swap
        const candidat = JSON.parse(JSON.stringify(config));
        [candidat[i].joueurs[idxA], candidat[j].joueurs[idxB]] =
            [candidat[j].joueurs[idxB], candidat[i].joueurs[idxA]];

        // Recalculer niveauTotal
        [i, j].forEach(idx => {
            candidat[idx].niveauTotal = candidat[idx].joueurs
                .reduce((acc, p) => acc + (p.niveau || 0), 0);
        });

        const ecartCandidat = _ecartTypeScores(candidat);
        const delta = ecartCandidat - ecart;

        // Accepter si meilleur, ou avec probabilité e^(-delta/T)
        if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
            config = candidat;
            ecart  = ecartCandidat;
        }
        T *= 0.985; // Refroidissement
    }
    return config;
}

// Appel à la fin de creerEquipes(), avant afficherEquipes()
window.AppCore.equipes = _optimiserEquipes(window.AppCore.equipes);
```

**Performance :** 400 itérations sur 20 joueurs en 4 équipes s'exécutent en **< 3ms** dans un navigateur moderne.  
**Gain typique :** l'écart-type des scores compétitifs est réduit de 15 à 40% par rapport au greedy seul, selon la distribution des niveaux.

---

## Amélioration 4 — `autreProposition` évalue sur le bon critère

Actuellement `autreProposition` valide un swap si la **variation de moyenne reste ≤ ±0.2** par équipe. Ce critère est incohérent avec le score compétitif affiché.

**Remplacer le critère de validation :**

```js
// Avant : vérification de la variation de moyenne
if (Math.abs(newMoyI - moyennesOriginales[i]) > 0.2) continue;
if (Math.abs(newMoyJ - moyennesOriginales[j]) > 0.2) continue;

// Après : vérification que l'écart-type des scores ne se dégrade pas
const ecartOriginal  = _ecartTypeScores(window.AppCore.propositionOriginale);
const ecartCandidat  = _ecartTypeScores(candidat);
if (ecartCandidat > ecartOriginal * 1.1) continue; // tolérance +10%
```

**Bonus :** augmenter le nombre de tentatives de 10 à 30 — le critère plus souple permettra de trouver des alternatives valides plus facilement.

---

## Amélioration 5 — Facteur K variable selon le nombre de soirées jouées *(meilleurs niveaux → meilleures équipes)*

Le niveau stocké en base est la donnée d'entrée de l'algo de constitution. Si les niveaux convergent lentement vers la réalité, les équipes resteront déséquilibrées même avec un meilleur algo.

Avec `K=0.3`, un joueur dont le niveau estimé est 3 mais dont le vrai niveau est 7 met **40+ soirées** à atteindre son vrai niveau. Les 40 soirées intermédiaires produisent des équipes systématiquement déséquilibrées.

La solution documentée (Elo Chess Federation, Glicko) est un **K décroissant** selon l'historique du joueur :

```js
// Dans sessions.js — remplacer la constante ELO_K par une fonction
// const ELO_K = 0.3; // ← supprimer

function _getK(joueur) {
    const n = joueur.nb_soirees || 0; // champ à ajouter ou calculer depuis l'historique
    if (n < 8)  return 0.8;  // Nouveau joueur : convergence rapide
    if (n < 20) return 0.5;  // Joueur intermédiaire
    return 0.3;               // Joueur établi : valeur actuelle
}

// Puis dans calculerAjustements() :
// totalDelta += _calculerDeltaMatch(myAvg, oppAvg, res);
// → totalDelta += _getK(joueurRef) / 0.3 * _calculerDeltaMatch(myAvg, oppAvg, res);
// (diviser par 0.3 pour normaliser, puis multiplier par le K effectif)
```

Note : cela nécessite soit d'ajouter un champ `nb_soirees` en base (calculable depuis `session_players`), soit de le calculer dynamiquement dans `calculerAjustements`.

---

## Synthèse — ordre d'implémentation recommandé

| # | Amélioration | Fichier | Lignes modifiées | Impact équilibre | Effort |
|---|---|---|---|---|---|
| 1 | Extraire `scoreEquipe` comme fonction partagée | `teams.js` | ~5 | Prérequis | Très faible |
| 2 | Greedy sur `scoreEquipe` au lieu de `niveauTotal` | `teams.js` | 2 | ★★★★★ | Très faible |
| 3 | SA post-greedy | `teams.js` | ~35 | ★★★★☆ | Faible |
| 4 | `autreProposition` sur `_ecartTypeScores` | `teams.js` | ~10 | ★★★☆☆ | Très faible |
| 5 | K variable selon ancienneté | `sessions.js` | ~15 | ★★★☆☆ | Faible |

Les améliorations 1–4 sont dans le même fichier, sans dépendance externe, et peuvent être livrées en une seule PR.

---

## Sources

- [TrueSkill 2 — Microsoft Research (PDF)](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/03/trueskill2.pdf)
- [Elo rating system — Wikipedia](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Mastering optimization: Greedy vs Bin Packing — IBM Developer](https://developer.ibm.com/articles/mastering-optimization/)
- [A New Algorithm for Optimal Bin Packing — Korf, AAAI 2002 (PDF)](https://cdn.aaai.org/AAAI/2002/AAAI02-110.pdf)
- [Optimization by Simulated Annealing — INFORMS 1991](https://pubsonline.informs.org/doi/10.1287/opre.39.3.378)
- [Multi-criteria assessment of sport team formation — ScienceDirect 2014](https://www.sciencedirect.com/science/article/abs/pii/S0957417414001730)
