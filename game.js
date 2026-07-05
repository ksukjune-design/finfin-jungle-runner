/* ==========================================================
   핀핀 정글 등원 대작전 v2 — FUN OVERHAUL
   시바견 × FINFIN 밸런스바이크 × 호랑이 추격 러닝 게임
   슬라이드 · 패턴 스포너 · 콤보/피버 · 파워업 · 스테이지 ·
   부활 · 도전과제 · 니어미스 · 일시정지 · 공유
   ========================================================== */
(() => {
'use strict';

// ---------- DOM ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'), score: $('score'), bones: $('bones'), combo: $('combo'),
  tigerFill: $('tigerbar-fill'), feverFill: $('feverbar-fill'),
  feverWrap: $('feverbar-wrap'), effects: $('effects'), toast: $('toast'),
  pauseBtn: $('pauseBtn'), zones: $('zones'),
  start: $('start'), startBtn: $('startBtn'), posterVideo: $('posterVideo'),
  titleMeta: $('titleMeta'), achBtn: $('achBtn'), muteBtn: $('muteBtn'),
  intro: $('intro'), introVideo: $('introVideo'), skipBtn: $('skipBtn'),
  countdown: $('countdown'), countNum: $('countNum'),
  gameover: $('gameover'), goScore: $('goScore'), goBones: $('goBones'),
  goBest: $('goBest'), goCombo: $('goCombo'), goFever: $('goFever'),
  goNew: $('goNew'), goAch: $('goAch'), retryBtn: $('retryBtn'), introBtn: $('introBtn'),
  shareBtn: $('shareBtn'), goAchBtn: $('goAchBtn'),
  pause: $('pause'), resumeBtn: $('resumeBtn'), quitBtn: $('quitBtn'), pMuteBtn: $('pMuteBtn'),
  revive: $('revive'), reviveBtn: $('reviveBtn'), reviveCnt: $('reviveCnt'), reviveSkip: $('reviveSkip'),
  achPanel: $('achPanel'), achList: $('achList'), achClose: $('achClose'),
};

// ---------- 저장 ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let best = store.get('finfin_best', 0);
let totals = store.get('finfin_tot', { runs: 0, bones: 0, slides: 0 });
let achState = store.get('finfin_ach', {});
let muted = store.get('finfin_mute', false);

// ---------- 에셋 ----------
const IMG_SRC = {
  shiba1: 'assets/sprites/shiba_1.png',
  shiba2: 'assets/sprites/shiba_2.png',
  shiba3: 'assets/sprites/shiba_3.png',
  shiba4: 'assets/sprites/shiba_4.png',
  shibaSlide: 'assets/sprites/shiba_slide.png',
  tiger1: 'assets/sprites/tiger_1.png',
  tiger2: 'assets/sprites/tiger_2.png',
  tiger3: 'assets/sprites/tiger_3.png',
  tiger4: 'assets/sprites/tiger_4.png',
  rock:  'assets/sprites/obs_1.png',
  log:   'assets/sprites/obs_2.png',
  plant: 'assets/sprites/obs_3.png',
  bone:  'assets/sprites/obs_4.png',
  branch:'assets/sprites/obs_branch.png',
  toucan1:'assets/sprites/toucan_1.png',
  toucan2:'assets/sprites/toucan_2.png',
  powHelmet:'assets/sprites/pow_1.png',
  powMagnet:'assets/sprites/pow_2.png',
  powBoost:'assets/sprites/pow_3.png',
  powGold:'assets/sprites/pow_4.png',
  ground:'assets/sprites/ground.png',
  bg:    'assets/sprites/bg_jungle.jpg',
  bgSunset:'assets/sprites/bg_sunset.jpg',
  bgNight:'assets/sprites/bg_night.jpg',
};
const img = {};
let assetsReady = false;
function loadAssets() {
  const keys = Object.keys(IMG_SRC);
  let n = 0;
  return new Promise(res => {
    keys.forEach(k => {
      img[k] = new Image();
      img[k].onload = img[k].onerror = () => { if (++n === keys.length) { assetsReady = true; res(); } };
      img[k].src = IMG_SRC[k];
    });
  });
}

// ---------- 사운드 (WebAudio 합성음) ----------
let actx = null;
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === 'suspended') actx.resume();
}
function blip(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0) {
  if (!actx || muted) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0); o.stop(t0 + dur);
}
function swish(dur, vol, f0, f1) {
  if (!actx || muted) return;
  const n = actx.sampleRate * dur;
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, actx.currentTime);
  f.frequency.exponentialRampToValueAtTime(f1, actx.currentTime + dur);
  const g = actx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(actx.destination);
  src.start();
}
const sfx = {
  jump()    { blip(420, 0.18, 'square', 0.10, +380); },
  djump()   { blip(560, 0.16, 'square', 0.10, +420); },
  slide()   { swish(0.22, 0.30, 900, 260); },
  collect() { blip(880, 0.10, 'sine', 0.13, +220); blip(1320, 0.12, 'sine', 0.11, 0, 0.06); },
  combo10() { blip(740, 0.09, 'sine', 0.13); blip(980, 0.09, 'sine', 0.13, 0, 0.08); blip(1240, 0.14, 'sine', 0.13, 0, 0.16); },
  near()    { blip(1560, 0.08, 'sine', 0.12, +300); },
  hit()     { blip(160, 0.25, 'sawtooth', 0.16, -90); },
  shield()  { blip(500, 0.12, 'square', 0.14, -180); blip(330, 0.2, 'square', 0.10, -120, 0.08); },
  caught()  { blip(300, 0.5, 'sawtooth', 0.16, -220); blip(180, 0.6, 'sawtooth', 0.14, -120, 0.18); },
  power()   { blip(660, 0.1, 'sine', 0.12); blip(880, 0.1, 'sine', 0.12, 0, 0.08); blip(1100, 0.14, 'sine', 0.12, 0, 0.16); },
  gold()    { blip(1040, 0.09, 'sine', 0.14); blip(1320, 0.09, 'sine', 0.14, 0, 0.07); blip(1660, 0.16, 'sine', 0.14, 0, 0.14); },
  boost()   { swish(0.5, 0.4, 300, 2400); blip(320, 0.4, 'sawtooth', 0.08, +500); },
  fever()   { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, 0.14, 'sine', 0.14, 0, i * 0.07)); },
  feverEnd(){ blip(880, 0.2, 'sine', 0.10, -300); },
  roar()    { blip(90, 0.55, 'sawtooth', 0.20, +40); swish(0.5, 0.5, 200, 90); },
  revive()  { blip(440, 0.12, 'sine', 0.14); blip(660, 0.2, 'sine', 0.14, 0, 0.12); },
  record()  { [659, 784, 1046, 1318, 1568].forEach((f, i) => blip(f, 0.16, 'square', 0.10, 0, i * 0.09)); },
  stage()   { blip(784, 0.12, 'sine', 0.12); blip(988, 0.16, 'sine', 0.12, 0, 0.1); },
  count()   { blip(700, 0.09, 'sine', 0.12); },
  go()      { blip(1000, 0.3, 'sine', 0.14, +200); },
  click()   { blip(520, 0.06, 'sine', 0.08); },
};
function vib(p) { if (!muted && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

// ---------- 캔버스/스케일 (세로/가로 모두 지원) ----------
let W = 0, H = 0, DPR = 1, SC = 1, groundY = 0;
function resize() {
  const oldW = W, oldH = H, oldSC = SC, oldGroundY = groundY;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  SC = W > H ? H / 560 : Math.min(W / 420, H / 760);
  groundY = H * 0.78;
  if (oldW && (oldW !== W || oldH !== H)) rescaleWorld(oldW, oldSC, oldGroundY);
}
function rescaleWorld(oldW, oldSC, oldGroundY) {
  if (!G.player) return;
  const rx = W / oldW, rs = SC / oldSC;
  const p = G.player;
  p.x = W * 0.30;
  p.w = 128 * SC; p.h = 128 * SC;
  if (p.onGround) { p.y = groundY; p.vy = 0; }
  else { p.y = groundY - (oldGroundY - p.y) * rs; p.vy *= rs; }
  for (const o of G.obstacles) {
    o.x *= rx; o.dw *= rs; o.dh *= rs;
    if (o.barBottom !== undefined) o.barBottom = groundY - (oldGroundY - o.barBottom) * rs;
    if (o.y0 !== undefined) o.y0 = groundY - (oldGroundY - o.y0) * rs;
  }
  for (const h of G.holes) { h.x *= rx; h.w *= rs; }
  for (const b of G.bones) { b.x *= rx; b.y = groundY - (oldGroundY - b.y) * rs; }
  for (const w of G.pows) { w.x *= rx; w.y = groundY - (oldGroundY - w.y) * rs; }
  for (const s of G.signs) s.x *= rx;
  for (const t of G.hints) t.x *= rx;
  G.speed *= rs; G.baseSpeed *= rs; G.maxSpeed = 780 * SC;
  G.spawnPx *= rx;
  G.parts = []; G.pops = [];
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 60));
resize();

// ---------- 게임 상태 ----------
const ST = { MENU: 0, INTRO: 1, COUNT: 2, RUN: 3, CAUGHT: 4, OVER: 5, PAUSE: 6, REVIVE: 7 };
let state = ST.MENU;

const G = {};
function resetGame() {
  G.speed = 330 * SC;
  G.baseSpeed = 330 * SC;
  G.maxSpeed = 780 * SC;
  G.score = 0;
  G.bonesCnt = 0;
  G.tigerDist = 62;
  G.player = {
    x: W * 0.30, y: groundY, vy: 0,
    onGround: true, jumps: 0, anim: 0, invuln: 0, falling: false,
    sliding: false, slideLock: 0, fastFall: false,
    w: 128 * SC, h: 128 * SC,
  };
  G.tiger = { anim: 0, lunge: 0 };
  G.obstacles = [];   // {kind, x, dw, dh, ...} branch: barBottom / toucan: y0,t
  G.holes = [];
  G.bones = [];
  G.pows = [];        // {kind:'helmet'|'magnet'|'boost'|'gold', x, y, t}
  G.parts = [];
  G.pops = [];        // 떠오르는 점수 텍스트 {x,y,txt,t,life,c,big}
  G.signs = [];
  G.hints = [];       // 튜토리얼 말풍선 {x,y,txt}
  G.worldX = 0;
  G.nextMilestone = 500;
  G.shake = 0; G.flash = 0; G.caughtT = 0;
  G.slowRecover = 0;
  // 콤보/피버
  G.combo = 0; G.comboMax = 0;
  G.fever = 0;        // 게이지 0..1
  G.feverT = 0;       // 피버 남은 시간
  G.feverCnt = 0;
  // 파워업
  G.magT = 0; G.boostT = 0; G.shield = false;
  // 스포너
  G.spawnPx = 620 * SC;
  G.lastChunk = '';
  G.powCd = 2;
  G.queue = totals.runs === 0 ? ['bones_line', 'rock', 'bones_arc', 'log', 'branch_intro', 'bones_line'] : [];
  // 기록
  G.nearCnt = 0; G.slideCnt = 0; G.noHitDist = 0; G.newAch = []; G.hitCnt = 0;
  G.reviveUsed = false; G.reviveT = 0;
  // 스테이지
  G.stage = 0; G.stagePrev = 0; G.stageFade = 1;
  G.roarT = 0.5;
  // 연출
  G.hitStop = 0; G.banner = null; G.bestBroken = false; G.deathBy = '';
  G.player.squash = 0;
  updateHUD(true);
}

// ---------- 도전과제 ----------
const ACH = [
  { id: 'first_run', name: '첫 등원',           desc: '첫 게임을 완주했다멍!', icon: '🎒' },
  { id: 'm500',      name: '동네 한 바퀴',      desc: '한 판에 500m 달리기', icon: '🚲' },
  { id: 'm1000',     name: '정글 탐험가',       desc: '한 판에 1,000m 달리기', icon: '🌴' },
  { id: 'm2000',     name: '질주 본능',         desc: '한 판에 2,000m 달리기', icon: '⚡' },
  { id: 'm3000',     name: '등원왕 시바',       desc: '한 판에 3,000m 달리기', icon: '👑' },
  { id: 'bones30',   name: '간식 부자',         desc: '한 판에 뼈다귀 30개', icon: '🦴' },
  { id: 'combo15',   name: '콤보 마스터',       desc: '콤보 15 달성', icon: '🔥' },
  { id: 'fever3',    name: '피버 타임!',        desc: '한 판에 피버 3번', icon: '🌈' },
  { id: 'near10',    name: '아슬아슬 곡예사',   desc: '한 판에 니어미스 10번', icon: '😎' },
  { id: 'nohit700',  name: '무결점 라이더',     desc: '부딪히지 않고 700m', icon: '🛡️' },
  { id: 'bones300',  name: '뼈다귀 콜렉터',     desc: '누적 뼈다귀 300개', icon: '💎' },
  { id: 'slide50',   name: '림보의 달인',       desc: '누적 슬라이드 50번', icon: '🐍' },
];
function unlock(id) {
  if (achState[id]) return;
  achState[id] = true;
  store.set('finfin_ach', achState);
  const a = ACH.find(a => a.id === id);
  G.newAch && G.newAch.push(a);
  showToast(`🏅 도전과제 달성 — ${a.name}!`);
  sfx.record(); vib([30, 40, 60]);
}
function achCount() { return ACH.filter(a => achState[a.id]).length; }

// ---------- 입력 (오른쪽 탭=점프 · 왼쪽 홀드=슬라이드) ----------
const input = { slidePointers: new Set(), keySlide: false };
function slideHeld() { return input.slidePointers.size > 0 || input.keySlide; }
function jumpInput() {
  if (state !== ST.RUN) return;
  const p = G.player;
  if (p.falling) return;
  if (p.sliding) { p.sliding = false; p.slideLock = 0; }
  if (p.onGround) {
    p.vy = -1120 * SC; p.onGround = false; p.jumps = 1;
    sfx.jump(); dust(p.x, groundY, 8);
  } else if (p.jumps === 1) {
    p.vy = -980 * SC; p.jumps = 2;
    sfx.djump(); dust(p.x, p.y, 6, true);
  }
}
function slidePress() {
  if (state !== ST.RUN) return;
  const p = G.player;
  p.slideLock = 0.30;
  if (!p.onGround && !p.fastFall && !p.falling) {
    p.fastFall = true;
    p.vy = Math.max(p.vy, 1500 * SC);
    dust(p.x, p.y, 4, true);
  }
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); audioInit();
  if (e.clientX < W * 0.38) { input.slidePointers.add(e.pointerId); slidePress(); }
  else jumpInput();
}, { passive: false });
const releaseSlide = e => input.slidePointers.delete(e.pointerId);
window.addEventListener('pointerup', releaseSlide);
window.addEventListener('pointercancel', releaseSlide);
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); audioInit(); jumpInput(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); audioInit(); input.keySlide = true; slidePress(); }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === ST.RUN) doPause(); else if (state === ST.PAUSE) doResume(); }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') input.keySlide = false;
});

