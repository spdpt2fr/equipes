# Analyse et refonte de la formule du score compétitif

> Sources : SAS DO Loop (2021), Lucifora & Simmons (2003), Sports Gini (Medium/Harvard),  
> Massey Rating System, geometric decay weighting (GITTA)  
> Date : 2026-04-15

---

## 1. Problèmes de la formule actuelle

```
score = Σtop6 × 0.60 + n1 × 0.25 + n2 × 0.15
```

**Trois défauts structurels :**

**a) Double comptage trop fort.** n1 et n2 sont déjà inclus dans Σ, puis re-pondérés individuellement. Le poids effectif du meilleur joueur est `0.60 × (1/6) + 0.25 = 0.35` et non pas 0.25. Ce n'est pas un problème en soi, mais le résultat est contre-intuitif.

**b) Le terme total (0.60) est trop dominant.** Deux équipes de même Σ obtiennent des scores très proches même si l'une a une "star" à niveau 9 et l'autre est parfaitement homogène. La formule est peu sensible à la distribution interne du talent.

**c) La formule s'arrête au 2e joueur.** Les 3e et 4e joueurs, pourtant décisifs dans un sport à 6 joueurs sur le terrain, n'ont aucun poids individuel. Seule la somme les capture, de façon indifférenciée.

---

## 2. Fondements théoriques

### 2a. Décroissance géométrique (SAS DO Loop, 2021)

La méthode de pondération par position la plus documentée en classification sportive est la **décroissance géométrique** : chaque rang vaut une fraction fixe du rang précédent.

L'exemple canonique des médailles olympiques (SAS) :
```
w = (4, 2, 1) / 7 ≈ (0.571, 0.286, 0.143)
```
→ ratio q = 0.5 entre chaque rang (or = 2 × argent = 4 × bronze).

Pour 4 joueurs avec le même ratio 0.5 :
```
w = (8, 4, 2, 1) / 15 ≈ (0.533, 0.267, 0.133, 0.067)
```
Ce ratio est assez agressif. Un ratio plus doux (q ≈ 0.63) est plus adapté au contexte sportif amateur où l'écart entre joueurs est modéré.

### 2b. Effet "superstar" (Lucifora & Simmons, 2003 ; Sports Gini)

La recherche sur le football professionnel (Lucifora & Simmons, *Journal of Sports Economics*, 2003) montre que la relation performance/salaire est **hautement convexe** : un joueur deux fois meilleur qu'un autre contribue plus que deux fois à la performance de l'équipe.

L'analyse NBA via le "Sports Gini" (coefficient de concentration du talent par équipe) montre qu'un taux de concentration optimal autour de **~24% du talent total sur le meilleur joueur** maximise les victoires. En d'autres termes, une star clairement identifiée vaut plus que sa part arithmétique.

**Conséquence pour la formule :** le 1er joueur mérite un poids significativement supérieur à sa part proportionnelle dans le total, et ce poids doit décroître rapidement sur les positions suivantes.

### 2c. Système de Massey (rating mathématique)

Le système Massey (utilisé pour le classement NCAA et NFL) exprime la force d'une équipe comme une combinaison pondérée de ses composantes individuelles, avec des coefficients optimisés sur les résultats historiques. Le principe : minimiser l'erreur de prédiction sur les matchs passés pour trouver les bons poids.

**Application ici :** une fois suffisamment de soirées enregistrées (> 30), les poids de la formule pourraient être calibrés empiriquement sur les données Supabase pour minimiser l'écart entre score prédit et résultat réel.

---

## 3. Deux formules proposées

Les deux formules partagent le même principe :
- Terme collectif **réduit** (Σ × α, avec α < 0.40)
- Quatre termes individuels décroissants (positions 1 à 4)
- Somme des poids = 1.00

### Formule A — Décroissance douce (q ≈ 0.65)

```
score = Σtop6 × 0.25 + n1 × 0.35 + n2 × 0.23 + n3 × 0.11 + n4 × 0.06
```

| Terme | Poids | Ratio avec rang suivant |
|---|---|---|
| Σtop6 (collectif) | 0.25 | — |
| n1 (meilleur) | 0.35 | ×1.52 |
| n2 (2e) | 0.23 | ×2.09 |
| n3 (3e) | 0.11 | ×1.83 |
| n4 (4e) | 0.06 | — |
| **Total** | **1.00** | |

