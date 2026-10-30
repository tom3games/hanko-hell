import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '5392' } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' })
await p.goto('http://localhost:5392/'); await p.waitForFunction(() => window.__hhReady)
const out = await p.evaluate(() => {
  hh.dbg.pause(true); hh.dbg.quiet(true); const res = {}
  for (const bot of ['bow', 'straight', 'fun', 'late', 'mash', 'idle']) {
    res[bot] = []
    for (let s = 1; s <= 8; s++) { hh.startGame(s * 7919); hh.dbg.autoplay(bot); hh.dbg.step(60 * 75); const r = hh.S.result; if (!r) return { err: [bot, s, hh.S.mode, hh.S.t, hh.S.hit, hh.S.ct] }; res[bot].push([r.score, r.done, r.missed, r.ngTotal, r.collapses].join('/')) }
  }
  return res
})
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(9), v.join('  '))
await b.close(); server.kill()