// ---------- 파티클 / 팝업 ----------
function dust(x, y, n, air = false) {
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x: x - 30 * SC + Math.random() * 24 * SC,
      y: y - (air ? 10 : 4) * SC + Math.random() * 8 * SC,
      vx: -(60 + Math.random() * 120) * SC,
      vy: -(20 + Math.random() * 90) * SC * (air ? 0.4 : 1),
      r: (3 + Math.random() * 5) * SC,
      life: 0.5 + Math.random() * 0.3, t: 0,
      c: air ? '255,255,255' : '164,124,88', grav: 1,
    });
  }
}
function sparkle(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 160) * SC;
    G.parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40 * SC,
      r: (2.5 + Math.random() * 4) * SC, life: 0.45 + Math.random() * 0.35, t: 0,
      c, grav: 0.4,
    });
  }
}
function rainbow(x, y) {
  const hue = (performance.now() * 0.35) % 360;
  const [r, g, b] = hsl2rgb(hue, 90, 62);
  G.parts.push({
    x: x - 30 * SC, y: y - 40 * SC + Math.random() * 30 * SC,
    vx: -(140 + Math.random() * 60) * SC, vy: (Math.random() - 0.5) * 60 * SC,
    r: (4 + Math.random() * 6) * SC, life: 0.5, t: 0, c: `${r},${g},${b}`, grav: 0,
  });
}
function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function pop(x, y, txt, c = '#ffe9a8', big = false) {
  G.pops.push({ x, y, txt, t: 0, life: big ? 1.1 : 0.8, c, big });
}
// 확장 링 이펙트 (피격/수집 임팩트)
function ring(x, y, c, growth = 260) {
  G.parts.push({ ring: 1, x, y, vx: 0, vy: 0, r: 10 * SC, life: 0.35, t: 0, c, grav: 0, growth: growth * SC });
}
// 대형 배너 (피버/스테이지/신기록 등 빅 모먼트)
function showBanner(txt, c = '#ffd75e') {
  G.banner = { txt, c, t: 0, life: 1.7 };
}

// ---------- 토스트 ----------
function showToast(txt) {
  const t = ui.toast;
  t.textContent = txt;
  t.classList.remove('hidden');
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
}

// ---------- 장애물/아이템 정의 ----------
// 히트박스는 시각보다 관대하게 (플랫포머 공정성 원칙)
const OBS_DEF = {
  rock:  { dw: 96,  hbx: 0.20, hby: 0.76 },
  log:   { dw: 128, hbx: 0.18, hby: 0.74 },
  plant: { dw: 88,  hbx: 0.24, hby: 0.79 },
};
function addObstacle(kind, x) {
  const def = OBS_DEF[kind];
  const dw = def.dw * SC * (0.92 + Math.random() * 0.18);
  const ratio = img[kind] && img[kind].height / img[kind].width || 0.75;
  G.obstacles.push({ kind, x, dw, dh: dw * ratio, minClear: 1e9 });
}
function addBranch(x) {
  const dw = 175 * SC * (0.95 + Math.random() * 0.1);
  const ratio = img.branch && img.branch.width ? img.branch.height / img.branch.width : 0.9;
  G.obstacles.push({ kind: 'branch', x, dw, dh: dw * ratio, barBottom: groundY - 64 * SC, minClear: 1e9 });
}
function addToucan(x) {
  const dw = 96 * SC;
  const ratio = img.toucan1 && img.toucan1.width ? img.toucan1.height / img.toucan1.width : 0.8;
  G.obstacles.push({ kind: 'toucan', x, dw, dh: dw * ratio, y0: groundY - 104 * SC, t: 0, minClear: 1e9 });
}
function addPow(kind, x, y) {
  G.pows.push({ kind, x, y: y || groundY - 150 * SC, t: Math.random() * 6 });
}
function boneArc(x, arc) {
  const n = 3 + (Math.random() * 3 | 0);
  const baseY = groundY - (arc ? 150 : 70) * SC - Math.random() * 60 * SC;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const yOff = arc ? -Math.sin(t * Math.PI) * 90 * SC : 0;
    G.bones.push({ x: x + i * 64 * SC, y: baseY + yOff, t: Math.random() * 6 });
  }
  return n * 64 * SC;
}