Adapté quand les équipes ont des niveaux assez homogènes entre elles. Conserve une importance notable au collectif.

### Formule B — Décroissance forte, collectif minimal *(recommandée)*

```
score = Σtop6 × 0.15 + n1 × 0.40 + n2 × 0.25 + n3 × 0.13 + n4 × 0.07
```

| Terme | Poids | Ratio avec rang suivant |
|---|---|---|
| Σtop6 (collectif) | 0.15 | — |
| n1 (meilleur) | 0.40 | ×1.60 |
| n2 (2e) | 0.25 | ×1.92 |
| n3 (3e) | 0.13 | ×1.86 |
| n4 (4e) | 0.07 | — |
| **Total** | **1.00** | |

Ratio individuel moyen ≈ 0.63 entre rangs (proche du ratio SAS ramené de 0.5 à 0.63 pour plus de douceur). Le collectif ne représente plus que 15% — les 4 meilleurs joueurs portent 85% du score.

---

## 4. Validation numérique

Six équipes de test avec Σ identiques au sein de chaque paire.

### Paire 1 — Σ = 24 : une star vs équipe homogène

| Équipe | Composition | Σ | Formule actuelle | Formule A | Formule B |
|---|---|---|---|---|---|
| **A** — une star | {9, 3, 3, 3, 3, 3} | 24 | 17.10 | 10.35 | **8.55** |
| **B** — homogène | {4, 4, 4, 4, 4, 4} | 24 | 16.00 | 9.00 | **7.00** |
| **Ratio A/B** | | | +6.9% | +15.0% | **+22.1%** |

### Paire 2 — Σ = 24 : deux bons joueurs vs équipe homogène

| Équipe | Composition | Σ | Formule actuelle | Formule A | Formule B |
|---|---|---|---|---|---|
| **C** — deux bons | {7, 6, 4, 3, 2, 2} | 24 | 17.05 | 10.45 | **8.63** |
| **D** — homogène | {4, 4, 4, 4, 4, 4} | 24 | 16.00 | 9.00 | **7.00** |
| **Ratio C/D** | | | +6.6% | +16.1% | **+23.3%** |

→ Note : C > A en Formula B (8.63 > 8.55), alors qu'en formule actuelle A > C (17.10 > 17.05).
C'est **correct** : une équipe avec deux bons joueurs bat plus fiablement une équipe avec un seul
excellent joueur entouré de joueurs faibles.

### Paire 3 — Σ = 30 : top-4 forts vs deux groupes homogènes

| Équipe | Composition | Σ | Formule actuelle | Formule A | Formule B |
|---|---|---|---|---|---|
| **E** — top-4 fort | {8, 7, 5, 4, 3, 3} | 30 | 21.05 | 12.70 | **10.38** |
| **F** — 2 niveaux | {6, 6, 6, 4, 4, 4} | 30 | 20.40 | 11.88 | **9.46** |
| **Ratio E/F** | | | +3.2% | +6.9% | **+9.7%** |

---

## 5. Recommandation

**Formule B** est recommandée pour les raisons suivantes :

1. **Elle correspond au sport.** En hockey subaquatique, les 4 premiers joueurs (en termes de niveau) ont un impact déterminant sur l'issue du match — ils sont sur le terrain le plus longtemps et prennent les décisions clés. Les joueurs 5 et 6 comptent mais comme fond de banc.

2. **Elle est cohérente avec la recherche.** Le ratio décroissant ≈ 1.7 entre positions reflète la convexité de la performance documentée par Lucifora & Simmons (2003), et le ratio total est proche des poids géométriques SAS (q ≈ 0.63 vs 0.50 pour les médailles olympiques, ce dernier étant intentionnellement plus agressif).

3. **Elle différencie mieux les équipes à même total.** La formule actuelle donne +6.9% pour une équipe avec une star (paire 1). La Formule B donne +22.1% — plus proche de ce qu'on observe sur le terrain.

4. **Elle préserve un plancher collectif (15%).** Deux équipes sans star mais avec des profondeurs différentes ne seront pas confondues (le Σ garde son rôle discriminant, juste atténué).

