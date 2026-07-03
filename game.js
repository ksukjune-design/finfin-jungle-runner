/* ==========================================================
   핀핀 정글 등원 대작전
   — 시바견 × FINFIN 밸런스바이크 × 호랑이 추격 러닝 게임
   ========================================================== */
(() => {
'use strict';

// ---------- DOM ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'), score: $('score'), bones: $('bones'),
  tigerFill: $('tigerbar-fill'), toast: $('toast'),
  start: $('start'), startBtn: $('startBtn'), posterVideo: $('posterVideo'),
  intro: $('intro'), introVideo: $('introVideo'), skipBtn: $('skipBtn'),
  countdown: $('countdown'), countNum: $('countNum'),
  gameover: $('gameover'), goScore: $('goScore'), goBones: $('goBones'),
  goBest: $('goBest'), retryBtn: $('retryBtn'), introBtn: $('introBtn'),
};

// ---------- 에셋 ----------
const IMG_SRC = {
  shiba1: 'assets/sprites/shiba_1.png', // 글라이드(다리 올림) → 점프
  shiba2: 'assets/sprites/shiba_2.png', // 전진 글라이드
  shiba3: 'assets/sprites/shiba_3.png', // 킥(발 내림)
  shiba4: 'assets/sprites/shiba_4.png', // 푸시(발 뒤로)
  tiger1: 'assets/sprites/tiger_1.png',
  tiger2: 'assets/sprites/tiger_2.png',
  tiger3: 'assets/sprites/tiger_3.png',
  tiger4: 'assets/sprites/tiger_4.png',
  rock:  'assets/sprites/obs_1.png',
  log:   'assets/sprites/obs_2.png',
  plant: 'assets/sprites/obs_3.png',
  bone:  'assets/sprites/obs_4.png',
  ground:'assets/sprites/ground.png',
  bg:    'assets/sprites/bg_jungle.jpg',
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
function blip(freq, dur, type = 'square', vol = 0.12, slide = 0) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, actx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), actx.currentTime + dur);
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur);
}
const sfx = {
  jump()    { blip(420, 0.18, 'square', 0.10, +380); },
  djump()   { blip(560, 0.16, 'square', 0.10, +420); },
  collect() { blip(880, 0.10, 'sine', 0.14, +220); setTimeout(() => blip(1320, 0.12, 'sine', 0.12), 60); },
  hit()     { blip(160, 0.25, 'sawtooth', 0.16, -90); },
  caught()  { blip(300, 0.5, 'sawtooth', 0.16, -220); setTimeout(() => blip(180, 0.6, 'sawtooth', 0.14, -120), 180); },
  power()   { blip(660, 0.1, 'sine', 0.12); setTimeout(() => blip(880, 0.1, 'sine', 0.12), 80); setTimeout(() => blip(1100, 0.14, 'sine', 0.12), 160); },
  count()   { blip(700, 0.09, 'sine', 0.12); },
  go()      { blip(1000, 0.3, 'sine', 0.14, +200); },
};

// ---------- 캔버스/스케일 (세로/가로 모두 지원) ----------
let W = 0, H = 0, DPR = 1, SC = 1, groundY = 0;
function resize() {
  const oldW = W, oldH = H, oldSC = SC, oldGroundY = groundY;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // 가로모드: 세로 공간 기준으로 캐릭터를 키움 (좌우는 여유가 많음)
  SC = W > H ? H / 560 : Math.min(W / 420, H / 760);
  groundY = H * 0.78;
  if (oldW && (oldW !== W || oldH !== H)) rescaleWorld(oldW, oldSC, oldGroundY);
}
// 회전/리사이즈 시 진행 중인 월드를 새 좌표계로 환산해 이어서 플레이
function rescaleWorld(oldW, oldSC, oldGroundY) {
  if (!G.player) return;
  const rx = W / oldW;        // 가로 위치 비율
  const rs = SC / oldSC;      // 크기 비율
  const p = G.player;
  p.x = W * 0.30;
  p.w = 128 * SC; p.h = 128 * SC;
  if (p.onGround) { p.y = groundY; p.vy = 0; }
  else { p.y = groundY - (oldGroundY - p.y) * rs; p.vy *= rs; }
  for (const o of G.obstacles) { o.x *= rx; o.dw *= rs; o.dh *= rs; }
  for (const h of G.holes) { h.x *= rx; h.w *= rs; }
  for (const b of G.bones) { b.x *= rx; b.y = groundY - (oldGroundY - b.y) * rs; }
  for (const s of G.signs) s.x *= rx;
  G.speed *= rs; G.baseSpeed *= rs; G.maxSpeed = 800 * SC;
  G.parts = [];
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 60));
resize();