// ---------- 패턴 청크 (난이도 밴드 스포너) ----------
const CHUNKS = [
  { id: 'rock', d: 1, fn(x) { addObstacle('rock', x); if (Math.random() < 0.5) boneArc(x + 20 * SC, true); return 140 * SC; } },
  { id: 'log', d: 1, fn(x) { addObstacle('log', x); if (Math.random() < 0.5) boneArc(x + 30 * SC, true); return 170 * SC; } },
  { id: 'plant', d: 1, fn(x) { addObstacle('plant', x); return 130 * SC; } },
  { id: 'bones_line', d: 1, fn(x) { return boneArc(x, false); } },
  { id: 'bones_arc', d: 1, fn(x) { return boneArc(x, true); } },
  { id: 'pow', d: 1, tag: 'pow', fn(x) {
      const r = Math.random();
      addPow(r < 0.4 ? 'helmet' : r < 0.72 ? 'magnet' : 'boost', x);
      return 90 * SC;
  } },
  { id: 'hole', d: 2, fn(x) {
      const w = (130 + Math.random() * 55) * SC + G.speed * 0.08;
      G.holes.push({ x, w });
      if (Math.random() < 0.55) boneArc(x + w * 0.15, true);
      return w;
  } },
  { id: 'branch', d: 2, fn(x) { addBranch(x); return 200 * SC; } },
  { id: 'gold', d: 2, fn(x) { addPow('gold', x, groundY - 200 * SC); return 90 * SC; } },
  { id: 'toucan', d: 3, fn(x) { addToucan(x + 300 * SC); return 200 * SC; } },
  { id: 'double_obs', d: 3, fn(x) {
      const k1 = Math.random() < 0.5 ? 'rock' : 'plant';
      const k2 = Math.random() < 0.5 ? 'log' : 'rock';
      addObstacle(k1, x);
      const gap = 230 * SC + G.speed * 0.26;
      addObstacle(k2, x + gap);
      return gap + 160 * SC;
  } },
  { id: 'hole_rock', d: 3, fn(x) {
      const w = 140 * SC + G.speed * 0.08;
      G.holes.push({ x, w });
      const gap = 200 * SC + G.speed * 0.24;
      addObstacle('rock', x + w + gap);
      return w + gap + 140 * SC;
  } },
  { id: 'arc_hole', d: 3, fn(x) {
      const w = (160 + Math.random() * 50) * SC + G.speed * 0.10;
      G.holes.push({ x, w });
      boneArc(x - 30 * SC, true);
      return w + 40 * SC;
  } },
  { id: 'jump_slide', d: 4, fn(x) {
      addObstacle('rock', x);
      const gap = 300 * SC + G.speed * 0.40;
      addBranch(x + gap);
      return gap + 220 * SC;
  } },
  { id: 'slide_jump', d: 4, fn(x) {
      addBranch(x);
      const gap = 310 * SC + G.speed * 0.40;
      const w = 130 * SC + G.speed * 0.08;
      G.holes.push({ x: x + gap, w });
      return gap + w + 50 * SC;
  } },
  { id: 'double_hole', d: 4, fn(x) {
      const w = 120 * SC + G.speed * 0.06;
      const gap = 235 * SC + G.speed * 0.26;
      G.holes.push({ x, w });
      G.holes.push({ x: x + w + gap, w });
      boneArc(x + w + gap * 0.28, true);
      return w * 2 + gap + 60 * SC;
  } },
  { id: 'toucan_rock', d: 4, fn(x) {
      addObstacle('rock', x);
      const gap = 390 * SC + G.speed * 0.30;
      addToucan(x + gap);
      return gap + 180 * SC;
  } },
  { id: 'triple', d: 5, fn(x) {
      const gap = 245 * SC + G.speed * 0.26;
      addObstacle('rock', x);
      addObstacle('plant', x + gap);
      addObstacle('log', x + gap * 2);
      boneArc(x + gap * 0.4, true);
      return gap * 2 + 170 * SC;
  } },
  { id: 'long_hole', d: 5, fn(x) {
      const w = (220 + Math.random() * 55) * SC + G.speed * 0.13;
      G.holes.push({ x, w });
      boneArc(x + w * 0.1, true);
      return w + 60 * SC;
  } },
  { id: 'branch_tunnel', d: 5, fn(x) {
      addBranch(x);
      const gap = 340 * SC + G.speed * 0.32;
      addBranch(x + gap);
      return gap + 220 * SC;
  } },
  // 튜토리얼 전용
  { id: 'branch_intro', d: 9, fn(x) {
      addBranch(x);
      G.hints.push({ x: x + 40 * SC, y: groundY - 260 * SC, txt: '왼쪽 꾹! ⬇ 슬라이드' });
      return 220 * SC;
  } },
];
const CHUNK_MAP = {}; CHUNKS.forEach(c => CHUNK_MAP[c.id] = c);
function bandFor(m) { return m < 350 ? 1 : m < 900 ? 2 : m < 1700 ? 3 : m < 2800 ? 4 : 5; }
function spawnChunk() {
  const x = W + 80 * SC;
  let chunk;
  if (G.queue.length) {
    chunk = CHUNK_MAP[G.queue.shift()];
    if (chunk.id === 'rock' && totals.runs === 0) {
      G.hints.push({ x: x + 10 * SC, y: groundY - 250 * SC, txt: '오른쪽 탭! ⬆ 점프' });
    }
  } else {
    const maxD = bandFor(G.worldX);
    const pool = CHUNKS.filter(c =>
      c.d <= maxD && c.id !== G.lastChunk && (c.tag !== 'pow' || G.powCd <= 0));
    let total = 0;
    const weights = pool.map(c => {
      let w = c.d === maxD ? 2.2 : c.d === maxD - 1 ? 1.6 : 1;
      if (c.tag === 'pow') w = 0.9;
      if (c.id === 'gold') w = 0.5;
      if (c.id.indexOf('bones') === 0) w = 0.8;
      total += w; return w;
    });
    let r = Math.random() * total;
    chunk = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { chunk = pool[i]; break; } }
  }
  const w = chunk.fn(x);
  G.lastChunk = chunk.id;
  if (chunk.tag === 'pow') G.powCd = 5 + (Math.random() * 4 | 0); else G.powCd--;
  const gap = G.speed * (0.52 + Math.random() * 0.42) + 170 * SC;
  G.spawnPx = w + gap;
}

// ---------- 충돌 ----------
function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function playerBox() {
  const p = G.player;
  if (p.sliding) return { x: p.x - p.w * 0.28, y: p.y - p.h * 0.38, w: p.w * 0.58, h: p.h * 0.34 };
  return { x: p.x - p.w * 0.22, y: p.y - p.h * 0.72, w: p.w * 0.44, h: p.h * 0.68 };
}
function obstacleBoxes(o) {
  if (o.kind === 'branch') {
    const barH = o.dh * 0.30;
    const barTop = o.barBottom - barH;
    return [
      { x: o.x + o.dw * 0.05, y: barTop, w: o.dw * 0.90, h: barH },
      { x: o.x + o.dw * 0.36, y: 0, w: o.dw * 0.28, h: Math.max(0, barTop) },
    ];
  }
  if (o.kind === 'toucan') {
    const y = o.y0 + Math.sin(o.t * 3) * 10 * SC;
    return [{ x: o.x + o.dw * 0.18, y: y - o.dh * 0.30, w: o.dw * 0.64, h: o.dh * 0.60 }];
  }
  const def = OBS_DEF[o.kind];
  return [{
    x: o.x + o.dw * def.hbx, y: groundY - o.dh * def.hby,
    w: o.dw * (1 - def.hbx * 2), h: o.dh * def.hby,
  }];
}

