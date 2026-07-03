# Migration FullCalendar → Vuetify Calendar

---

## ✅ Réalisé

### Dépendances

#### Moteur de calendrier
- Suppression de `@fullcalendar/core`, `@fullcalendar/vue3`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/list`
- Remplacement par `vuetify` v4 (`v-calendar`)

#### Formulaire d'édition
- Suppression de `@koumoul/vjsf` et `@koumoul/vjsf-markdown`
- Remplacement par `@data-fair/frame` : le formulaire est chargé dans un `<d-frame>` (iframe) pointant vers l'embed data-fair

#### Bibliothèques data-fair
- `@data-fair/lib-vue` : v1.20 → v1.27
- `@data-fair/lib-vuetify` : v1.9 → v2.3
- `@data-fair/dev-server` : v1 → v2

#### Nouvelles dépendances
- `reconnecting-websocket` : WebSocket auto-reconnectant pour le rafraîchissement après sauvegarde
- `ajv-formats` : validation de formats JSON Schema
- `@vueuse/core` : utilitaires Vue (dont `useDebounce`)

---

### Outillage de build

#### Vite
- v5 → v8
- `vite.config.js` → `vite.config.mjs` (ESM natif)
- Suppression des options spécifiques à VJSF (`commonjsDeps`, `optimizeDeps.include`)
- `@vitejs/plugin-vue` : v5 → v6

#### TypeScript
- L'ancienne version était en JavaScript pur (`.js`, `<script setup>` sans `lang`)
- Ajout de `tsconfig.json` avec mode strict, résolution `bundler`, alias `@/*`
- Tous les composables et composants migrés en `.ts` / `<script setup lang="ts">`
- Ajout de `vue-tsc` pour la vérification statique des types
- Ajout de `@data-fair/lib-types-builder` : génère `src/config/.type/index.d.ts` et `public/config-schema.json` depuis `src/config/schema.json`

#### ESLint
- `.eslintrc.cjs` (format legacy, `eslint-config-standard`) → `eslint.config.js` (flat config)
- Nouveau stack : `neostandard` + `eslint-plugin-vue` + `eslint-plugin-vuetify` + `@typescript-eslint/parser`

---

### Scripts npm

| Ancien | Nouveau | Notes |
|--------|---------|-------|
| `npm run dev` | `npm run dev` | Lance désormais Zellij |
| `df-dev-server` (inline dans `dev`) | `npm run dev-server` | Séparé, via `cross-env` |
| `vite` (inline dans `dev-src`) | `npm run dev-app` | Séparé, port 3000 |
| *(absent)* | `npm run build-types` | Génère les types de config |
| *(absent)* | `npm run type-check` | `vue-tsc --noEmit` |
| `eslint . --ext .vue,.js,...` | `eslint . --fix` | Flat config, détecte les extensions seule |

#### Zellij
Ajout de `.zellij.kdl` : `npm run dev` ouvre un layout à trois panneaux — terminal libre, `dev-app` (Vite), `dev-server` (df-dev-server).

---

### Architecture applicative

#### État global : `context.js` → `createConfig` / `useConfig`

**Ancienne version** : un module singleton `context.js` exportait des `ref` et `computedAsync` globaux (`events`, `colorPalette`, `timestamp`) partagés par import direct entre composants. L'état n'était pas réactif aux messages `postMessage` de la page parente.

**Nouvelle version** : plugin Vue `createConfig()` (injecté via `app.use()`) expose l'état via `useConfig()`. Tout est réactif (`ref`, `computed`). La config se met à jour dynamiquement via `window.addEventListener('message', ...)` lors des modifications dans le panneau de configuration du dashboard.

#### `useAppInfo` → `useConfig`

**Ancienne version** : `useAppInfo.js` retournait des valeurs statiques calculées une seule fois au montage. Jetait une erreur si le dataset ou le champ libellé était manquant.

**Nouvelle version** : `config.ts` expose des `computed` réactifs. Les erreurs sont exposées via `error` et affichées par `App.vue` sans interrompre le cycle de vie de l'application.

#### Thème dynamique

**Ancienne version** : `defaultOptions(reactiveSearchParams)` de `@data-fair/lib-vuetify` — thème statique calculé à l'initialisation.

**Nouvelle version** : `createSession()` + `vuetifySessionOptions(session)` — le thème est piloté par la session utilisateur et peut changer dynamiquement (dark/light, couleurs primaires).

#### Fetch des données

**Ancienne version** : `computedAsync` + `ofetch` directement dans `context.js` pour toutes les requêtes.

**Nouvelle version** :
- `useFetch` de `@data-fair/lib-vue` pour les requêtes déclaratives (événements, palette de couleurs) — gestion automatique du cycle de vie et de l'annulation
- `ofetch` conservé uniquement pour les requêtes impératives (planning `loadMore`)
- Debounce de 300 ms sur la query des événements (`useDebounce` de `@vueuse/core`) pour éviter les rafraîchissements trop fréquents lors des changements de vue ou de filtres

---

### Configuration

#### Champs supprimés (VJSF)
Les champs `formDensity`, `formVariant`, `formLayout` et `showHelpMessages` ont été retirés du schéma. Ils pilotaient VJSF embarqué directement dans l'application. Depuis le passage à `<d-frame>`, le formulaire est rendu par data-fair lui-même et n'expose aucun de ces paramètres.

#### Nouveaux champs — section "Edition" (jeux de données REST uniquement)
- **`formWidth`** : largeur du dialogue d'édition (en dixièmes de la largeur de l'écran).
- **`minDate`** / **`maxDate`** : contraintes de date. Bloquent le drag, le resize et la création côté calendrier.

#### Nouveaux champs — section "Source de données"
- **`staticFilters`** : filtres prédéfinis appliqués à toutes les requêtes, compatibles avec le système `concept-filters` des dashboards. Trois types : `in` (restreindre à des valeurs), `interval` (intervalle), `out` (exclure des valeurs).

---

### Fonctionnalités nouvelles

#### Vues
- Vue **planning** (liste infinie avec chargement progressif) remplace `listNextYear`
- Sélecteur de date via clic sur le titre (date picker) en vues mois, semaine et jour

#### Affichage des événements
- Événements multi-jours scindés en segments par jour, avec compteur "Jour X/N"
- Événements ponctuels (sans durée) affichés distinctement
- Indicateur de l'heure courante et surbrillance du jour actuel en vues semaine/jour
- Événements de fin de nuit repositionnés pour lisibilité

#### Edition (jeux de données REST)
- Drag & drop et redimensionnement en vues semaine/jour
- Sélection de plage horaire pour création rapide

#### Filtres et intégration dashboard
- `staticFilters` : filtres prédéfinis appliqués à toutes les requêtes (vues calendrier et planning)
- Les filtres de contexte du dashboard (`_c_*`, `_d_*`) sont automatiquement pris en compte

#### Navigation et URL
- Vue et date de navigation persistées dans l'URL (`?view=`, `?date=`)
- `openOnCurrentDay` respecte les paramètres URL si l'utilisateur a déjà navigué

---

### Rafraîchissement après sauvegarde

Le formulaire d'édition (`EventEdit.vue`) est chargé dans un `<d-frame>` pointant vers `/data-fair/embed/dataset/{id}/form`. Le calendrier ne peut pas intercepter directement la soumission du formulaire.

Deux mécanismes déclenchent le rafraîchissement :

1. **WebSocket (primaire)** : `EventEdit` souscrit au journal du jeu de données (`datasets/{id}/journal`) via `useWS('/data-fair')`. Lorsque data-fair émet `finalize-end`, la popup se ferme et les données sont rechargées.
2. **Timeout (fallback)** : si le WebSocket ne répond pas dans 1,5 s (ex. dev sans proxy), un `setTimeout` déclenche la fermeture et le rafraîchissement.

Le `timestamp` (ref exportée par `useCalendarData.ts`) est le signal partagé qui déclenche le re-fetch dans toutes les vues.

---

## ⏳ Reste à faire

### Pré-remplissage des dates dans le formulaire d'édition

Lors d'un ajout, d'un drag ou d'un resize, les dates cibles sont calculées côté calendrier avant l'ouverture de l'iframe. Ces valeurs sont loguées dans la console (`[EventEdit] default dates`) **en attente du support par l'API embed data-fair**.

Quand ce support sera disponible, il suffira de compléter le `TODO` dans `EventEdit.vue` (`src` computed) en ajoutant `defaultStart` et `defaultEnd` à l'URL. La prop `pendingEvent` contient les nouvelles dates issues du drag/resize (prioritaires sur les données API de `item`).

### Contraintes `minDate` / `maxDate` dans le formulaire d'édition

Ces contraintes bloquent le drag, le resize et la création d'événements côté calendrier. En revanche, elles **ne sont pas appliquées dans le formulaire de modification** (iframe data-fair) : l'API embed ne supporte pas encore le passage de ces paramètres via URL. Un utilisateur peut donc saisir manuellement une date hors bornes dans le formulaire. Ces champs sont conservés dans le schéma en prévision d'une évolution future de l'API embed.

---

## ⚠️ Problèmes connus

### Limitations du dev-server

Ces comportements sont des limitations de `@data-fair/dev-server` et ne peuvent pas être corrigés depuis l'application.

#### Bouton "VIDER" efface tout au lieu de réinitialiser

Cliquer sur "VIDER" envoie `PUT /config` avec `{}`, ce qui écrase `.dev-config.json` avec un objet vide. Le formulaire de configuration disparaît jusqu'au prochain rechargement.

**Contournement** : conserver une sauvegarde de `.dev-config.json` (ex. `.dev-config.backup.json`).

#### Absence de reset des champs lors du changement de dataset

Lorsqu'on change le jeu de données, les mappings de champs (label, couleur, etc.) ne sont pas réinitialisés. Ces références pointent vers des clés inexistantes dans le nouveau dataset, ce qui déclenche une erreur de requête.

Le calendrier se vide et recharge correctement, mais les champs de configuration restent tels quels côté dev-server.