// ---------- 게임 상태 ----------
const ST = { MENU: 0, INTRO: 1, COUNT: 2, RUN: 3, CAUGHT: 4, OVER: 5 };
let state = ST.MENU;

const G = {}; // 런타임 상태
function resetGame() {
  G.speed = 330 * SC;
  G.baseSpeed = 330 * SC;
  G.maxSpeed = 800 * SC;
  G.score = 0;
  G.bonesCnt = 0;
  G.tigerDist = 62;          // 0=잡힘, 100=안전
  G.player = {
    x: W * 0.30, y: groundY, vy: 0,
    onGround: true, jumps: 0, anim: 0, invuln: 0, falling: false,
    w: 128 * SC, h: 128 * SC,
  };
  G.tiger = { anim: 0, x: -999, lunge: 0 };
  G.obstacles = [];  // {kind:'rock'|'log'|'plant', x, dw, dh}
  G.holes = [];      // {x, w}
  G.bones = [];      // {x, y, t}
  G.parts = [];      // 파티클
  G.signs = [];      // 마일스톤 표지판 (장식)
  G.spawnT = 1.2;    // 첫 스폰 대기
  G.worldX = 0;
  G.nextMilestone = 500;
  G.shake = 0; G.flash = 0; G.caughtT = 0;
  G.slowRecover = 0;
}

// ---------- 입력 (원버튼) ----------
function jumpInput() {
  if (state !== ST.RUN) return;
  const p = G.player;
  if (p.falling) return;
  if (p.onGround) {
    p.vy = -1060 * SC; p.onGround = false; p.jumps = 1;
    sfx.jump(); dust(p.x, groundY, 8);
  } else if (p.jumps === 1) {
    p.vy = -940 * SC; p.jumps = 2;
    sfx.djump(); dust(p.x, p.y, 6, true);
  }
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); jumpInput(); }, { passive: false });
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); audioInit(); jumpInput(); }
});

// ---------- 파티클 ----------
function dust(x, y, n, air = false) {
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x: x - 30 * SC + Math.random() * 24 * SC,
      y: y - (air ? 10 : 4) * SC + Math.random() * 8 * SC,
      vx: -(60 + Math.random() * 120) * SC,
      vy: -(20 + Math.random() * 90) * SC * (air ? 0.4 : 1),
      r: (3 + Math.random() * 5) * SC,
      life: 0.5 + Math.random() * 0.3, t: 0,
      c: air ? '255,255,255' : '164,124,88',
    });
  }
}

// ---------- 토스트 ----------
function showToast(txt) {
  const t = ui.toast;
  t.textContent = txt;
  t.classList.remove('hidden');
  t.style.animation = 'none';
  void t.offsetWidth; // reflow → 애니메이션 재시작
  t.style.animation = '';
}

// ---------- 스폰 ----------
const OBS_DEF = {
  rock:  { dw: 96,  hbx: 0.16, hby: 0.82 },
  log:   { dw: 128, hbx: 0.12, hby: 0.80 },
  plant: { dw: 88,  hbx: 0.20, hby: 0.85 },
};
function lastFeatureX() {
  let mx = -1e9;
  for (const o of G.obstacles) mx = Math.max(mx, o.x + o.dw);
  for (const h of G.holes) mx = Math.max(mx, h.x + h.w);
  return mx;
}
function spawn() {
  const spd = G.speed;
  const minGap = 240 * SC + spd * 0.34;           // 공정성: 반응+점프 여유
  if (lastFeatureX() > W + 60 * SC - minGap) return;

  const x = W + 80 * SC;
  const r = Math.random();
  const hardOK = G.worldX > 600;                   // 초반엔 쉬운 것만

  if (r < 0.42) {
    // 단일 장애물
    const kinds = ['rock', 'log', 'plant'];
    const kind = kinds[(Math.random() * kinds.length) | 0];
    addObstacle(kind, x);
    if (Math.random() < 0.45) boneArc(x + OBS_DEF[kind].dw * SC * 0.5, true);
  } else if (r < 0.57 && hardOK) {
    // 이중 장애물 (사이 띄움)
    const k1 = Math.random() < 0.5 ? 'rock' : 'plant';
    const k2 = Math.random() < 0.5 ? 'log' : 'rock';
    addObstacle(k1, x);
    addObstacle(k2, x + (200 + spd * 0.22) * SC);
  } else if (r < 0.74 && hardOK) {
    // 구덩이
    const w = (130 + Math.random() * 60) * SC + spd * 0.10;
    G.holes.push({ x, w });
    if (Math.random() < 0.5) boneArc(x + w * 0.5, true);
  } else {
    // 뼈다귀 라인/아치
    boneArc(x, Math.random() < 0.5);
  }
  G.spawnT = 0.55 + Math.random() * 0.75;
}
function addObstacle(kind, x) {
  const def = OBS_DEF[kind];
  const dw = def.dw * SC * (0.92 + Math.random() * 0.18);
  const ratio = img[kind].height / img[kind].width || 0.75;
  G.obstacles.push({ kind, x, dw, dh: dw * ratio });
}
function boneArc(x, arc) {
  const n = 3 + (Math.random() * 3 | 0);
  const baseY = groundY - (arc ? 150 : 70) * SC - Math.random() * 60 * SC;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const yOff = arc ? -Math.sin(t * Math.PI) * 90 * SC : 0;
    G.bones.push({ x: x + i * 64 * SC, y: baseY + yOff, t: Math.random() * 6 });
  }
}

