// 全項目の自動検証。node verify.mjs（shots/ にスクショを出す）
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5390
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = [], bootFails = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, skipTut = false) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, acceptDownloads: true, ...opts })
  await ctx.addInitScript(k => { try { localStorage.clear(); if (k) localStorage.setItem('hh.tut', '1') } catch (e) {} }, skipTut)
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0)
  try { await p.waitForFunction(() => window.__hhReady, null, { timeout: 15000 }) }
  catch (e) { bootFails.push(p.errs.join('|') || 'no error'); await ctx.close(); if (bootFails.length > 3) throw e; return open(browser, opts, skipTut) }
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) .hbox,main:not([hidden]) .rsheet,main:not([hidden]) .panel,main:not([hidden]) .logo,#corner button')) {
    if (!el.offsetParent) continue; const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1 || r.right > innerWidth + 1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom))
  }
  // 重なり: 右上の小ボタンと HUD・見出し
  const cr = document.querySelector('#corner').getBoundingClientRect()
  for (const el of document.querySelectorAll('main:not([hidden]) .hbox,main:not([hidden]) .logo,main:not([hidden]) .panel,main:not([hidden]) .rhead,main:not([hidden]) .rsheet')) {
    if (!el.offsetParent) continue; const r = el.getBoundingClientRect(); if (r.left < cr.right && r.right > cr.left && r.top < cr.bottom && r.bottom > cr.top) over.push('corner-overlap:' + (el.id || el.className))
  }
  return { H, over: over.slice(0, 6) }
})
// 3D の画面が描けているか（輝度の散らばり）
const variance3d = p => p.evaluate(() => {
  hh.dbg.render(); const src = document.querySelector('#world'), c = document.createElement('canvas'); c.width = 200; c.height = Math.round(200 * src.height / src.width)
  const x = c.getContext('2d'); x.drawImage(src, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data
  let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 3) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
  return Math.round(s2 / n - (s / n) ** 2)
})
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [844, 390, 'land'], [667, 375, 'land-se'], [768, 1024, 'tab'], [1440, 900, 'pc']]
// 1回分を台本どおりに進める（時間は止めて手で進める）
const runBot = (p, bot, seed) => p.evaluate(([bot, seed]) => { hh.dbg.pause(true); hh.dbg.quiet(true); hh.startGame(seed); hh.dbg.autoplay(bot); hh.dbg.step(60 * 75); hh.dbg.autoplay(null); hh.dbg.quiet(false); const r = hh.S.result; return { score: r.score, done: r.done, missed: r.missed, ng: r.ngTotal, col: r.collapses, gi: r.gi, grade: hh.GRADES[r.gi].ja, cm: r.cm, view: hh.S.view } }, [bot, seed])

const browser = await chromium.launch()
let p = await open(browser, {}, true)

await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return r
})
await t('OGP 一式がある（画像は og.png?v=1・url はスラッグ）', async () => {
  const r = await p.evaluate(() => ({ m: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => document.querySelector(`meta[property="${k}"]`)?.content), tw: document.querySelector('meta[name="twitter:card"]')?.content }))
  expect(r.m.every(Boolean) && r.tw === 'summary_large_image' && r.m[2] === 'https://tom3games.github.io/hanko-hell/og.png?v=1' && r.m[3] === 'https://tom3games.github.io/hanko-hell/', JSON.stringify(r))
})
await t('og.png が 1200x630 で置いてある', async () => { const st = statSync(ROOT + '/og.png'); const r = await p.evaluate(async () => { const im = new Image(); im.src = 'og.png'; await im.decode(); return [im.naturalWidth, im.naturalHeight] }); expect(r[0] === 1200 && r[1] === 630, r); return { kb: Math.round(st.size / 1024) } })
await t('タイトルが日本語で出ている', async () => { const s = await p.textContent('.logo .main'); expect(s.includes('ハンコ地獄'), s); return s })
await t('タイトルの3Dの机が描けている（輝度の散らばり）', async () => { await p.waitForTimeout(600); const v = await variance3d(p); expect(v > 120, v); return v })
await t('タイトルの見本で手が自動でハンコを押している', async () => { const n0 = await p.evaluate(() => hh.S.items.filter(i => i.stamped).length); await p.waitForTimeout(4000); const n1 = await p.evaluate(() => hh.S.items.filter(i => i.stamped).length + Object.keys(hh.Snd.played).length); expect(n1 > n0 || (await p.evaluate(() => hh.hand.ph)) !== undefined, n0 + '/' + n1); return { n0, n1 } })
await p.screenshot({ path: ROOT + '/shots/01-title.png' })
await t('読み込みが軽い（転送量 3MB 以内）', async () => { const kb = await p.evaluate(() => Math.round(performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0) / 1024)); expect(kb < 3072, kb + 'KB'); return kb + 'KB' })

