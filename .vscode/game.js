// ============================================================
// METRO RECICLA — Corrida Infinita sob as Cerejeiras
// Cenário: Rua das Flores (Coreia) ao pôr do sol
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BASE_WIDTH = 500;
const BASE_HEIGHT = 900;
let W, H, LANE_WIDTH, LANE_COUNT = 3;

function resize() {
  const container = document.getElementById('game-container');
  W = container.clientWidth;
  H = container.clientHeight;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  LANE_WIDTH = W / LANE_COUNT;
}
window.addEventListener('resize', resize);

const State = { MENU: 0, PLAYING: 1, GAMEOVER: 2 };
let state = State.MENU;

let player, obstacles, collectibles, particles, groundOffset;
let score, recycled, speed, spawnTimer, collectibleTimer, distance;
let bestScore = parseInt(localStorage.getItem('metroReciclaBest') || '0');

// 🌸 Sistema de pétalas caindo (efeito atmosférico)
let petals = [];

// 🌸 Fator de "parallax" do cenário
let sceneryOffset = 0;

// ---------- Jogador ----------
function createPlayer() {
  return {
    lane: 1,
    x: LANE_WIDTH * 1.5,
    y: H * 0.75,
    w: 46,
    h: 64,
    targetX: LANE_WIDTH * 1.5,
    jumping: false,
    vy: 0,
    jumpHeight: 0,
    invulnerable: 0
  };
}

// ---------- Loop ----------
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.67, 2);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

// ---------- Update ----------
function update(dt) {
  // 🌸 Atualiza pétalas mesmo no menu (efeito contínuo)
  updatePetals(dt);

  if (state !== State.PLAYING) return;

  speed += 0.0006 * dt;
  distance += speed * dt;
  score = Math.floor(distance) + recycled * 10;

  const targetX = LANE_WIDTH * (player.lane + 0.5);
  player.targetX = targetX;
  player.x += (targetX - player.x) * 0.25 * dt;

  if (player.jumping) {
    player.vy += 0.9 * dt;
    player.jumpHeight += player.vy;
    if (player.jumpHeight >= 0) {
      player.jumpHeight = 0;
      player.jumping = false;
      player.vy = 0;
    }
  }

  if (player.invulnerable > 0) player.invulnerable -= dt;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 55 - Math.min(speed * 8, 30);
  }

  collectibleTimer -= dt;
  if (collectibleTimer <= 0) {
    spawnCollectible();
    collectibleTimer = 30 + Math.random() * 30;
  }

  obstacles.forEach(o => { o.y += (6 + speed * 3) * dt; });
  obstacles = obstacles.filter(o => o.y < H + 100);

  collectibles.forEach(c => {
    c.y += (6 + speed * 3) * dt;
    c.rotation += 0.05 * dt;
  });
  collectibles = collectibles.filter(c => c.y < H + 100);

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vy += 0.15 * dt;
  });
  particles = particles.filter(p => p.life > 0);

  checkCollisions();

  document.getElementById('score').textContent = score;
  document.getElementById('recycled').textContent = recycled;
  document.getElementById('speed').textContent = speed.toFixed(1);
}

// ---------- Pétalas 🌸 ----------
function updatePetals(dt) {
  // Cria novas pétalas continuamente
  if (petals.length < 25 && Math.random() < 0.15) {
    petals.push({
      x: Math.random() * W,
      y: -20,
      size: 5 + Math.random() * 5,
      vx: -0.5 - Math.random() * 1.5,
      vy: 0.8 + Math.random() * 1.2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      sway: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? '#ffb7d5' : '#ff8fb8'
    });
  }

  petals.forEach(p => {
    p.sway += 0.04 * dt;
    p.x += (p.vx + Math.sin(p.sway) * 0.8) * dt;
    p.y += p.vy * dt;
    p.rot += p.rotSpeed * dt;
  });

  petals = petals.filter(p => p.y < H + 30);
}

