// 音のエンジン（素材なし・WebAudio）。bakage テンプレの snd.js をもとに、曲と効果音をこのゲーム用に書いた
// ---------- 音（素材なし。WebAudio で全部鳴らす）
const Snd = {
  ctx: null, muted: false, next: 0, step: 0, track: null, want: null, switchAt: 0, played: {}, lastBrush: 0, last: {},
  TEMPO: { title: 104, play: 138, rush: 168, result: 124, sad: 72 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
    try {
      this.ctx = new AC()
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.master.connect(this.an); this.an.connect(this.ctx.destination)
      this.bgm = this.ctx.createGain(); this.bgm.gain.value = 0.0001; this.bgm.connect(this.master)
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, len)
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      if (this.want) { const w = this.want; this.want = null; this.setTrack(w) }
    } catch (e) { this.ctx = null }
  },
  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.7 },
  tone(f, t0, dur, type = 'square', vol = 0.2, dest, f2) {
    if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(dest || this.master); o.start(t0); o.stop(t0 + dur + 0.02)
  },
  noise(t0, dur, vol, freq, type = 'highpass', dest, q) {
    if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02)
  },
  now() { return this.ctx ? this.ctx.currentTime : 0 },
  level() { if (!this.an) return 0; const d = new Float32Array(this.an.fftSize); this.an.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m },
  mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  mark(n) { this.played[n] = (this.played[n] || 0) + 1 },
  setTrack(name) {
    if (this.want === name) return
    this.want = name; if (!this.ctx) return
    const now = this.ctx.currentTime, g = this.bgm.gain
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(0.0001, now + 0.25)
    this.switchAt = now + 0.27
  },
  tick() {
    if (!this.ctx) return; const c = this.ctx
    if (this.switchAt && c.currentTime >= this.switchAt) {
      this.track = this.want; this.step = 0; this.next = c.currentTime + 0.05; this.switchAt = 0
      const g = this.bgm.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0.0001, c.currentTime); g.linearRampToValueAtTime(0.26, c.currentTime + 0.35)
      if (this.track) this.mark('bgm:' + this.track)
    }
    if (!this.track || this.switchAt) return
    const spb = 60 / this.TEMPO[this.track] / 4
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05
    while (this.next < c.currentTime + 0.25) { this['p_' + this.track](this.step, this.next); this.next += spb; this.step++ }
  },
  kick(t, v = 0.7) { this.tone(150, t, 0.16, 'sine', v, this.bgm, 42) },
  clap(t, v = 0.2) { for (const d of [0, 0.012, 0.024]) this.noise(t + d, 0.09, v, 1500, 'bandpass', this.bgm) },
  hat(t, v = 0.06, open) { this.noise(t, open ? 0.12 : 0.03, v, 8000, 'highpass', this.bgm) },
  bass(n, t, dur = 0.18, vol = 0.45, type = 'triangle') { this.tone(this.mtof(n), t, dur, type, vol, this.bgm) },
  pad(n, t, dur, vol = 0.04) { this.tone(this.mtof(n), t, dur, 'sine', vol, this.bgm); this.tone(this.mtof(n) * 2.005, t, dur * 0.6, 'sine', vol * 0.3, this.bgm) },
  stab(ns, t, dur = 0.14, vol = 0.04) {
    if (!this.ctx) return; const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain()
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    for (const n of ns) for (const d of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.mtof(n); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.02) }
    f.connect(g); g.connect(this.bgm)
  },
  // タイトル: のんきな事務所のボサノバ（Dm7 - G7 - Cmaj7 - A7）
  p_title(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16
    const root = [38, 43, 36, 45][bar], ch = [[62, 65, 69, 72], [59, 62, 65, 67], [60, 64, 67, 71], [61, 64, 67, 69]][bar]
    if (s === 0 || s === 10) this.kick(t, 0.4); if (s === 3 || s === 6 || s === 12) this.noise(t, 0.03, 0.06, 2500, 'bandpass', this.bgm, 3)
    if (s % 2 === 0) this.hat(t, 0.025)
    if (s === 0) this.bass(root, t, 0.4, 0.34, 'sine'); if (s === 6) this.bass(root + 7, t, 0.3, 0.28, 'sine'); if (s === 12) this.bass(root + 12, t, 0.2, 0.22, 'sine')
    if (s === 2 || s === 9) this.stab(ch, t, 0.22, 0.022)
    const mel = [[74, -1, 72, 69], [71, -1, 67, -1], [76, 74, 72, -1], [73, -1, 76, -1]]
    if (s % 4 === 0 && Math.floor(i / 64) % 2) { const n = mel[bar][s / 4]; if (n > 0) this.tone(this.mtof(n), t, 0.3, 'triangle', 0.05, this.bgm) }
  },
  // プレイ: せわしない事務所ポルカ（C - G - Am - F）
  p_play(i, t) {
    const bar = Math.floor(i / 16) % 4, s = i % 16
    const root = [36, 43, 45, 41][bar], ch = [[60, 64, 67], [59, 62, 67], [60, 64, 69], [60, 65, 69]][bar]
    if (s % 4 === 0) this.kick(t, 0.6); if (s === 4 || s === 12) this.clap(t, 0.12); if (s % 2) this.hat(t, 0.04)
    if (s % 4 === 0) this.bass(root, t, 0.14, 0.4); if (s % 4 === 2) this.stab(ch, t, 0.1, 0.03)
    const mel = [[72, 74, 76, 72, 79, -1, 76, -1], [74, 76, 77, 74, 79, -1, 74, -1], [76, 77, 79, 76, 81, 79, 76, 72], [77, 76, 74, 72, 74, -1, -1, -1]]
    if (s % 2 === 0) { const n = mel[bar][s / 2]; if (n > 0) this.tone(this.mtof(n), t, 0.12, 'square', 0.025, this.bgm) }
  },
  // 定時ダッシュ: 同じ曲を速く、上で鳴らす
  p_rush(i, t) {
    this.p_play(i, t); const s = i % 16
    this.hat(t, 0.03); if (s % 8 === 4) this.noise(t, 0.08, 0.05, 6000, 'highpass', this.bgm)
    const bar = Math.floor(i / 16) % 4; if (s % 4 === 1) this.tone(this.mtof([84, 83, 81, 77][bar]), t, 0.06, 'square', 0.018, this.bgm)
  },
  // 結果: ファンファーレのあと軽いスウィング
  p_result(i, t) {
    const s = i % 16, bar = Math.floor(i / 16) % 4
    if (i < 16) { const f = [[0, 67], [3, 67], [6, 72], [12, 76]].find(a => a[0] === s); if (f) { this.tone(this.mtof(f[1]), t, s === 12 ? 0.6 : 0.15, 'sawtooth', 0.05, this.bgm); this.tone(this.mtof(f[1] - 12), t, 0.15, 'square', 0.03, this.bgm) } if (s === 12) this.stab([60, 64, 67, 72], t, 0.6, 0.04); return }
    const root = [36, 33, 38, 31][bar], ch = [[64, 67, 71], [60, 64, 67], [62, 65, 69], [59, 62, 65]][bar]
    if (s % 4 === 0) this.kick(t, 0.45); if (s === 4 || s === 12) this.clap(t, 0.08); if (s % 4 === 3) this.hat(t, 0.04, true)
    if (s % 4 === 0) this.bass(root + (s === 8 ? 7 : 0), t, 0.2, 0.32); if (s === 2 || s === 10) this.stab(ch, t, 0.14, 0.025)
  },
  // 残念: 物悲しいワルツ風（Am - Dm - E - Am）
  p_sad(i, t) {
    const bar = Math.floor(i / 12) % 4, s = i % 12
    const ch = [[57, 60, 64], [57, 62, 65], [56, 59, 64], [57, 60, 64]][bar], root = [33, 38, 40, 33][bar]
    if (s === 0) this.bass(root, t, 0.8, 0.3, 'sine'); if (s === 4 || s === 8) for (const n of ch) this.tone(this.mtof(n), t, 0.4, 'triangle', 0.02, this.bgm)
    const mel = [[76, 74, 72], [74, 72, 69], [71, 69, 68], [69, -1, -1]][bar]
    if (s % 4 === 0) { const n = mel[s / 4]; if (n > 0) this.tone(this.mtof(n), t, 0.5, 'sine', 0.06, this.bgm) }
  },
  // 効果音
  sfx(name, v = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime; this.mark(name)
    switch (name) {
      case 'tap': this.tone(880, t, 0.06, 'triangle', 0.12 * v); break
      case 'stamp': this.tone(130, t, 0.16, 'sine', 0.7, null, 45); this.noise(t, 0.07, 0.35, 900, 'lowpass'); this.tone(2400, t, 0.02, 'square', 0.04); break
      case 'straight': this.tone(1046, t + 0.02, 0.18, 'triangle', 0.16); this.tone(1568, t + 0.07, 0.25, 'sine', 0.1); break
      case 'bow': for (const [k, n] of [[0, 72], [1, 76], [2, 79], [3, 84]].entries()) this.tone(this.mtof(n[1]), t + 0.02 + k * 0.05, 0.25, 'triangle', 0.13); this.tone(2093, t + 0.25, 0.4, 'sine', 0.06); break
      case 'fun': this.tone(392, t + 0.02, 0.14, 'square', 0.06, null, 330); break
      case 'off': this.tone(262, t + 0.02, 0.18, 'triangle', 0.1, null, 220); break
      case 'air': this.noise(t, 0.08, 0.3, 500, 'bandpass', null, 2); this.tone(190, t, 0.1, 'sine', 0.3, null, 120); break
      case 'pass': this.tone(500, t, 0.35, 'triangle', 0.08, null, 160); this.noise(t, 0.25, 0.05, 1500, 'bandpass'); break
      case 'combo': { const f = 660 * Math.pow(2, Math.min(v, 12) / 12); this.tone(f, t, 0.1, 'square', 0.04); this.tone(f * 1.5, t + 0.06, 0.12, 'square', 0.035); break }
      case 'accident': for (let k = 0; k < 4; k++) this.tone(k % 2 ? 620 : 930, t + k * 0.11, 0.11, 'square', 0.07); this.tone(90, t, 0.6, 'sine', 0.6, null, 35); this.noise(t, 0.5, 0.25, 1800, 'lowpass'); break
      case 'meow': { if (!this.ctx) break; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.4
        o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(1150, t + 0.18); o.frequency.linearRampToValueAtTime(980, t + 0.45); o.frequency.linearRampToValueAtTime(1250, t + 0.6); o.frequency.exponentialRampToValueAtTime(380, t + 0.95)
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.05); g.gain.setValueAtTime(0.3, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1)
        o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 1.05); break }
      case 'hii': { const c = this.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2
        o.frequency.setValueAtTime(1100, t); for (let k = 1; k <= 8; k++) o.frequency.linearRampToValueAtTime((k % 2 ? 1250 : 980) - k * 45, t + k * 0.06); o.frequency.exponentialRampToValueAtTime(420, t + 0.75)
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
        o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.85); break }
      case 'boss': for (const [k, f] of [190, 175, 140].entries()) { this.tone(f, t + k * 0.13, 0.13, 'sawtooth', 0.09, null, f * 0.92) } break
      case 'bossBig': for (const [k, f] of [240, 220, 200, 150].entries()) { this.tone(f, t + k * 0.12, 0.14, 'sawtooth', 0.13, null, f * 0.85) } this.noise(t, 0.4, 0.06, 600, 'lowpass'); break
      case 'laugh': for (let k = 0; k < 4; k++) this.tone(260 + k * 30, t + k * 0.13, 0.1, 'sawtooth', 0.09, null, 200 + k * 30); break
      case 'collapse': for (let k = 0; k < 26; k++) this.noise(t + k * 0.03 + Math.random() * 0.03, 0.08, 0.12, 1200 + Math.random() * 1800, 'bandpass', null, 1); this.tone(70, t + 0.5, 0.5, 'sine', 0.6, null, 30); break
      case 'bell': for (const [k, n] of [76, 72, 74, 67, 67, 74, 76, 72].entries()) { this.tone(this.mtof(n), t + k * 0.42, 1.2, 'sine', 0.18); this.tone(this.mtof(n) * 2.01, t + k * 0.42, 0.6, 'sine', 0.04) } break
      case 'count': this.tone(660, t, 0.12, 'square', 0.07); break
      case 'go': this.tone(990, t, 0.35, 'square', 0.08); this.tone(1320, t, 0.35, 'triangle', 0.06); break
      case 'roll': for (let k = 0; k < 36; k++) this.noise(t + k * 0.04, 0.05, 0.05 + k * 0.004, 1800, 'bandpass'); break
      case 'seal': this.tone(110, t, 0.5, 'sine', 0.8, null, 40); this.noise(t, 0.5, 0.3, 2500, 'lowpass'); this.tone(523, t, 0.6, 'square', 0.07); this.tone(784, t, 0.6, 'square', 0.05); break
      case 'splat': this.noise(t, 0.22, 0.45, 700, 'lowpass'); this.tone(140, t, 0.18, 'sine', 0.3, null, 50); break
      case 'heart': for (let k = 0; k < 5; k++) this.tone(1200 + k * 220, t + k * 0.05, 0.18, 'sine', 0.07); break
      case 'void': this.tone(140, t, 0.5, 'sawtooth', 0.12); this.tone(147, t, 0.5, 'sawtooth', 0.1); break
      case 'cheer': this.noise(t, 1.6, 0.12, 1200, 'bandpass', null, 0.6); for (let k = 0; k < 3; k++) this.tone(1800, t + k * 0.3, 0.3, 'sine', 0.05, null, 2600); break
      case 'boo': for (let k = 0; k < 7; k++) { const f = 105 + Math.random() * 40; this.tone(f, t + Math.random() * 0.2, 1.2, 'sawtooth', 0.035, null, f * 0.7) } break
      case 'whoosh': this.noise(t, 0.3, 0.06, 900, 'bandpass', null, 2); break
      case 'paper': this.noise(t, 0.12, 0.08, 3000, 'bandpass', null, 1.5); break
    }
  },
}
