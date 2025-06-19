const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// "Design" resolution
const DESIGN_WIDTH = 720;
const DESIGN_HEIGHT = 1024;

// Grid settings
const cols = 3;
const rows = 6;
const ROAD_BOTTOM_RATIO = 1.2; // กว้างเกินขอบ
const ROAD_TOP_RATIO = 1;

// Speed settings (kid-friendly)
const baseSpeed = 0.001;
const maxSpeed = 0.5;
const speedIncrement = 0.000005;

// Spawn settings
const spawnInterval = 100;
const maxObstacles = 4;

// Player settings
const playerZ = 0.05; // ระดับ depth ของ player (moved up)
const playerYOffset = -100; // ขยับแกน Y (ค่าลบ = ขึ้น, บวก = ลง)
let playerLane = 1; // เริ่มตรงกลาง (0–2)
let playerRow = 0; // เริ่มแถวล่างสุด (0–5)

// Threshold for auto-delete
const deleteThresholdZ = -0.2; // ให้ fire เลย grid ไปก่อนแล้วค่อยหาย

// State
let objects = []; // array of { lane, z }
let score = 0;
let objectSpeed = baseSpeed;
let spawnTimer = 0;
let gameOver = false;

// Player health
let playerHealth = 3;
const maxPlayerHealth = 3;
// Boss health
let bossHealth = 20;
const maxBossHealth = 20;
// Player fireballs
let fireballs = []; // {x, y, z}

// Load player image
const playerImg = new Image();
playerImg.src = "img/player.png";

// Load boss image
const bossImg = new Image();
bossImg.src = "img/boss.png";

const fireImg = new Image();
fireImg.src = "img/fire.png";

const heartImg = new Image();
heartImg.src = "img/heart.png";

// Add at the top, after state
const maxDistance = 2000; // ระยะทางสูงสุดที่ต้องบินถึง (ปรับได้)

// Game state
let isRunning = false;
let animationId = null;

// Load fireball image
const fireballImg = new Image();
fireballImg.src = "img/fireball.png";

let fireballCooldown = 400; // หน่วง 400ms ต่อการยิง 1 ครั้ง
let lastFireballTime = 0;

function setOverlayMsg(msg) {
  const overlay = document.getElementById('overlayMsg');
  if (msg) {
    overlay.textContent = msg;
    overlay.style.display = '';
  } else {
    overlay.textContent = '';
    overlay.style.display = 'none';
  }
}

function setGameButtons(visible) {
  const btns = document.getElementById('gameButtons');
  if (btns) btns.style.display = visible ? '' : 'none';
}

function resetGame() {
  objects = [];
  score = 0;
  objectSpeed = baseSpeed;
  spawnTimer = 0;
  gameOver = false;
  playerHealth = maxPlayerHealth;
  bossHealth = maxBossHealth;
  fireballs = [];
  playerRow = 0;
  setOverlayMsg('');
  setGameButtons(true);
}

function startGame() {
  resetGame();
  isRunning = true;
  setOverlayMsg('');
  setGameButtons(false);
  gameLoop();
}

// Button event listeners
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').onclick = startGame;
  setOverlayMsg('');
  setGameButtons(true);
});

