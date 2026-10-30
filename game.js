// 稟議書ハンコ地獄 本体。3D は Three.js（vendor/）。文言とデータは data.js、音は snd.js
import * as THREE from 'three'

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)]
const STEP = 1 / 60, GAME_T = 45, RUSH_T = 35
const BELT_Y = 0.16, STX = 0, BOX_Z = -0.62, BOX_DX = 0.48, DOC_W = 1.7, DOC_D = 2.2
const SPAWN_X = -10.5, KILL_X = 10.5
const PILE = { x: 2.55, z: -2.25 }, PILE_MAX = 6
const BOSS_IDLE = new THREE.Vector3(-2.1, 0, -4.4), BOSS_PEEK = new THREE.Vector3(-1.25, 0.25, -3.05)
const PTS = { straight: 100, bow: 150, fun: -30, off: -20, air: -50, ng: -400, collapse: -200, skip: 30 }
const WIN = { straight: 0.06, bow: 0.17 }
const TRAPS = ['trapPhoto', 'trapLottery']

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, k) => a + (b - a) * k
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k])

const S = {
  lang: 'ja', view: 'title', mode: 'demo', t: 0, frame: 0, items: [], fx: [], rnd: Math.random, seed: 1,
  score: 0, done: 0, combo: 0, maxCombo: 0, bows: 0, straights: 0, ng: {}, ngOrder: [], collapses: 0, missed: 0, stamps: [],
  pile: 1, hit: 0, ct: 0, endT: 0, dist: 0, gap: 3, spawnN: 0, lastNg: false, bag: [], bot: null, botT: 0, tutOn: false, tutHits: 0,
  rush: false, result: null, revealId: 0, nextMada: 8, bowRun: 0,
}
const T = k => TXT[S.lang][k]
const isTouch = () => matchMedia('(pointer:coarse)').matches