function drawPetals() {
  petals.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    // Forma de pétala (elipse estilizada)
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Detalhe mais escuro no meio
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(200, 50, 100, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.4, p.size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ---------- Render ----------
function render() {
  // 🌸 1) Céu de PÔR DO SOL (gradiente quente + estrelas surgindo)
  drawSunsetSky();

  // 🌸 2) Sol poente brilhando no horizonte
  drawSun();

  // 🌸 3) Silhuetas de montanhas/estação coreana distantes
  drawDistantScenery();

  // 🌸 4) Fileiras de cerejeiras em ambos os lados
  drawCherryTrees();

  // 🌸 5) Chão com trilhos do metrô
  drawTracks();

  // Coletáveis e obstáculos
  collectibles.forEach(drawCollectible);
  obstacles.forEach(drawObstacle);

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(p.life / 30, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  if (player) drawPlayer();

  // 🌸 6) Pétalas na frente de tudo (profundidade)
  drawPetals();

  // Vinheta de pôr do sol nas bordas
  drawVignette();
}

// 🌸 Céu de pôr do sol
function drawSunsetSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0.0, '#1a1a4e');   // azul-noite no topo
  sky.addColorStop(0.25, '#5a2a6e');  // roxo
  sky.addColorStop(0.45, '#c94a7a');  // rosa forte
  sky.addColorStop(0.65, '#ff8c5a');  // laranja
  sky.addColorStop(0.85, '#ffc470');  // amarelo-dourado
  sky.addColorStop(1.0, '#ffe4a0');   // dourado claro no horizonte
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.65);

  // Nuvens suaves iluminadas pelo sol
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 137 + sceneryOffset * 0.15) % (W + 200)) - 100;
    const cy = H * (0.15 + i * 0.07);
    const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
    cloudGrad.addColorStop(0, '#ffd9a0');
    cloudGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Estrelas fracas aparecendo no topo
  if (!drawSunsetSky.stars) {
    drawSunsetSky.stars = [];
    for (let i = 0; i < 30; i++) {
      drawSunsetSky.stars.push({
        x: Math.random() * BASE_WIDTH,
        y: Math.random() * BASE_HEIGHT * 0.25,
        r: Math.random() * 1.2 + 0.3
      });
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  drawSunsetSky.stars.forEach(s => {
    ctx.beginPath();
    ctx.arc((s.x / BASE_WIDTH) * W, (s.y / BASE_HEIGHT) * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 🌸 Sol poente
function drawSun() {
  const sunX = W * 0.5;
  const sunY = H * 0.55;
  const sunR = W * 0.18;

  // Halo externo
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
  halo.addColorStop(0, 'rgba(255, 220, 130, 0.9)');
  halo.addColorStop(0.4, 'rgba(255, 160, 80, 0.4)');
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Disco do sol
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  disc.addColorStop(0, '#fffbe0');
  disc.addColorStop(0.6, '#ffd060');
  disc.addColorStop(1, '#ff8040');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Reflexo do sol no "asfalto" (trilha luminosa)
  const refl = ctx.createLinearGradient(sunX, sunY, sunX, H);
  refl.addColorStop(0, 'rgba(255, 200, 100, 0.35)');
  refl.addColorStop(0.5, 'rgba(255, 150, 80, 0.15)');
  refl.addColorStop(1, 'transparent');
  ctx.fillStyle = refl;
  ctx.fillRect(sunX - W * 0.15, sunY, W * 0.3, H - sunY);
}

// 🌸 Silhuetas distantes (montanhas / estação / pagode coreano)
function drawDistantScenery() {
  const horizonY = H * 0.58;
  sceneryOffset += (state === State.PLAYING ? 0.3 : 0.1);

  // Montanhas em camadas
  ctx.fillStyle = 'rgba(60, 30, 70, 0.7)';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= W; x += 20) {
    const y = horizonY - 40 - Math.sin((x + sceneryOffset) * 0.008) * 25 - Math.cos((x * 0.02)) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, horizonY);
  ctx.closePath();
  ctx.fill();

  // Silhueta de pagode/estação coreana no horizonte
  const pagodaX = W * 0.78;
  const pagodaY = horizonY - 20;
  ctx.fillStyle = 'rgba(40, 20, 50, 0.9)';
  // Base
  ctx.fillRect(pagodaX - 25, pagodaY - 30, 50, 30);
  // Telhados curvos (estilo coreano)
  for (let i = 0; i < 3; i++) {
    const y = pagodaY - 30 - i * 18;
    const w = 40 - i * 8;
    ctx.beginPath();
    ctx.moveTo(pagodaX - w, y);
    ctx.quadraticCurveTo(pagodaX, y - 15, pagodaX + w, y);
    ctx.lineTo(pagodaX + w - 5, y);
    ctx.quadraticCurveTo(pagodaX, y - 8, pagodaX - w + 5, y);
    ctx.closePath();
    ctx.fill();
  }

  // 🌸 Fileira de cerejeiras silhuetadas ao fundo
  ctx.fillStyle = 'rgba(70, 25, 55, 0.8)';
  for (let i = 0; i < 12; i++) {
    const tx = ((i * 60 - sceneryOffset * 0.4) % (W + 120)) - 60;
    const ty = horizonY - 5;
    // Tronco
    ctx.fillRect(tx - 2, ty - 20, 4, 20);
    // Copa
    ctx.beginPath();
    ctx.arc(tx, ty - 28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx - 10, ty - 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx + 10, ty - 22, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 🌸 Cerejeiras próximas em ambos os lados (com flores rosa)
function drawCherryTrees() {
  const trees = [
    { side: 'left',  offset: 0 },
    { side: 'left',  offset: 0.35 },
    { side: 'right', offset: 0.15 },
    { side: 'right', offset: 0.55 }
  ];

  trees.forEach((t, idx) => {
    const t_scroll = (sceneryOffset * 0.8 + t.offset * H) % H;
    const treeY = H * 0.4 + t_scroll * 0.7;
    const treeX = t.side === 'left' ? -10 : W + 10;

    if (treeY > H * 1.1) return;

    const scale = 0.7 + (treeY / H) * 0.8;
    drawCherryTree(treeX, treeY, scale, t.side);
  });
}

function drawCherryTree(x, y, scale, side) {
  ctx.save();
  ctx.translate(x, y);
  if (side === 'right') ctx.scale(-1, 1);

  // Tronco marrom retorcido
  ctx.strokeStyle = '#3a1f1a';
  ctx.lineWidth = 10 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 60 * scale);
  ctx.quadraticCurveTo(10 * scale, 30 * scale, 20 * scale, 0);
  ctx.quadraticCurveTo(40 * scale, -30 * scale, 50 * scale, -50 * scale);
  ctx.stroke();

  // Galho secundário
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(20 * scale, 0);
  ctx.quadraticCurveTo(60 * scale, -10 * scale, 80 * scale, -30 * scale);
  ctx.stroke();

  // Copa de flores rosa (nuvens de pétalas)
  const blossoms = [
    { x: 50 * scale, y: -55 * scale, r: 40 * scale },
    { x: 85 * scale, y: -35 * scale, r: 32 * scale },
    { x: 30 * scale, y: -70 * scale, r: 30 * scale },
    { x: 70 * scale, y: -70 * scale, r: 28 * scale },
    { x: 100 * scale, y: -50 * scale, r: 22 * scale }
  ];

  blossoms.forEach(b => {
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, '#ffe0ec');
    grad.addColorStop(0.5, '#ff9fc0');
    grad.addColorStop(1, '#e06090');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// ---------- Chão / Trilhos ----------
function drawTracks() {
  const horizonY = H * 0.58;
  const bottomY = H;

  // Asfalto com tom quente (refletindo o pôr do sol)
  const roadGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  roadGrad.addColorStop(0, '#3a1e30');
  roadGrad.addColorStop(0.4, '#2a1525');
  roadGrad.addColorStop(1, '#1a0d18');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, horizonY, W, bottomY - horizonY);

  // Faixas divisórias
  for (let i = 1; i < LANE_COUNT; i++) {
    const xBottom = (i / LANE_COUNT) * W;
    const xTop = W * 0.5 + (xBottom - W * 0.5) * 0.3;
    ctx.strokeStyle = 'rgba(255, 180, 120, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 25]);
    ctx.lineDashOffset = -groundOffset;
    ctx.beginPath();
    ctx.moveTo(xTop, horizonY);
    ctx.lineTo(xBottom, bottomY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Trilhos metálicos
  for (let i = 0; i < LANE_COUNT; i++) {
    const laneCenterBottom = (i + 0.5) * (W / LANE_COUNT);
    const laneCenterTop = W * 0.5 + (laneCenterBottom - W * 0.5) * 0.3;

    for (const offset of [-0.18, 0.18]) {
      const xB = laneCenterBottom + offset * LANE_WIDTH;
      const xT = laneCenterTop + offset * (W / LANE_COUNT) * 0.3;
      const grad = ctx.createLinearGradient(xT, horizonY, xB, bottomY);
      grad.addColorStop(0, 'rgba(255, 180, 140, 0.4)');
      grad.addColorStop(1, 'rgba(220, 200, 210, 0.85)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(xT, horizonY);
      ctx.lineTo(xB, bottomY);
      ctx.stroke();
    }
  }

  // Dormentes
  groundOffset = (groundOffset + (state === State.PLAYING ? 6 + speed * 3 : 2)) % 80;
  ctx.strokeStyle = 'rgba(100, 60, 50, 0.7)';
  ctx.lineWidth = 6;
  for (let y = horizonY + groundOffset; y < bottomY; y += 80) {
    const progress = (y - horizonY) / (bottomY - horizonY);
    const scale = 0.3 + progress * 0.7;
    const x1 = W * 0.5 - (W * 0.5) * scale;
    const x2 = W * 0.5 + (W * 0.5) * scale;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
}

// ---------- Vinheta de pôr do sol ----------
function drawVignette() {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'transparent');
  v.addColorStop(1, 'rgba(40, 10, 30, 0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ---------- Jogador (Lixeiro) ----------
function drawPlayer() {
  const px = player.x;
  const py = player.y + player.jumpHeight;
  const bw = player.w;
  const bh = player.h;

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(px, player.y + bh / 2 + 5, bw * 0.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

  ctx.save();
  ctx.translate(px, py);

  ctx.fillStyle = '#1a3a6a';
  ctx.fillRect(-bw * 0.35, bh * 0.2, bw * 0.28, bh * 0.35);
  ctx.fillRect(bw * 0.07, bh * 0.2, bw * 0.28, bh * 0.35);

  ctx.fillStyle = '#111';
  ctx.fillRect(-bw * 0.38, bh * 0.52, bw * 0.34, bh * 0.12);
  ctx.fillRect(bw * 0.04, bh * 0.52, bw * 0.34, bh * 0.12);

  const torsoGrad = ctx.createLinearGradient(0, -bh * 0.1, 0, bh * 0.25);
  torsoGrad.addColorStop(0, '#2dd44a');
  torsoGrad.addColorStop(1, '#1a8a2e');
  ctx.fillStyle = torsoGrad;
  roundRect(ctx, -bw * 0.45, -bh * 0.15, bw * 0.9, bh * 0.4, 8);
  ctx.fill();

  ctx.fillStyle = '#ffdd00';
  ctx.fillRect(-bw * 0.45, bh * 0.02, bw * 0.9, 6);

  ctx.fillStyle = '#2dd44a';
  ctx.fillRect(-bw * 0.58, -bh * 0.1, bw * 0.14, bh * 0.3);
  ctx.fillRect(bw * 0.44, -bh * 0.1, bw * 0.14, bh * 0.3);

  ctx.fillStyle = '#e8b888';
  ctx.beginPath();
  ctx.arc(0, -bh * 0.32, bw * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a8a2e';
  ctx.beginPath();
  ctx.arc(0, -bh * 0.36, bw * 0.3, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f5a1e';
  ctx.fillRect(-bw * 0.32, -bh * 0.38, bw * 0.64, 6);

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-bw * 0.1, -bh * 0.31, 2.5, 0, Math.PI * 2);
  ctx.arc(bw * 0.1, -bh * 0.31, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------- Obstáculos ----------
const OBSTACLE_TYPES = [
  { type: 'barrier', color: '#ff4444' },
  { type: 'trash',   color: '#884422' },
  { type: 'cone',    color: '#ff8800' }
];

function spawnObstacle() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const t = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  obstacles.push({
    lane, x: LANE_WIDTH * (lane + 0.5), y: -100,
    w: 50, h: 55, type: t.type, color: t.color, rotation: 0
  });
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, o.h / 2 + 5, o.w * 0.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.type === 'trash') {
    ctx.fillStyle = '#4a3018';
    roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 10);
    ctx.fill();
    ctx.fillStyle = '#6a4028';
    roundRect(ctx, -o.w / 2 + 5, -o.h / 2 + 5, o.w - 10, o.h * 0.4, 6);
    ctx.fill();
    ctx.fillStyle = '#ffaa00';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♻️', 0, 5);
  } else if (o.type === 'barrier') {
    ctx.fillStyle = '#222';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 6;
    for (let i = -o.w / 2; i < o.w / 2; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, -o.h / 2);
      ctx.lineTo(i + 10, o.h / 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#333';
    ctx.fillRect(-o.w / 2 - 4, o.h / 2 - 5, o.w + 8, 10);
  } else if (o.type === 'cone') {
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.moveTo(0, -o.h / 2);
    ctx.lineTo(o.w / 2, o.h / 2);
    ctx.lineTo(-o.w / 2, o.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-o.w * 0.24, 2, o.w * 0.48, 7);
    ctx.fillStyle = '#333';
    ctx.fillRect(-o.w / 2 - 4, o.h / 2 - 5, o.w + 8, 10);
  }

  ctx.restore();
}

// ---------- Coletáveis ----------
const COLLECTIBLE_TYPES = [
  { type: 'plastic', color: '#52d6ff', icon: '♻' },
  { type: 'paper', color: '#f5e6a8', icon: '纸' },
  { type: 'glass', color: '#70e09a', icon: '瓶' },
  { type: 'metal', color: '#d8dde8', icon: '罐' }
];

function spawnCollectible() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const item = COLLECTIBLE_TYPES[Math.floor(Math.random() * COLLECTIBLE_TYPES.length)];
  collectibles.push({
    lane,
    x: LANE_WIDTH * (lane + 0.5),
    y: -40,
    radius: 18,
    type: item.type,
    color: item.color,
    icon: item.icon,
    rotation: 0
  });
}

function drawCollectible(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#173126';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon, 0, 1);
  ctx.restore();
}

// ---------- Colisões ----------
function checkCollisions() {
  collectibles = collectibles.filter(item => {
    const collected = item.lane === player.lane && Math.abs(item.y - player.y) < 48;
    if (collected) {
      recycled++;
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: item.x,
          y: item.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.8) * 4,
          life: 24,
          size: 2 + Math.random() * 3,
          color: item.color
        });
      }
    }
    return !collected;
  });

  const hit = obstacles.some(obstacle =>
    obstacle.lane === player.lane &&
    Math.abs(obstacle.y - player.y) < (obstacle.h + player.h) * 0.4 &&
    player.jumpHeight > -25
  );

  if (hit) endGame();
}

function endGame() {
  state = State.GAMEOVER;
  bestScore = Math.max(bestScore, score);
  localStorage.setItem('metroReciclaBest', String(bestScore));
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-recycled').textContent = recycled;
  document.getElementById('best-score').textContent = bestScore;
  document.getElementById('game-over').classList.remove('hidden');
}

// ---------- Utilitários e controles ----------
function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function startGame() {
  player = createPlayer();
  obstacles = [];
  collectibles = [];
  particles = [];
  groundOffset = 0;
  score = 0;
  recycled = 0;
  speed = 1;
  distance = 0;
  spawnTimer = 30;
  collectibleTimer = 20;
  state = State.PLAYING;
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-over').classList.add('hidden');
}

function changeLane(direction) {
  if (state === State.PLAYING) {
    player.lane = Math.max(0, Math.min(LANE_COUNT - 1, player.lane + direction));
  }
}

function jump() {
  if (state === State.PLAYING && !player.jumping) {
    player.jumping = true;
    player.vy = -12;
  }
}

window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') changeLane(-1);
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') changeLane(1);
  if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.key === ' ') jump();
});

let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', event => {
  touchStartX = event.changedTouches[0].clientX;
  touchStartY = event.changedTouches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', event => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) changeLane(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
}, { passive: true });

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

resize();
window.addEventListener('resize', () => {
  if (player) {
    player.y = H * 0.75;
    player.x = LANE_WIDTH * (player.lane + 0.5);
  }
});
requestAnimationFrame(gameLoop);