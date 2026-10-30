// SNS用サムネ og.png（1200x630）。node og.mjs
// 遊んでいる一番おもしろい場面（昼寝中の猫に押してしまい、課長が激怒）＋タイトル＋一言
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '5394' } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, locale: 'ja-JP' })
await p.addInitScript(() => { try { localStorage.setItem('hh.tut', '1') } catch (e) {} })
await p.goto('http://localhost:5394/'); await p.waitForFunction(() => window.__hhReady)
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
await p.click('#bStart')
await p.evaluate(() => {
  hh.dbg.pause(true); hh.dbg.quiet(true); hh.dbg.autoplay('bow'); hh.dbg.step(181 + 60 * 9); hh.dbg.autoplay(null)
  hh.S.pile = 6; hh.dbg.spawn('cat', -1.6)
  for (let i = 0; i < 400; i++) { const c = hh.S.items.find(it => it.kind === 'cat'); if (c && c.x >= 0) break; hh.dbg.step(1) }
  hh.dbg.quiet(false); hh.press(); hh.dbg.step(16); hh.dbg.cam(0.62, -0.2); hh.dbg.render()
})
await p.addStyleTag({ content: `.hud,#combo,#corner,#tut,#count,.pop{display:none!important}#world,#fx{transform:translateX(-230px)}#banner{right:48%;left:12px;top:78%}#banner .b1{font-size:46px}#banner .b2{display:none}
  body::after{content:'';position:fixed;inset:0 0 0 50%;background:linear-gradient(90deg,rgba(18,28,43,0),rgba(18,28,43,.9) 22%);z-index:30}` })
await p.evaluate(() => {
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;right:36px;top:0;bottom:0;width:470px;z-index:31;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px;text-align:center'
  d.innerHTML = `<div style="background:#fbf6ea;color:#1e1a17;padding:22px 26px 18px;border-radius:6px;transform:rotate(-2deg);box-shadow:0 8px 0 #d9ccb0,0 18px 30px rgba(0,0,0,.4);position:relative;width:440px">
    <div style="position:absolute;inset:8px;border:2px solid rgba(214,51,43,.55);border-radius:3px"></div>
    <div style="font-family:'Dela Gothic One';font-size:58px;line-height:1.05">稟議書</div>
    <div style="font-family:'Dela Gothic One';font-size:76px;line-height:1.1;color:#d6332b;white-space:nowrap">ハンコ地獄</div></div>
  <div style="font-family:'Zen Maru Gothic';font-weight:900;font-size:29px;line-height:1.5;color:#fff">流れてくる書類に、押して押しまくれ。<br><span style="color:#ffb4a6">押しちゃダメなものもある。</span></div>`
  document.body.appendChild(d)
})
await p.waitForTimeout(400)
await p.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
console.log('ok')
