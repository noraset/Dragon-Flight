const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Load multiple car images
const carSrcs = ['img/car-dodger/car1.png', 'img/car-dodger/car2.png', 'img/car-dodger/car3.png', 'img/car-dodger/car4.png'];
const carImgs = carSrcs.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

// Utility to pick a random car image
function getRandomCarImg() {
  return carImgs[Math.floor(Math.random() * carImgs.length)];
}

// ถนน
const road = {
  width: W * 0.6,
  x: (W - W * 0.6) / 2,
  y: 0,
  height: H,
  lineWidth: 4,
  lineGap: 30,
  lineLength: 20,
  offset: 0
};

// รถผู้เล่น
const player = {
  width: 40,
  height: 60,
  x: W/2 - 20,
  y: H - 80,
  speed: 5,
  img: getRandomCarImg()
};

// รถคู่แข่ง
let enemies = [];
const spawnRate = 100; // frames
let frameCount = 0;

// คะแนน
let score = 0;

// คีย์
const keys = { left:false, right:false, up:false, down:false };
document.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft')  keys.left  = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'ArrowUp')    keys.up    = true;
  if (e.code === 'ArrowDown')  keys.down  = true;
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft')  keys.left  = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'ArrowUp')    keys.up    = false;
  if (e.code === 'ArrowDown')  keys.down  = false;
});

// โหลดภาพต้นไม้และบ้าน
const treeImg = new Image();
treeImg.src = 'img/tree.png';
const homeImg = new Image();
homeImg.src = 'img/home.png';

// roadside objects (tree/home)
const roadsideObjects = [];
const roadsideSpacing = 180;
const roadsideSpeed = 2.5; // ปรับความเร็วให้ใกล้เคียง enemies
const roadsideTypes = [
  {img: treeImg, w: 48, h: 64, type: 'tree'},
  {img: homeImg, w: 64, h: 64, type: 'home'}
];

// สร้างรถคู่แข่ง
function spawnEnemy() {
  const ex = road.x + Math.random()*(road.width - player.width);
  enemies.push({
    x: ex,
    y: -player.height,
    width: player.width,
    height: player.height,
    speed: 2 + Math.random() * 2,
    img: getRandomCarImg(),
    angle: 0,
    angularSpeed: 0.1
  });
}

// สร้างต้นไม้และบ้านข้างถนน
function spawnRoadsideObject(side) {
  // สุ่มชนิด (บ้านน้อยกว่าต้นไม้)
  const isHome = Math.random() < 0.25;
  const t = isHome ? roadsideTypes[1] : roadsideTypes[0];
  roadsideObjects.push({
    y: -t.h,
    side,
    ...t
  });
}

// วาดถนน + เส้นเลน
function drawRoad() {
  // พื้นถนน
  ctx.fillStyle = '#333';
  ctx.fillRect(road.x, road.y, road.width, road.height);
  // เส้นประกลางถนน (ขยับลง)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = road.lineWidth;
  let y = -road.offset;
  while (y < H) {
    ctx.beginPath();
    ctx.moveTo(W/2, y);
    ctx.lineTo(W/2, y + road.lineLength);
    ctx.stroke();
    y += road.lineLength + road.lineGap;
  }
  // เส้นขอบถนน
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(road.x, road.y, road.width, road.height);
}