// Resize canvas
function resizeCanvasToDisplaySize() {
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = Math.round((w * DESIGN_HEIGHT) / DESIGN_WIDTH);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

// Compute road parameters
function getRoadParams() {
  const W = canvas.width,
    H = canvas.height;
  const vp = { x: W / 2, y: H * 0.3 }; // vanishing point ลงมาครึ่งจอ
  const roadBottomW = W * ROAD_BOTTOM_RATIO;
  const roadTopW = W * ROAD_TOP_RATIO;
  const lb = vp.x - roadBottomW / 2;
  const rb = vp.x + roadBottomW / 2;
  const lt = vp.x - roadTopW / 2;
  const rt = vp.x + roadTopW / 2;
  return { W, H, vp, lb, rb, lt, rt };
}

// lane,z → X
function getLaneCenter(lane, z, p) {
  const left = p.lb + z * (p.lt - p.lb);
  const right = p.rb + z * (p.rt - p.rb);
  const laneW = (right - left) / cols;
  return left + lane * laneW + laneW / 2;
}

// z → Y
function getYFromZ(z, p) {
  return p.H - z * (p.H - p.vp.y);
}

// z → size
function getSizeFromZ(z) {
  return 60 * (1 - z) + 10;
}

// Draw boss and fire
function drawBossAndFire(p) {
  // Boss position: vanishing point, oscillate left-right within road, and float up-down
  const bossW = 180;
  const bossH = 180;
  const t = performance.now() / 1200; // speed of movement
  // Calculate road bounds at bottom
  const minX = p.lb + bossW / 2;
  const maxX = p.rb - bossW / 2;
  // Oscillate between minX and maxX
  const oscNorm = (Math.sin(t) + 1) / 2; // 0..1
  const bossCenterX = minX + (maxX - minX) * oscNorm;
  // Up-down floating
  const t2 = performance.now() / 700;
  const bossFloat = Math.sin(t2) * 18; // amplitude in px
  const bx = bossCenterX - bossW / 2;
  const by = p.vp.y - bossH * 0.8 + bossFloat;
  if (bossImg.complete) {
    ctx.drawImage(bossImg, bx, by, bossW, bossH);
  }
  // Fire effect (simple cone)
  ctx.save();
  ctx.globalAlpha = 0.7;
  const fireBaseY = p.vp.y + bossH * 0.1 + bossFloat;
  ctx.beginPath();
  ctx.moveTo(bossCenterX, fireBaseY);
  ctx.lineTo(bossCenterX - 60, fireBaseY + 220);
  ctx.lineTo(bossCenterX + 60, fireBaseY + 220);
  ctx.closePath();
  ctx.restore();
  // Boss health bar
  ctx.save();
  const barW = 180, barH = 18;
  const bxBar = bx - barW / 50;
  const byBar = by - 32;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(bxBar, byBar, barW, barH);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(bxBar, byBar, barW * (bossHealth / maxBossHealth), barH);
  ctx.restore();
}

// Draw grid
function drawGrid(p) {
  // Fill road area with brown
  ctx.fillStyle = "#ff8B4513"; // brown
  ctx.beginPath();
  ctx.moveTo(p.lb, p.H);
  ctx.lineTo(p.rb, p.H);
  ctx.lineTo(p.rt, p.vp.y);
  ctx.lineTo(p.lt, p.vp.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  // vertical lines
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const xB = p.lb + t * (p.rb - p.lb);
    const xT = p.lt + t * (p.rt - p.lt);
    ctx.beginPath();
    ctx.moveTo(xB, p.H);
    ctx.lineTo(xT, p.vp.y);
    ctx.stroke();
  }
  // horizontal lines
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    const xL = p.lb + t * (p.lt - p.lb);
    const xR = p.rb + t * (p.rt - p.rb);
    const y = getYFromZ(t, p);
    ctx.beginPath();
    ctx.moveTo(xL, y);
    ctx.lineTo(xR, y);
    ctx.stroke();
  }
}

