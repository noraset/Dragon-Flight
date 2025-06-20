window.addEventListener("load", () => {
  const raw = localStorage.getItem("byteSnakeHighScores");
  const scores = raw ? JSON.parse(raw) : [];
  // ซ่อน score และ level ตอนเริ่มเกม
  const scoreDisplay = document.getElementById("scoreDisplay");
  const levelDisplay = document.getElementById("levelDisplay");
  gameOverText.style.display = "none";
  // ตั้งค่าให้อยู่ด้านหลังสุด
  scoreDisplay.style.position = "relative";
  scoreDisplay.style.zIndex = "-1";
  levelDisplay.style.position = "relative";
  levelDisplay.style.zIndex = "-1";
  renderHighScoreList(scores);
});

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const playerNameInput = document.getElementById("playerNameInput");
const startBtn = document.getElementById("startBtn");
const highScoreTable = document.getElementById("highScoreTable");
const gameOverText = document.getElementById("gameOver");
const gameTitle = document.getElementById("gameTitle");
const homeBtn = document.getElementById("homeBtn");
// กำหนดขนาด canvas แบบคงที่
canvas.width = 400;
canvas.height = 600;

const grid = 20;
const tileSize = 20;
const tileCountX = canvas.width / tileSize;  // = 20
const tileCountY = canvas.height / tileSize; // = 30
let snake, apple, dx, dy, score, highScore, gameInterval, isPaused;
let level, speed;
let playerName = "";
const bgImage = new Image();
const imgHead = new Image();
const imgBody = new Image();
const imgTail = new Image();
const imgApple = new Image();

imgApple.src = 'img/byte-snake/apple.png';
imgHead.src = 'img/byte-snake/head.png';
imgBody.src = 'img/byte-snake/body.png';
imgTail.src = 'img/byte-snake/tail.png';
bgImage.src = "img/byte-snake/background.png";

bgImage.onload = () => {
  drawGame();
};

// เพิ่มตัวแปรสำหรับเก็บ mode
let gameMode = 'classic'; // 'classic' หรือ 'wrapped'

function initGame() {
  homeBtn.style.display = "inline-block";
  gameTitle.style.display = "none";
  highScoreTable.style.display = "none";
  gameOverText.style.display = "none";
  // เริ่มงูที่ตำแหน่งกลางจอ
  const startX = Math.floor(tileCountX / 2);
  const startY = Math.floor(tileCountY / 2);
  snake = [{ x: startX, y: startY }];
  // วางแอปเปิ้ลในตำแหน่งที่ห่างจากงู
  do {
    apple = {
      x: Math.floor(Math.random() * (tileCountX - 2)) + 1,
      y: Math.floor(Math.random() * (tileCountY - 2)) + 1
    };
  } while (snake[0].x === apple.x && snake[0].y === apple.y);
  
  dx = 1;
  dy = 0;
  score = 0;
  level = 1;
  speed = 100;
  isPaused = false;
  highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;
  restartBtn.style.display = "none";
  pauseBtn.style.display = "inline-block";
  pauseBtn.textContent = "PAUSE";
  clearInterval(gameInterval);
  gameInterval = setInterval(drawGame, speed);
}

function drawGame() {
  if (isPaused) return;
  moveSnake();
  if (checkCollision()) return gameOver();
  highScoreTable.style.display = "none";
  gameOverText.style.display = "none";
  // อัปเดตคะแนนใน HTML (อยู่ด้านหลังสุด)
  const scoreDisplay = document.getElementById("scoreDisplay");
  const levelDisplay = document.getElementById("levelDisplay");
  
  if (score > 0) {
    scoreDisplay.textContent = "Score: " + score;
    levelDisplay.textContent = "Level: " + level;
  }

  // วาดพื้นหลังให้เต็ม canvas
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

  // วาดแอปเปิ้ล
  if (!snake) return;
  ctx.drawImage(imgApple, apple.x * grid, apple.y * grid, grid, grid);

  // วาดงู (อยู่ด้านหน้าสุด)
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  
  // วาดงู
  for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      let img = imgBody;
      let angle = 0;

      if (i === 0) { // หัว
          img = imgHead;
          if (dx === 1) angle = 0;
          else if (dx === -1) angle = Math.PI;
          else if (dy === 1) angle = Math.PI / 2;
          else if (dy === -1) angle = -Math.PI / 2;
      } else if (i === snake.length - 1) {
          img = imgTail;
          const tail = snake[i];
          const prev = snake[i - 1];
          const diffX = tail.x - prev.x;
          const diffY = tail.y - prev.y;
          if (diffX === 1) angle = 0;
          else if (diffX === -1) angle = Math.PI;
          else if (diffY === 1) angle = Math.PI / 2;
          else if (diffY === -1) angle = -Math.PI / 2;
      }

      drawRotatedImage(img, s.x * grid, s.y * grid, angle);
  }

  // ชื่อผู้เล่น
  if (playerName) {
      ctx.fillStyle = "white";
      ctx.font = "12px 'Press Start 2P', 'VT323', monospace";
      ctx.fillText(playerName, snake[0].x * grid, snake[0].y * grid - 5);
  }
}

function drawRotatedImage(img, x, y, angleRad) {
  ctx.save();
  ctx.translate(x + grid / 2, y + grid / 2); // ย้าย origin ไปกลาง tile
  ctx.rotate(angleRad);
  ctx.drawImage(img, -grid / 2, -grid / 2, grid, grid);
  ctx.restore();
}

