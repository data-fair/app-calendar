# Audit app-calendar — Reste à faire

Issue tracker issu de l'audit du 2026-07-03. Les corrections P0 sont déjà appliquées (bug copier-coller `useCalendarData.ts:135`, réactivité `conceptFilters`, suppression `MIGRATION.md`) ainsi que P1-2 (migration vers `useUiNotif`).

---

## P1 — Haut (correctness, cohérence, dead code)

### P1-1 — Dead code `dFrameAdapter` / `accessKey` (décision : garder avec TODO)
**Décision prise** : conserver le squelette pour une future migration `<d-frame>` (embeds table/visu dans la fiche détails).

- [ ] Poser un commentaire `// TODO: reserved for future d-frame migration (embeds in EventDetails)` dans `src/composables/config.ts` au niveau de `dFrameAdapter` (L36) et `accessKey` (L40, L150-151)
- [ ] Poser un commentaire `// TODO: used by future d-frame embeds` dans `src/main.ts:11` sur l'import `@data-fair/frame/lib/d-frame`
- [ ] Vérifier que `ConfigState` (L32-33) expose bien les deux champs pour la consommation future

### P1-3 — `usePlanningData.ts:97` `ofetch` direct pour un GET
- [ ] Remplacer `ofetch(url)` dans `loadMore` par `useFetch` avec URL `computed(() => nextUrl.value)` retriggerable
- [ ] Gérer `finalizedAt` en mode `simple` comme dans `useCalendarData.ts:37` (cache DataFair)
- [ ] Si la pagination impérative rend le pattern déclaratif trop intrusif, documenter l'exception en commentaire
- [ ] Vérifier le test E2E `06-planning-view` (pagination, sentinel, load more)

### P1-4 — `return` vide dans `.map` `useCalendarData.ts:102`
```ts
if (!labelField.value || labelField.value === undefined) return
```
- [ ] Remplacer par `return []`
- [ ] Idéalement sortir ce check avant le `.map` (invariant de boucle) pour éviter de l'évaluer N fois
- [ ] Ajouter un test E2E avec dataset sans labelField → événements vides, pas d'`undefined` dans le tableau

### P1-5 — Validation `error` incomplète `config.ts:89`
Seuls "pas de config" et "pas de dataset" gérés.
- [ ] Étendre le computed `error` :
  ```ts
  if (!labelField.value) return 'Veuillez sélectionner un champ de libellé'
  if (!startDateField.value && !dateField.value) return 'Aucun champ de date trouvé dans le dataset'
  ```
- [ ] Vérifier que `App.vue` affiche bien le `v-empty-state` pour ces nouveaux cas
- [ ] Ajouter un test E2E `01-no-config` pour ces deux nouveaux cas d'erreur

---

## P2 — Moyen

### P2-1 — `App.vue:9` POST d'erreur non wrappé
```ts
ofetch(window.APPLICATION.href + '/error', { body: { message }, method: 'POST' })
```
- [ ] Encapsuler dans `useAsyncAction` OU au minimum `.catch(() => {})` pour éviter une promesse rejetée non gérée
- [ ] Alternative : `useUiNotif` local pour logger côté UI en plus du POST serveur

### P2-2 — `EventDetails.vue:5` import avec extension `.js`
```ts
import { timestamp } from '@/composables/useCalendarData.js'
```
- [ ] Retirer l'extension → `'@/composables/useCalendarData'`
- [ ] Uniformiser avec le reste du projet (vérifier qu'aucun autre import n'a ce défaut)

### P2-3 — `index.html` méta tags
- [ ] L11 : `content="thumbnail.png"` → `content="%PUBLIC_URL%/thumbnail.png"` (convention DataFair)
- [ ] L9 : `<meta name="df:vjsf" content="3" />` alors que `@koumoul/vjsf: ^4.3.1` — vérifier la convention DataFair (probablement `content="4"` ou suppression)
- [ ] L6 : `df:overflow` non documenté dans le skill apps — à valider avec l'équipe DataFair

### P2-4 — `useDragResize.ts` couplage DOM Vuetify
`document.querySelector('.v-calendar-daily__scroll-area')` (L122) et `.v-calendar-daily__day` (L136).
- [ ] Centraliser les sélecteurs en constantes exportées en haut de fichier
- [ ] Idéalement passer par des `ref` templated (`<v-calendar ref="calendar">` + traversal via instance Vue)
- [ ] Risque : casser au moindre bump Vuetify. Ajouter un test E2E drag-resize qui capture ce couplage