// Draw obstacles
function drawObjects(p) {
  objects.forEach((o, i) => {
    const x = getLaneCenter(o.lane, o.z, p);
    const y = getYFromZ(o.z, p) + playerYOffset;
    const s = getSizeFromZ(o.z);
    if (fireImg.complete) {
      ctx.save();
      // Fast flip: alternate every 100ms
      const flip = Math.floor(performance.now() / 100 + i) % 2 === 1;
      if (flip) {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(fireImg, -s / 2, -s / 2, s, s);
      } else {
        ctx.drawImage(fireImg, x - s / 2, y - s / 2, s, s);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  });
  // Draw fireballs
  fireballs.forEach(f => {
    const x = getLaneCenter(f.lane, f.z, p);
    const y = getYFromZ(f.z, p) + playerYOffset;
    const s = getSizeFromZ(f.z) * 0.6;
    if (fireballImg.complete) {
      ctx.drawImage(fireballImg, x - s / 2, y - s / 2, s, s);
    } else {
      ctx.fillStyle = "#ff0";
      ctx.beginPath();
      ctx.arc(x, y, s / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// Spawn one obstacle
function spawnObstacle() {
  // Calculate boss X and Y position at this moment
  const p = getRoadParams();
  const bossW = 180;
  const bossH = 180;
  const t = performance.now() / 1200;
  const minX = p.lb + bossW / 2;
  const maxX = p.rb - bossW / 2;
  const oscNorm = (Math.sin(t) + 1) / 2;
  const bossX = minX + (maxX - minX) * oscNorm;
  const t2 = performance.now() / 700;
  const bossFloat = Math.sin(t2) * 18;
  const bossY = p.vp.y - bossH * 0.8 + bossH / 2 + bossFloat; // center of boss vertically
  // Find the lane whose center is closest to bossX
  let minDist = Infinity;
  let chosenLane = 1;
  for (let lane = 0; lane < cols; lane++) {
    const laneCenter = getLaneCenter(lane, 0.8, p); // spawn at z=0.8 (lower)
    const dist = Math.abs(laneCenter - bossX);
    if (dist < minDist) {
      minDist = dist;
      chosenLane = lane;
    }
  }
  // Only spawn if that lane is safe
  const unsafe = objects.filter((o) => o.z > 0.8).map((o) => o.lane);
  if (!unsafe.includes(chosenLane)) {
    objects.push({ lane: chosenLane, z: 0.8 });
  }
}

// Update logic & spawn & auto-delete
function updateObjects() {
  if (!isRunning || gameOver) return;
  score++;
  objectSpeed = Math.min(baseSpeed + score * speedIncrement, maxSpeed);

  // spawn
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    if (objects.length < maxObstacles) spawnObstacle();
  }

  // move & filter
  objects.forEach((o) => (o.z -= objectSpeed));
  objects = objects.filter((o) => o.z > deleteThresholdZ);

  // move fireballs (should move up: z += ...)
  fireballs.forEach(f => f.z += 0.005); // slow speed for fireballs
  fireballs = fireballs.filter(f => f.z < 1.2);

  // collision detection (player vs obstacle)
  const COLLISION_THRESHOLD = 0.04;
  for (const o of objects) {
    if (o.lane === playerLane && Math.abs(o.z - playerZ) < COLLISION_THRESHOLD) {
      objects = objects.filter(obj => obj !== o); // remove hit obstacle
      playerHealth--;
      if (playerHealth <= 0) {
        gameOver = true;
        isRunning = false;
        setOverlayMsg('Game Over');
        setGameButtons(true);
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
    }
  }

  // fireball vs boss
  const p = getRoadParams();
  const bossW = 180, bossH = 180;
  const t = performance.now() / 1200;
  const minX = p.lb + bossW / 2;
  const maxX = p.rb - bossW / 2;
  const oscNorm = (Math.sin(t) + 1) / 2;
  const bossCenterX = minX + (maxX - minX) * oscNorm;
  const t2 = performance.now() / 700;
  const bossFloat = Math.sin(t2) * 18;
  const bossY = p.vp.y - bossH * 0.8 + bossH / 2 + bossFloat;
  fireballs = fireballs.filter(f => {
    const fx = getLaneCenter(f.lane, f.z, p);
    const fy = getYFromZ(f.z, p) + playerYOffset;
    const fs = getSizeFromZ(f.z);
    // Check overlap with boss
    if (
      fx > bossCenterX - bossW / 2 && fx < bossCenterX + bossW / 2 &&
      fy > bossY - bossH / 2 && fy < bossY + bossH / 2
    ) {
      bossHealth--;
      if (bossHealth <= 0) {
        gameOver = true;
        isRunning = false;
        setOverlayMsg('You Win!');
        setGameButtons(true);
        if (animationId) cancelAnimationFrame(animationId);
      }
      return false; // remove fireball
    }
    return true;
  });

  // fireball vs fire obstacle
  const FIREBALL_COLLISION_THRESHOLD = 0.04;
  let fireballsToRemove = new Set();
  let objectsToRemove = new Set();

  fireballs.forEach((f, fi) => {
    objects.forEach((o, oi) => {
      // ถ้า obstacle มี row ให้เช็ค row ด้วย ถ้าไม่มีถือว่าอยู่ row 0
      const oRow = typeof o.row === 'number' ? o.row : 0;
      const fRow = typeof f.row === 'number' ? f.row : 0;
      if (
        f.lane === o.lane &&
        fRow === oRow &&
        Math.abs(f.z - o.z) < FIREBALL_COLLISION_THRESHOLD
      ) {
        fireballsToRemove.add(fi);
        objectsToRemove.add(oi);
      }
    });
  });

  // ลบ fireballs และ objects ที่ชนกัน
  fireballs = fireballs.filter((_, i) => !fireballsToRemove.has(i));
  objects = objects.filter((_, i) => !objectsToRemove.has(i));
}

// Draw player
function drawPlayer(p) {
  const x = getLaneCenter(playerLane, playerZ, p);
  // Flying effect: sine wave offset
  const t = performance.now() / 400; // speed of flying
  const flyOffset = Math.sin(t) * 12; // amplitude in px
  // คำนวณ y ตาม row
  const rowNorm = playerRow / (rows - 1); // 0 (ล่าง) ... 1 (บน)
  const y = getYFromZ(rowNorm, p) + playerYOffset + flyOffset;
  const s = getSizeFromZ(playerZ);
  if (playerImg.complete) {
    ctx.drawImage(playerImg, x - s / 2, y - s / 2, s, s);
  } else {
    ctx.fillStyle = "green";
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  // Draw player health (hearts)
  for (let i = 0; i < maxPlayerHealth; i++) {
    ctx.save();
    if (i >= playerHealth) {
      ctx.globalAlpha = 0.2;
    }
    ctx.beginPath();
    const hx = 40 + i * 38;
    const hy = 80;
    ctx.arc(hx, hy, 16, 0, Math.PI, false);
    ctx.bezierCurveTo(hx - 16, hy, hx - 16, hy + 24, hx, hy + 32);
    ctx.bezierCurveTo(hx + 16, hy + 24, hx + 16, hy, hx, hy);
    if (heartImg.complete) {
      ctx.drawImage(heartImg, hx - 16, hy - 16, 32, 32);
    } 
    ctx.restore();
  }
}

// Main draw + loop
function draw() {
  resizeCanvasToDisplaySize();
  const p = getRoadParams();
  ctx.clearRect(0, 0, p.W, p.H);

  drawBossAndFire(p); // draw boss and fire behind grid
  drawGrid(p);
  drawObjects(p);
  drawPlayer(p);
}

function gameLoop() {
  if (!isRunning || gameOver) return;
  updateObjects();
  draw();
  animationId = requestAnimationFrame(gameLoop);
}

// Controls
document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" && playerLane > 0) playerLane--;
  if (e.code === "ArrowRight" && playerLane < cols - 1) playerLane++;
  if (e.code === "ArrowDown" && playerRow > 0) playerRow--;
  if (e.code === "ArrowUp" && playerRow < rows - 1) playerRow++;
  if (e.code === "Space" && isRunning && !gameOver) {
    const now = Date.now();
    if (now - lastFireballTime >= fireballCooldown) {
      fireballs.push({ lane: playerLane, row: playerRow, z: playerZ });
      lastFireballTime = now;
    }
  }
});

// Remove auto-start
document.addEventListener('DOMContentLoaded', () => {
  setOverlayMsg('');
});