function moveSnake() {
  directionChanged = false;
  if (!snake) return;
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  
  // ถ้าเป็น wrapped mode ให้เดินทะลุกำแพงได้
  if (gameMode === 'wrapped') {
    if (head.x < 0) head.x = tileCountX - 1;
    if (head.x >= tileCountX) head.x = 0;
    if (head.y < 0) head.y = tileCountY - 1;
    if (head.y >= tileCountY) head.y = 0;
  }
  
  snake.unshift(head);

  if (head.x === apple.x && head.y === apple.y) {
      score++;
      if (score > highScore) {
          highScore = score;
          localStorage.setItem("snakeHighScore", highScore);
      }
      if (score % 5 === 0) {
          level++;
          speed = Math.max(20, speed - 10);
          clearInterval(gameInterval);
          gameInterval = setInterval(drawGame, speed);
      }
      placeApple();
  } else {
      snake.pop();
  }
}

function placeApple() {
  let valid = false;
  while (!valid) {
    apple.x = Math.floor(Math.random() * (tileCountX - 2)) + 1;
    apple.y = Math.floor(Math.random() * (tileCountY - 2)) + 1;
    valid = true;
    // ตรวจสอบว่าแอปเปิ้ลไม่ซ้อนทับกับงู
    for (let segment of snake) {
      if (segment.x === apple.x && segment.y === apple.y) {
        valid = false;
        break;
      }
    }
  }
}

function checkCollision() {
  if (!snake) return;

  const head = snake[0];
  
  // ตรวจสอบการชนกับขอบใน classic mode (ตายก่อนชนกำแพง 1 ช่อง)
  if (gameMode === 'classic') {
    if (head.x <= 0 || head.x >= tileCountX - 1 || head.y <= 0 || head.y >= tileCountY - 1) {
      return true;
    }
  }
  
  // ตรวจสอบการชนกับตัวงูเอง
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  return false;
}

function gameOver() {
  clearInterval(gameInterval);
  gameOverText.style.display = "block";
  

  restartBtn.style.display = "inline-block";
  pauseBtn.style.display = "none";
  updateHighScoreTable(playerName, score);
}

function updateHighScoreTable(name, score) {
  const raw = localStorage.getItem("byteSnakeHighScores");
  const highScores = raw ? JSON.parse(raw) : [];

  // แปลงวันที่เป็นรูปแบบ dd/mm/yyyy
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const now = `${day}/${month}/${year}`;

  highScores.push({ name, score, time: now });
  highScores.sort((a, b) => b.score - a.score);
  const topScores = highScores.slice(0, 3);

  localStorage.setItem("byteSnakeHighScores", JSON.stringify(topScores));
  renderHighScoreList(topScores);
}

function renderHighScoreList(list) {
  const tbody = document.querySelector("#highScoreTable tbody");
  tbody.innerHTML = "";

  const medals = ["🥇", "🥈", "🥉"];
  list.forEach(({ name, score, time }, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
  <td>${medals[i] || i + 1}</td>
  <td>${name}</td>
  <td>${score}</td>
  <td>${time}</td>
`;
    tbody.appendChild(tr);
  });
  highScoreTable.style.display = "block";
  gameTitle.style.display = "block";
}

let directionChanged = false;

document.addEventListener("keydown", (e) => {
  if (["w", "s", "a", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "Space" && restartBtn.style.display === "none") {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? "PLAY" : "PAUSE";
    return;
  }

  if (e.code === "Space" && restartBtn.style.display === "inline-block") {
    initGame();
    return;
  }

  if (directionChanged) return;

  if ((e.key === "ArrowLeft" || e.key === "a") && dx === 0) { dx = -1; dy = 0; directionChanged = true; }
  if ((e.key === "ArrowRight" || e.key === "d") && dx === 0) { dx = 1; dy = 0; directionChanged = true; }
  if ((e.key === "ArrowUp" || e.key === "w") && dy === 0) { dx = 0; dy = -1; directionChanged = true; }
  if ((e.key === "ArrowDown" || e.key === "s") && dy === 0) { dx = 0; dy = 1; directionChanged = true; }
});

restartBtn.addEventListener("click", initGame);

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "PLAY" : "PAUSE";
});

startBtn.addEventListener("click", () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) {
      alert("Please enter your name!");
      return;
  }
  playerNameInput.style.display = "none";
  startBtn.style.display = "none";
  gameTitle.style.display = "none";
  highScoreTable.style.display = "none";
  // แสดง score และ level เมื่อเริ่มเกม
  const scoreDisplay = document.getElementById("scoreDisplay");
  const levelDisplay = document.getElementById("levelDisplay");
  scoreDisplay.style.display = "block";
  levelDisplay.style.display = "block";
  // ตั้งค่าให้อยู่ด้านหลังสุด
  scoreDisplay.style.position = "relative";
  scoreDisplay.style.zIndex = "-1";
  levelDisplay.style.position = "relative";
  levelDisplay.style.zIndex = "-1";
  initGame();
});

// เพิ่มฟังก์ชันสำหรับเปลี่ยน mode
function changeGameMode(mode) {
  gameMode = mode;
  // อัพเดทข้อความบนปุ่ม
  document.getElementById('modeBtn').textContent = 
    gameMode === 'classic' ? 'Switch to Wrapped Mode' : 'Switch to Classic Mode';
  // รีสตาร์ทเกม
  initGame();
}

// เพิ่ม event listener สำหรับปุ่มเปลี่ยน mode
document.getElementById('modeBtn').addEventListener('click', () => {
  changeGameMode(gameMode === 'classic' ? 'wrapped' : 'classic');
});

homeBtn.addEventListener("click", () => {
  window.location.reload();
});

document.querySelectorAll('.minigame-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const game = this.getAttribute('data-game');
    if (game === 'dragon-runner') {
      window.location.href = 'dragon-runner.html';
    } else if (game === 'dragon-puzzle') {
      window.location.href = 'dragon-puzzle.html';
    }
    // เพิ่มกรณีสำหรับมินิเกมอื่นๆ
  });
});