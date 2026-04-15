# Analyse du système de score compétitif — `teams.js`

> Fichier source : `assets/js/teams.js`  
> Date d'analyse : 2026-04-15

---

## 1. Vue d'ensemble

Le score compétitif sert à deux choses :

1. **Afficher** l'équilibre de chaque équipe constituée (affiché quand "Afficher totaux" est activé).
2. **Calculer le rapport de force** entre équipes (section "Rapport de force entre équipes").

Il est calculé dans la fonction interne `scoreEquipe(equipe)`, définie à l'intérieur de `afficherEquipes()`.

---

## 2. La formule du score compétitif

```
score = total × 0.6 + meilleur × 0.25 + second × 0.15
```

| Variable | Définition |
|---|---|
| `total` | Somme des niveaux de tous les joueurs (limité aux 6 meilleurs si l'équipe > 6 joueurs) |
| `meilleur` | Niveau du meilleur joueur (1er après tri décroissant) |
| `second` | Niveau du 2e meilleur joueur |

**Interprétation des poids :**
- La **somme collective** (0.6) est le facteur dominant — l'équipe profondeur de banc compte.
- Le **meilleur joueur** (0.25) a un impact significatif — une "star" élève le score.
- Le **second meilleur** (0.15) complète la lecture du potentiel offensif de tête.

### Cas particulier : équipe de plus de 6 joueurs

Si `equipe.joueurs.length > 6` :
- Seuls les **6 joueurs les mieux classés** entrent dans le calcul.
- Les joueurs au-delà du rang 6 sont listés en rouge dans l'UI sous le label *"Joueur(s) non pris en compte"*.

```js
// Extrait simplifié
const joueursOrdonnes = [...equipe.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
if (joueursOrdonnes.length > 6) {
    const joueursPrisEnCompte = joueursOrdonnes.slice(0, 6);
    const total = joueursPrisEnCompte.reduce((acc, j) => acc + (j.niveau || 0), 0);
    const meilleur = joueursPrisEnCompte[0].niveau;
    const second  = joueursPrisEnCompte[1].niveau;
    score = total * 0.6 + meilleur * 0.25 + second * 0.15;
}
```

---

## 3. Rapport de force entre équipes

Affiché dans la section "Rapport de force entre équipes" pour chaque paire `(Équipe i, Équipe j)` :

```
ratio = score_i / score_j
part_i (%) = ratio × 100 / (1 + ratio)
part_j (%) = 100 / (1 + ratio)
```

**Exemple :** si Équipe 1 score = 32 et Équipe 2 score = 28 :
- ratio = 32/28 ≈ 1.14
- Équipe 1 : 53.3% / Équipe 2 : 46.7%

---

## 4. Algorithme de constitution des équipes (`creerEquipes`)

La création des équipes est un algorithme **glouton par niveauTotal croissant** avec gestion des groupes imposés.

### Étape 1 — Séparation groupes / sans groupe

```
joueursActifs → {groupes: {id → [joueurs]}, sansGroupe: [joueurs]}
```

Les joueurs ayant un `groupe` non nul sont regroupés et traités en bloc pour garantir qu'ils restent ensemble dans la même équipe.

### Étape 2 — Distribution des groupes

Pour chaque groupe (trié par niveau décroissant en interne) :
1. Trier les équipes par `niveauTotal` croissant.
2. Affecter **tous les joueurs du groupe** à l'équipe la plus faible (indice 0 après tri).

### Étape 3 — Distribution des joueurs sans groupe

Triés par niveau décroissant, puis pour chaque joueur :
1. Trier les équipes par `niveauTotal` croissant.
2. Affecter le joueur à l'équipe la plus faible.

### Résolution du poste "indifferent"

À chaque affectation, si `joueur.poste === 'indifferent'` :
```
poste affecté = (nbAvants ≤ nbArrières) ? 'avant' : 'arriere'
```
Ce mécanisme tente d'équilibrer la répartition avant/arrière au sein de chaque équipe.

---

## 5. Génération d'alternatives (`autreProposition`)

Permet de produire une composition différente sans dégrader l'équilibre.

### Principe

On part de `propositionOriginale` (la première composition générée) et on applique **1 à 3 échanges de joueurs** entre équipes différentes.

### Contraintes d'un échange valide

| Contrainte | Valeur |
|---|---|
| Joueurs avec groupe | Exclus (groupes ne doivent pas être brisés) |
| Écart de niveau entre les 2 joueurs échangés | ≤ 1 point |
| Variation de la moyenne d'équipe après échange | ≤ ±0.2 par équipe |
| Unicité de la configuration | Vérifiée via signature `_signatureEquipes` |

### Algorithme

1. Construire la liste de tous les swaps valides.
2. Mélanger aléatoirement (Fisher-Yates).
3. Sélectionner 1 à 3 swaps non conflictuels (aucun joueur ne peut apparaître dans 2 swaps).
4. Appliquer les swaps sur un clone de `propositionOriginale`.
5. Vérifier que **toutes** les moyennes d'équipe restent dans ±0.2 de l'original.
6. Vérifier que la signature est nouvelle (pas déjà proposée).
7. Maximum **10 tentatives** ; si toutes échouent → toast "Toutes les variantes proches ont été explorées".

### Signature d'une configuration

```js
function _signatureEquipes(equipes) {
    return equipes
        .map(e => e.joueurs.map(j => j.id).sort((a,b) => a-b).join(','))
        .sort()
        .join('|');
}
```

Identifiant canonique basé sur les IDs de joueurs par équipe, trié pour être indépendant de l'ordre.

---

## 6. Résumé visuel du pipeline

```
Joueurs actifs
     │
     ├── Avec groupe ─→ Triés par niveau ─→ Affectés en bloc à l'équipe la + faible
     │
     └── Sans groupe ─→ Triés par niveau ─→ Affectés un à un à l'équipe la + faible
                                                         │
                                              niveauTotal mis à jour à chaque étape
                                                         │
                                              Score compétitif calculé à l'affichage :
                                              score = Σniveaux×0.6 + max×0.25 + 2emax×0.15
```

---

## 7. Points d'attention / pistes d'amélioration potentielles

- **Plafond à 6 joueurs** : le plafond est fixe ; si les équipes ont régulièrement 7-8 joueurs, certains joueurs n'influencent jamais le score.
- **Poids arbitraires** : les coefficients 0.6 / 0.25 / 0.15 ne sont pas configurables. Un paramétrage via l'interface pourrait les rendre ajustables.
- **`autreProposition` part toujours de `propositionOriginale`** : les variantes sont toujours des variantes de la composition initiale, pas des recompositions complètes.
- **La résolution du poste `indifferent`** est locale et séquentielle : elle ne garantit pas un équilibre avant/arrière global optimal entre équipes.
