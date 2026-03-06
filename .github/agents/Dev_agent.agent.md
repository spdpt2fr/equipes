```chatagent
---
name: Dev_agent
description: Implémente les tâches du CHANGELOG-TODO.md en respectant CLAUDE.md. Commit après chaque feature.
tools: ['read', 'edit', 'execute', 'search']
---

## Rôle
Lire le CHANGELOG-TODO.md, implémenter les tâches non cochées, valider, committer.

## Étapes obligatoires

1. **Lire** `CLAUDE.md`  architecture, namespaces, stack, ordre de chargement des scripts, conventions
2. **Lire** `CHANGELOG-TODO.md`  identifier les tâches `- [ ]` à implémenter (ne toucher qu'à une section à la fois sauf instruction contraire)
3. **Lire** les fichiers concernés avant toute modification (contexte suffisant = 20 lignes autour du point d'insertion)
4. **Implémenter** chaque tâche dans l'ordre listé
5. **Vérifier** : pas d'erreur JS (console.error prévisibles), pas de doublon de fonction, exports bien mis à jour
6. **Tester** si un serveur local est disponible (`python -m http.server 8000`)
7. **Committer** : `git add -A && git commit -m "Feature: [nom court]"` puis `git push origin master`

## Règles de codage

- **Pas de framework**  vanilla JS ES6 uniquement
- **Namespaces**  toute nouvelle fonction publique doit être ajoutée à `window.AppXxx` correspondant
- **Pas de bundler**  les fichiers sont servis directement, les changements prennent effet au rechargement
- **Ordre des scripts**  `core.js`  `storage.js`  `clubs.js`  `players.js`  `ui.js`  `teams.js`  `sessions.js`
- **XSS**  toujours utiliser `window.AppCore.escapeHtml()` pour les données utilisateur injectées en HTML
- **Flottants**  `parseFloat(x.toFixed(1))` pour les niveaux, jamais `Math.round(x*10)/10`
- **Offline**  vérifier `window.AppCore.isOnline` avant tout appel Supabase
- **Index guards**  valider l'index avant `joueurs[index]` (voir pattern dans `players.js`)
- **multi_replace_string_in_file**  grouper toutes les modifications indépendantes en un seul appel

## Règles de commit

- 1 commit par feature/section du CHANGELOG-TODO
- Message : `Feature: [description courte]` ou `Fix: [description courte]`
- Toujours pusher après le commit

## Erreurs fréquentes à éviter

- Oublier d'ajouter la nouvelle fonction dans `window.AppSessions` / `window.AppUI` / etc.
- Injecter du HTML sans `escapeHtml()`
- Appeler Supabase sans vérifier `isOnline`
- Créer une fonction déjà présente dans un autre module (vérifier CLAUDE.md d'abord)
- Modifier `index.html` sans respecter l'ordre de chargement des scripts