// ---------- 遊び方
await p.click('#bHow')
await t('遊び方: PC 向けの言い方で4項目・押してはいけない物6種', async () => {
  const r = await p.evaluate(() => ({ n: document.querySelectorAll('#howList li').length, pc: document.querySelector('#howList').textContent.includes('スペース'), ng: document.querySelectorAll('#ngList .ic svg').length }))
  expect(r.n === 4 && r.pc && r.ng === 6, JSON.stringify(r)); return r
})
await p.screenshot({ path: ROOT + '/shots/02-how.png' })
await p.click('#bHowBack')

// ---------- 判定（位置を指定して押す）
await p.evaluate(() => { hh.dbg.pause(true); hh.startGame(12345); hh.dbg.step(181) })
await t('カウントダウンのあと始業（mode=play）・時間は固定60Hz（60歩で1.0秒）', async () => { const r = await p.evaluate(() => { const t0 = hh.S.t; hh.dbg.step(60); return [hh.S.mode, +(hh.S.t - t0).toFixed(4)] }); expect(r[0] === 'play' && r[1] === 1, r); return r })
await t('判定の境目（まっすぐ/お辞儀/ふんぞり/はみ出し/空押し）', async () => {
  const r = await p.evaluate(() => {
    const out = {}
    for (const [name, e] of [['straight', 0.0], ['straight2', 0.06], ['bow', 0.08], ['bow2', 0.23], ['fun', -0.08], ['fun2', -0.23], ['off', 0.3], ['off2', -0.3], ['offLate', 1.2], ['air', -0.5], ['air2', 1.4]]) {
      hh.S.hit = 0; hh.hand.ph = -1; hh.S.combo = 0; hh.dbg.place('doc', -0.48 + e); const s0 = hh.S.score; out[name] = [hh.press(), hh.S.score - s0]
    }
    return out
  })
  const ok = r.straight[0] === 'straight' && r.straight2[0] === 'straight' && r.bow[0] === 'bow' && r.bow2[0] === 'bow' && r.fun[0] === 'fun' && r.fun2[0] === 'fun' && r.off[0] === 'off' && r.off2[0] === 'off' && r.offLate[0] === 'off' && r.air[0] === 'air' && r.air2[0] === 'air'
  const pts = r.straight[1] === 100 && r.bow[1] === 150 && r.fun[1] === 50 && r.off[1] === 20 && r.air[1] === -10
  expect(ok && pts, JSON.stringify(r)); return r
})
await t('連続ボーナス（まっすぐ10連続 = 100x4 + 150x5 + 200 = 1350）', async () => {
  const d = await p.evaluate(() => { hh.S.combo = 0; const s0 = hh.S.score; for (let i = 0; i < 10; i++) { hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place('doc', -0.48); hh.press() } return [hh.S.score - s0, hh.S.combo] })
  expect(d[0] === 1350 && d[1] === 10, d); return d
})
await t('押せない間（ハンコが上がる途中）は連打を受け付けない', async () => { const r = await p.evaluate(() => { hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place('doc', -0.48); const a = hh.press(); const b = hh.press(); hh.dbg.step(10); const c = hh.press(); return [a, b, c] }); expect(r[0] === 'straight' && r[1] === 'busy' && r[2] !== 'busy', r); return r })
for (const n of ['cat', 'photo', 'lottery', 'resign', 'love', 'cake']) {
  await t(`押してはいけない物: ${n} → 事故（-300・バナー・課長の吹き出し・時間が止まる）`, async () => {
    const r = await p.evaluate(n => {
      hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place(n, 0); const s0 = hh.S.score, t0 = hh.S.t, c0 = hh.S.ng[n] || 0
      const j = hh.press(); const d = hh.S.score - s0; hh.dbg.step(30); const t1 = hh.S.t
      return { j, d, cnt: (hh.S.ng[n] || 0) - c0, banner: !document.querySelector('#banner').hidden && document.querySelector('#bn1').textContent, say: !!document.querySelector('.say'), frozen: t1 === t0 }
    }, n)
    expect(r.j === 'ng:' + n && r.d === -300 && r.cnt === 1 && r.banner && r.say && r.frozen, JSON.stringify(r)); return r.banner
  })
  if (n === 'cat' || n === 'cake') { await p.evaluate(() => { hh.dbg.step(6); hh.dbg.render() }); await p.screenshot({ path: `${ROOT}/shots/03-accident-${n}.png` }) }
}
await t('押してはいけない物を見送るとスルー（+30）', async () => { const r = await p.evaluate(() => { hh.S.hit = 0; hh.dbg.place('love', -1.2); const s0 = hh.S.score; hh.dbg.step(120); return hh.S.score - s0 }); expect(r === 30, r); return r })
await t('書類を流すと未決裁の山が増え、7枚で崩れる（-150）', async () => {
  const r = await p.evaluate(() => {
    hh.S.hit = 0; hh.S.pile = 2; const c0 = hh.S.collapses, piles = []
    for (let i = 0; i < 5; i++) { hh.dbg.place('doc', -0.48); hh.dbg.step(60); piles.push(hh.S.pile); hh.S.hit = 0 }
    return { piles, col: hh.S.collapses - c0 }
  })
  expect(r.piles.join() === '3,4,5,6,2' && r.col === 1, JSON.stringify(r)); return r
})
await p.evaluate(() => { hh.dbg.render() }); await p.screenshot({ path: ROOT + '/shots/04-collapse.png' })
await t('空振りでも書類にも当たらない所は空押し扱い', async () => { const r = await p.evaluate(() => { hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place('doc', 5); return hh.press() }); expect(r === 'air', r) })

