const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// รถของผู้เล่น
let carImg = new Image();
const car = {
    width: 40,
    height: 60,
    x: WIDTH / 2 - 20,
    y: HEIGHT - 80,
    speed: 5,
    img: carImg
};

// เตรียมภาพรถ obstacle
const obstacleCarImgs = [
    "img/car-dodger/car1.png",
    "img/car-dodger/car2.png",
    "img/car-dodger/car3.png",
    "img/car-dodger/car4.png"
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

// ข้อมูล obstacle
let obstacles = [];
const spawnRate = 90;  // ทุกกี่เฟรม spawn ครั้งหนึ่ง
let frameCount = 0;

// คะแนน
let score = 0;

// ควบคุมด้วย Arrow Left / Right
const keys = { left: false, right: false };
document.addEventListener("keydown", e => {
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowRight") keys.right = true;
});
document.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowRight") keys.right = false;
});

// สุ่มสร้าง obstacle
function spawnObstacle() {
    const x = Math.random() * (WIDTH - 40);
    const carImgIdx = Math.floor(Math.random() * obstacleCarImgs.length);
    obstacles.push({
        x,
        y: -60,
        width: 40,
        height: 60,
        speed: 2 + Math.random() * 2,
        img: obstacleCarImgs[carImgIdx],
        angle: 0 // เริ่มต้นสุ่มมุม
    });
}

// อัปเดตสถานะทั้งหมด
function update() {
    frameCount++;
    if (frameCount % spawnRate === 0) {
        spawnObstacle();
    }

    // เคลื่อนรถ
    if (keys.left) car.x -= car.speed;
    if (keys.right) car.x += car.speed;
    car.x = Math.max(0, Math.min(WIDTH - car.width, car.x));

    // เคลื่อน obstacle และหมุน
    obstacles.forEach(o => {
        o.y += o.speed;
        o.angle += 0.05; // หมุนต่อเนื่อง
        if (o.angle > Math.PI * 2) o.angle -= Math.PI * 2;
    });

    // ตรวจชน
    obstacles.forEach(o => {
        if (
            o.y + o.height > car.y &&
            o.x < car.x + car.width &&
            o.x + o.width > car.x
        ) {
            // Game Over
            alert(`Game Over!\nคะแนน: ${score}`);
            resetGame();
        }
    });

    // ทำความสะอาด obstacle ออกจากจอ และเพิ่มคะแนน
    obstacles = obstacles.filter(o => {
        if (o.y > HEIGHT) {
            score++;
            document.getElementById("score").innerText = `Score: ${score}`;
            return false;
        }
        return true;
    });
}

// รีเซ็ตเกม
function resetGame() {
    obstacles = [];
    score = 0;
    frameCount = 0;
    car.x = WIDTH / 2 - car.width / 2;
    document.getElementById("score").innerText = `Score: 0`;
}

// วาดทุกอย่างบน canvas
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    drawGrid();

    // วาดถนน (พื้นหลัง)
    ctx.fillStyle = "#555";
    ctx.fillRect(50, 0, WIDTH - 100, HEIGHT);

    // ขีดแบ่งเลน
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // วาดรถผู้เล่น
    if (car.img && car.img.complete) {
        const coloredCarCanvas = changeImageHue(carImg, selectedHue, car.width, car.height);
        ctx.drawImage(coloredCarCanvas, car.x, car.y, car.width, car.height);
    } else {
        ctx.fillStyle = "#0f0";
        ctx.fillRect(car.x, car.y, car.width, car.height);
    }
    // วาด obstacle เป็นรถ
    obstacles.forEach(o => {
        if (o.img && o.img.complete) {
            ctx.save();
            ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
            ctx.rotate(Math.PI); // กลับหัว
            ctx.drawImage(o.img, -o.width / 2, -o.height / 2, o.width, o.height);
            ctx.restore();
        } else {
            ctx.fillStyle = "#f00";
            ctx.fillRect(o.x, o.y, o.width, o.height);
        }
    });
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    // แนวตั้ง
    for (let x = 0; x <= WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }
    // แนวนอน
    for (let y = 0; y <= HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
    ctx.restore();
}