// ---------- 피격/포획/부활 ----------
function hitObstacle() {
  const p = G.player;
  if (p.invuln > 0 || G.feverT > 0 || G.boostT > 0) return;
  if (G.shield) {
    G.shield = false;
    p.invuln = 1.2;
    sfx.shield(); vib(40);
    sparkle(p.x, p.y - p.h * 0.5, 14, '255,215,120');
    pop(p.x, p.y - p.h * 1.1, '헬멧이 지켜줬다! ⛑️', '#ffd75e', true);
    return;
  }
  p.invuln = 1.5;
  G.combo = 0;
  G.hitCnt++;
  G.noHitDist = G.worldX;
  G.tigerDist = Math.max(0, G.tigerDist - 26);
  G.slowRecover = 0.85;
  G.shake = 0.45; G.flash = 0.35;
  G.hitStop = 0.09;
  ring(p.x, p.y - p.h * 0.5, '255,120,80');
  sfx.hit(); vib(80);
  showToast('부딪혔다멍! 🐯 호랑이가 가까워진다!');
  if (G.tigerDist <= 0) { G.deathBy = 'tiger'; startCaught(); }
}
function startCaught() {
  if (state !== ST.RUN) return;
  state = ST.CAUGHT;
  G.caughtT = 0;
  G.tiger.lunge = 1;
  G.hitStop = 0.16; G.flash = 0.55; G.shake = 0.6;
  const p = G.player;
  ring(p.x, p.y - p.h * 0.5, '255,90,60');
  sparkle(p.x, p.y - p.h * 0.5, 18, '255,150,90');
  sfx.caught(); vib([60, 40, 120]);
}
function offerRevive() {
  state = ST.REVIVE;
  G.reviveT = 3.5;
  ui.revive.classList.remove('hidden');
  ui.reviveCnt.textContent = '4';
}
function doRevive() {
  G.reviveUsed = true;
  ui.revive.classList.add('hidden');
  const p = G.player;
  p.falling = false; p.fastFall = false; p.y = groundY; p.vy = 0;
  p.onGround = true; p.jumps = 0; p.invuln = 2.2; p.sliding = false;
  G.tigerDist = 70;
  G.tiger.lunge = 0;
  G.obstacles = []; G.holes = []; G.slowRecover = 0;
  G.speed = G.baseSpeed * 0.7;
  G.spawnPx = 700 * SC;
  state = ST.RUN;
  sfx.revive(); vib(30);
  sparkle(p.x, p.y - p.h * 0.5, 20, '255,240,150');
  showToast('🦴 다시 달린다멍!! 포기란 없다!');
  updateHUD(true);
}

// ---------- 피버/파워업 ----------
function startFever() {
  G.feverT = 6.5;
  G.fever = 1;
  G.feverCnt++;
  G.flash = 0.22;
  const p = G.player;
  ring(p.x, p.y - p.h * 0.5, '255,220,120', 420);
  sparkle(p.x, p.y - p.h * 0.5, 20, '255,220,120');
  showBanner('🌈 FEVER TIME!!');
  sfx.fever(); vib(40);
  if (G.feverCnt >= 3) unlock('fever3');
}
function collectPow(w) {
  const p = G.player;
  if (w.kind === 'helmet') {
    G.shield = true;
    sfx.power(); pop(w.x, w.y - 30 * SC, '⛑️ 안전모 장착!', '#8ff0ff', true);
  } else if (w.kind === 'magnet') {
    G.magT = 8;
    sfx.power(); pop(w.x, w.y - 30 * SC, '🧲 뼈다귀 자석!', '#ffb0f0', true);
  } else if (w.kind === 'boost') {
    G.boostT = 2.3;
    G.tigerDist = Math.min(100, G.tigerDist + 10);
    sfx.boost(); vib(50); pop(w.x, w.y - 30 * SC, '🚀 부스터!!', '#ffcf5e', true);
  } else if (w.kind === 'gold') {
    G.bonesCnt += 5;
    G.combo += 5;
    G.comboMax = Math.max(G.comboMax, G.combo);
    G.score += 120;
    if (G.feverT <= 0) G.fever = Math.min(1, G.fever + 5 / 16);
    sfx.gold(); pop(w.x, w.y - 30 * SC, '💛 황금 뼈다귀 +5!', '#ffd75e', true);
  }
  sparkle(w.x, w.y, 16, w.kind === 'gold' ? '255,214,90' : '160,230,255');
}