// ---------- 顔とアイコン（DOM と結果画像で使う SVG）
function bossSvg(m, bg) {
  const brow = { normal: 'M18 23l9 0M37 23l9 0', angry: 'M16 18l12 6M48 18l-12 6', happy: 'M17 21q5-4 10 0M37 21q5-4 10 0', shock: 'M17 16q5-4 10 0M37 16q5-4 10 0', blush: 'M17 22q5-2 10 0M37 22q5-2 10 0', cry: 'M17 24l10-4M47 24l-10-4' }[m]
  const eye = {
    normal: '<circle cx="23" cy="30" r="2.4" fill="#1e1a17"/><circle cx="41" cy="30" r="2.4" fill="#1e1a17"/>',
    angry: '<path d="M19 30l8 1M45 30l-8 1" stroke="#1e1a17" stroke-width="3" stroke-linecap="round"/>',
    happy: '<path d="M19 31q4-4 8 0M37 31q4-4 8 0" stroke="#1e1a17" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    shock: '<circle cx="23" cy="30" r="4" fill="#fff" stroke="#1e1a17" stroke-width="1.6"/><circle cx="41" cy="30" r="4" fill="#fff" stroke="#1e1a17" stroke-width="1.6"/><circle cx="23" cy="30" r="1.4" fill="#1e1a17"/><circle cx="41" cy="30" r="1.4" fill="#1e1a17"/>',
    blush: '<path d="M19 30q4 3 8 0M37 30q4 3 8 0" stroke="#1e1a17" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    cry: '<path d="M19 29q4 3 8 0M37 29q4 3 8 0" stroke="#1e1a17" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M22 33q-2 6 0 9q2-3 0-9zM42 33q-2 6 0 9q2-3 0-9z" fill="#5cc6ff"/>',
  }[m]
  const mouth = {
    normal: '<path d="M27 47h10" stroke="#7a2a1a" stroke-width="2.6" stroke-linecap="round"/>',
    angry: '<ellipse cx="32" cy="48" rx="7" ry="5" fill="#7a1a12"/><path d="M26 46h12" stroke="#fff" stroke-width="2"/>',
    happy: '<path d="M24 45q8 10 16 0z" fill="#7a1a12"/>',
    shock: '<ellipse cx="32" cy="49" rx="4" ry="5" fill="#7a1a12"/>',
    blush: '<path d="M26 47q3-2 6 0t6 0" stroke="#7a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    cry: '<path d="M25 50q7-6 14 0" stroke="#7a2a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  }[m]
  const cheek = m === 'blush' || m === 'happy' ? '<ellipse cx="17" cy="38" rx="4" ry="2.6" fill="#ff8e8e" opacity=".8"/><ellipse cx="47" cy="38" rx="4" ry="2.6" fill="#ff8e8e" opacity=".8"/>' : ''
  const vein = m === 'angry' ? '<path d="M44 10l3 3-3 3M50 10l-3 3 3 3" stroke="#d6332b" stroke-width="2" fill="none"/>' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${bg ? '<circle cx="32" cy="32" r="31" fill="#22324a"/>' : ''}
<ellipse cx="8" cy="34" rx="4" ry="6" fill="#e9b68e"/><ellipse cx="56" cy="34" rx="4" ry="6" fill="#e9b68e"/>
<ellipse cx="32" cy="33" rx="23" ry="25" fill="#f2c9a5"/>
<path d="M9 30c0-8 2-12 5-14l1 12zM55 30c0-8-2-12-5-14l-1 12z" fill="#55504a"/>
<path d="M14 15q12-9 34-3M15 18q14-7 33-1M17 21q12-5 30 0" stroke="#55504a" stroke-width="2" fill="none" stroke-linecap="round"/>
${cheek}<path d="${brow}" stroke="#3a342e" stroke-width="3" stroke-linecap="round" fill="none"/>${eye}
<rect x="16" y="24" width="14" height="12" rx="4" fill="none" stroke="#1e1a17" stroke-width="2"/><rect x="34" y="24" width="14" height="12" rx="4" fill="none" stroke="#1e1a17" stroke-width="2"/><path d="M30 29h4" stroke="#1e1a17" stroke-width="2"/>
<path d="M22 42q10-6 20 0q-5 3-10 1q-5 2-10-1z" fill="#3a342e"/>${mouth}${vein}</svg>`
}
const ICONS = {
  cat: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="34" cy="40" rx="22" ry="13" fill="#e8913a"/><path d="M14 44q-6-2-5 6q8 4 14-2" fill="#e8913a"/><circle cx="18" cy="32" r="11" fill="#e8913a"/><path d="M9 26l2-10 7 7zM27 26l-2-10-7 7z" fill="#e8913a"/><path d="M13 32q2 2 4 0M20 32q2 2 4 0" stroke="#1e1a17" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M30 36q4-3 8 0M38 42q4-3 8 0" stroke="#c46a1c" stroke-width="2.4" fill="none"/><text x="40" y="22" font-family="sans-serif" font-weight="900" font-size="12" fill="#22324a">z</text><text x="48" y="14" font-family="sans-serif" font-weight="900" font-size="9" fill="#22324a">z</text></svg>',
  photo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="6" width="44" height="52" rx="3" fill="#8a5a2b"/><rect x="15" y="11" width="34" height="42" fill="#cfe3f0"/><ellipse cx="32" cy="32" rx="11" ry="12" fill="#f2c9a5"/><path d="M22 25q10-7 20 0" stroke="#55504a" stroke-width="2" fill="none"/><rect x="24" y="29" width="7" height="5" rx="2" fill="none" stroke="#1e1a17" stroke-width="1.5"/><rect x="33" y="29" width="7" height="5" rx="2" fill="none" stroke="#1e1a17" stroke-width="1.5"/><path d="M27 38q5-3 10 0" stroke="#3a342e" stroke-width="2.4" fill="none"/><path d="M18 53q14-14 28 0z" fill="#22324a"/></svg>',
  lottery: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M5 18h54v8a6 6 0 0 0 0 12v8H5v-8a6 6 0 0 0 0-12z" fill="#ffd6e0" stroke="#d6336c" stroke-width="2"/><path d="M32 22l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#f2c14e" stroke="#a07b1c" stroke-width="1.2"/><path d="M12 24v16M52 24v16" stroke="#d6336c" stroke-width="1.5" stroke-dasharray="2 2"/></svg>',
  resign: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="17" y="5" width="30" height="54" rx="2" fill="#fff" stroke="#9aa0a8" stroke-width="2"/><path d="M32 13v28" stroke="#1e1a17" stroke-width="4" stroke-linecap="round"/><path d="M26 17h12M27 25h10M26 33h12" stroke="#1e1a17" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="50" r="4" fill="none" stroke="#d6332b" stroke-width="2"/></svg>',
  love: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="14" width="52" height="36" rx="3" fill="#ffc3d6" stroke="#e05a8a" stroke-width="2"/><path d="M6 16l26 20 26-20" fill="none" stroke="#e05a8a" stroke-width="2"/><path d="M32 46s-10-6-10-12a5 5 0 0 1 10-2a5 5 0 0 1 10 2c0 6-10 12-10 12z" fill="#e5304f"/></svg>',
  trapPhoto: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="12" y="4" width="40" height="56" fill="#fbf6ea" stroke="#9a8f80" stroke-width="2"/><path d="M18 30h28M18 37h28M18 44h20" stroke="#c8bca6" stroke-width="2"/><rect x="34" y="8" width="15" height="17" fill="#cfe3f0" stroke="#8a5a2b" stroke-width="1.5"/><circle cx="41.5" cy="16" r="5" fill="#f2c9a5"/><path d="M38 15h3M42 15h3" stroke="#1e1a17" stroke-width="1.2"/><path d="M38.5 19q3 2 6 0" stroke="#3a342e" stroke-width="1.5" fill="none"/></svg>',
  trapLottery: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="16" y="4" width="40" height="56" fill="#fbf6ea" stroke="#9a8f80" stroke-width="2"/><path d="M22 14h28M22 21h28M22 28h20" stroke="#c8bca6" stroke-width="2"/><g transform="rotate(-20 20 46)"><rect x="2" y="38" width="34" height="16" fill="#ffd6e0" stroke="#d6336c" stroke-width="2"/><path d="M19 41l2 4 4 .5-3 2.5 1 4-4-2-4 2 1-4-3-2.5 4-.5z" fill="#f2c14e"/></g></svg>',
  cake: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="52" rx="26" ry="6" fill="#e6e6ea"/><path d="M10 30l40-12v28L10 50z" fill="#fff8ee"/><path d="M10 38l40-10v6L10 44z" fill="#ffb3c7"/><path d="M10 30l40-12 4 4-40 12z" fill="#fff"/><circle cx="36" cy="16" r="6" fill="#e5304f"/><path d="M34 10l2 3 3-3" stroke="#3aa04a" stroke-width="2" fill="none"/></svg>',
}
const MOODS = ['normal', 'angry', 'happy', 'shock', 'blush', 'cry']
const svgUrl = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)
const IMG = {}
function loadImg(key, svg) { return new Promise(r => { const im = new Image(); im.onload = () => { IMG[key] = im; r(im) }; im.onerror = () => r(null); im.src = svgUrl(svg) }) }

// ---------- 3D の土台
const canvas = $('#world')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
renderer.outputColorSpace = THREE.SRGBColorSpace
const scene = new THREE.Scene()
scene.background = new THREE.Color('#3b4a63')
scene.fog = new THREE.Fog('#3b4a63', 34, 70)
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
scene.add(new THREE.HemisphereLight('#fff4e2', '#4a5466', 1.25))
const sun = new THREE.DirectionalLight('#ffd9a8', 1.7); sun.position.set(-5, 9, 4); scene.add(sun)

const LAMB = c => new THREE.MeshLambertMaterial({ color: c })
const G0 = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 12, 8) }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() }
const FONT_D = "'Dela Gothic One','Hiragino Sans',sans-serif", FONT_M = "'Zen Maru Gothic','Hiragino Maru Gothic ProN','Hiragino Sans',sans-serif"

// 机・床・部屋
const desk = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 6.6), LAMB('#8a5a2e')); desk.position.set(0, -0.25, -0.1); scene.add(desk)
const deskTop = new THREE.Mesh(new THREE.PlaneGeometry(34, 6.6), new THREE.MeshLambertMaterial({ map: canvasTex(1024, 200, (x, w, h) => {
  x.fillStyle = '#b07842'; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 20},20,${0.12 + Math.random() * 0.15})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); x.bezierCurveTo(w * .3, y + Math.random() * 10 - 5, w * .6, y + Math.random() * 10 - 5, w, y + Math.random() * 8 - 4); x.stroke() }
}) }))
deskTop.rotation.x = -Math.PI / 2; deskTop.position.set(0, 0.001, -0.1); scene.add(deskTop)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshLambertMaterial({ map: (() => { const t = canvasTex(256, 256, (x, w, h) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#56647a' : '#5f6e85'; x.fillRect(i * 64, j * 64, 64, 64) }
  x.strokeStyle = 'rgba(30,40,55,.35)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke() }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(22, 15); return t })() }))
floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.2, -12); scene.add(floor)
// 置き時計（16:59 → 17:00）
const clockTex = canvasTex(256, 256, () => {})
const clockG = new THREE.Group(); clockG.position.set(-2.9, 0, -2.25); clockG.rotation.y = 0.25; scene.add(clockG)
{ const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.35), LAMB('#d6332b')); b.position.y = 0.5; b.rotation.x = -0.15; clockG.add(b)
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshBasicMaterial({ map: clockTex })); f.position.set(0, 0.53, 0.2); f.rotation.x = -0.15; clockG.add(f)
  for (const sx of [-0.28, 0.28]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), LAMB('#f2c14e')); bell.position.set(sx, 1.02, -0.05); clockG.add(bell) } }
function drawClock(sec) {
  const c = clockTex.image, x = c.getContext('2d'), w = 256
  x.clearRect(0, 0, w, w); x.fillStyle = '#fbf6ea'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill()
  x.strokeStyle = '#22324a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = i % 3 ? 5 : 10; x.beginPath(); x.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); x.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); x.stroke() }
  const hand = (a, len, wd, col) => { x.strokeStyle = col; x.lineWidth = wd; x.lineCap = 'round'; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); x.stroke() }
  const total = 16 * 3600 + 59 * 60 + 15 + sec
  hand((total / 43200) * Math.PI * 2, 60, 14, '#22324a'); hand(((total % 3600) / 3600) * Math.PI * 2, 92, 9, '#22324a'); hand(((total % 60) / 60) * Math.PI * 2, 104, 4, '#d6332b')
  x.fillStyle = '#d6332b'; x.beginPath(); x.arc(128, 128, 9, 0, 7); x.fill()
  clockTex.needsUpdate = true
}
drawClock(0)
// 同僚の島（奥の机・モニター・椅子・寝ている同僚）
const farTopMat = LAMB('#cdb894'), farLegMat = LAMB('#8d97a8'), monMat = LAMB('#2a3446'), scrMat = new THREE.MeshBasicMaterial({ color: '#9fd0ff' }), chairMat = LAMB('#334058'), headMat = LAMB('#3a2e28'), shirtMat = LAMB('#e9eef5'), pileMat = LAMB('#f3eee2')
const farTop = new THREE.BoxGeometry(6, 0.18, 2.6), farLeg = new THREE.BoxGeometry(5.6, 1.4, 2.2), monGeo = new THREE.BoxGeometry(1.3, 0.85, 0.08), scrGeo = new THREE.PlaneGeometry(1.15, 0.7)
for (let r = 0; r < 2; r++) for (let c = -3; c <= 3; c++) {
  const X = c * 7.4 + r * 3.7, Z = -8.5 - r * 6.5, y0 = -2.2
  const d = new THREE.Mesh(farTop, farTopMat); d.position.set(X, y0 + 1.5, Z); scene.add(d)
  const l = new THREE.Mesh(farLeg, farLegMat); l.position.set(X, y0 + 0.7, Z); scene.add(l)
  for (const sx of [-1.5, 1.5]) {
    const m = new THREE.Mesh(monGeo, monMat); m.position.set(X + sx, y0 + 2.05, Z - 0.6); scene.add(m)
    const sc = new THREE.Mesh(scrGeo, scrMat); sc.position.set(X + sx, y0 + 2.05, Z - 0.55); scene.add(sc)
    const ch = new THREE.Mesh(G0.box, chairMat); ch.scale.set(1, 1.4, 0.3); ch.position.set(X + sx, y0 + 1.6, Z + 1.7); scene.add(ch)
    if ((r * 7 + c + (sx > 0)) % 3 === 0) { const b = new THREE.Mesh(G0.box, shirtMat); b.scale.set(0.9, 0.5, 0.8); b.position.set(X + sx, y0 + 1.85, Z + 0.9); scene.add(b); const hd = new THREE.Mesh(G0.sph, headMat); hd.scale.setScalar(0.32); hd.position.set(X + sx, y0 + 1.9, Z + 0.35); scene.add(hd) }
    else { for (let k = 0; k < 3 + ((c + r) & 3); k++) { const p = new THREE.Mesh(G0.box, pileMat); p.scale.set(0.8, 0.08, 1.0); p.position.set(X + sx * 0.4, y0 + 1.63 + k * 0.09, Z + 0.2); p.rotation.y = k * 0.3; scene.add(p) } }
  }
}

// ベルトコンベア
const beltTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#3a3f47'; x.fillRect(0, 0, w, h); x.fillStyle = '#2c3037'; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 10, h) })
beltTex.wrapS = THREE.RepeatWrapping; beltTex.repeat.set(12, 1)
const belt = new THREE.Mesh(new THREE.BoxGeometry(24, BELT_Y, 2.5), [LAMB('#2c3037'), LAMB('#2c3037'), new THREE.MeshLambertMaterial({ map: beltTex }), LAMB('#2c3037'), LAMB('#8a929e'), LAMB('#8a929e')])
belt.position.set(0, BELT_Y / 2, 0); scene.add(belt)
for (const z of [-1.32, 1.32]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 0.14), LAMB('#b7bec8')); rail.position.set(0, BELT_Y + 0.02, z); scene.add(rail) }
// 押す位置の目印（赤い線と三角）
const guideMat = new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.75, depthWrite: false })
const guide = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.5), guideMat); guide.rotation.x = -Math.PI / 2; guide.position.set(STX, BELT_Y + 0.004, 0); scene.add(guide)
const triGeo = new THREE.ConeGeometry(0.16, 0.3, 3)
for (const z of [-1.5, 1.5]) { const tri = new THREE.Mesh(triGeo, new THREE.MeshBasicMaterial({ color: '#ff3b30' })); tri.rotation.x = z < 0 ? Math.PI / 2 : -Math.PI / 2; tri.position.set(STX, BELT_Y + 0.12, z); scene.add(tri) }
const ringTex = canvasTex(128, 128, (x) => { x.strokeStyle = 'rgba(255,59,48,.9)'; x.lineWidth = 6; x.setLineDash([10, 8]); x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke() })
const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(STX, BELT_Y + 0.03, BOX_Z); scene.add(ring)

// 机の小物
const inkpad = new THREE.Group()
{ const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.7), LAMB('#2a2a2e')); b.position.y = 0.08; inkpad.add(b); const p = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.04, 0.54), LAMB('#c0201a')); p.position.y = 0.17; inkpad.add(p) }
inkpad.position.set(-2.9, 0, 2.0); inkpad.rotation.y = 0.2; scene.add(inkpad)
const mug = new THREE.Group()
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.6, 16), LAMB('#f3efe6')); c.position.y = 0.3; mug.add(c); const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), LAMB('#f3efe6')); h.position.set(0.32, 0.32, 0); mug.add(h); const cof = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), LAMB('#5a3a22')); cof.rotation.x = -Math.PI / 2; cof.position.y = 0.55; mug.add(cof) }
mug.position.set(3.0, 0, 2.0); scene.add(mug)
const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.12), LAMB('#22324a')); plate.position.set(1.2, 0.2, 2.15); plate.rotation.x = -0.4; scene.add(plate)
const plateTxt = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshBasicMaterial({ transparent: true })); plateTxt.position.set(1.2, 0.22, 2.215); plateTxt.rotation.x = -0.4; scene.add(plateTxt)

// ---------- 書類と押してはいけない物
const paperMat = LAMB('#fbf6ea')
let docMats = [], ngTex = {}
function buildDocTextures() {
  for (const m of docMats) { m.map.dispose(); m.dispose() }
  docMats = DOC_TITLES[S.lang].map((title, i) => new THREE.MeshLambertMaterial({ map: canvasTex(256, 332, (x, w, h) => {
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h)
    x.fillStyle = '#1e1a17'; x.font = `26px ${FONT_D}`; x.textAlign = 'left'; x.fillText(T('cardHead').replace(/ /g, '').slice(0, S.lang === 'ja' ? 3 : 8), 14, 36)
    x.font = `10px ${FONT_M}`; x.fillStyle = '#7a6a58'; x.fillText(`No.${1000 + i * 37}`, 16, 52)
    const lab = S.lang === 'ja' ? ['部長', '課長', '担当'] : ['DIR', 'MGR', 'YOU']
    const bw = 0.42 / DOC_W * w, cy = (DOC_D / 2 + BOX_Z) / DOC_D * h
    for (let k = 0; k < 3; k++) {
      const cx = (DOC_W / 2 + (k - 1) * BOX_DX) / DOC_W * w
      x.font = `bold 10px ${FONT_M}`; x.textAlign = 'center'; x.fillStyle = k === 2 ? '#d6332b' : '#7a6a58'; x.fillText(lab[k], cx, cy - bw / 2 - 4)
      if (k === 2) { x.fillStyle = 'rgba(214,51,43,.12)'; x.fillRect(cx - bw / 2, cy - bw / 2, bw, bw) }
      x.strokeStyle = k === 2 ? '#d6332b' : '#9a8f80'; x.lineWidth = k === 2 ? 3.5 : 1.5; x.strokeRect(cx - bw / 2, cy - bw / 2, bw, bw)
    }
    x.textAlign = 'left'; x.fillStyle = '#1e1a17'; x.font = `bold 15px ${FONT_M}`
    const ty = cy + bw / 2 + 30; x.fillText(S.lang === 'ja' ? '件名' : 'Re:', 14, ty)
    x.font = `bold 15px ${FONT_M}`; let line = '', yy = ty, lines = 0
    const words = S.lang === 'ja' ? [...title] : title.split(' ').map((s, j, a) => j < a.length - 1 ? s + ' ' : s)
    for (const ch of words) { if (x.measureText(line + ch).width > w - 70) { x.fillText(line, 56, yy); yy += 20; line = ''; lines++ } line += ch } x.fillText(line, 56, yy)
    x.strokeStyle = '#d8ccb6'; x.lineWidth = 1.2
    for (let k = 0; k < 7; k++) { const y = yy + 22 + k * 19; if (y > h - 12) break; x.beginPath(); x.moveTo(14, y); x.lineTo(w - 14 - (k % 3) * 30, y); x.stroke() }
  }) }))
  ngTex.lottery?.dispose(); ngTex.resign?.dispose(); ngTex.love?.dispose(); ngTex.voidT?.dispose(); ngTex.plate?.dispose()
  ngTex.lottery = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#ffd6e0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d6336c'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12)
    x.fillStyle = '#d6336c'; x.font = `40px ${FONT_D}`; x.textAlign = 'center'; x.fillText(S.lang === 'ja' ? '1等 当せん' : 'JACKPOT', w / 2, 62)
    x.font = `bold 18px ${FONT_M}`; x.fillStyle = '#1e1a17'; x.fillText('No. 07 組 123456', w / 2, 98)
  })
  ngTex.resign = canvasTex(160, 280, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c8ccd2'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4)
    x.fillStyle = '#1e1a17'; x.textAlign = 'center'
    if (S.lang === 'ja') { x.font = `46px ${FONT_D}`;['退', '職', '届'].forEach((c, i) => x.fillText(c, w / 2, 70 + i * 58)); x.font = `bold 18px ${FONT_M}`; x.fillText('自分', w / 2, 262) }
    else { x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.font = `30px ${FONT_D}`; x.fillText('RESIGNATION', 0, 10); x.restore(); x.font = `bold 16px ${FONT_M}`; x.fillText('(mine)', w / 2, 266) }
  })
  ngTex.love = canvasTex(256, 170, (x, w, h) => {
    x.fillStyle = '#ffc3d6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e05a8a'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, h * .6); x.lineTo(w, 0); x.stroke()
    x.fillStyle = '#e5304f'; x.beginPath(); const cx = w / 2, cy = h * .62; x.moveTo(cx, cy + 22); x.bezierCurveTo(cx - 40, cy - 6, cx - 18, cy - 36, cx, cy - 14); x.bezierCurveTo(cx + 18, cy - 36, cx + 40, cy - 6, cx, cy + 22); x.fill()
    x.fillStyle = '#7a1a3a'; x.font = `bold 20px ${FONT_M}`; x.textAlign = 'left'; x.fillText(S.lang === 'ja' ? '課長へ' : 'To: Boss', 14, h - 14)
  })
  ngTex.voidT = canvasTex(256, 128, (x, w, h) => { x.strokeStyle = '#1e1a17'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#1e1a17'; x.font = `64px ${FONT_D}`; x.textAlign = 'center'; x.fillText(S.lang === 'ja' ? '無効' : 'VOID', w / 2, 88) })
  ngTex.plate = canvasTex(256, 56, (x, w, h) => { x.fillStyle = '#fbf6ea'; x.font = `bold 30px ${FONT_M}`; x.textAlign = 'center'; x.fillText(S.lang === 'ja' ? '係長 （あなた）' : 'YOU', w / 2, 40) })
  plateTxt.material.map = ngTex.plate; plateTxt.material.needsUpdate = true
  for (const it of S.items) if (it.kind === 'doc') it.paper.material = docMats[it.v % docMats.length]
  for (const it of S.items) if (it.texKey) it.texMesh.material.map = ngTex[it.texKey], it.texMesh.material.needsUpdate = true
}
const stampTex = canvasTex(128, 128, (x) => {
  x.strokeStyle = '#d6332b'; x.fillStyle = '#d6332b'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke()
  x.font = `38px ${FONT_D}`; x.textAlign = 'center'; x.fillText('決', 64, 60); x.fillText('裁', 64, 100)
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { x.globalAlpha = Math.random() * .5; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, Math.random() * 4, 0, 7); x.fill() }
})
const stampMat = new THREE.MeshBasicMaterial({ map: stampTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
const stampGeo = new THREE.PlaneGeometry(0.44, 0.44)
function addImpression(parent, lx, ly, lz, rot) {
  const g = new THREE.Group(); g.position.set(lx, ly, lz); g.rotation.y = rot
  const m = new THREE.Mesh(stampGeo, stampMat); m.rotation.x = -Math.PI / 2; g.add(m); parent.add(g)
  g.scale.setScalar(1.4); g.userData.pop = 8; S.fx.push({ obj: g, kind: 'pop' }); return g
}
const G = {
  paper: new THREE.PlaneGeometry(DOC_W, DOC_D), shadow: new THREE.PlaneGeometry(DOC_W + 0.1, DOC_D + 0.1),
  sph: new THREE.SphereGeometry(1, 14, 10), cone: new THREE.ConeGeometry(1, 1, 4), cyl: new THREE.CylinderGeometry(1, 1, 1, 18), box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1),
}
const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false })
const M = { cat: LAMB('#e8913a'), catW: LAMB('#fff3e6'), dark: LAMB('#3a2a1e'), frame: LAMB('#8a5a2b'), white: LAMB('#ffffff'), cream: LAMB('#fff8ee'), pink: LAMB('#ffb3c7'), berry: LAMB('#e5304f'), plateM: LAMB('#e6e6ea') }
let photoTex = null
function mesh(geo, mat, sx, sy, sz, x, y, z) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m }
function flat(tex, w, d, y = 0.012) { const m = new THREE.Mesh(G.plane, new THREE.MeshLambertMaterial({ map: tex })); m.scale.set(w, d, 1); m.rotation.x = -Math.PI / 2; m.position.y = y; return m }
const BUILD = {
  doc(it) {
    const g = new THREE.Group(); const sh = new THREE.Mesh(G.shadow, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0.04, 0.004, 0.05); g.add(sh)
    it.v = Math.floor(S.rnd() * 8); const p = new THREE.Mesh(G.paper, docMats[it.v % docMats.length]); p.rotation.x = -Math.PI / 2; p.position.y = 0.01; g.add(p); it.paper = p
    it.top = 0.012; g.rotation.y = (S.rnd() - 0.5) * 0.06; return g
  },
  cat(it) {
    const g = new THREE.Group()
    g.add(mesh(G.sph, M.cat, 0.72, 0.36, 0.5, 0, 0.32, 0)); g.add(mesh(G.sph, M.catW, 0.4, 0.2, 0.3, 0.2, 0.22, 0.25))
    const head = new THREE.Group(); head.position.set(0.62, 0.38, 0.12); g.add(head)
    head.add(mesh(G.sph, M.cat, 0.33, 0.3, 0.32, 0, 0, 0)); head.add(mesh(G.cone, M.cat, 0.12, 0.22, 0.12, -0.12, 0.3, -0.05)); head.add(mesh(G.cone, M.cat, 0.12, 0.22, 0.12, 0.14, 0.3, -0.05))
    head.add(mesh(G.box, M.dark, 0.1, 0.02, 0.02, -0.1, 0.06, 0.3)); head.add(mesh(G.box, M.dark, 0.1, 0.02, 0.02, 0.1, 0.06, 0.3)); head.add(mesh(G.sph, LAMB('#ff8fa0'), 0.035, 0.03, 0.03, 0, -0.02, 0.32))
    const tail = mesh(G.cyl, M.cat, 0.08, 0.7, 0.08, -0.62, 0.22, 0.3); tail.rotation.set(0, 0.6, Math.PI / 2.4); g.add(tail)
    for (let k = 0; k < 3; k++) g.add(mesh(G.box, LAMB('#c46a1c'), 0.06, 0.02, 0.4, -0.3 + k * 0.22, 0.66, 0))
    it.zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex, transparent: true, depthWrite: false })); it.zzz.scale.set(0.55, 0.55, 1); it.zzz.position.set(0.8, 1.05, 0); g.add(it.zzz)
    it.top = 0.68; it.head = head; return g
  },
  trapPhoto(it) { const g = BUILD.doc(it); const ph = flat(photoTex, 0.4, 0.5, 0.02); ph.position.set(BOX_DX, 0.02, BOX_Z); ph.rotation.z = 0.08; g.add(ph); return g },
  trapLottery(it) { const g = BUILD.doc(it); const tk = flat(ngTex.lottery, 0.8, 0.4, 0.02); tk.position.set(-0.75, 0.02, 0.5); tk.rotation.z = 0.35; g.add(tk); it.ticket = tk; it.texKey = 'lottery'; it.texMesh = tk; return g },
  photo(it) {
    const g = new THREE.Group(); g.add(mesh(G.box, M.frame, 1.05, 0.08, 1.3, 0, 0.04, 0))
    const p = flat(photoTex, 0.85, 1.1, 0.085); g.add(p); it.top = 0.09; return g
  },
  lottery(it) { const g = new THREE.Group(); const p = flat(ngTex.lottery, 1.3, 0.65); g.add(p); it.texKey = 'lottery'; it.texMesh = p; it.top = 0.014; g.rotation.y = 0.12; return g },
  resign(it) { const g = new THREE.Group(); const p = flat(ngTex.resign, 0.8, 1.4); g.add(p); it.texKey = 'resign'; it.texMesh = p; it.top = 0.014; g.rotation.y = -0.1; return g },
  love(it) { const g = new THREE.Group(); const p = flat(ngTex.love, 1.25, 0.83); g.add(p); it.texKey = 'love'; it.texMesh = p; it.top = 0.014; g.rotation.y = 0.15; return g },
  cake(it) {
    const g = new THREE.Group(); g.add(mesh(G.cyl, M.plateM, 0.6, 0.04, 0.6, 0, 0.02, 0))
    const c = new THREE.Group(); g.add(c); it.cakeG = c
    c.add(mesh(G.cyl, M.cream, 0.42, 0.36, 0.42, 0, 0.22, 0)); c.add(mesh(G.cyl, M.pink, 0.43, 0.07, 0.43, 0, 0.2, 0))
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; c.add(mesh(G.sph, M.berry, 0.09, 0.09, 0.09, Math.cos(a) * 0.24, 0.45, Math.sin(a) * 0.24)) }
    c.add(mesh(G.sph, M.berry, 0.12, 0.12, 0.12, 0, 0.47, 0)); it.top = 0.42; return g
  },
}
const zzzTex = canvasTex(128, 128, (x) => { x.fillStyle = '#fbf6ea'; x.strokeStyle = '#22324a'; x.lineWidth = 6; x.font = `56px ${FONT_D}`; x.strokeText('Z', 20, 100); x.fillText('Z', 20, 100); x.font = `36px ${FONT_D}`; x.strokeText('z', 76, 52); x.fillText('z', 76, 52) })
const heartTex = canvasTex(64, 64, (x) => { x.fillStyle = '#ff4f7a'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(-6, 30, 12, 0, 32, 20); x.bezierCurveTo(52, 0, 70, 30, 32, 56); x.fill() })
const sparkTex = canvasTex(64, 64, (x) => { x.fillStyle = '#ffd34a'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 10 : 30; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) } x.fill() })
const sheetMat = new THREE.MeshLambertMaterial({ color: '#fbf6ea', side: THREE.DoubleSide })
const sheetGeo = new THREE.PlaneGeometry(1.1, 1.45)

function spawnItem(kind, x) {
  const it = { kind, x, z: kind === 'doc' || TRAPS.includes(kind) ? 0 : BOX_Z, hw: kind === 'doc' ? DOC_W / 2 : NG.find(n => n.id === kind).hw, stamped: 0, hit: false, counted: false }
  it.g = BUILD[kind](it); it.g.position.set(x, BELT_Y, it.z); scene.add(it.g); S.items.push(it); return it
}
function clearItems() { for (const it of S.items) scene.remove(it.g); S.items = [] }

// ---------- 手とハンコ
const hand = { g: new THREE.Group(), ph: -1, from: 1.3, contact: BELT_Y, y: 1.3, sq: 0 }
const REST_Y = 1.35
{
  const hk = new THREE.Group(); hand.hk = hk
  hk.add(mesh(G.cyl, LAMB('#7a4a22'), 0.17, 0.7, 0.17, 0, 0.45, 0)); hk.add(mesh(G.cyl, LAMB('#b0202a'), 0.21, 0.09, 0.21, 0, 0.045, 0)); hk.add(mesh(G.cyl, LAMB('#e7c58f'), 0.22, 0.06, 0.22, 0, 0.12, 0))
  hk.add(mesh(G.sph, LAMB('#7a4a22'), 0.2, 0.14, 0.2, 0, 0.82, 0)); hk.add(mesh(G.sph, LAMB('#d6332b'), 0.07, 0.04, 0.07, 0, 0.95, 0))
  const skin = LAMB('#f2c9a5'); const fist = mesh(G.sph, skin, 0.26, 0.24, 0.27, 0.2, 0.6, 0); hk.add(fist)
  for (let k = 0; k < 4; k++) hk.add(mesh(G.sph, skin, 0.075, 0.075, 0.075, 0.02, 0.5 + k * 0.075, 0.2 - k * 0.02))
  hk.add(mesh(G.sph, skin, 0.08, 0.07, 0.13, 0.05, 0.72, -0.2))
  hand.g.add(hk)
  const cuff = mesh(G.cyl, LAMB('#22324a'), 0.23, 0.22, 0.23, 0, 0, 0); hand.cuff = cuff; hand.g.add(cuff)
  const arm = mesh(new THREE.CylinderGeometry(1.15, 1, 1, 16), LAMB('#e8f0fa'), 0.2, 1, 0.2, 0, 0, 0); hand.arm = arm; hand.g.add(arm)
  const armEnd = mesh(G.sph, LAMB('#e8f0fa'), 0.23, 0.23, 0.23, 0, 0, 0); hand.armEnd = armEnd; hand.g.add(armEnd)
  const fore = mesh(G.cyl, skin, 0.17, 1, 0.17, 0, 0, 0); hand.fore = fore; hand.g.add(fore)
  scene.add(hand.g)
  hand.blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), shadowMat.clone()); hand.blob.rotation.x = -Math.PI / 2; hand.blob.position.set(STX, BELT_Y + 0.02, BOX_Z); scene.add(hand.blob)
}
const ARM_DIR = new THREE.Vector3(0.55, 1, 0.12).normalize(), ARM_LEN = 0.95, _v = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0)
function placeHand() {
  const hk = hand.hk; hk.position.set(STX, hand.y, BOX_Z); hk.scale.set(1 + hand.sq * 0.12, 1 - hand.sq * 0.12, 1 + hand.sq * 0.12)
  const wrist = _v.set(STX + 0.36, hand.y + 0.6, BOX_Z + 0.08)
  // 腕は手首から先だけ。ハンコの真上から右上へ短く逃がし、ベルトの書類と赤い線をふさがない
  const dir = ARM_DIR, len = ARM_LEN
  const fl = 0.35; _q.setFromUnitVectors(UP, dir)
  hand.fore.position.copy(wrist).addScaledVector(dir, fl / 2); hand.fore.scale.set(0.15, fl, 0.15); hand.fore.quaternion.copy(_q)
  hand.arm.position.copy(wrist).addScaledVector(dir, fl + (len - fl) / 2); hand.arm.scale.set(0.2, len - fl, 0.2); hand.arm.quaternion.copy(_q)
  hand.armEnd.position.copy(wrist).addScaledVector(dir, len)
  hand.cuff.position.copy(wrist).addScaledVector(dir, fl); hand.cuff.scale.set(0.215, 0.1, 0.215); hand.cuff.quaternion.copy(_q)
  const h = clamp((hand.y - hand.contact) / 1.3, 0, 1); hand.blob.scale.setScalar(0.6 + h * 0.6); hand.blob.material.opacity = 0.35 - h * 0.2; hand.blob.position.y = hand.contact + 0.006
}
function updateHand() {
  if (hand.ph >= 0) {
    hand.ph++
    const p = hand.ph
    if (p <= 2) hand.y = lerp(hand.from, hand.contact, p / 2)
    else if (p <= 7) { hand.y = hand.contact; hand.sq = p <= 4 ? 1 : 1 - (p - 4) / 3 }
    else if (p <= 16) { const k = (p - 7) / 9; hand.y = lerp(hand.contact, REST_Y, 1 - (1 - k) * (1 - k)); hand.sq = 0 }
    else { hand.ph = -1; hand.y = REST_Y }
  } else hand.y = REST_Y + Math.sin(S.frame * 0.08) * 0.04
  placeHand()
}
const handReady = () => hand.ph < 0 || hand.ph >= 9

// ---------- 課長
const boss = { g: new THREE.Group(), peek: 0, peekT: 0, mood: 'normal', moodT: 0, say: null, sayT: 0, lean: 0 }
const faceTex = {}
{
  const g = boss.g, suit = LAMB('#2d3a52')
  const body = mesh(G.cyl, suit, 0.9, 2.2, 0.6, 0, 0.4, 0); g.add(body)
  g.add(mesh(G.box, LAMB('#ffffff'), 0.5, 1.2, 0.05, 0, 0.9, 0.57)); g.add(mesh(G.box, LAMB('#c0201a'), 0.16, 0.95, 0.06, 0, 0.85, 0.6))
  boss.armL = mesh(G.cyl, suit, 0.22, 1.5, 0.22, -0.95, 0.6, 0.2); boss.armL.rotation.z = 0.25; g.add(boss.armL)
  boss.armR = mesh(G.cyl, suit, 0.22, 1.5, 0.22, 0.95, 0.6, 0.2); boss.armR.rotation.z = -0.25; g.add(boss.armR)
  boss.head = new THREE.Group(); boss.head.position.set(0, 2.1, 0.1); g.add(boss.head)
  boss.head.add(mesh(G.sph, LAMB('#f2c9a5'), 0.62, 0.66, 0.6, 0, 0, 0))
  boss.face = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); boss.face.scale.set(1.5, 1.5, 1); boss.face.position.set(0, 0, 0.45); boss.head.add(boss.face)
  g.position.copy(BOSS_IDLE); scene.add(g)
}
function setMood(m) { boss.mood = m; if (faceTex[m]) { boss.face.material.map = faceTex[m]; boss.face.material.needsUpdate = true } }
function bossSay(text, mood = 'angry', big = false, dur = 100) {
  setMood(mood); boss.moodT = dur; boss.peekT = dur
  if (boss.say) boss.say.remove()
  const d = document.createElement('div'); d.className = 'say' + (big ? ' big' : ''); d.textContent = text; $('#fx').appendChild(d); boss.say = d; boss.sayT = dur
}
function updateBoss() {
  if (boss.peekT > 0) boss.peekT--
  if (boss.moodT > 0 && --boss.moodT === 0) setMood('normal')
  if (boss.sayT > 0 && --boss.sayT === 0 && boss.say) { boss.say.remove(); boss.say = null }
  boss.peek = lerp(boss.peek, boss.peekT > 0 ? 1 : 0, 0.12)
  boss.g.position.lerpVectors(BOSS_IDLE, BOSS_PEEK, boss.peek)
  const f = S.frame
  boss.g.rotation.x = boss.peek * 0.32; boss.g.position.y += Math.sin(f * 0.05) * 0.04
  const angry = boss.mood === 'angry'
  boss.armL.rotation.z = angry ? 0.25 + Math.sin(f * 0.6) * 0.5 + 1.2 : boss.mood === 'happy' ? 2.4 + Math.sin(f * 0.3) * 0.3 : 0.25
  boss.armR.rotation.z = angry ? -(0.25 + Math.cos(f * 0.6) * 0.5 + 1.2) : boss.mood === 'happy' ? -2.4 - Math.sin(f * 0.3) * 0.3 : -0.25
  boss.head.rotation.z = angry ? Math.sin(f * 0.9) * 0.08 : boss.mood === 'blush' ? 0.18 : boss.mood === 'cry' ? Math.sin(f * 0.4) * 0.05 : 0
}

// ---------- 未決裁の山
const pileG = new THREE.Group(); pileG.position.set(PILE.x, 0, PILE.z); scene.add(pileG)
const pileGeo = new THREE.BoxGeometry(1.3, 0.07, 1.65)
function rebuildPile() {
  while (pileG.children.length) pileG.remove(pileG.children[0])
  const r = rng(77)
  for (let i = 0; i < S.pile; i++) { const m = new THREE.Mesh(pileGeo, paperMat); m.position.set((r() - 0.5) * 0.18 * (1 + i * 0.15), 0.04 + i * 0.075, (r() - 0.5) * 0.14); m.rotation.y = (r() - 0.5) * 0.4; pileG.add(m) }
}
rebuildPile()

// ---------- 演出（3D の粒・紙）と DOM の吹き出し
function addFx(obj, o) { scene.add(obj); S.fx.push(Object.assign({ obj, kind: 'phys', vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, g: 9, life: 90, floor: 0.02 }, o)) }
function sheetBurst(x, y, z, n, spread = 3) {
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sheetGeo, sheetMat); m.position.set(x, y + i * 0.05, z); m.rotation.set(-Math.PI / 2 + (Math.random() - .5), Math.random() * 6, 0); m.scale.setScalar(0.8)
    addFx(m, { vx: (Math.random() - 0.5) * spread, vy: 2 + Math.random() * 3.5, vz: (Math.random() - 0.3) * spread, rx: (Math.random() - .5) * 8, rz: (Math.random() - .5) * 8, g: 6, life: 110 + Math.random() * 30, drag: 0.97 }) }
}
function spriteBurst(tex, x, y, z, n, sc = 0.35, up = 3) {
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.position.set(x, y, z); s.scale.setScalar(sc * (0.7 + Math.random() * 0.6))
    addFx(s, { vx: (Math.random() - 0.5) * 3, vy: up * (0.6 + Math.random() * 0.8), vz: (Math.random() - 0.5) * 2, g: 3, life: 50 + Math.random() * 20, fade: true, floor: -9 }) }
}
function creamBurst(x, y, z) {
  for (let i = 0; i < 18; i++) { const m = mesh(G.sph, i % 4 ? M.cream : M.pink, 0.08, 0.06, 0.08, x, y, z); addFx(m, { vx: (Math.random() - 0.5) * 5, vy: 1.5 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, g: 9, life: 120, stick: true, floor: 0.03 }) }
}
function updateFx() {
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i]
    if (f.kind === 'pop') { const k = --f.obj.userData.pop; f.obj.scale.setScalar(1 + Math.max(0, k) * 0.05); if (k <= 0) { f.obj.scale.setScalar(1); S.fx.splice(i, 1) } continue }
    const o = f.obj; f.vy -= f.g * STEP; if (f.drag) { f.vx *= f.drag; f.vz *= f.drag; if (f.vy < -1.2) f.vy = -1.2 }
    o.position.x += f.vx * STEP; o.position.y += f.vy * STEP; o.position.z += f.vz * STEP
    if (o.position.y <= f.floor) { o.position.y = f.floor; f.vy = 0; f.vx *= 0.8; f.vz *= 0.8; f.rx *= 0.5; f.rz *= 0.5; if (f.stick) f.vx = f.vz = 0 }
    o.rotation.x += f.rx * STEP; o.rotation.y += f.ry * STEP; o.rotation.z += f.rz * STEP
    if (f.fade && o.material) o.material.opacity = clamp(f.life / 30, 0, 1)
    if (--f.life <= 0) { scene.remove(o); if (f.fade && o.material) o.material.dispose(); S.fx.splice(i, 1) }
  }
}
const _p = new THREE.Vector3()
function toScreen(x, y, z) { _p.set(x, y, z).project(camera); return { x: (_p.x + 1) / 2 * innerWidth, y: (1 - _p.y) / 2 * innerHeight } }
function pop(x, y, z, text, cls, sub) {
  if (S.mode === 'demo' || S.quiet) return
  const s = toScreen(x, y, z), d = document.createElement('div'); d.className = 'pop ' + cls
  d.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); d.style.left = clamp(s.x, 70, innerWidth - 70) + 'px'; d.style.top = Math.max(90, s.y) + 'px'
  $('#fx').appendChild(d); setTimeout(() => d.remove(), 820)
}
function shake(red) { document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); const f = $('#flash'); f.classList.toggle('redf', !!red); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on') }
let bannerT = 0
function banner(a, b, rush) { const el = $('#banner'); $('#bn1').textContent = a; $('#bn2').textContent = b || ''; $('#bn2').hidden = !b; el.classList.toggle('rush', !!rush); el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); bannerT = 80 }

// ---------- 遊び
function speed() { const k = clamp(S.t / GAME_T, 0, 1); return 2.0 + 2.2 * Math.pow(k, 1.1) + (S.t > RUSH_T ? 0.45 : 0) }
function nextGap() { const k = clamp(S.t / GAME_T, 0, 1); return 2.7 - 0.6 * k + S.rnd() * 0.6 }
function pickKind() {
  S.spawnN++
  if (S.mode === 'demo') return Math.random() < 0.22 ? NG[Math.floor(Math.random() * NG.length)].id : 'doc'
  const p = 0.2 + 0.18 * clamp(S.t / GAME_T, 0, 1)
  if (S.spawnN <= 3 || S.rnd() >= p || (S.lastNg && S.rnd() < 0.7)) { S.lastNg = false; return 'doc' }
  if (!S.bag.length) { S.bag = NG.map(n => n.id); for (let i = S.bag.length - 1; i > 0; i--) { const j = Math.floor(S.rnd() * (i + 1));[S.bag[i], S.bag[j]] = [S.bag[j], S.bag[i]] } }
  S.lastNg = true; return S.bag.pop()
}
function resetRun(seed) {
  S.seed = seed >>> 0 || 1; S.rnd = rng(S.seed)
  Object.assign(S, { t: 0, score: 0, done: 0, combo: 0, maxCombo: 0, bows: 0, straights: 0, ng: {}, ngOrder: [], collapses: 0, missed: 0, stamps: [], pile: 2, hit: 0, ct: 0, endT: 0, spawnN: 0, lastNg: false, bag: [], rush: false, result: null, nextMada: 9, bowRun: 0, tutHits: 0 })
  clearItems(); rebuildPile()
  let x = -3.2; spawnItem(pickKind(), x)
  while (true) { const g = nextGap(); if (x - g < SPAWN_X) { S.gap = g; S.dist = x - SPAWN_X; break } x -= g; spawnItem(pickKind(), x) }
  hand.ph = -1; boss.peekT = 0; setMood('normal')
}
function startDemo() {
  S.mode = 'demo'; S.rnd = Math.random; clearItems(); S.pile = 2; rebuildPile()
  for (let x = 4; x > SPAWN_X; x -= 3.4) spawnItem(pickKind(), x)
  S.dist = 0; S.gap = 3.4
}
function startGame(seed = (Math.random() * 1e9) | 0) {
  go('play'); resetRun(seed); S.mode = 'count'; S.ct = 0
  let tut = false; try { tut = !localStorage.getItem('hh.tut') } catch (e) { tut = true }
  S.tutOn = tut; S.tutDone = false; $('#hClock').classList.remove('rush'); $('#tut').hidden = true; $('#banner').hidden = true; $('#combo').className = ''
  Snd.setTrack('play'); hudUpdate(true)
}
function press() {
  if (S.mode !== 'play' && S.mode !== 'demo') return 'nomode'
  if (S.hit > 0 || !handReady()) return 'busy'
  hand.from = hand.y; hand.ph = 0
  let target = null, e = 0
  for (const it of S.items) {
    if (it.kind === 'doc') { e = it.x + BOX_DX - STX; if (e > -0.37 && e < 1.33) { target = it; break } }
    else if (!it.hit && Math.abs(it.x - STX) < it.hw) { target = it; break }
  }
  if (S.mode === 'demo') { hand.contact = target ? BELT_Y + target.top : BELT_Y; if (target && target.kind === 'doc' && !target.stamped) { target.stamped = 1; addImpression(target.g, STX - target.x, target.top + 0.004, BOX_Z, 0.3) } Snd.sfx('stamp', 0.6); return 'demo' }
  Snd.sfx('stamp')
  if (!target) { hand.contact = BELT_Y; S.score += PTS.air; S.combo = 0; S.bowRun = 0; pop(STX, 0.8, BOX_Z, T('j').air, 'bad', PTS.air); Snd.sfx('air'); hudUpdate(); return 'air' }
  hand.contact = BELT_Y + target.top
  if (target.kind !== 'doc') return accident(target)
  if (target.stamped) { addImpression(target.g, rotLocal(target, STX - target.x), target.top + 0.004 + target.stamped * 0.001, BOX_Z, (Math.random() - 0.5) * 0.6); target.stamped++; S.combo = 0; pop(STX, 0.9, BOX_Z, T('j').air, 'bad', PTS.air); S.score += PTS.air; Snd.sfx('air'); hudUpdate(); return 'double' }
  let j, rot
  const a = Math.abs(e)
  const W0 = WIN.straight, W1 = WIN.bow
  if (a < W0) { j = 'straight'; rot = e * 0.6 }
  else if (e > 0 && e < W1) { j = 'bow'; rot = (12 + (e - W0) / (W1 - W0) * 14) * Math.PI / 180 }
  else if (e < 0 && e > -W1) { j = 'fun'; rot = -(12 + (-e - W0) / (W1 - W0) * 14) * Math.PI / 180 }
  else { j = 'off'; rot = (S.rnd() - 0.5) * 1.2 }
  target.stamped = 1; target.judge = j
  addImpression(target.g, rotLocal(target, STX - target.x), target.top + 0.004, BOX_Z, rot - target.g.rotation.y)
  if (j === 'straight' || j === 'bow') S.combo++; else S.combo = 0
  S.maxCombo = Math.max(S.maxCombo, S.combo)
  const mult = 1 + Math.min(4, Math.floor(S.combo / 5)) * 0.5
  const pts = Math.round(PTS[j] * (PTS[j] > 0 ? mult : 1))
  S.score += pts; S.done++
  if (j === 'bow') { S.bows++; S.bowRun++; spriteBurst(sparkTex, STX, 0.5, BOX_Z, 6, 0.3, 2.5) } else S.bowRun = 0
  if (j === 'straight') S.straights++
  S.stamps.push({ j, rot, e })
  pop(STX, 2.3, BOX_Z, T('j')[j], j, (pts > 0 ? '+' : '') + pts + (mult > 1 && pts > 0 ? ` ×${mult}` : ''))
  Snd.sfx(j)
  if (S.combo > 0 && S.combo % 5 === 0) { Snd.sfx('combo', S.combo / 5); comboPop() }
  if (S.bowRun === 3) bossSay(T('bossBow'), 'happy', false, 80)
  if (S.tutOn && (j === 'straight' || j === 'bow' || j === 'fun') && ++S.tutHits >= 3) S.tutDone = true
  hudUpdate(); return j
}
// 書類は少し回して置いてあるので、押した位置を書類の座標に直す
function rotLocal(it, dx) { return dx * Math.cos(it.g.rotation.y) }
function accident(it) {
  const n = NG.find(k => k.id === it.kind); it.hit = true
  S.ng[it.kind] = (S.ng[it.kind] || 0) + 1; if (!S.ngOrder.includes(it.kind)) S.ngOrder.push(it.kind)
  S.score += PTS.ng; S.combo = 0; S.bowRun = 0; S.hit = 46
  S.stamps.push({ j: 'ng', id: it.kind, rot: (S.rnd() - 0.5) * 0.8 })
  const imp = addImpression(it.g, STX - it.x, it.top + 0.006, it.z === 0 ? BOX_Z : 0, (S.rnd() - 0.5) * 0.8)
  shake(true); Snd.sfx('accident'); setTimeout(() => Snd.sfx('hii'), 380)
  banner(S.lang === 'ja' ? n.bja : n.ben, S.lang === 'ja' ? n.sja : n.sen)
  bossSay(S.lang === 'ja' ? n.mja : n.men, n.boss, true, 130)
  pop(STX, 1.2, BOX_Z, PTS.ng, 'bad')
  const wx = STX, wy = BELT_Y + it.top, wz = BOX_Z
  if (it.kind === 'cat') { Snd.sfx('meow'); S.items.splice(S.items.indexOf(it), 1); it.g.position.y += 0.1; addFx(it.g, { vx: -1.6, vy: 6.5, vz: 2.2, rx: -4, rz: 7, g: 8, life: 120, floor: -20 }); if (it.zzz) it.zzz.visible = false }
  if (it.kind === 'photo' || it.kind === 'trapPhoto') Snd.sfx('bossBig')
  if (it.kind === 'trapLottery') { Snd.sfx('void'); it.ticket.material = it.ticket.material.clone(); it.ticket.material.map = ngTex.voidT }
  if (it.kind === 'lottery') { Snd.sfx('void'); const v = flat(ngTex.voidT, 1.2, 0.6, 0.03); v.material.transparent = true; it.g.add(v) }
  if (it.kind === 'resign') { Snd.sfx('laugh'); sheetBurst(wx, wy, wz, 3, 2) }
  if (it.kind === 'love') { Snd.sfx('heart'); spriteBurst(heartTex, wx, wy + 0.3, wz, 14, 0.45, 3.5) }
  if (it.kind === 'cake') { Snd.sfx('splat'); it.cakeG.scale.set(1.35, 0.3, 1.35); creamBurst(wx, wy + 0.1, wz) }
  hudUpdate(); return 'ng:' + it.kind
}
function comboPop() { const c = $('#combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump') }
function addPile() {
  S.pile++; S.missed++; S.combo = 0; S.bowRun = 0
  const m = new THREE.Mesh(sheetGeo, sheetMat); m.position.set(PILE.x, 3, PILE.z); m.rotation.x = -Math.PI / 2
  addFx(m, { vy: 0, g: 14, life: 26, floor: 0.05 + S.pile * 0.075 })
  setTimeout(rebuildPile, 380)
  if (S.pile > PILE_MAX) collapse()
  else { const a = T('bossMada'); bossSay(a[Math.min(a.length - 1, S.missed % a.length)], 'angry', false, 80); Snd.sfx('boss') }
}
function collapse() {
  S.collapses++; S.score += PTS.collapse
  sheetBurst(PILE.x, 0.4, PILE.z, 10, 5); S.pile = 2; setTimeout(rebuildPile, 0)
  shake(); Snd.sfx('collapse'); banner(T('collapse'), PTS.collapse + ''); bossSay(T('bossCollapse'), 'angry', true, 120); Snd.sfx('bossBig'); S.hit = Math.max(S.hit, 30)
}
function update() {
  S.frame++
  if (bannerT > 0 && --bannerT === 0) $('#banner').hidden = true
  if (S.mode === 'count') {
    const k = S.ct++
    if (k % 60 === 0 && k <= 180) { const i = k / 60, el = $('#count'); el.hidden = false; el.textContent = T('count')[i]; el.className = 'anim' + (i === 3 ? ' go' : ''); void el.offsetWidth; Snd.sfx(i === 3 ? 'go' : 'count') }
    if (k === 180) S.mode = 'play'
  }
  if (S.mode === 'count' && S.ct > 230) $('#count').hidden = true
  if (S.mode === 'play' && S.ct++ > 230) $('#count').hidden = true
  const moving = S.mode === 'demo' || (S.mode === 'play' && S.hit === 0)
  if (S.hit > 0) S.hit--
  if (moving) {
    const v = S.mode === 'demo' ? 1.25 : speed(), dx = v * STEP
    if (S.mode === 'play') {
      const before = S.t; S.t += STEP
      if (before < RUSH_T && S.t >= RUSH_T) { S.rush = true; banner(T('rush'), T('rushSub'), true); Snd.setTrack('rush'); $('#hClock').classList.add('rush') }
      if (S.t >= S.nextMada && S.t < GAME_T - 2) { const a = T('bossMada'); bossSay(a[Math.floor(S.rnd() * a.length)], 'angry', false, 70); Snd.sfx('boss'); S.nextMada = S.t + 7 + S.rnd() * 4 }
    }
    beltTex.offset.x -= dx / 2 * 12 / 24 * 2
    for (const it of S.items) {
      it.x += dx; it.g.position.x = it.x
      if (S.mode !== 'play') continue
      if (!it.counted && it.kind === 'doc' && !it.stamped && it.x + BOX_DX > STX + 1.4) { it.counted = true; pop(it.x, 0.2, 1.0, T('j').pass, 'bad'); Snd.sfx('pass'); addPile() }
      if (!it.counted && it.kind !== 'doc' && !it.hit && it.x - it.hw > STX + 0.15) { it.counted = true; S.score += PTS.skip; pop(it.x, 0.2, 1.0, T('j').skip, 'off', '+' + PTS.skip) }
    }
    for (let i = S.items.length - 1; i >= 0; i--) if (S.items[i].x > KILL_X) { scene.remove(S.items[i].g); S.items.splice(i, 1) }
    S.dist += dx
    if (S.dist >= S.gap) { S.dist -= S.gap; spawnItem(pickKind(), SPAWN_X + S.dist); S.gap = S.mode === 'demo' ? 3 + Math.random() * 1.2 : nextGap() }
    if (S.mode === 'play' && S.t >= GAME_T) endGame()
  }
  for (const it of S.items) if (it.zzz) { it.zzz.position.y = 1.05 + Math.sin(S.frame * 0.06 + it.x) * 0.08; it.head.rotation.z = Math.sin(S.frame * 0.04) * 0.08 }
  if (S.mode === 'end' && ++S.endT === 150) showResult()
  // 自動で押す（タイトルの見本と検証用）
  const bot = S.mode === 'demo' ? 'demo' : S.mode === 'play' ? S.bot : null
  if (bot && handReady() && S.hit === 0) {
    if (bot === 'mash') { if (S.frame % 11 === 0) press() }
    else if (bot !== 'idle') {
      const th = { demo: 0.08, bow: 0.08, straight: -0.05, fun: -0.16, late: 0.5 }[bot]
      for (const it of S.items) if (it.kind === 'doc' && !it.stamped) { const e = it.x + BOX_DX - STX; if (e >= th && e < th + 0.2) { press(); break } }
      if (bot === 'chaos') for (const it of S.items) if (it.kind !== 'doc' && !it.hit && Math.abs(it.x - STX) < 0.05) { press(); break }
    }
  }
  if (S.mode === 'play' && S.tutOn) tutUpdate()
  updateHand(); updateBoss(); updateFx()
  pileG.rotation.z = Math.sin(S.frame * 0.09) * 0.004 * S.pile * S.pile
}
function tutUpdate() {
  const el = $('#tut')
  if (S.tutDone || S.t > 14) { el.hidden = true; return }
  el.hidden = false
  let now = false; for (const it of S.items) if (it.kind === 'doc' && !it.stamped) { const e = it.x + BOX_DX - STX; if (e > -0.08 && e < 0.12) now = true }
  el.classList.toggle('now', now); $('#tutTxt').textContent = now ? T('tutNow') : (isTouch() ? T('tutSp') : T('tutPc'))
}
function endGame() {
  S.mode = 'end'; S.endT = 0; $('#tut').hidden = true
  Snd.setTrack(null); Snd.sfx('bell'); banner(T('bell'), '', true)
  bossSay(S.lang === 'ja' ? 'よし、定時だ' : 'Okay. Five o\'clock.', 'normal', false, 120)
  try { localStorage.setItem('hh.tut', '1') } catch (e) {}
  S.result = makeResult()
}
function gradeIdx(score) { let g = 0; GRADES.forEach((x, i) => { if (score >= x.min) g = i }); return g }
function makeResult() {
  const gi = gradeIdx(S.score), ngTotal = Object.values(S.ng).reduce((a, b) => a + b, 0)
  let cm
  if (S.ng.resign) cm = BOSS_SPECIAL.resign[S.lang]
  else if (S.done === 0) cm = BOSS_SPECIAL.zero[S.lang]
  else if (ngTotal >= 4) cm = BOSS_SPECIAL.many[S.lang]
  else { const L = BOSS_COMMENT[S.lang]; cm = L.filter(c => c[0] <= gi).pop()[1] }
  const mood = S.ng.resign ? 'happy' : gi >= 8 ? 'happy' : gi >= 4 ? 'normal' : S.done === 0 ? 'shock' : 'angry'
  return { score: S.score, done: S.done, bows: S.bows, straights: S.straights, maxCombo: S.maxCombo, ng: { ...S.ng }, ngOrder: [...S.ngOrder], ngTotal, collapses: S.collapses, missed: S.missed, gi, cm, mood, stamps: S.stamps.slice(), seed: S.seed }
}

// ---------- HUD
let lastHud = ''
function clockStr(t) { const s = 16 * 3600 + 59 * 60 + 15 + Math.floor(t); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` }
function hudUpdate(force) {
  const key = `${Math.floor(S.t)}|${S.score}|${S.done}|${S.combo}|${S.lang}`
  if (!force && key === lastHud) return; lastHud = key
  $('#hTime').textContent = clockStr(Math.min(S.t, GAME_T)); $('#hBar').style.width = (100 - Math.min(S.t, GAME_T) / GAME_T * 100) + '%'
  $('#hScore').textContent = S.score; $('#hDone').textContent = S.done
  const c = $('#combo'); c.textContent = fmt(T('combo'), { n: S.combo }) + (S.combo >= 5 ? ` ×${1 + Math.min(4, Math.floor(S.combo / 5)) * 0.5}` : ''); c.classList.toggle('on', S.combo >= 2)
  drawClock(Math.min(S.t, GAME_T))
}

// ---------- 画面
const VIEWS = { title: 'vTitle', how: 'vHow', play: 'vPlay', result: 'vResult' }
function go(v) {
  S.view = v; document.body.classList.toggle('playing', v === 'play')
  for (const [k, id] of Object.entries(VIEWS)) $('#' + id).hidden = k !== v
  if (v !== 'play') { $('#banner').hidden = true; $('#count').hidden = true; $('#tut').hidden = true }
  if (v === 'title' || v === 'how') { if (S.mode !== 'demo') startDemo(); Snd.setTrack('title'); $('#hClock').classList.remove('rush'); drawClock(0) }
  if (boss.say && v !== 'play' && v !== 'result') { boss.say.remove(); boss.say = null }
  for (const el of $$('#fx .pop')) el.remove()
  fitCamera()
}
function applyLang() {
  document.documentElement.lang = S.lang
  for (const el of $$('[data-t]')) { const k = el.dataset.t; if (k === 'titleHtml') el.innerHTML = T(k); else el.textContent = T(k) }
  document.title = T('title'); $('#langTxt').textContent = T('lang')
  $('#howList').innerHTML = T(isTouch() ? 'howSp' : 'howPc').map(s => `<li>${s}</li>`).join('')
  $('#ngList').innerHTML = NG.map(n => `<div><span class="ic x">${ICONS[n.id]}</span>${S.lang === 'ja' ? n.ja : n.en}</div>`).join('')
  buildDocTextures()
  if (S.result && S.view === 'result') fillResult(true)
  hudUpdate(true)
}

// ---------- 結果
function fillResult(instant) {
  const R = S.result, g = GRADES[R.gi]
  $('#rDone').textContent = instant ? R.done : 0; $('#rScore').textContent = instant ? R.score : 0
  $('#rMini').textContent = `${T('resBows')} ${R.bows} / ${T('resMax')} ${R.maxCombo}` + (R.collapses ? ` / ${T('resPile')} ${R.collapses}` : '')
  const gname = S.lang === 'ja' ? g.ja : g.en
  $('#rGrade').textContent = gname; $('#rSeal').classList.toggle('long', gname.length > 6)
  $('#rNick').textContent = '「' + (S.lang === 'ja' ? g.nja : g.nen) + '」'
  $('#rBossFace').innerHTML = bossSvg(R.mood, true); $('#rBossTxt').textContent = R.cm
  const ids = R.ngOrder
  $('#rNg').innerHTML = ids.length ? ids.slice(0, 3).map(id => { const n = NG.find(k => k.id === id); return `<div class="ngrow"><span class="ic">${ICONS[id]}</span><div><b>${S.lang === 'ja' ? n.ja : n.en} ${fmt(T('times'), { n: R.ng[id] })}</b>${S.lang === 'ja' ? n.lja : n.len}</div></div>` }).join('') + (ids.length > 3 ? `<div class="ngnone">${fmt(T('resMore'), { n: ids.length - 3 })}</div>` : '')
    : `<div class="ngnone">${T('resNgNone')}</div>`
  for (const s of ['#rSeal', '#rNick', '#rBoss']) $(s).classList.toggle('on', !!instant)
}
function showResult() {
  go('result'); fillResult(false)
  const id = ++S.revealId, R = S.result, later = (ms, fn) => setTimeout(() => { if (S.revealId === id && S.view === 'result') fn() }, ms)
  Snd.setTrack(R.gi >= 4 ? 'result' : 'sad'); Snd.sfx('roll')
  const t0 = performance.now()
  const roll = () => { if (S.revealId !== id) return; const k = clamp((performance.now() - t0) / 1300, 0, 1); $('#rDone').textContent = Math.round(R.done * k); $('#rScore').textContent = Math.round(R.score * k); if (k < 1) requestAnimationFrame(roll) }
  requestAnimationFrame(roll)
  later(1500, () => { $('#rSeal').classList.add('on'); Snd.sfx('seal'); shake(); Snd.sfx(R.gi >= 4 ? 'cheer' : 'boo') })
  later(1900, () => $('#rNick').classList.add('on'))
  later(2300, () => { $('#rBoss').classList.add('on'); Snd.sfx(R.mood === 'happy' ? 'laugh' : 'boss') })
}

// ---------- 結果を1枚の画像に（1080x1350・稟議書の紙）
async function drawCard() {
  const R = S.result, g = GRADES[R.gi], ja = S.lang === 'ja'
  try { await Promise.all([document.fonts.load(`40px 'Dela Gothic One'`), document.fonts.load(`900 30px 'Zen Maru Gothic'`)]) } catch (e) {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d')
  x.fillStyle = '#a8703c'; x.fillRect(0, 0, 1080, 1350)
  for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(80,45,15,${0.08 + Math.random() * 0.1})`; x.lineWidth = 2 + Math.random() * 3; x.beginPath(); const y = Math.random() * 1350; x.moveTo(0, y); x.bezierCurveTo(360, y + 8, 720, y - 8, 1080, y + 4); x.stroke() }
  x.save(); x.translate(540, 675); x.rotate(-0.012); x.translate(-540, -675)
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 30; x.shadowOffsetY = 12; x.fillStyle = '#fbf6ea'; x.fillRect(50, 44, 980, 1262); x.shadowColor = 'transparent'
  x.strokeStyle = '#d6332b'; x.lineWidth = 4; x.strokeRect(74, 68, 932, 1214); x.lineWidth = 1.5; x.strokeRect(84, 78, 912, 1194)
  // 見出しと承認欄
  x.fillStyle = '#1e1a17'; x.textAlign = 'left'; x.font = `${ja ? 76 : 60}px 'Dela Gothic One',sans-serif`; fitText(x, T('cardHead'), 112, 178, 500)
  x.font = `900 28px 'Zen Maru Gothic',sans-serif`; x.fillStyle = '#5a4c3c'; x.fillText(T('cardNo') + '  ' + (ja ? '17:00 提出' : 'Filed 5:00 PM'), 114, 226)
  const labs = ja ? ['部長', '課長', '担当'] : ['DIR', 'MGR', 'YOU'], bx = 640, bw = 112
  for (let k = 0; k < 3; k++) {
    const X = bx + k * bw; x.strokeStyle = '#1e1a17'; x.lineWidth = 2; x.strokeRect(X, 104, bw, 36); x.strokeRect(X, 140, bw, 108)
    x.fillStyle = '#1e1a17'; x.font = `900 22px 'Zen Maru Gothic',sans-serif`; x.textAlign = 'center'; x.fillText(labs[k], X + bw / 2, 131)
  }
  x.font = `900 22px 'Zen Maru Gothic',sans-serif`; x.fillStyle = '#9a8f80'; x.fillText(ja ? '不在' : 'away', bx + bw / 2, 202)
  const bossSeal = R.mood === 'happy' ? (ja ? '可' : 'OK') : R.mood === 'angry' ? (ja ? '怒' : 'NO') : R.mood === 'shock' ? (ja ? '呆' : '??') : (ja ? '見' : 'saw')
  drawSeal(x, bx + bw * 1.5, 194, 40, bossSeal, -0.25, '#d6332b')
  const best = R.stamps.find(s => s.j === 'bow') || R.stamps.find(s => s.j === 'straight') || R.stamps.find(s => s.j !== 'ng')
  if (best) drawSeal(x, bx + bw * 2.5, 194, 40, ja ? '決裁' : 'OK', best.rot, '#d6332b')
  // 数字
  x.strokeStyle = '#d8ccb6'; x.lineWidth = 2; x.beginPath(); x.moveTo(112, 280); x.lineTo(968, 280); x.stroke()
  x.textAlign = 'left'; x.fillStyle = '#5a4c3c'; x.font = `900 30px 'Zen Maru Gothic',sans-serif`; x.fillText(T('resDone'), 112, 336)
  x.fillStyle = '#1e1a17'; x.font = `150px 'Dela Gothic One',sans-serif`; x.fillText(String(R.done), 108, 488)
  const nw = x.measureText(String(R.done)).width; x.font = `52px 'Dela Gothic One',sans-serif`; x.fillText(T('resUnit') || 'forms', 118 + nw, 486)
  x.font = `900 32px 'Zen Maru Gothic',sans-serif`; x.fillStyle = '#5a4c3c'; x.fillText(`${T('resScore')} `, 114, 548); x.fillStyle = '#8f1d17'; x.font = `44px 'Dela Gothic One',sans-serif`; x.fillText(String(R.score), 114 + 100 + (ja ? 0 : 20), 550)
  x.font = `900 26px 'Zen Maru Gothic',sans-serif`; x.fillStyle = '#5a4c3c'; x.fillText(`${T('resBows')} ${R.bows}  /  ${T('resMax')} ${R.maxCombo}`, 114, 596)
  // 級の大きな判
  const gname = ja ? g.ja : g.en
  x.save(); x.translate(800, 450); x.rotate(-0.2); x.globalAlpha = 0.92; x.strokeStyle = '#d6332b'; x.fillStyle = '#d6332b'
  x.lineWidth = 12; x.beginPath(); x.arc(0, 0, 150, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 130, 0, 7); x.stroke()
  x.textAlign = 'center'; x.font = `900 28px 'Zen Maru Gothic',sans-serif`; x.fillText(T('resGrade'), 0, -52)
  x.font = `84px 'Dela Gothic One',sans-serif`; fitText(x, gname, 0, 44, 220)
  x.restore()
  x.textAlign = 'center'; x.fillStyle = '#8f1d17'; x.font = `44px 'Dela Gothic One',sans-serif`; fitText(x, '「' + (ja ? g.nja : g.nen) + '」', 540, 680, 860)
  // 押したハンコの並び
  x.fillStyle = '#5a4c3c'; x.font = `900 26px 'Zen Maru Gothic',sans-serif`; x.textAlign = 'left'; x.fillText(T('cardStamps'), 112, 744)
  x.strokeStyle = '#d8ccb6'; x.lineWidth = 2; x.beginPath(); x.moveTo(112, 760); x.lineTo(968, 760); x.stroke()
  const list = R.stamps.slice(0, 40), cols = 10, cw = 856 / cols
  list.forEach((s, i) => {
    const cx = 112 + cw * (i % cols) + cw / 2, cy = 806 + Math.floor(i / cols) * 86
    x.strokeStyle = '#c9bea8'; x.lineWidth = 1.5; x.strokeRect(cx - 34, cy - 34, 68, 68)
    if (s.j === 'ng') { const im = IMG['ng_' + s.id]; if (im) x.drawImage(im, cx - 32, cy - 32, 64, 64); drawSeal(x, cx + 6, cy + 4, 24, ja ? '決' : 'OK', s.rot, 'rgba(214,51,43,.9)') }
    else drawSeal(x, cx - (s.j === 'off' ? s.e * 30 : s.e * 60), cy, 28, ja ? '決' : 'OK', s.rot, s.j === 'off' ? 'rgba(214,51,43,.55)' : '#d6332b')
  })
  if (!list.length) { x.fillStyle = '#9a8f80'; x.font = `900 30px 'Zen Maru Gothic',sans-serif`; x.textAlign = 'center'; x.fillText(ja ? '（白紙）' : '(blank)', 540, 830) }
  // 押してはいけなかった物と課長
  let y = 1150
  x.textAlign = 'left'; x.fillStyle = '#5a4c3c'; x.font = `900 26px 'Zen Maru Gothic',sans-serif`; x.fillText(T('resNg'), 112, y - 4)
  if (R.ngOrder.length) R.ngOrder.slice(0, 6).forEach((id, i) => { const im = IMG['ng_' + id]; const X = 112 + i * 92; if (im) x.drawImage(im, X, y + 8, 64, 64); x.fillStyle = '#d6332b'; x.font = `26px 'Dela Gothic One',sans-serif`; x.fillText('×' + R.ng[id], X + 50, y + 76) })
  else { x.fillStyle = '#1e1a17'; x.font = `900 28px 'Zen Maru Gothic',sans-serif`; x.fillText(T('resNgNone'), 112, y + 48) }
  const bim = IMG['boss_' + R.mood]; if (bim) x.drawImage(bim, 676, y - 40, 96, 96)
  x.fillStyle = '#1e1a17'; x.font = `900 24px 'Zen Maru Gothic',sans-serif`; wrapText(x, R.cm, 784, y - 6, 196, 30)
  x.restore()
  x.fillStyle = '#fbf6ea'; x.textAlign = 'left'; x.font = `30px 'Dela Gothic One',sans-serif`; x.fillText(T('title') + (ja ? '  STAMP HELL' : ''), 50, 1336)
  x.font = `900 20px 'Zen Maru Gothic',sans-serif`; x.textAlign = 'right'; x.fillText(T('cardFoot'), 1050, 1300 + 36)
  return c
}
function drawSeal(x, cx, cy, r, txt, rot, col) {
  x.save(); x.translate(cx, cy); x.rotate(-rot); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(3, r * 0.14); x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke()
  x.textAlign = 'center'; x.textBaseline = 'middle'
  if (txt.length === 2 && /[^\x00-\x7f]/.test(txt)) { x.font = `${r * 0.72}px 'Dela Gothic One',sans-serif`; x.fillText(txt[0], 0, -r * 0.36); x.fillText(txt[1], 0, r * 0.38) }
  else { x.font = `${txt.length > 2 ? r * 0.55 : r * 0.9}px 'Dela Gothic One',sans-serif`; x.fillText(txt, 0, r * 0.04) }
  x.restore()
}
function fitText(x, s, cx, cy, maxW) { let sz = parseFloat(x.font); const fam = x.font.replace(/^.*?px\s*/, ''); while (x.measureText(s).width > maxW && sz > 12) { sz -= 2; x.font = `${sz}px ${fam}` } x.fillText(s, cx, cy) }
function wrapText(x, s, X, Y, maxW, lh) {
  const parts = S.lang === 'ja' ? [...s] : s.split(' ').map((w, i, a) => i < a.length - 1 ? w + ' ' : w)
  let line = '', y = Y; for (const p of parts) { if (x.measureText(line + p).width > maxW && line) { x.fillText(line, X, y); y += lh; line = '' } line += p } x.fillText(line, X, y)
}
async function cardBlob() { const c = await drawCard(); return new Promise(r => c.toBlob(r, 'image/png')) }
async function saveImage() {
  const blob = await cardBlob(); if (!blob) return 'fail'
  const file = new File([blob], 'hanko-hell.png', { type: 'image/png' })
  if (navigator.canShare && navigator.share && isTouch()) {
    try { if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: T('title'), text: `${T('title')} ${T('resGrade')} ${S.lang === 'ja' ? GRADES[S.result.gi].ja : GRADES[S.result.gi].en} https://tom3games.github.io/hanko-hell/` }); toast(T('shared')); return 'shared' } }
    catch (e) { if (e && e.name === 'AbortError') return 'abort' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hanko-hell.png'; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(T('saved')); return 'download'
}
const PUBLIC_URL = 'https://tom3games.github.io/hanko-hell/'
function xPost() {
  const R = S.result, g = GRADES[R.gi], ja = S.lang === 'ja'
  const text = T('xText').replace('{d}', R.done).replace('{s}', R.score).replace('{g}', ja ? g.ja : g.en).replace('{n}', ja ? g.nja : g.nen)
  return { text, url: PUBLIC_URL, href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(PUBLIC_URL)}` }
}
function openX() { if (!S.result) return; window.open(xPost().href, '_blank', 'noopener') }
function toast(s) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = s; document.body.appendChild(d); setTimeout(() => d.remove(), 1600) }

// ---------- カメラ（どの画面の形でも机・課長・山が収まる距離を探す）
const FIT_PTS = [[-3.0, 0.2, 0.4], [3.0, 0.2, 0.4], [-3.0, 0.2, -1.3], [3.0, 0.2, -1.3], [BOSS_IDLE.x, 3.0, BOSS_IDLE.z], [PILE.x + 0.7, 1.2, PILE.z], [0, 0.2, 1.6]]
const LOOK = new THREE.Vector3(0, 0, -0.9)
function fitCamera() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
  const pitch = 0.95, dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch))
  const land = w / h > 1, top = S.view === 'title' ? (land ? 0.8 : 0.35) : 0.7, bot = S.view === 'title' && !land ? -0.25 : -0.82
  const v = new THREE.Vector3()
  let d = 6
  for (; d < 70; d += 0.2) {
    camera.position.copy(LOOK).addScaledVector(dir, d); camera.lookAt(LOOK); camera.updateMatrixWorld()
    if (FIT_PTS.every(p => { v.set(...p).project(camera); return Math.abs(v.x) < 0.95 && v.y < top && v.y > bot })) break
  }
  S.camD = d
}

// ---------- ループ（固定60Hz。時計は performance.now）
let acc = 0, lastT = performance.now(), paused = false, fpsN = 0, fpsT = performance.now(), fps = 0
function render() {
  renderer.render(scene, camera)
  if (boss.say) { const s = toScreen(boss.g.position.x, boss.g.position.y + 3.15, boss.g.position.z); const bw = boss.say.offsetWidth / 2 + 8; boss.say.style.left = clamp(s.x, bw, Math.max(bw, innerWidth - bw)) + 'px'; boss.say.style.top = Math.max(110, s.y) + 'px' }
}
function frame() {
  const now = performance.now(); let dt = (now - lastT) / 1000; lastT = now; if (dt > 0.25) dt = 0.25
  if (!paused) { acc += dt; let n = 0; while (acc >= STEP && n < 8) { update(); acc -= STEP; n++ } if (n === 8) acc = 0 }
  if (S.mode === 'play') hudUpdate()
  render(); Snd.tick()
  fpsN++; if (now - fpsT > 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now }
  requestAnimationFrame(frame)
}

// ---------- 起動
async function boot() {
  try { const l = localStorage.getItem('hh.lang'); S.lang = l || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en') } catch (e) { S.lang = (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en' }
  try { if (localStorage.getItem('hh.mute') === '1') { Snd.muted = true; $('#icOn').hidden = true; $('#icOff').hidden = false } } catch (e) {}
  for (const el of $$('[data-face]')) el.innerHTML = bossSvg(el.dataset.face, true)
  applyLang()
  const on = (id, fn) => $(id).addEventListener('click', e => { Snd.init(); fn(e) })
  on('#bStart', () => { Snd.sfx('tap'); startGame() })
  on('#bHow', () => { Snd.sfx('tap'); go('how') })
  on('#bHowBack', () => { Snd.sfx('tap'); go('title') })
  on('#bAgain', () => { Snd.sfx('tap'); startGame() })
  on('#bSave', () => saveImage())
  on('#bX', () => { Snd.sfx('tap'); openX() })
  on('#bTitle', () => { Snd.sfx('tap'); go('title') })
  on('#bLang', () => { S.lang = S.lang === 'ja' ? 'en' : 'ja'; try { localStorage.setItem('hh.lang', S.lang) } catch (e) {} applyLang() })
  on('#bMute', () => { Snd.setMute(!Snd.muted); $('#icOn').hidden = Snd.muted; $('#icOff').hidden = !Snd.muted; try { localStorage.setItem('hh.mute', Snd.muted ? '1' : '0') } catch (e) {} })
  $('#vPlay').addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); Snd.init(); press() })
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') { if (S.view === 'play') { e.preventDefault(); if (!e.repeat) { Snd.init(); press() } } }
  })
  window.addEventListener('resize', fitCamera)
  document.addEventListener('visibilitychange', () => { lastT = performance.now(); acc = 0 })
  go('title')
  requestAnimationFrame(frame)
  window.__hhReady = true
  // 顔とアイコンの画像（3D の顔と結果画像に使う）
  await Promise.all([...MOODS.map(m => loadImg('boss_' + m, bossSvg(m, false))), ...NG.map(n => loadImg('ng_' + n.id, ICONS[n.id]))])
  for (const m of MOODS) if (IMG['boss_' + m]) faceTex[m] = canvasTex(128, 128, x => x.drawImage(IMG['boss_' + m], 0, 0, 128, 128))
  photoTex.image.getContext('2d').drawImage(IMG.boss_normal || new Image(), 30, 30, 196, 196); photoTex.needsUpdate = true
  setMood(boss.mood)
  document.fonts?.ready.then(() => { buildDocTextures(); hudUpdate(true) })
}
photoTex = canvasTex(256, 330, (x, w, h) => { x.fillStyle = '#cfe3f0'; x.fillRect(0, 0, w, h); x.fillStyle = '#22324a'; x.beginPath(); x.ellipse(w / 2, h + 30, 120, 110, 0, 0, 7); x.fill() })

// 検証用の窓口
window.hh = {
  S, press, startGame, showResult, drawCard, saveImage, xPost, openX, go, fitCamera, makeResult, GRADES, NG, Snd, toScreen, boss, hand,
  setLang: l => { S.lang = l; applyLang() },
  dbg: {
    pause: v => { paused = v; acc = 0; lastT = performance.now() },
    step: n => { for (let i = 0; i < n; i++) update(); hudUpdate(true) },
    render: () => render(),
    autoplay: m => { S.bot = m },
    fps: () => fps,
    quiet: v => { S.quiet = v },
    place: (kind, x) => { clearItems(); spawnItem(kind, x); return S.items.length },
    setT: t => { S.t = t },
    cam: (f, lx = 0) => { const dir = camera.position.clone().sub(LOOK); const L = LOOK.clone(); L.x = lx; camera.position.copy(L).addScaledVector(dir, f); camera.lookAt(L); camera.updateMatrixWorld() },
    spawn: (kind, x) => { for (let i = S.items.length - 1; i >= 0; i--) if (Math.abs(S.items[i].x - x) < 1.9) { scene.remove(S.items[i].g); S.items.splice(i, 1) } spawnItem(kind, x); return S.items.length },
    items: () => S.items.map(it => ({ kind: it.kind, x: +it.x.toFixed(3), stamped: it.stamped, hit: it.hit })),
  },
}
boot()