// ---------- 충돌 ----------
function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function playerBox() {
  const p = G.player;
  return { x: p.x - p.w * 0.24, y: p.y - p.h * 0.72, w: p.w * 0.48, h: p.h * 0.68 };
}

// ---------- 피격/포획 ----------
function hitObstacle() {
  const p = G.player;
  if (p.invuln > 0) return;
  p.invuln = 1.3;
  G.tigerDist = Math.max(0, G.tigerDist - 30);
  G.slowRecover = 1.0;           // 속도 회복 타이머
  G.shake = 0.45; G.flash = 0.35;
  sfx.hit();
  showToast('부딪혔다멍! 🐯 호랑이가 가까워진다!');
  if (G.tigerDist <= 0) startCaught();
}
function startCaught() {
  if (state !== ST.RUN) return;
  state = ST.CAUGHT;
  G.caughtT = 0;
  G.tiger.lunge = 1;
  sfx.caught();
}

// ---------- 업데이트 ----------
function update(dt) {
  const p = G.player;

  if (state === ST.CAUGHT) {
    G.caughtT += dt;
    G.tiger.anim += dt * 14;
    G.shake = Math.max(0, 0.4 - G.caughtT * 0.4);
    if (G.flash > 0) G.flash -= dt * 0.6;
    if (p.falling) { p.vy += 3200 * SC * dt; p.y += p.vy * dt; }
    if (G.caughtT > 1.0) endGame();
    return;
  }
  if (state !== ST.RUN) return;

  // 속도/점수
  const ramp = 7.5 * SC;
  G.baseSpeed = Math.min(G.maxSpeed, G.baseSpeed + ramp * dt);
  if (G.slowRecover > 0) {
    G.slowRecover -= dt;
    G.speed = G.baseSpeed * 0.55;
  } else {
    G.speed += (G.baseSpeed - G.speed) * Math.min(1, dt * 3);
  }
  const dx = G.speed * dt;
  G.worldX += dx / (42 * SC);            // 미터 환산
  G.score = G.worldX;

  // 마일스톤
  if (G.worldX >= G.nextMilestone) {
    G.nextMilestone += 500;
    G.baseSpeed = Math.min(G.maxSpeed, G.baseSpeed + 26 * SC);
    G.tigerDist = Math.min(100, G.tigerDist + 6);
    sfx.power();
    showToast(`🏫 ${Math.floor(G.worldX)}m! 유치원이 가까워진다!`);
    G.signs.push({ x: W + 60 * SC });
  }

  // 호랑이 게이지: 서서히 회복(시바가 더 빠름)
  G.tigerDist = Math.min(100, G.tigerDist + 1.7 * dt);

  // 플레이어 물리
  p.anim += dt * (8 + G.speed / (90 * SC));
  if (!p.onGround || p.falling) {
    p.vy += 3000 * SC * dt;
    p.y += p.vy * dt;
    if (!p.falling && p.vy > 0 && p.y >= groundY) {
      // 착지 — 발밑이 구덩이인지 확인
      if (overHole(p.x)) {
        p.falling = true;
      } else {
        p.y = groundY; p.vy = 0; p.onGround = true; p.jumps = 0;
        dust(p.x, groundY, 6);
      }
    }
    if (p.falling && p.y - p.h > H + 40) { startCaught(); p.falling = false; G.caughtT = 0.7; }
  } else {
    // 지면 주행 중 구덩이 진입
    if (overHole(p.x)) { p.onGround = false; p.falling = true; p.vy = 120 * SC; sfx.hit(); }
  }
  if (p.invuln > 0) p.invuln -= dt;

  // 오브젝트 이동
  for (const o of G.obstacles) o.x -= dx;
  for (const h of G.holes) h.x -= dx;
  for (const b of G.bones) { b.x -= dx; b.t += dt * 4; }
  for (const s of G.signs) s.x -= dx;
  G.obstacles = G.obstacles.filter(o => o.x + o.dw > -60);
  G.holes = G.holes.filter(h => h.x + h.w > -60);
  G.bones = G.bones.filter(b => b.x > -60 && !b.got);
  G.signs = G.signs.filter(s => s.x > -160 * SC);

  // 스폰
  G.spawnT -= dt;
  if (G.spawnT <= 0) spawn();

  // 충돌 — 장애물
  const pb = playerBox();
  for (const o of G.obstacles) {
    const def = OBS_DEF[o.kind];
    const ob = {
      x: o.x + o.dw * def.hbx, y: groundY - o.dh * def.hby,
      w: o.dw * (1 - def.hbx * 2), h: o.dh * def.hby,
    };
    if (rectsHit(pb, ob)) { hitObstacle(); break; }
  }
  // 수집 — 뼈다귀
  for (const b of G.bones) {
    const dxb = b.x - p.x, dyb = (b.y + Math.sin(b.t) * 6 * SC) - (p.y - p.h * 0.4);
    if (dxb * dxb + dyb * dyb < (56 * SC) ** 2) {
      b.got = true;
      G.bonesCnt++;
      G.score += 15;
      G.worldX += 15;
      sfx.collect();
      if (G.bonesCnt % 8 === 0) {
        G.tigerDist = Math.min(100, G.tigerDist + 14);
        sfx.power();
        showToast('간식 파워!! 🦴 호랑이를 따돌렸다!');
      }
    }
  }

  // 호랑이 애니
  G.tiger.anim += dt * (10 + G.speed / (60 * SC));

  // 파티클
  if (p.onGround && Math.random() < dt * 18) dust(p.x - p.w * 0.3, groundY, 1);
  for (const pa of G.parts) {
    pa.t += dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 300 * SC * dt;
  }
  G.parts = G.parts.filter(pa => pa.t < pa.life);

  // 이펙트 타이머
  if (G.shake > 0) G.shake -= dt;
  if (G.flash > 0) G.flash -= dt;

  // HUD
  ui.score.textContent = Math.floor(G.score) + 'm';
  ui.bones.textContent = '🦴 ' + G.bonesCnt;
  ui.tigerFill.style.width = (100 - G.tigerDist) + '%';
}
function overHole(x) {
  for (const h of G.holes) if (x > h.x + 14 * SC && x < h.x + h.w - 14 * SC) return true;
  return false;
}

