// Warm-up du serveur Vite avant les tests : on « crawl » tous les modules
// source via HTTP pour déclencher la découverte des dépendances (deps des
// composants asynchrones, imports par composant générés par vite-plugin-vuetify…).
// Sans cela, la première vague de découverte arrive au milieu d'un test :
// Vite re-optimise, recharge la page et la config injectée par postMessage
// est perdue (empty state « Configuration incomplète »).
//
// Le globalSetup est exécuté après le démarrage du webServer (les plugins
// Playwright, dont webServer, passent avant les globalSetups) : le serveur
// répond déjà. Aucune page n'est ouverte ici, donc les recharges de Vite
// pendant le crawl sont sans conséquence.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

/** Walk `src/` recursively, returning paths relative to the repo root. */
function walkSourceFiles (dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      // Types générés par df-build-types : jamais servis au navigateur.
      if (full.endsWith('src/config/.type')) continue
      walkSourceFiles(full, acc)
    } else if (/\.(vue|ts|js|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      acc.push(path.relative(rootDir, full))
    }
  }
  return acc
}

async function waitForOptimizerSettled (maxMs = 30_000) {
  const metaPath = path.join(rootDir, 'node_modules/.vite/deps/_metadata.json')
  const started = Date.now()
  let lastHash: string | null = null
  let stableSince: number | null = null
  while (Date.now() - started < maxMs) {
    await new Promise(r => setTimeout(r, 500))
    let hash: string | null = null
    try {
      hash = JSON.parse(readFileSync(metaPath, 'utf8')).browserHash ?? null
    } catch { /* le fichier peut ne pas exister si aucune dep n'est optimisée */ }
    if (hash !== null && hash === lastHash) {
      stableSince = stableSince ?? Date.now()
      if (Date.now() - stableSince > 2000) return
    } else {
      stableSince = null
      lastHash = hash
    }
  }
}

export default async function () {
  const port = process.env.E2E_PORT ?? 4100
  const base = `http://localhost:${port}${process.env.PUBLIC_URL ?? '/app/'}`

  // Attente de sécurité : le webServer est prêt (Playwright a déjà validé son
  // URL), on tolère néanmoins un délai de propagation.
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(base)
      if (res.ok) break
    } catch { /* pas encore prêt */ }
    if (i > 50) throw new Error(`warmup: serveur injoignable sur ${base}`)
    await new Promise(r => setTimeout(r, 200))
  }

  const files = walkSourceFiles(path.join(rootDir, 'src'))
  for (const file of files) {
    try {
      await fetch(`${base}${file}`)
    } catch (e) {
      // Un échec de crawl n'est pas fatal : le test concerné retombera sur la
      // découverte classique, au pire avec un reload de plus.
      console.warn(`warmup: échec du fetch de ${file}`, (e as Error).message)
    }
  }

  await waitForOptimizerSettled()
}