// ---------- 업데이트 ----------
function update(dt) {
  const p = G.player;

  if (state === ST.REVIVE) {
    G.reviveT -= dt;
    const n = Math.ceil(G.reviveT);
    if (ui.reviveCnt.textContent !== String(n)) ui.reviveCnt.textContent = n;
    if (G.reviveT <= 0) { ui.revive.classList.add('hidden'); endGame(); }
    return;
  }
  if (state === ST.CAUGHT) {
    G.caughtT += dt;
    G.tiger.anim += dt * 14;
    G.shake = Math.max(0, 0.4 - G.caughtT * 0.4);
    if (G.flash > 0) G.flash -= dt * 0.6;
    if (p.falling) { p.vy += 3200 * SC * dt; p.y += p.vy * dt; }
    if (G.caughtT > 1.0) {
      if (!G.reviveUsed && G.worldX > 120) offerRevive();
      else endGame();
    }
    return;
  }
  if (state !== ST.RUN) return;

  // 속도 (피버/부스터 배속) — 최고속 도달 ~1200m로 완만하게
  const ramp = 4.2 * SC;
  G.baseSpeed = Math.min(G.maxSpeed, G.baseSpeed + ramp * dt);
  let target = G.baseSpeed;
  if (G.feverT > 0) target = G.baseSpeed * 1.42;
  if (G.boostT > 0) target = G.baseSpeed * 1.8;
  if (G.slowRecover > 0) { G.slowRecover -= dt; G.speed = G.baseSpeed * 0.55; }
  else G.speed += (target - G.speed) * Math.min(1, dt * 3);
  const dx = G.speed * dt;
  G.worldX += dx / (42 * SC);
  G.score = Math.max(G.score, G.worldX + G.bonesCnt * 15);

  // 스테이지 (700m 주기: 낮→노을→밤)
  const stg = Math.floor(G.worldX / 700) % 3;
  if (stg !== G.stage) {
    G.stagePrev = G.stage; G.stage = stg; G.stageFade = 0;
    sfx.stage();
    showBanner(stg === 1 ? '🌇 노을 정글' : stg === 2 ? '🌙 밤의 정글' : '🌞 아침 정글', '#ffe9a8');
    showToast(stg === 1 ? '해가 저물어 간다…' : stg === 2 ? '반딧불이 반짝반짝!' : '아침 해가 떴다!');
  }
  if (G.stageFade < 1) G.stageFade = Math.min(1, G.stageFade + dt * 0.8);

  // 최고 기록 돌파 연출 (달리는 중 실시간)
  if (!G.bestBroken && best > 0 && G.worldX > best) {
    G.bestBroken = true;
    showBanner('🏆 신기록 돌파!!');
    ring(p.x, p.y - p.h * 0.5, '255,215,90', 420);
    sfx.record(); vib([30, 30, 80]);
  }

  // 마일스톤
  if (G.worldX >= G.nextMilestone) {
    G.nextMilestone += 500;
    G.baseSpeed = Math.min(G.maxSpeed, G.baseSpeed + 18 * SC);
    G.tigerDist = Math.min(100, G.tigerDist + 6);
    sfx.power();
    showToast(`🏫 ${Math.floor(G.worldX)}m! 유치원이 가까워진다!`);
    G.signs.push({ x: W + 60 * SC });
  }

  // 도전과제 (거리/노히트)
  if (G.worldX >= 500) unlock('m500');
  if (G.worldX >= 1000) unlock('m1000');
  if (G.worldX >= 2000) unlock('m2000');
  if (G.worldX >= 3000) unlock('m3000');
  if (G.worldX - G.noHitDist >= 700) unlock('nohit700');

  // 피버/파워업 타이머
  if (G.feverT > 0) {
    G.feverT -= dt;
    G.fever = Math.max(0, G.feverT / 6.5);
    G.tigerDist = Math.min(100, G.tigerDist + 8 * dt);
    if (Math.random() < dt * 40) rainbow(p.x, p.y);
    if (G.feverT <= 0) { G.fever = 0; sfx.feverEnd(); }
  }
  if (G.magT > 0) G.magT -= dt;
  if (G.boostT > 0) {
    G.boostT -= dt;
    if (Math.random() < dt * 30) rainbow(p.x, p.y);
  }

  // 호랑이 게이지 회복
  G.tigerDist = Math.min(100, G.tigerDist + 1.7 * dt);

  // 호랑이 으르렁 경고
  if (G.tigerDist < 25) {
    G.roarT -= dt;
    if (G.roarT <= 0) {
      G.roarT = 2.8;
      sfx.roar(); vib(90);
      pop(p.x - p.w * 1.3, groundY - p.h * 1.2, '으르렁!! 🐯', '#ff7a5c', true);
    }
  }

  // 슬라이드 상태
  const wantSlide = slideHeld() || p.slideLock > 0;
  if (p.slideLock > 0) p.slideLock -= dt;
  if (p.onGround && !p.falling) {
    const was = p.sliding;
    p.sliding = wantSlide;
    if (p.sliding && !was) {
      sfx.slide();
      dust(p.x + p.w * 0.2, groundY, 5);
      G.slideCnt++;
      totals.slides++;
      if (totals.slides >= 50) unlock('slide50');
    }
  } else p.sliding = false;

  // 플레이어 물리
  p.anim += dt * (8 + G.speed / (90 * SC));
  if (!p.onGround || p.falling) {
    p.vy += 2850 * SC * dt;
    p.y += p.vy * dt;
    if (!p.falling && p.vy > 0 && p.y >= groundY) {
      if (overHole(p.x)) {
        p.falling = true;
      } else {
        p.y = groundY; p.vy = 0; p.onGround = true; p.jumps = 0;
        p.squash = p.fastFall ? 0.16 : 0.11;   // 착지 스쿼시 (내려찍기는 더 강하게)
        if (p.fastFall) { G.shake = Math.max(G.shake, 0.18); dust(p.x, groundY, 10); }
        p.fastFall = false;
        dust(p.x, groundY, 6);
      }
    }
    if (p.falling && p.y - p.h > H + 40) { G.deathBy = 'hole'; startCaught(); p.falling = false; G.caughtT = 0.7; }
  } else {
    if (overHole(p.x)) { p.onGround = false; p.falling = true; p.sliding = false; p.vy = 120 * SC; sfx.hit(); }
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.squash > 0) p.squash -= dt;

  // 배너 타이머
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.life) G.banner = null; }

  // 오브젝트 이동
  for (const o of G.obstacles) {
    o.x -= dx;
    if (o.kind === 'toucan') { o.x -= 105 * SC * dt; o.t += dt; }
  }
  for (const h of G.holes) h.x -= dx;
  for (const b of G.bones) { b.x -= dx; b.t += dt * 4; }
  for (const w of G.pows) { w.x -= dx; w.t += dt * 3; }
  for (const s of G.signs) {
    s.x -= dx;
    if (!s.passed && s.x < p.x) {   // 표지판 통과 — 나뭇잎 축포
      s.passed = true;
      sparkle(s.x, groundY - 110 * SC, 14, '140,220,90');
      sparkle(s.x, groundY - 130 * SC, 8, '255,232,140');
    }
  }
  for (const t of G.hints) t.x -= dx;
  G.obstacles = G.obstacles.filter(o => o.x + o.dw > -80);
  G.holes = G.holes.filter(h => h.x + h.w > -60);
  G.bones = G.bones.filter(b => b.x > -60 && !b.got);
  G.pows = G.pows.filter(w => w.x > -60 && !w.got);
  G.signs = G.signs.filter(s => s.x > -160 * SC);
  G.hints = G.hints.filter(t => t.x > -300 * SC);

  // 자석/피버: 뼈 끌어오기
  if (G.magT > 0 || G.feverT > 0) {
    const R = G.feverT > 0 ? 280 * SC : 200 * SC;
    for (const b of G.bones) {
      const ddx = p.x - b.x, ddy = (p.y - p.h * 0.5) - b.y;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < R * R) {
        const k = Math.min(1, dt * 9);
        b.x += ddx * k; b.y += ddy * k;
      }
    }
  }

  // 스폰
  G.spawnPx -= dx;
  if (G.spawnPx <= 0) spawnChunk();

  // 충돌 — 장애물 + 니어미스 추적
  const pb = playerBox();
  for (const o of G.obstacles) {
    const boxes = obstacleBoxes(o);
    let hitNow = false;
    for (const ob of boxes) {
      if (rectsHit(pb, ob)) { hitNow = true; break; }
    }
    if (hitNow) {
      if (!o.hitDone) { o.hitDone = true; hitObstacle(); }
    } else if (!o.hitDone && !o.nearDone) {
      // x축 겹칠 때 세로 간격 추적
      const mb = boxes[0];
      if (pb.x < mb.x + mb.w && pb.x + pb.w > mb.x) {
        const gap = Math.max(mb.y - (pb.y + pb.h), pb.y - (mb.y + mb.h));
        if (gap >= 0) o.minClear = Math.min(o.minClear, gap);
      } else if (mb.x + mb.w < pb.x && o.minClear < 26 * SC) {
        o.nearDone = true;
        G.nearCnt++;
        G.score += 30;
        if (G.feverT <= 0) G.fever = Math.min(1, G.fever + 0.03);
        sfx.near();
        pop(p.x, p.y - p.h * 1.15, '아슬아슬! +30', '#9fe8ff');
        if (G.nearCnt >= 10) unlock('near10');
      }
    }
  }

  // 수집 — 뼈다귀
  for (const b of G.bones) {
    const dxb = b.x - p.x, dyb = (b.y + Math.sin(b.t) * 6 * SC) - (p.y - p.h * 0.4);
    if (dxb * dxb + dyb * dyb < (56 * SC) ** 2) {
      b.got = true;
      G.bonesCnt++;
      totals.bones++;
      G.combo++;
      G.comboMax = Math.max(G.comboMax, G.combo);
      const bonus = 15 + Math.min(40, G.combo * 2) + (G.feverT > 0 ? 15 : 0);
      G.score += bonus;
      sfx.collect();
      ring(b.x, b.y, '255,240,180', 130);
      if (G.combo > 0 && G.combo % 10 === 0) {
        sfx.combo10();
        sparkle(p.x, p.y - p.h * 0.7, 12, '255,200,90');
        pop(p.x, p.y - p.h * 1.2, `콤보 x${G.combo}!! 🔥`, '#ffb84d', true);
      }
      if (G.feverT <= 0) {
        G.fever = Math.min(1, G.fever + 1 / 16);
        if (G.fever >= 1) startFever();
      }
      if (G.bonesCnt === 30) unlock('bones30');
      if (totals.bones >= 300) unlock('bones300');
      if (G.combo >= 15) unlock('combo15');
      if (G.bonesCnt % 8 === 0) {
        G.tigerDist = Math.min(100, G.tigerDist + 14);
        sfx.power();
        showToast('간식 파워!! 🦴 호랑이를 따돌렸다!');
      }
    }
  }

  // 수집 — 파워업
  for (const w of G.pows) {
    const dxw = w.x - p.x, dyw = (w.y + Math.sin(w.t) * 8 * SC) - (p.y - p.h * 0.4);
    if (dxw * dxw + dyw * dyw < (66 * SC) ** 2) { w.got = true; collectPow(w); }
  }

  // 호랑이 애니
  G.tiger.anim += dt * (10 + G.speed / (60 * SC));

  // 파티클/팝업
  if (p.onGround && !p.sliding && Math.random() < dt * 18) dust(p.x - p.w * 0.3, groundY, 1);
  if (p.sliding && Math.random() < dt * 30) dust(p.x + p.w * 0.25, groundY, 1);
  for (const pa of G.parts) {
    pa.t += dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 300 * SC * dt * (pa.grav !== undefined ? pa.grav : 1);
  }
  G.parts = G.parts.filter(pa => pa.t < pa.life);
  for (const pp of G.pops) { pp.t += dt; pp.y -= 46 * SC * dt; }
  G.pops = G.pops.filter(pp => pp.t < pp.life);

  // 밤 스테이지 반딧불
  if (G.stage === 2 && Math.random() < dt * 6) {
    G.parts.push({
      x: W + 20, y: groundY - (60 + Math.random() * 380) * SC,
      vx: -(G.speed * 0.4 + Math.random() * 40 * SC), vy: (Math.random() - 0.5) * 30 * SC,
      r: (2 + Math.random() * 2.5) * SC, life: 3.5, t: 0, c: '190,255,120', grav: 0, glow: 1,
    });
  }

  if (G.shake > 0) G.shake -= dt;
  if (G.flash > 0) G.flash -= dt;

  updateHUD();
}
function overHole(x) {
  for (const h of G.holes) if (x > h.x + 14 * SC && x < h.x + h.w - 14 * SC) return true;
  return false;
}

// ---------- HUD ----------
let hudCache = {};
function updateHUD(force) {
  const s = Math.floor(G.score) + 'm';
  if (force || hudCache.s !== s) { ui.score.textContent = s; hudCache.s = s; }
  const b = '🦴 ' + G.bonesCnt;
  if (force || hudCache.b !== b) { ui.bones.textContent = b; hudCache.b = b; }
  const tw = Math.round(100 - G.tigerDist) + '%';
  if (force || hudCache.tw !== tw) { ui.tigerFill.style.width = tw; hudCache.tw = tw; }
  const fv = Math.round(G.fever * 100) + '%';
  if (force || hudCache.fv !== fv) { ui.feverFill.style.width = fv; hudCache.fv = fv; }
  const fa = G.feverT > 0;
  if (force || hudCache.fa !== fa) { ui.feverWrap.classList.toggle('fever-on', fa); hudCache.fa = fa; }
  // 콤보 배지
  const cb = G.combo >= 3 ? `x${G.combo} 콤보` : '';
  if (force || hudCache.cb !== cb) {
    ui.combo.textContent = cb;
    ui.combo.classList.toggle('hidden', !cb);
    hudCache.cb = cb;
  }
  // 활성 효과 아이콘
  const fx = (G.shield ? '⛑️ ' : '') + (G.magT > 0 ? `🧲${Math.ceil(G.magT)} ` : '') + (G.boostT > 0 ? '🚀 ' : '');
  if (force || hudCache.fx !== fx) {
    ui.effects.textContent = fx.trim();
    ui.effects.classList.toggle('hidden', !fx.trim());
    hudCache.fx = fx;
  }
}