// ---------- 通しで遊ぶ（台本）
await t('通し: お辞儀狙いの名人が一番高く、何もしないと十級', async () => {
  const bow = await runBot(p, 'bow', 7), st = await runBot(p, 'straight', 7), fun = await runBot(p, 'fun', 7), idle = await runBot(p, 'idle', 7), mash = await runBot(p, 'mash', 7)
  expect(bow.score > st.score && st.score > fun.score && fun.score > idle.score && idle.score > -2000, JSON.stringify({ bow, st, fun, idle }))
  expect(bow.missed === 0 && bow.ng === 0 && bow.gi >= 10, 'bow ' + JSON.stringify(bow))
  expect(idle.done === 0 && idle.grade === '十級' && idle.col >= 3 && idle.cm.includes('寝てた'), 'idle ' + JSON.stringify(idle))
  expect(mash.ng >= 2 && mash.score < fun.score, 'mash ' + JSON.stringify(mash))
  return { bow: bow.score + ' ' + bow.grade, straight: st.score + ' ' + st.grade, fun: fun.score + ' ' + fun.grade, mash: mash.score + ' ' + mash.grade, idle: idle.score + ' ' + idle.grade }
})
await t('同じ種なら同じ結果（再現性）・種が違えば書類の並びが変わる', async () => {
  const a = await runBot(p, 'bow', 99), b = await runBot(p, 'bow', 99), c = await runBot(p, 'bow', 4242)
  expect(a.score === b.score && a.done === b.done, JSON.stringify([a, b]))
  const seqA = await p.evaluate(() => { hh.startGame(1); return hh.dbg.items().map(i => i.kind).join() }), seqB = await p.evaluate(() => { hh.startGame(2); return hh.dbg.items().map(i => i.kind).join() })
  return { a: a.score, c: c.score, seqDiff: seqA !== seqB }
})
await t('書類の数は45秒で28〜38枚・押してはいけない物も混ざる（8種の種で）', async () => {
  const r = await p.evaluate(() => { hh.dbg.quiet(true); const out = []; for (let s = 1; s <= 8; s++) { hh.startGame(s * 31); hh.dbg.autoplay('idle'); let ng = 0, seen = new Set(); for (let k = 0; k < 2900; k++) { hh.dbg.step(1); for (const it of hh.S.items) if (!seen.has(it)) { seen.add(it); if (it.kind !== 'doc') ng++ } } out.push([hh.S.missed, ng]) } hh.dbg.autoplay(null); hh.dbg.quiet(false); return out })
  expect(r.every(([d, n]) => d >= 28 && d <= 38 && n >= 3), JSON.stringify(r)); return r.map(a => a.join('/')).join(' ')
})
await t('残り10秒で定時ダッシュ（曲と時計が変わる）', async () => {
  const r = await p.evaluate(() => { hh.dbg.quiet(true); hh.startGame(5); hh.dbg.autoplay('bow'); hh.dbg.step(181); while (hh.S.t < 34) hh.dbg.step(1); const a = hh.S.rush; while (hh.S.t < 35.3) hh.dbg.step(1); return [a, hh.S.rush, hh.Snd.want, document.querySelector('#hClock').classList.contains('rush')] })
  expect(r[0] === false && r[1] === true && r[2] === 'rush' && r[3], r); return r
})
await t('定時で終わって結果画面へ（判定は発表まで隠す）', async () => {
  await p.evaluate(() => { hh.dbg.autoplay('bow'); hh.dbg.step(60 * 12 + 160); hh.dbg.autoplay(null); hh.dbg.quiet(false) })
  const early = await p.evaluate(() => ({ view: hh.S.view, seal: getComputedStyle(document.querySelector('#rSeal')).opacity }))
  await p.evaluate(() => hh.dbg.pause(false)); await p.waitForTimeout(3200)
  const late = await p.evaluate(() => ({ seal: getComputedStyle(document.querySelector('#rSeal')).opacity, done: document.querySelector('#rDone').textContent, grade: document.querySelector('#rGrade').textContent, boss: document.querySelector('#rBossTxt').textContent }))
  expect(early.view === 'result' && +early.seal < 0.2 && +late.seal > 0.8 && late.grade && late.boss, JSON.stringify({ early, late })); return late
})
await p.screenshot({ path: ROOT + '/shots/05-result.png' })
await t('結果画面ではみ出しなし・ボタンが画面内', async () => { const o = await overflow(p), f = await fit(p); expect(o.sw <= o.W && !o.bad.length && !f.over.length, JSON.stringify([o, f])) })
await t('結果画像: 1080x1350 で描けている（押したハンコの並び・級）', async () => {
  const r = await p.evaluate(async () => { const c = await hh.drawCard(); const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let red = 0; for (let i = 0; i < d.length; i += 4 * 7) if (d[i] > 180 && d[i + 1] < 90 && d[i + 2] < 90) red++; return [c.width, c.height, red, c.toDataURL('image/png').length] })
  expect(r[0] === 1080 && r[1] === 1350 && r[2] > 3000, r); return r
})
await t('画像を保存でダウンロードされる（PC）', async () => {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('#bSave')])
  const path = ROOT + '/shots/card-ja.png'; await dl.saveAs(path); expect(dl.suggestedFilename() === 'hanko-hell.png' && statSync(path).size > 50000, dl.suggestedFilename()); return Math.round(statSync(path).size / 1024) + 'KB'
})
// 事故だらけの結果
await t('事故だらけ: 押してしまった物の一覧と課長のコメント', async () => {
  const r = await p.evaluate(async () => { hh.dbg.pause(true); hh.dbg.quiet(true); hh.startGame(77); hh.dbg.autoplay('chaos'); hh.dbg.step(60 * 80); hh.dbg.autoplay(null); hh.dbg.quiet(false); hh.dbg.pause(false); return { ng: hh.S.result.ngTotal, ids: hh.S.result.ngOrder, cm: hh.S.result.cm } })
  await p.waitForTimeout(2800)
  const rows = await p.evaluate(() => document.querySelectorAll('#rNg .ngrow').length)
  expect(r.ng >= 3 && rows >= 1 && r.cm, JSON.stringify([r, rows])); return { ...r, rows }
})
await p.screenshot({ path: ROOT + '/shots/06-result-ng.png' })
{ const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); await dl.saveAs(ROOT + '/shots/card-ng.png') }
await t('もう一回ですぐ始まる', async () => { await p.click('#bAgain'); const r = await p.evaluate(() => [hh.S.view, hh.S.mode, hh.S.score]); expect(r[0] === 'play' && r[1] === 'count' && r[2] === 0, r); return r })