// ลูปหลัก
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// --- Car image select overlay ---
const carSelectOverlay = document.getElementById("carSelectOverlay");
let selectedCarImgSrc = null;
let selectedHue = null;
let pendingCarImgSrc = null;
let pendingHue = null;
const startGameBtn = document.getElementById('startGameBtn');

function updateStartBtnState() {
    startGameBtn.disabled = !(selectedCarImgSrc && selectedHue !== null);
}

function setSelectedButton(groupSelector, selectedBtn) {
    document.querySelectorAll(groupSelector).forEach(btn => btn.classList.remove('selected'));
    if (selectedBtn) selectedBtn.classList.add('selected');
}



document.querySelectorAll('.car-option').forEach(btn => {
    btn.addEventListener('click', function () {
        selectedCarImgSrc = this.getAttribute('data-img');
        carImg = new Image();
        carImg.src = selectedCarImgSrc;
        setSelectedButton('.car-option', this);
        // ถ้ามีการเลือกสีไว้แล้ว ให้ setSelectedButton กับปุ่มสีนั้นด้วย
        if (selectedHue !== null) {
            const selectedColorBtn = document.querySelector('.color-option[data-color="' + Object.keys(colorHueMap).find(key => colorHueMap[key] === selectedHue) + '"]');
            if (selectedColorBtn) setSelectedButton('.color-option', selectedColorBtn);
        }
        updateCarImage();
        updateStartBtnState();
    });
});

document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', function () {
        const color = this.getAttribute('data-color');
        selectedHue = colorHueMap[color] || 0;
        setSelectedButton('.color-option', this);
        // ถ้ามีการเลือกรถไว้แล้ว ให้ setSelectedButton กับปุ่มรถนั้นด้วย
        if (selectedCarImgSrc) {
            const selectedCarBtn = document.querySelector('.car-option[data-img="' + selectedCarImgSrc + '"]');
            if (selectedCarBtn) setSelectedButton('.car-option', selectedCarBtn);
        }
        updateCarImage();
        updateStartBtnState();
    });
});

startGameBtn.addEventListener('click', function () {
    if (selectedCarImgSrc && selectedHue !== null) {
        carSelectOverlay.style.display = 'none';
        resetGame();
        loop();
    }
});

// --- ปรับการเริ่มเกม ---
function startGame() {
    carSelectOverlay.style.display = "flex";
    selectedCarImgSrc = null;
    selectedHue = null;
    car.img = null;
    setSelectedButton('.car-option', null);
    setSelectedButton('.color-option', null);
    updateStartBtnState();
}

// ไม่ต้องเรียก loop() ทันที ให้รอเลือกก่อน
startGame();

function changeImageHue(img, hueDeg, width, height) {
    // สร้าง offscreen canvas
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(img, 0, 0, width, height);

    // ดึง pixel data
    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // ปรับ hue
    for (let i = 0; i < data.length; i += 4) {
        // RGB → HSL
        let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        // เปลี่ยน hue
        h = (h * 360 + hueDeg) % 360;
        if (h < 0) h += 360;
        h /= 360;

        // HSL → RGB
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        data[i] = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
        data[i + 1] = Math.round(hue2rgb(p, q, h) * 255);
        data[i + 2] = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
        // data[i+3] = data[i+3]; // alpha
    }
    offCtx.putImageData(imageData, 0, 0);
    return off;
}

// Map สีไปเป็นองศา hue
const colorHueMap = {
    red: 0,
    green: 120,
    blue: 240,
    purple: 280
};

function updateCarImage() {
    // ถ้าเลือกรถแล้วและเลือกสีแล้ว ให้ apply hue
    pendingCarImgSrc = selectedCarImgSrc;
    pendingHue = selectedHue;
    car.img = carImg;
    carImg.onload = function () {
        car.img = carImg;
    }
}