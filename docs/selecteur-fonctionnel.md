# Description fonctionnelle — Vue "Sélectionneur"

> Rédigée le 2026-04-15  
> Statut : validée, prête pour développement

---

## 1. Contexte et objectif

Le niveau attribué à chaque joueur est une donnée sensible. Sa divulgation pourrait créer des tensions au sein du groupe. Il est cependant nécessaire que certains utilisateurs puissent participer à la constitution des équipes et à l'enregistrement des résultats, sans jamais avoir connaissance des niveaux individuels.

L'objectif est donc de proposer une **vue restreinte accessible librement**, permettant de réaliser ces tâches sans exposer aucune donnée de niveau ou de score.

---

## 2. Accès et identification

- La vue restreinte est accessible via une **URL séparée** de la vue administrateur.
- Elle ne nécessite **aucune authentification** : toute personne connaissant l'URL peut y accéder.
- La vue administrateur (URL existante) reste inchangée dans son fonctionnement et son accès.
- Il n'existe qu'un seul accès partagé à la vue restreinte (pas de comptes individuels).

---

## 3. Règle générale transversale

**Aucune valeur numérique de niveau ou de score ne doit apparaître à l'écran**, quelle que soit la page, la section ou l'action en cours. Cette règle s'applique à tous les onglets sans exception.

---

## 4. Onglet "Équipes"

### 4.1 Sélection du club
- Le sélecteur de club (Grenoble / Jeeves) est présent et fonctionnel.

### 4.2 Création de joueur
- Le formulaire permettant d'ajouter un nouveau joueur est **entièrement absent** de la page.
- Il n'est pas possible de créer, modifier ou supprimer un joueur depuis cette vue.

### 4.3 Liste des joueurs
- La liste des joueurs disponibles est affichée.
- Pour chaque joueur, sont visibles : **nom, poste, groupe, statut actif/inactif**.
- Le **niveau n'apparaît pas**, ni dans la liste, ni dans aucun champ ou colonne.
- La recherche par nom et par poste est possible. La recherche par niveau est absente.
- Le tri alphabétique est disponible. Le tri par niveau est absent.

### 4.4 Constitution des équipes
- L'utilisateur peut choisir le nombre d'équipes à constituer et lancer la génération.
- Le **choix de la méthode de constitution** (niveau total / score compétitif) est absent : la méthode utilisée est déterminée automatiquement sans que l'utilisateur n'ait à le savoir.
- Les équipes générées sont affichées avec la liste des joueurs qui les composent.
- Le **niveau total de chaque équipe n'est pas affiché**.
- La composition des équipes peut être **modifiée manuellement par glisser-déposer** entre équipes.

### 4.5 Validation et enregistrement
- L'utilisateur peut valider la composition des équipes pour créer une soirée.
- Après validation, l'interface de saisie des résultats apparaît.

### 4.6 Saisie des résultats
- Pour chaque match de la soirée, l'utilisateur indique :
  - quelle équipe a gagné, **ou**
  - match nul, **ou**
  - match non joué.
- Les équipes sont identifiées par leur numéro et la liste de leurs joueurs (sans niveau).
- L'utilisateur peut enregistrer ces résultats.

---

## 5. Onglet "Historique"

- L'historique des soirées passées est **accessible librement**.
- Pour chaque soirée, sont visibles : la date, la composition des équipes, et le résultat de chaque match (équipe gagnante ou match nul).
- **Aucun niveau ou score de joueur n'apparaît** dans les données historiques.

---

## 6. Onglet "Stats"

- L'onglet est **visible et accessible**.
- Le tableau des statistiques est affiché avec, pour chaque joueur : nom, points, victoires, nuls, défaites, nombre de matchs joués, pourcentage de victoires.
- Le **menu déroulant d'évolution du niveau** — qui s'affiche en cliquant sur une ligne joueur et présente l'historique chronologique de son niveau — est **entièrement absent** : ni la flèche indicatrice, ni le contenu masqué ne sont présents dans la page.
- Le bouton **"Exporter CSV"** des statistiques est **absent**.

---

## 7. Onglet "Comment ça marche"

- Accessible sans restriction, identique à la vue administrateur.

---

## 8. Import / Export

- Les fonctions d'import et d'export de données (joueurs, matchs, tout) sont **entièrement absentes** de la vue restreinte.
- Seul le bouton de synchronisation avec la base de données reste accessible.

---

## 9. Ce que cette vue ne change pas

- Les données enregistrées (compositions d'équipes, résultats) sont les mêmes que celles consultées par l'administrateur.
- Le calcul interne des niveaux (mis à jour après chaque soirée) continue de fonctionner normalement côté administrateur — la vue restreinte n'interfère pas avec ce mécanisme.