// วาดรถผู้เล่น
function drawPlayer() {
  if (player.img.complete) {
    ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}

// วาดรถคู่แข่ง
function drawEnemies() {
  enemies.forEach(e => {
    const w = e.width;
    const h = e.height;
    const cx = e.x + w / 2;
    const cy = e.y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (e.img.complete) {
      ctx.drawImage(e.img, -w/2, -h/2, w, h);
    } else {
      ctx.fillStyle = '#f00';
      ctx.fillRect(-w/2, -h/2, w, h);
    }
    ctx.restore();
  });
}

// วาดต้นไม้และบ้านข้างถนน
function drawRoadsideObjects() {
  roadsideObjects.forEach(obj => {
    const x = obj.side === 'left' ? (road.x - obj.w - 10) : (road.x + road.width + 10);
    if (obj.img.complete) ctx.drawImage(obj.img, x, obj.y, obj.w, obj.h);
  });
}

// ฟังก์ชันแสดง Game Over overlay
function showGameOverOverlay(score) {
  const overlay = document.getElementById('gameOverOverlay');
  const scoreBox = document.getElementById('finalScore');
  scoreBox.textContent = `Score: ${score}`;
  overlay.style.display = 'flex';
  isGameOver = true;
  // โฟกัสปุ่ม restart
  setTimeout(() => {
    const btn = document.getElementById('restartBtn');
    if (btn) btn.focus();
  }, 100);
}

// อัปเดตตำแหน่งทั้งหมด
function update() {
  if (isGameOver) return;
  frameCount++;
  // spawn enemy
  if (frameCount % spawnRate === 0) spawnEnemy();

  // spawn roadside objects (ซ้าย/ขวา)
  if (roadsideObjects.length === 0 || roadsideObjects[roadsideObjects.length-1].y > roadsideSpacing) {
    spawnRoadsideObject('left');
    spawnRoadsideObject('right');
  }
  // ขยับ roadside objects
  roadsideObjects.forEach(obj => obj.y += roadsideSpeed);
  // ลบที่หลุดจอ
  while (roadsideObjects.length && roadsideObjects[0].y > H + 50) roadsideObjects.shift();

  // เคลื่อนถนน (offset เส้นเลน) ด้วยความเร็วคงที่
  road.offset = (road.offset + 2) % (road.lineLength + road.lineGap);

  // เคลื่อน player
  if (keys.left)  player.x -= player.speed;
  if (keys.right) player.x += player.speed;
  if (keys.up)    player.y -= player.speed;
  if (keys.down)  player.y += player.speed;
  player.x = Math.max(road.x, Math.min(road.x + road.width - player.width, player.x));
  // จำกัด player.y ไม่ให้ออกนอกถนน (บน/ล่าง)
  const minY = 0;
  const maxY = H - player.height;
  player.y = Math.max(minY, Math.min(maxY, player.y));

  // เคลื่อน enemies
  enemies.forEach(e => { e.y += e.speed; e.angle += e.angularSpeed; });

  // ตรวจชน
  for (let e of enemies) {
    if (
      player.x < e.x + e.width &&
      player.x + player.width > e.x &&
      player.y < e.y + e.height &&
      player.y + player.height > e.y
    ) {
      showGameOverOverlay(score);
      return;
    }
  }

  // กรอง enemies ออกจากจอ + เพิ่มคะแนน
  enemies = enemies.filter(e => {
    if (e.y > H) {
      score++;
      document.getElementById('score').innerText = `Score: ${score}`;
      return false;
    }
    return true;
  });
}

// รีเซ็ตเกม
function reset() {
  player.img = getRandomCarImg();
  enemies = [];
  score = 0;
  frameCount = 0;
  player.x = W/2 - player.width/2;
  document.getElementById('score').innerText = `Score: 0`;
  // ซ่อน overlay
  const overlay = document.getElementById('gameOverOverlay');
  if (overlay) overlay.style.display = 'none';
  isGameOver = false;
}

// ลูปหลัก
function loop() {
  if (!isGameOver) {
    update();
    ctx.clearRect(0,0,W,H);
    drawRoadsideObjects(); // วาดต้นไม้และบ้านข้างถนน
    drawRoad();
    drawPlayer();
    drawEnemies();
    requestAnimationFrame(loop);
  }
}

// เริ่มเกม
reset();
loop();

// เชื่อมปุ่ม restart
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('restartBtn');
  if (btn) btn.onclick = () => {
    location.reload();
  };
});