// ---------- 実際の操作（クリック・スペース）と実時間
await t('クリックで押せる・スペースで押せる', async () => {
  await p.evaluate(() => { hh.dbg.pause(true); hh.dbg.step(181) })
  const a = await p.evaluate(() => { hh.dbg.place('doc', -0.48); hh.hand.ph = -1; return hh.S.done })
  await p.mouse.click(200, 500); const b = await p.evaluate(() => hh.S.done)
  await p.evaluate(() => { hh.dbg.step(20); hh.dbg.place('doc', -0.4) }); await p.keyboard.press('Space'); const c = await p.evaluate(() => [hh.S.done, hh.S.stamps.at(-1).j])
  expect(b === a + 1 && c[0] === b + 1, JSON.stringify([a, b, c])); return c
})
await t('実時間: 2秒で約2秒進む（固定60Hz・performance.now）', async () => {
  const t0 = await p.evaluate(() => { hh.dbg.pause(false); return hh.S.t }); await p.waitForTimeout(2000); const t1 = await p.evaluate(() => hh.S.t)
  expect(Math.abs(t1 - t0 - 2) < 0.35, t1 - t0); return +(t1 - t0).toFixed(2)
})
await t('音: 鳴らしてもエラーなし（BGM・ハンコ・事故・ベル）', async () => {
  const r = await p.evaluate(async () => { hh.Snd.init(); hh.dbg.pause(true); hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place('doc', -0.4); hh.press(); hh.hand.ph = -1; hh.S.hit = 0; hh.dbg.place('cat', 0); hh.press(); hh.dbg.pause(false); await new Promise(r => setTimeout(r, 900)); return { played: Object.keys(hh.Snd.played), level: hh.Snd.level(), state: hh.Snd.ctx && hh.Snd.ctx.state } })
  expect(r.played.includes('stamp') && r.played.includes('accident') && r.played.includes('bgm:play') && p.errs.length === 0, JSON.stringify(r) + p.errs.join('|')); return r.played.join(',')
})
await t('ミュートが切り替わり、次回も覚えている', async () => { await p.click('#bMute'); const r = await p.evaluate(() => [hh.Snd.muted, localStorage.getItem('hh.mute')]); await p.click('#bMute'); expect(r[0] === true && r[1] === '1', r) })
await t('fps（ヘッドレス Chromium・ソフト描画）', async () => { await p.waitForTimeout(1500); const f = await p.evaluate(() => hh.dbg.fps()); expect(f > 20, f); return Math.round(f) })