// ---------- 그리기 ----------
const STAGE_TINT = [null, 'rgba(255,140,60,0.10)', 'rgba(30,50,140,0.17)'];
function stageBg(i) {
  if (i === 1 && img.bgSunset && img.bgSunset.width) return img.bgSunset;
  if (i === 2 && img.bgNight && img.bgNight.width) return img.bgNight;
  return img.bg;
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * G.shake, (Math.random() - 0.5) * 14 * G.shake);

  drawBG();
  drawGround();
  drawSigns();
  drawBones();
  drawPows();
  drawObstacles();
  drawTiger();
  drawPlayer();
  drawParts();
  drawPops();
  drawHints();
  drawSpeedLines();
  drawBanner();

  ctx.restore();

  // 스테이지 틴트
  const tint = STAGE_TINT[G.stage];
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
  // 피버 골드 글로우
  if (G.feverT > 0) {
    const a = 0.10 + Math.sin(performance.now() * 0.012) * 0.04;
    ctx.fillStyle = `rgba(255,200,60,${a})`;
    ctx.fillRect(0, 0, W, H);
  }
  // 피격 플래시
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,60,30,${Math.min(0.32, G.flash * 0.32)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // 호랑이 근접 경고 (붉은 테두리 펄스)
  if (state === ST.RUN && G.tigerDist < 25) {
    const a = ((25 - G.tigerDist) / 25) * (0.22 + Math.sin(performance.now() * 0.008) * 0.10);
    const wg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.7);
    wg.addColorStop(0, 'rgba(255,30,10,0)');
    wg.addColorStop(1, `rgba(255,30,10,${Math.max(0, a)})`);
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, W, H);
  }
  // 비네트
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.55, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,14,7,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function tileLoop(dw, scrollPx, fn) {
  const k0 = Math.floor(scrollPx / dw);
  const off = scrollPx - k0 * dw;
  for (let i = 0, bx = -off; bx < W; i++, bx += dw) fn(bx, (k0 + i) & 1);
}
function drawMirrorTile(im, bx, y, dw, dh, mirror) {
  ctx.save();
  if (mirror) { ctx.translate(bx + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(bx + dw / 2), 0); }
  ctx.drawImage(im, bx - 0.5, y, dw + 1, dh);
  ctx.restore();
}
function drawBG() {
  const cur = stageBg(G.stage);
  if (!cur || !cur.width) { ctx.fillStyle = '#12331d'; ctx.fillRect(0, 0, W, H); return; }
  const bh = groundY + 30 * SC;
  const drawOne = (im, alpha) => {
    if (!im || !im.width) return;
    const bw = bh * (im.width / im.height);
    ctx.globalAlpha = alpha;
    tileLoop(bw, G.worldX * 42 * SC * 0.22, (bx, m) => drawMirrorTile(im, bx, 0, bw, bh, m));
    ctx.globalAlpha = 1;
  };
  if (G.stageFade < 1) {
    drawOne(stageBg(G.stagePrev), 1);
    drawOne(cur, G.stageFade);
  } else drawOne(cur, 1);
  const gr = ctx.createLinearGradient(0, groundY - 160 * SC, 0, groundY);
  gr.addColorStop(0, 'rgba(8,20,10,0)');
  gr.addColorStop(1, 'rgba(8,20,10,0.45)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, groundY - 160 * SC, W, 160 * SC);
}

function drawGround() {
  const g = img.ground;
  const soil = '#3d2a1a';
  const depth = H - groundY;
  const gw = 430 * SC;
  const gh = g.width ? gw * (g.height / g.width) : 150 * SC;
  const surfOff = gh * 0.10;
  const sg = ctx.createLinearGradient(0, groundY, 0, H);
  sg.addColorStop(0, soil);
  sg.addColorStop(1, '#1c120a');
  ctx.fillStyle = sg;
  ctx.fillRect(0, groundY, W, depth);
  if (g.width) {
    tileLoop(gw, G.worldX * 42 * SC, (bx, m) => drawMirrorTile(g, bx, groundY - surfOff, gw, gh, m));
    if (gh - surfOff < depth) {
      const fg = ctx.createLinearGradient(0, groundY - surfOff + gh - 8, 0, H);
      fg.addColorStop(0, '#33200f');
      fg.addColorStop(1, '#1a1008');
      ctx.fillStyle = fg;
      ctx.fillRect(0, groundY - surfOff + gh - 1, W, depth - gh + surfOff + 1);
    }
  }
  for (const h of G.holes) {
    const grd = ctx.createLinearGradient(0, groundY - surfOff, 0, H);
    grd.addColorStop(0, '#160d06');
    grd.addColorStop(1, '#050302');
    ctx.fillStyle = grd;
    ctx.fillRect(h.x, groundY - surfOff - 2, h.w, H - groundY + surfOff + 2);
    ctx.fillStyle = 'rgba(255,220,160,0.18)';
    ctx.fillRect(h.x - 2, groundY - surfOff - 2, 4, 10 * SC);
    ctx.fillRect(h.x + h.w - 2, groundY - surfOff - 2, 4, 10 * SC);
  }
}

function drawSigns() {
  for (const s of G.signs) {
    const x = s.x, ph = 96 * SC, bw = 128 * SC, bh = 46 * SC;
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(x - 5 * SC, groundY - ph, 10 * SC, ph);
    ctx.fillStyle = '#8a5f36';
    ctx.strokeStyle = '#5d3f22';
    ctx.lineWidth = 3 * SC;
    const bx = x - bw / 2, by = groundY - ph - bh + 6 * SC;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8 * SC); else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3d9';
    ctx.font = `800 ${19 * SC}px 'Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('유치원 →', x, by + bh / 2 + 1);
  }
}

function drawObstacles() {
  for (const o of G.obstacles) {
    if (o.kind === 'branch') {
      const im = img.branch;
      const top = o.barBottom - o.dh;
      // 덩굴 로프 (스프라이트 위 → 화면 상단)
      if (top > 0) {
        ctx.strokeStyle = 'rgba(38,52,24,0.95)';
        ctx.lineWidth = 5 * SC;
        ctx.beginPath();
        ctx.moveTo(o.x + o.dw * 0.32, 0); ctx.lineTo(o.x + o.dw * 0.32, top + 12 * SC);
        ctx.moveTo(o.x + o.dw * 0.66, 0); ctx.lineTo(o.x + o.dw * 0.66, top + 12 * SC);
        ctx.stroke();
      }
      if (im && im.width) ctx.drawImage(im, o.x, top, o.dw, o.dh);
      else { ctx.fillStyle = '#4a3418'; ctx.fillRect(o.x, o.barBottom - 40 * SC, o.dw, 40 * SC); }
    } else if (o.kind === 'toucan') {
      const im = (Math.floor(o.t * 7) % 2 === 0 ? img.toucan1 : img.toucan2) || img.toucan1;
      const y = o.y0 + Math.sin(o.t * 3) * 10 * SC;
      if (im && im.width) ctx.drawImage(im, o.x, y - o.dh * 0.5, o.dw, o.dh);
      else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(o.x + o.dw / 2, y, o.dw * 0.4, o.dh * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
      // 접근 경고
      if (o.x > W - 40 * SC) {
        ctx.fillStyle = 'rgba(255,80,60,0.9)';
        ctx.font = `900 ${26 * SC}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('❗', W - 26 * SC, o.y0 - 10 * SC);
      }
    } else {
      const im = img[o.kind];
      if (im && im.width) ctx.drawImage(im, o.x, groundY - o.dh + 4 * SC, o.dw, o.dh);
    }
  }
}

function drawBones() {
  const im = img.bone;
  if (!im.width) return;
  for (const b of G.bones) {
    const s = 44 * SC, bob = Math.sin(b.t) * 6 * SC;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.rotate(Math.sin(b.t * 0.7) * 0.15);
    ctx.drawImage(im, -s / 2, -s / 2, s, s * (im.height / im.width));
    ctx.restore();
  }
}