// ---------- 그리기 ----------
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * G.shake, (Math.random() - 0.5) * 14 * G.shake);

  drawBG();
  drawGround();
  drawSigns();
  drawBones();
  drawObstacles();
  drawTiger();
  drawPlayer();
  drawParts();

  ctx.restore();

  // 피격 플래시 & 비네트
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,60,30,${Math.min(0.32, G.flash * 0.32)})`;
    ctx.fillRect(0, 0, W, H);
  }
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
  const bg = img.bg;
  if (!bg.width) { ctx.fillStyle = '#12331d'; ctx.fillRect(0, 0, W, H); return; }
  const bh = groundY + 30 * SC;
  const bw = bh * (bg.width / bg.height);
  tileLoop(bw, G.worldX * 42 * SC * 0.22, (bx, m) => drawMirrorTile(bg, bx, 0, bw, bh, m));
  // 지면 근처 어둡게
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
  // 구덩이를 피해 지면 타일 그리기
  const gw = 430 * SC;
  const gh = g.width ? gw * (g.height / g.width) : 150 * SC;
  const surfOff = gh * 0.10; // 잔디가 표면 위로 살짝
  // 1) 흙 기본 채우기 (타일 아래 어두워지는 그라데이션)
  const sg = ctx.createLinearGradient(0, groundY, 0, H);
  sg.addColorStop(0, soil);
  sg.addColorStop(1, '#1c120a');
  ctx.fillStyle = sg;
  ctx.fillRect(0, groundY, W, depth);
  // 2) 타일 텍스처 (교차 미러링으로 이음새 감춤)
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
  // 3) 구덩이
  for (const h of G.holes) {
    const grd = ctx.createLinearGradient(0, groundY - surfOff, 0, H);
    grd.addColorStop(0, '#160d06');
    grd.addColorStop(1, '#050302');
    ctx.fillStyle = grd;
    ctx.fillRect(h.x, groundY - surfOff - 2, h.w, H - groundY + surfOff + 2);
    // 가장자리 하이라이트
    ctx.fillStyle = 'rgba(255,220,160,0.18)';
    ctx.fillRect(h.x - 2, groundY - surfOff - 2, 4, 10 * SC);
    ctx.fillRect(h.x + h.w - 2, groundY - surfOff - 2, 4, 10 * SC);
  }
}

function drawSigns() {
  for (const s of G.signs) {
    const x = s.x, ph = 96 * SC, bw = 128 * SC, bh = 46 * SC;
    // 기둥
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(x - 5 * SC, groundY - ph, 10 * SC, ph);
    // 보드
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
    const im = img[o.kind];
    if (!im.width) continue;
    ctx.drawImage(im, o.x, groundY - o.dh + 4 * SC, o.dw, o.dh);
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
  // 그림자
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
  ctx.drawImage(im, -dw * 0.52, -dh * 0.94, dw, dh);
  ctx.restore();
  ctx.globalAlpha = 1;
}
function pickShiba() {
  const p = G.player;
  if (state === ST.CAUGHT) return img.shiba2;
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
  if (state === ST.CAUGHT && G.tiger.lunge) {
    gap = Math.max(-dw * 0.15, (1 - G.caughtT * 2.4) * W * 0.35);
  } else {
    gap = (G.tigerDist / 100) * W * 0.92 + dw * 0.15;
  }
  const tx = p.x - gap - dw * 0.5;
  if (tx + dw < -30) return;
  const bob = Math.sin(G.tiger.anim * 0.9) * 5 * SC;
  ctx.save();
  ctx.translate(tx + dw / 2, groundY + bob - 2 * SC);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6 * SC, dw * 0.4, 11 * SC, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(im, -dw / 2, -dh * 0.96, dw, dh);
  ctx.restore();
}

function drawParts() {
  for (const pa of G.parts) {
    const a = 1 - pa.t / pa.life;
    ctx.fillStyle = `rgba(${pa.c},${a * 0.7})`;
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, pa.r * (0.6 + a * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- 메인 루프 ----------
let lastT = 0, paused = false;
function loop(t) {
  requestAnimationFrame(loop);
  if (paused) { lastT = t; return; }
  let dt = (t - lastT) / 1000;
  if (!isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(0.034, dt);
  lastT = t;
  if (state === ST.RUN || state === ST.CAUGHT) update(dt);
  if (assetsReady && state !== ST.MENU && state !== ST.INTRO) draw();
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange', () => { paused = document.hidden; });

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
  v.play().catch(() => { /* 자동재생 실패 시에도 진행 가능 */ });
  ui.skipBtn.onclick = () => { v.removeEventListener('ended', done); v.pause(); startCountdown(); };
}

function startCountdown() {
  state = ST.COUNT;
  resetGame();
  showScreen(ui.countdown);
  ui.hud.classList.remove('hidden');
  let n = 3;
  ui.countNum.textContent = n;
  sfx.count();
  draw();
  const iv = setInterval(() => {
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

function loadBest() {
  try { return parseInt(localStorage.getItem('finfin_best') || '0', 10) || 0; } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('finfin_best', v); } catch (e) {}
}
function endGame() {
  state = ST.OVER;
  const score = Math.floor(G.score);
  const best = Math.max(score, loadBest());
  saveBest(best);
  ui.goScore.textContent = score;
  ui.goBones.textContent = G.bonesCnt;
  ui.goBest.textContent = best;
  ui.hud.classList.add('hidden');
  showScreen(ui.gameover);
}

// ---------- 버튼 ----------
ui.startBtn.addEventListener('click', () => { audioInit(); playIntro(); });
ui.retryBtn.addEventListener('click', () => { audioInit(); startCountdown(); });
ui.introBtn.addEventListener('click', () => { audioInit(); playIntro(); });

// ---------- 초기화 ----------
// 테스트 모드(?test): rAF 없이 동기적으로 게임을 진행시키는 훅 (검증용)
if (location.search.indexOf('test') >= 0) {
  window.__test = {
    go() { if (state === ST.COUNT || state === ST.MENU || state === ST.INTRO) { resetGame(); showScreen(null); ui.hud.classList.remove('hidden'); state = ST.RUN; } },
    sim(ms) { const n = Math.round(ms / 16); for (let i = 0; i < n; i++) update(0.016); draw(); },
    warp(m) { G.worldX = m; },
    caught: startCaught,
    state: () => state,
  };
}

loadAssets();
// 시작 화면 배경: 인트로 영상 무음 루프
const pv = ui.posterVideo;
pv.muted = true; pv.loop = true; pv.autoplay = true;
pv.play().catch(() => {});

})();