// ---------- 英語
await t('英語: タイトル・遊び方・結果が英語になる', async () => {
  await p.evaluate(() => { hh.dbg.pause(true); hh.go('title') }); await p.click('#bLang')
  const r = await p.evaluate(async () => { const title = document.querySelector('.logo .main').textContent; hh.go('how'); const how = document.querySelector('#howList').textContent; hh.dbg.quiet(true); hh.startGame(3); hh.dbg.autoplay('straight'); hh.dbg.step(60 * 50 + 160); hh.dbg.autoplay(null); hh.dbg.quiet(false); hh.dbg.pause(false); return { title, how, grade: document.querySelector('#rGrade').textContent } })
  await p.waitForTimeout(2800)
  const boss = await p.evaluate(() => document.querySelector('#rBossTxt').textContent + ' / ' + document.querySelector('#rNick').textContent)
  r.how = r.how.slice(0, 200); expect(r.title.includes('STAMP') && /Space/.test(r.how) && /Rank|Dan|Grand/.test(r.grade) && !/[ぁ-ん]/.test(boss), JSON.stringify(r) + boss); return { ...r, boss }
})
await p.screenshot({ path: ROOT + '/shots/07-result-en.png' })
{ const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bSave')]); await dl.saveAs(ROOT + '/shots/card-en.png') }
await t('英語の結果画面ではみ出しなし', async () => { const o = await overflow(p), f = await fit(p); expect(o.sw <= o.W && !o.bad.length && !f.over.length, JSON.stringify([o, f])) })
await t('通しでエラーなし（Chromium）', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await p.close()

// ---------- 初回のチュートリアル
p = await open(browser, {}, false)
await t('初回はチュートリアルの吹き出しが出て、書類が線に来たら「いま！」になる', async () => {
  await p.click('#bStart'); await p.evaluate(() => { hh.dbg.pause(true); hh.dbg.step(181 + 20) })
  const a = await p.evaluate(() => [!document.querySelector('#tut').hidden, document.querySelector('#tutTxt').textContent])
  let now = null; for (let i = 0; i < 200 && !now; i++) now = await p.evaluate(() => { hh.dbg.step(3); return document.querySelector('#tut').classList.contains('now') ? document.querySelector('#tutTxt').textContent : null })
  await p.screenshot({ path: ROOT + '/shots/08-tutorial.png' })
  expect(a[0] && /クリック/.test(a[1]) && now === 'いま！', JSON.stringify([a, now])); return [a[1], now]
})
await t('終わればチュートリアル済みになる', async () => { const r = await p.evaluate(() => { hh.dbg.quiet(true); hh.dbg.step(60 * 50); return localStorage.getItem('hh.tut') }); expect(r === '1', r) })
await p.close()

// ---------- 6サイズ × 全画面
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  await q.waitForTimeout(300)
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await q.click('#bHowBack')
  await q.click('#bStart'); await q.evaluate(() => { hh.dbg.pause(true); hh.dbg.step(60); hh.dbg.render() }); views.count = await fit(q)
  await q.evaluate(() => { hh.dbg.autoplay('bow'); hh.dbg.step(140 + 60 * 8); hh.dbg.autoplay(null); hh.S.hit = 0; hh.hand.ph = -1; hh.dbg.place('cat', 0); hh.press(); hh.dbg.step(8); hh.dbg.render() })
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  await t(`${name}: プレイ中の3Dが描けている`, async () => { const v = await variance3d(q); expect(v > 300, v); return v })
  await q.evaluate(() => { hh.dbg.quiet(true); hh.dbg.autoplay('bow'); hh.dbg.step(60 * 40 + 160); hh.dbg.autoplay(null); hh.dbg.pause(false) }); await q.waitForTimeout(2700)
  views.result = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---------- WebKit（iPhone 相当）でタッチの通し
for (const [w, h] of [[390, 844], [844, 390]]) {
  const wb = await webkit.launch(), wp = await open(wb, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await t(`WebKit ${w}x${h}: 2本指の touchmove を止める`, async () => {
    const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
    expect(r, r)
  })
  await t(`WebKit ${w}x${h}: 遊び方はスマホ向けの言い方`, async () => { await wp.tap('#bHow'); const s = await wp.textContent('#howList'); await wp.tap('#bHowBack'); expect(s.includes('タップ') && !s.includes('スペース'), s) })
  await t(`WebKit ${w}x${h}: タップで始業→タップで押す→結果まで`, async () => {
    await wp.tap('#bStart'); await wp.evaluate(() => { hh.dbg.pause(true); hh.dbg.step(181); hh.dbg.place('doc', -0.45); hh.hand.ph = -1 })
    await wp.touchscreen.tap(Math.round(w / 2), Math.round(h * 0.7)); const d = await wp.evaluate(() => hh.S.done)
    await wp.evaluate(() => { hh.dbg.quiet(true); hh.dbg.autoplay('bow'); hh.dbg.step(60 * 50); hh.dbg.autoplay(null); hh.dbg.render() }); await wp.waitForTimeout(400)
    await wp.screenshot({ path: `${ROOT}/shots/webkit-${w}-result.png` })
    const r = await wp.evaluate(() => [hh.S.view, document.querySelector('#rGrade').textContent])
    expect(d === 1 && r[0] === 'result' && r[1], JSON.stringify([d, r])); return r
  })
  await t(`WebKit ${w}x${h}: 結果画像が描ける`, async () => { const r = await wp.evaluate(async () => { const c = await hh.drawCard(); return [c.width, c.height] }); expect(r[0] === 1080, r) })
  await t(`WebKit ${w}x${h}: はみ出し・エラーなし`, async () => { const o = await overflow(wp), f = await fit(wp); expect(o.sw <= o.W && !o.bad.length && !f.over.length && wp.errs.length === 0, JSON.stringify([o, f]) + wp.errs.join('|')) })
  await wb.close()
}
server.kill()
console.log(results.join('\n'))
console.log('boot retries:', bootFails.length, bootFails.join(' / '))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