---

## P3 — Bas

### P3-1 — `config.ts:95` `setConfig(newConfig: any)`
- [ ] Typer en `Config` (type généré dans `src/config/.type/index.d.ts`)

### P3-2 — `Calendar.vue:222` `watch deep: true` inutile
`events` est un `computed` qui recrée un tableau.
- [ ] Retirer `deep: true` du `watch([events, colorPalette, type], ...)`
- [ ] Vérifier qu'aucune régression n'apparaît (test E2E `05-event-details` + `13-multicolor`)

### P3-3 — `EventView.vue:27, 31` `v-html` XSS
`v-html="item[labelField]"` et `item[descriptionField]` sur données dataset non maîtrisées.
- [ ] Vérifier avec le métier si le HTML est requis (markdown interprété ?)
- [ ] Si oui : sanitizer via DOMPurify
- [ ] Si non : passer en texte (`{{ }}`)
- [ ] `eslint.config.js:47` désactive `vue/no-v-html` — à restaurer si passage en texte

### P3-4 — `README.md` template Vite par défaut
- [ ] Réécrire en README spécifique à app-calendar
- [ ] Sections : configuration, datasets attendus (concepts `startDate`/`endDate`/`openingHours`), vues (mois/semaine/jour/planning), édition REST, filtres statiques, intégration dashboard

### P3-5 — Versioning `package.json` 1.2.12
Migration majeure (Vuetify 2→4, JS→TS, Vite 5→8) sans bump major.
- [ ] Vérifier la politique de semver DataFair
- [ ] Si publication via jsdelivr CDN (`build` script), envisager un bump major (2.0.0) à la prochaine release

### P3-6 — `useDateBounds.ts` asymétrie min/max
`resolveMinDate` gère `day`, `tomorrow` ; `resolveMaxDate` non.
- [ ] Documenter l'asymétrie en commentaire si intentionnelle
- [ ] Ou aligner les valeurs possibles entre min/max

### P3-7 — Tests E2E manquants
- [ ] Horaires d'ouverture (composant `OpeningHours.vue` + node VJSF `OpeningHoursNode.vue`)
- [ ] Planning + filtres dynamiques combinés (`staticFilters` + concept filters)
- [ ] Mode draft (changement de config via `postMessage('set-config')` → re-réactivité)
- [ ] Dataset avec `startDate` + openingHours mais sans `endDate` (cas P0-1 corrigé)

---

## Hors audit initial, apparu pendant l'exécution

### H-1 — `main.ts` locale hardcodée
`createLocaleDayjs('fr')` (L26) alors que `session.lang.value` est dispo.
- [ ] Remplacer par `createLocaleDayjs(session.lang.value)` (pattern du snippet `main.ts` du skill)
- [ ] Prérequis pour pouvoir plus tard adopter `<DfUiNotif />` native (qui nécessite `createI18n` + `vite-plugin-vue-i18n`)

### H-2 — `reconnecting-websocket` inutilisé
- [ ] Retirer `reconnecting-websocket` des `dependencies` de `package.json`
- [ ] Vérifier que rien d'autre ne l'importe (`grep -r reconnecting-websocket src/`)
- [ ] `npm install` pour mettre à jour `package-lock.json`

### H-3 — `<DfUiNotif />` native bloquée par i18n
Le composant `@data-fair/lib-vuetify/ui-notif.vue` a un bloc `<i18n lang="yaml">` qui nécessite `vite-plugin-vue-i18n` (non installé).
- [ ] Si on veut adopter la snackbar standard DataFair : installer `vite-plugin-vue-i18n` + `createI18n` dans `main.ts` (voir snippet `main.ts` du skill)
- [ ] Remplacer alors `src/components/SnackBar.vue` par `<DfUiNotif />` dans `App.vue`
- [ ] Supprimer `src/components/SnackBar.vue`
- [ ] Pour l'instant, snackbar locale branchée sur `useUiNotif` (solution intermédiaire propre)

---

## Estimation globale

| Phase | Effort cumulé | Risque |
|---|---|---|
| P1 (3-4 tâches) | 2-3h | Faible à moyen (P1-3) |
| P2 (4 tâches) | +2h | Faible |
| P3 (7 tâches) | +3-4h | Faible |
| Hors audit (3 tâches) | +1-2h | Faible (sauf H-3 i18n) |
| **Total** | **~8-11h** | — |