---

## 6. Implémentation — modification de `scoreEquipe` dans `teams.js`

La modification porte uniquement sur les coefficients dans la fonction `scoreEquipe`, une fois celle-ci extraite comme fonction de module (voir `AGENT-INSTRUCTIONS.md`, §1a).

**Remplacer** les valeurs actuelles :
```js
// AVANT
return { score: total * 0.6 + meilleur * 0.25 + second * 0.15, ... }
```

**Par** (Formule B, cas ≤ 6 joueurs) :
```js
// APRÈS — Formule B : collectif 0.15 + décroissance géométrique sur positions 1–4
const troisieme = joueursOrdonnes[2] ? joueursOrdonnes[2].niveau || 0 : 0;
const quatrieme = joueursOrdonnes[3] ? joueursOrdonnes[3].niveau || 0 : 0;

return {
    score: total * 0.15 + meilleur * 0.40 + second * 0.25 + troisieme * 0.13 + quatrieme * 0.07,
    meilleur,
    second,
    troisieme,
    quatrieme,
    joueursIgnores: []
};
```

Pour le cas > 6 joueurs, la même logique s'applique avec `top = joueursOrdonnes.slice(0, 6)` :
```js
const troisieme = joueursPrisEnCompte[2] ? joueursPrisEnCompte[2].niveau || 0 : 0;
const quatrieme = joueursPrisEnCompte[3] ? joueursPrisEnCompte[3].niveau || 0 : 0;

return {
    score: total * 0.15 + meilleur * 0.40 + second * 0.25 + troisieme * 0.13 + quatrieme * 0.07,
    meilleur,
    second,
    troisieme,
    quatrieme,
    joueursIgnores
};
```

### Mise à jour de l'affichage dans `afficherEquipes`

Le détail affiché sous chaque équipe (ligne "Score compétitif") doit refléter les 4 termes :

```js
// Remplacer l'affichage actuel par :
html += `<div class="team-total">
    Score compétitif : ${scoresObj[idx].score.toFixed(2)}<br>
    <span style="font-size:12px;">
        (Collectif×0.15 : ${(totalPrisEnCompte * 0.15).toFixed(2)}
        | 1er×0.40 : ${(scoresObj[idx].meilleur * 0.40).toFixed(2)}
        | 2e×0.25 : ${(scoresObj[idx].second * 0.25).toFixed(2)}
        | 3e×0.13 : ${(scoresObj[idx].troisieme * 0.13).toFixed(2)}
        | 4e×0.07 : ${(scoresObj[idx].quatrieme * 0.07).toFixed(2)})
    </span>
</div>`;
```

### Mise à jour de l'onglet "Comment ça marche"

Dans `ui.js`, `afficherAlgorithme()`, remplacer la formule affichée :

```
// FR :
Score = Σ niveaux × 0,15 + 1er joueur × 0,40 + 2e × 0,25 + 3e × 0,13 + 4e × 0,07

// EN :
Score = Σ levels × 0.15 + 1st player × 0.40 + 2nd × 0.25 + 3rd × 0.13 + 4th × 0.07
```

---

## Sources

- [A comparison of different weighting schemes for ranking sports teams — SAS DO Loop](https://blogs.sas.com/content/iml/2021/08/18/ranking-teams-weights.html)
- [Rankings and the geometry of weighted averages — SAS DO Loop](https://blogs.sas.com/content/iml/2021/08/16/geometry-weighted-averages.html)
- [Superstar Effects in Sport — Lucifora & Simmons, Journal of Sports Economics, 2003](https://journals.sagepub.com/doi/10.1177/1527002502239657)
- [The Sports Gini: Evaluating Whether Stars Matter More — Medium](https://mau-zachrisson.medium.com/the-sports-gini-evaluating-whether-stars-matter-more-in-the-playoffs-9779f86b8cbb)
- [Massey Rating System — masseyratings.com](https://masseyratings.com/theory/massey.htm)
- [Weighting by ranking — GITTA (geometric positional weights)](http://www.gitta.info/Suitability/en/html/Normalisatio_learningObject1.html)
- [Ranked Positional Weight Calculator — Calculator Academy](https://calculator.academy/ranked-positional-weight-calculator/)