const POW_IMG = { helmet: 'powHelmet', magnet: 'powMagnet', boost: 'powBoost', gold: 'powGold' };
const POW_EMOJI = { helmet: '⛑️', magnet: '🧲', boost: '🚀', gold: '🦴' };
function drawPows() {
  for (const w of G.pows) {
    const bob = Math.sin(w.t) * 8 * SC;
    const s = 62 * SC;
    const im = img[POW_IMG[w.kind]];
    ctx.save();
    ctx.translate(w.x, w.y + bob);
    // 글로우 링
    const gl = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 0.75);
    gl.addColorStop(0, w.kind === 'gold' ? 'rgba(255,215,80,0.35)' : 'rgba(140,230,255,0.30)');
    gl.addColorStop(1, 'rgba(140,230,255,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2); ctx.fill();
    if (im && im.width) {
      const dh = s * (im.height / im.width);
      ctx.drawImage(im, -s / 2, -dh / 2, s, dh);
    } else {
      ctx.font = `${40 * SC}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(POW_EMOJI[w.kind], 0, 0);
    }
    ctx.restore();
  }
}

const SHIBA_RUN = ['shiba3', 'shiba4', 'shiba2'];
function drawPlayer() {
  const p = G.player;
  const im = pickShiba();
  if (!im || !im.width) return;
  const dw = p.w * 1.12, dh = dw * (im.height / im.width);
  let ang = 0;
  if (!p.onGround) ang = Math.max(-0.20, Math.min(0.32, p.vy / (2800 * SC)));
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  if (p.onGround || p.y > groundY - 240 * SC) {
    const sh = Math.max(0.25, 1 - (groundY - p.y) / (260 * SC));
    ctx.save();
    ctx.rotate(-ang);
    ctx.fillStyle = `rgba(0,0,0,${0.28 * sh})`;
    ctx.beginPath();
    ctx.ellipse(0, groundY - p.y + 6 * SC, dw * 0.36 * sh + dw * 0.1, 10 * SC * sh + 3 * SC, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 스쿼시 & 스트레치 (착지 눌림 / 상승 늘어남) — 발 기준 앵커
  let sx = 1, sy = 1;
  if (p.squash > 0) {
    const k = Math.min(1, p.squash / 0.11);
    sx = 1 + 0.15 * k; sy = 1 - 0.20 * k;
  } else if (!p.onGround && p.vy < -260 * SC) {
    sx = 0.94; sy = 1.08;
  }
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  // 피버/부스터 오라
  if (G.feverT > 0 || G.boostT > 0) {
    const hue = (performance.now() * 0.35) % 360;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = G.boostT > 0 ? '#ffcf5e' : `hsl(${hue},95%,60%)`;
    ctx.shadowBlur = 34 * SC;
    ctx.drawImage(im, -dw * 0.52, -dh * 0.94, dw, dh);
    ctx.restore();
  }
  ctx.drawImage(im, -dw * 0.52, -dh * 0.94, dw, dh);
  // 헬멧 표시
  if (G.shield) {
    ctx.font = `${30 * SC}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⛑️', dw * 0.06, -dh * 1.02);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function pickShiba() {
  const p = G.player;
  if (p.sliding && img.shibaSlide && img.shibaSlide.width) return img.shibaSlide;
  if (state === ST.CAUGHT || state === ST.REVIVE) return img.shiba2;
  if (!p.onGround) return p.jumps >= 2 ? img.shiba2 : img.shiba1;
  return img[SHIBA_RUN[Math.floor(p.anim) % SHIBA_RUN.length]];
}

const TIGER_RUN = ['tiger1', 'tiger3', 'tiger2', 'tiger4'];
function drawTiger() {
  const p = G.player;
  const im = img[TIGER_RUN[Math.floor(G.tiger.anim) % TIGER_RUN.length]];
  if (!im.width) return;
  const dw = p.w * 1.9, dh = dw * (im.height / im.width);
  let gap;
  if ((state === ST.CAUGHT || state === ST.REVIVE) && G.tiger.lunge) {
    gap = Math.max(-dw * 0.15, (1 - Math.min(1, G.caughtT) * 2.4) * W * 0.35);
  } else {
    gap = (G.tigerDist / 100) * W * 0.92 + dw * 0.15;
  }
  const tx = p.x - gap - dw * 0.5;
  if (tx + dw < -30) return;
  const bob = Math.sin(G.tiger.anim * 0.9) * 5 * SC;
  ctx.save();
  ctx.translate(tx + dw / 2, groundY + bob - 2 * SC);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6 * SC, dw * 0.4, 11 * SC, 0, 0, Math.PI * 2);
  ctx.fill();
  // 근접 시 위협 글로우
  if (state === ST.RUN && G.tigerDist < 16) {
    ctx.shadowColor = 'rgba(255,50,20,0.85)';
    ctx.shadowBlur = (18 + Math.sin(performance.now() * 0.012) * 8) * SC;
  }
  ctx.drawImage(im, -dw / 2, -dh * 0.96, dw, dh);
  ctx.restore();
}

function drawParts() {
  for (const pa of G.parts) {
    const a = 1 - pa.t / pa.life;
    if (pa.ring) {
      ctx.strokeStyle = `rgba(${pa.c},${a * 0.85})`;
      ctx.lineWidth = 3.5 * SC * a + 1;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.r + pa.growth * pa.t, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pa.glow) {
      ctx.save();
      ctx.shadowColor = `rgba(${pa.c},0.9)`;
      ctx.shadowBlur = 8 * SC;
      ctx.fillStyle = `rgba(${pa.c},${a * 0.9})`;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y + Math.sin((pa.t * 3 + pa.x) * 0.8) * 6 * SC, pa.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(${pa.c},${a * 0.7})`;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.r * (0.6 + a * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPops() {
  for (const pp of G.pops) {
    const a = 1 - pp.t / pp.life;
    const size = (pp.big ? 24 : 17) * SC * (pp.t < 0.12 ? 0.6 + pp.t * 3.3 : 1);
    ctx.font = `900 ${size}px 'Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4 * SC;
    ctx.strokeStyle = `rgba(20,16,8,${a * 0.8})`;
    ctx.strokeText(pp.txt, pp.x, pp.y);
    ctx.fillStyle = pp.c;
    ctx.globalAlpha = a;
    ctx.fillText(pp.txt, pp.x, pp.y);
    ctx.globalAlpha = 1;
  }
}

function drawHints() {
  for (const t of G.hints) {
    ctx.font = `800 ${17 * SC}px 'Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
    const tw = ctx.measureText(t.txt).width + 28 * SC;
    ctx.fillStyle = 'rgba(8,26,14,0.85)';
    ctx.strokeStyle = 'rgba(255,232,168,0.6)';
    ctx.lineWidth = 2 * SC;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(t.x - tw / 2, t.y - 20 * SC, tw, 40 * SC, 20 * SC);
    else ctx.rect(t.x - tw / 2, t.y - 20 * SC, tw, 40 * SC);
    ctx.fill(); ctx.stroke();
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(t.x - 8 * SC, t.y + 19 * SC);
    ctx.lineTo(t.x + 8 * SC, t.y + 19 * SC);
    ctx.lineTo(t.x, t.y + 34 * SC);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,26,14,0.85)';
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.txt, t.x, t.y + 1);
  }
}

function drawBanner() {
  const b = G.banner;
  if (!b) return;
  // 등장: 오버슈트 팝 / 퇴장: 축소 페이드
  let k;
  if (b.t < 0.28) { const u = b.t / 0.28; k = 1 + 0.35 * Math.sin(u * Math.PI) * (1 - u); k *= u < 0.5 ? u * 2 : 1; }
  else if (b.t > b.life - 0.3) k = Math.max(0, (b.life - b.t) / 0.3);
  else k = 1;
  const fs = Math.min(46 * SC, W * 0.09);
  ctx.save();
  ctx.translate(W / 2, H * 0.28);
  ctx.scale(Math.max(0.01, k), Math.max(0.01, k));
  ctx.globalAlpha = Math.min(1, k);
  ctx.font = `900 ${fs}px 'Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = fs * 0.22;
  ctx.strokeStyle = 'rgba(20,14,4,0.85)';
  ctx.strokeText(b.txt, 0, 0);
  const gr = ctx.createLinearGradient(0, -fs * 0.6, 0, fs * 0.6);
  gr.addColorStop(0, '#fff6d8');
  gr.addColorStop(0.5, b.c);
  gr.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = gr;
  ctx.fillText(b.txt, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSpeedLines() {
  if (G.boostT <= 0 && G.feverT <= 0) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2.5 * SC;
  for (let i = 0; i < 7; i++) {
    const y = ((performance.now() * 0.05 + i * 137) % 1) * H * 0.8 + H * 0.05;
    const x = W - ((performance.now() * (1.4 + i * 0.13)) % (W * 1.4));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (90 + i * 22) * SC, y);
    ctx.stroke();
  }
}

// ---------- 메인 루프 ----------
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - lastT) / 1000;
  if (!isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(0.034, dt);
  lastT = t;
  if (state === ST.PAUSE) return;
  // 히트스톱: 짧은 프레임 정지로 타격감 강조
  if (G.hitStop > 0 && (state === ST.RUN || state === ST.CAUGHT)) {
    G.hitStop -= dt;
    if (assetsReady) draw();
    return;
  }
  if (state === ST.RUN || state === ST.CAUGHT || state === ST.REVIVE) update(dt);
  if (assetsReady && state !== ST.MENU && state !== ST.INTRO) draw();
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange', () => {
  if (window.__test) return; // 테스트 모드: 자동 일시정지 없음
  if (document.hidden && state === ST.RUN) doPause();
});

// ---------- 일시정지 ----------
function doPause() {
  if (state !== ST.RUN) return;
  state = ST.PAUSE;
  ui.pause.classList.remove('hidden');
}
function doResume() {
  if (state !== ST.PAUSE) return;
  ui.pause.classList.add('hidden');
  state = ST.RUN;
  G.player.invuln = Math.max(G.player.invuln, 0.6);
}
ui.pauseBtn.addEventListener('click', () => { sfx.click(); doPause(); });
ui.resumeBtn.addEventListener('click', () => { sfx.click(); doResume(); });
ui.quitBtn.addEventListener('click', () => {
  sfx.click();
  ui.pause.classList.add('hidden');
  ui.hud.classList.add('hidden');
  state = ST.MENU;
  showScreen(ui.start);
  refreshTitle();
  try { ui.posterVideo.play().catch(() => {}); } catch (e) {}
});

// ---------- 음소거 ----------
function refreshMute() {
  const icon = muted ? '🔇' : '🔊';
  ui.muteBtn.textContent = icon;
  ui.pMuteBtn.textContent = icon + (muted ? ' 소리 켜기' : ' 소리 끄기');
}
function toggleMute() {
  muted = !muted;
  store.set('finfin_mute', muted);
  refreshMute();
  if (!muted) sfx.click();
}
ui.muteBtn.addEventListener('click', toggleMute);
ui.pMuteBtn.addEventListener('click', toggleMute);

// ---------- 화면 전환 ----------
function showScreen(el) {
  [ui.start, ui.intro, ui.countdown, ui.gameover].forEach(s => s.classList.add('hidden'));
  if (el) el.classList.remove('hidden');
}

function playIntro() {
  state = ST.INTRO;
  showScreen(ui.intro);
  ui.hud.classList.add('hidden');
  try { ui.posterVideo.pause(); } catch (e) {}
  const v = ui.introVideo;
  v.currentTime = 0;
  v.muted = false;
  const done = () => { v.removeEventListener('ended', done); startCountdown(); };
  v.addEventListener('ended', done);
  v.play().catch(() => {});
  ui.skipBtn.onclick = () => { v.removeEventListener('ended', done); v.pause(); startCountdown(); };
}

function startCountdown() {
  state = ST.COUNT;
  resetGame();
  showScreen(ui.countdown);
  ui.hud.classList.remove('hidden');
  // 조작 안내 오버레이 (처음 2판)
  if (totals.runs < 2) {
    ui.zones.classList.remove('hidden');
    ui.zones.style.animation = 'none';
    void ui.zones.offsetWidth;
    ui.zones.style.animation = '';
    setTimeout(() => ui.zones.classList.add('hidden'), 4200);
  }
  let n = 3;
  ui.countNum.textContent = n;
  sfx.count();
  draw();
  const iv = setInterval(() => {
    if (state !== ST.COUNT) { clearInterval(iv); return; }
    n--;
    if (n <= 0) {
      clearInterval(iv);
      showScreen(null);
      sfx.go();
      state = ST.RUN;
    } else {
      ui.countNum.textContent = n;
      sfx.count();
      ui.countNum.style.animation = 'none';
      void ui.countNum.offsetWidth;
      ui.countNum.style.animation = '';
    }
  }, 850);
}

function endGame() {
  state = ST.OVER;
  const score = Math.floor(G.score);
  const isRecord = score > best && best > 0;
  best = Math.max(score, best);
  store.set('finfin_best', best);
  totals.runs++;
  store.set('finfin_tot', totals);
  unlock('first_run');
  store.set('finfin_ach', achState);

  ui.goScore.textContent = score;
  ui.goBones.textContent = G.bonesCnt;
  ui.goBest.textContent = best;
  ui.goCombo.textContent = G.comboMax;
  ui.goFever.textContent = G.feverCnt;
  ui.goNew.classList.toggle('hidden', !isRecord);
  if (isRecord) { sfx.record(); vib([30, 30, 80]); }
  // 이번 판 획득 뱃지
  if (G.newAch.length) {
    ui.goAch.innerHTML = G.newAch.map(a => `<span class="go-badge">${a.icon} ${a.name}</span>`).join('');
    ui.goAch.classList.remove('hidden');
  } else ui.goAch.classList.add('hidden');
  ui.hud.classList.add('hidden');
  showScreen(ui.gameover);
}

// ---------- 공유 ----------
ui.shareBtn.addEventListener('click', async () => {
  sfx.click();
  const url = location.origin + location.pathname;
  const text = `🐕🚲 핀핀 정글 등원 대작전에서 ${Math.floor(G.score || 0)}m 달렸어요! 호랑이보다 빨리 유치원까지! 같이 달려볼까요?`;
  try {
    if (navigator.share) await navigator.share({ title: '핀핀 정글 등원 대작전', text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToastGlobal('📋 링크가 복사되었어요!');
    }
  } catch (e) {}
});
function showToastGlobal(txt) {
  // 게임오버 화면 등 HUD 밖에서도 보이는 간단 알림
  ui.hud.classList.remove('hidden');
  showToast(txt);
  setTimeout(() => { if (state === ST.OVER || state === ST.MENU) ui.hud.classList.add('hidden'); }, 1700);
}

// ---------- 도전과제 패널 ----------
function openAch() {
  sfx.click();
  ui.achList.innerHTML = ACH.map(a => {
    const on = !!achState[a.id];
    return `<div class="ach-item ${on ? 'on' : ''}">
      <span class="ach-icon">${on ? a.icon : '🔒'}</span>
      <span class="ach-txt"><b>${a.name}</b><small>${a.desc}</small></span>
      ${on ? '<span class="ach-check">✓</span>' : ''}
    </div>`;
  }).join('');
  $('achTitle').textContent = `🏅 도전과제 ${achCount()}/${ACH.length}`;
  ui.achPanel.classList.remove('hidden');
}
ui.achBtn.addEventListener('click', openAch);
ui.goAchBtn.addEventListener('click', openAch);
ui.achClose.addEventListener('click', () => { sfx.click(); ui.achPanel.classList.add('hidden'); });

// ---------- 부활 ----------
ui.reviveBtn.addEventListener('click', () => { if (state === ST.REVIVE) doRevive(); });
ui.reviveSkip.addEventListener('click', () => {
  if (state !== ST.REVIVE) return;
  ui.revive.classList.add('hidden');
  endGame();
});

// ---------- 타이틀 ----------
function refreshTitle() {
  ui.titleMeta.innerHTML =
    (best > 0 ? `🏆 최고 기록 <b>${best}m</b> &nbsp;·&nbsp; ` : '') +
    `🏅 도전과제 <b>${achCount()}/${ACH.length}</b>`;
}

// ---------- 버튼 ----------
ui.startBtn.addEventListener('click', () => { audioInit(); sfx.click(); playIntro(); });
ui.retryBtn.addEventListener('click', () => { audioInit(); sfx.click(); startCountdown(); });
ui.introBtn.addEventListener('click', () => { audioInit(); sfx.click(); playIntro(); });

// ---------- 테스트 모드 (?test) ----------
if (location.search.indexOf('test') >= 0) {
  window.__test = {
    go() { if (state !== ST.RUN) { resetGame(); showScreen(null); ui.hud.classList.remove('hidden'); state = ST.RUN; } },
    sim(ms) { const n = Math.round(ms / 16); for (let i = 0; i < n; i++) update(0.016); draw(); },
    warp(m) { G.worldX = m; G.nextMilestone = Math.ceil(m / 500) * 500 + 500; },
    caught: startCaught,
    state: () => state,
    G: () => G,
    give(k) { collectPow({ kind: k, x: G.player.x, y: G.player.y - 100 }); },
    fever: startFever,
    gauge(v) { G.fever = v; },
    slide(on) { input.keySlide = on; if (on) slidePress(); },
    jump: jumpInput,
    chunk(id) { CHUNK_MAP[id].fn(W + 80 * SC); },
    revive: doRevive,
    resetSave() { localStorage.clear(); },
    // 난이도 계측용 자동 플레이 봇 (reactSec: 반응 속도 — 사람 평균 ~0.42s)
    botRun(reactSec = 0.42, maxMs = 240000) {
      this.go();
      const p = G.player;
      const n = Math.round(maxMs / 16);
      for (let i = 0; i < n; i++) {
        if (state === ST.REVIVE) { ui.revive.classList.add('hidden'); endGame(); }
        if (state !== ST.RUN && state !== ST.CAUGHT) break;
        if (state === ST.RUN) {
          const react = G.speed * reactSec + 40 * SC;
          let jumpD = 1e9, slideD = 1e9;
          for (const o of G.obstacles) {
            if (o.hitDone) continue;
            const d = o.x - (p.x + p.w * 0.3);
            if (d < -60 * SC) continue;
            if (o.kind === 'branch' || o.kind === 'toucan') slideD = Math.min(slideD, d);
            else jumpD = Math.min(jumpD, d);
          }
          for (const h of G.holes) {
            const d = h.x - p.x;
            if (d > -h.w) jumpD = Math.min(jumpD, Math.max(0, d));
          }
          const wantSlide = slideD < react * 0.85 && slideD > -80 * SC;
          if (wantSlide && !input.keySlide) { input.keySlide = true; slidePress(); }
          else if (!wantSlide) input.keySlide = false;
          if (!wantSlide && jumpD < G.speed * 0.22 + 24 * SC && p.onGround) jumpInput();
          // 사람처럼: 하강 중 아직 장애물 위를 못 벗어났으면 2단 점프
          if (!p.onGround && p.vy > 150 * SC && p.jumps === 1 &&
              ((jumpD < 1e8 && jumpD > -70 * SC) || overHole(p.x + p.w * 0.8))) jumpInput();
        }
        update(0.016);
      }
      input.keySlide = false;
      const res = { m: Math.floor(G.worldX), deathBy: G.deathBy || 'none', hits: G.hitCnt, bones: G.bonesCnt, fevers: G.feverCnt, state };
      if (state === ST.OVER) return res;
      endGame();
      return res;
    },
  };
}

// ---------- 초기화 ----------
loadAssets();
refreshMute();
refreshTitle();
const pv = ui.posterVideo;
pv.muted = true; pv.loop = true; pv.autoplay = true;
pv.play().catch(() => {});

})();
