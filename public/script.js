// public/script.js (Modified for Staggered Tariff Update)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

const player1ScoreDisplay = document.getElementById('player1-score').querySelector('.tariff-value');
const player2ScoreDisplay = document.getElementById('player2-score').querySelector('.tariff-value');
const player1Area = document.getElementById('player1-area');
const player2Area = document.getElementById('player2-area');
const player1Img = document.getElementById('player1-img');
const player2Img = document.getElementById('player2-img');
const player1Particles = document.getElementById('player1-particles');
const player2Particles = document.getElementById('player2-particles');
const instructionsDiv = document.getElementById('instructions');

// --- Game Settings ---
const PADDLE_HEIGHT = 110;
const PADDLE_WIDTH = 14;
const BALL_RADIUS = 9;
const INITIAL_BALL_SPEED_X = 5.5;
const INITIAL_BALL_SPEED_Y = 5.5;
const MAX_BALL_SPEED_X = 22;
const SPEED_INCREASE_FACTOR = 1.025;

// --- AI Difficulty Settings ---
const DEFAULT_RIGHT_BOT_SPEED_FACTOR = 0.065;
const DEFAULT_LEFT_BOT_SPEED_FACTOR = 0.070;
const BOTMATCH_RIGHT_BOT_SPEED_FACTOR = 0.5;
const BOTMATCH_LEFT_BOT_SPEED_FACTOR = 0.5;

// --- Active AI Speed Factors ---
let activeRightBotSpeedFactor = DEFAULT_RIGHT_BOT_SPEED_FACTOR;
let activeLeftBotSpeedFactor = DEFAULT_LEFT_BOT_SPEED_FACTOR;

let canvasWidth, canvasHeight;

// --- Game Mode ---
let gameMode = 'player';

// --- Game Objects ---
let playerPaddle = {
    x: 15, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, color: 'rgba(102, 179, 255, 0.8)', score: 0
};
let botPaddle = {
    x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, color: 'rgba(255, 102, 102, 0.8)', score: 0
};
let ball = {
    x: 0, y: 0, radius: BALL_RADIUS, speedX: INITIAL_BALL_SPEED_X, speedY: INITIAL_BALL_SPEED_Y, color: '#ffffff', trail: []
};
const MAX_TRAIL_LENGTH = 10;

// --- Game State ---
let rallyHits = 0;
// --- NEW: Separate variables for displayed tariffs ---
let displayedTariffP1 = 0;
let displayedTariffP2 = 0;
// --- End New Variables ---
let gamePaused = false;
let animationFrameId = null;

// --- Helper Functions --- (Unchanged)
function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

// --- Drawing Functions --- (Unchanged)
function drawRect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function drawCircle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2, false); ctx.fill(); }
function drawBall() { /* ... (keep implementation) ... */
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > MAX_TRAIL_LENGTH) ball.trail.shift();
    for (let i = 0; i < ball.trail.length; i++) {
        const point = ball.trail[i];
        const alpha = (i / MAX_TRAIL_LENGTH) * 0.5;
        const radius = ball.radius * (i / MAX_TRAIL_LENGTH);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)'; ctx.shadowBlur = 10;
    drawCircle(ball.x, ball.y, ball.radius, ball.color);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// --- Update Functions ---
function moveBall() {
    if (gamePaused) return;
    ball.x += ball.speedX; ball.y += ball.speedY;
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.speedY = -ball.speedY; ball.y = clamp(ball.y, ball.radius, canvas.height - ball.radius);
    }
    let paddle = (ball.x < canvas.width / 2) ? playerPaddle : botPaddle;
    if (detectCollision(ball, paddle)) {
        let collidePoint = clamp((ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2), -1, 1);
        let angleRad = collidePoint * (Math.PI / 3.5);
        let direction = (ball.x < canvas.width / 2) ? 1 : -1;
        let currentSpeed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
        let newSpeed = Math.min(currentSpeed * SPEED_INCREASE_FACTOR, MAX_BALL_SPEED_X);
        if (direction > 0) ball.x = paddle.x + paddle.width + ball.radius + 1;
        else ball.x = paddle.x - ball.radius - 1;
        ball.speedX = direction * newSpeed * Math.cos(angleRad);
        ball.speedY = newSpeed * Math.sin(angleRad);

        // --- MODIFIED TARIFF LOGIC ---
        rallyHits++; // Increment rally count
        let newTariffValue = Math.floor(Math.pow(rallyHits, 1.3) * 5); // Calculate new tariff potential

        // Update the DISPLAYED tariff for the player WHO JUST HIT the ball
        if (paddle === playerPaddle) { // Player 1 hit
            displayedTariffP1 = newTariffValue;
        } else { // Player 2 (Bot) hit
            displayedTariffP2 = newTariffValue;
        }
        updateTariffsDisplay(); // Update display and visual effects based on displayed values
        // --- END MODIFIED TARIFF LOGIC ---

        createHitSparks(paddle === playerPaddle ? 'p1' : 'p2', ball.x, ball.y);
    } else {
        if (ball.x + ball.radius < 0) { botPaddle.score++; scoreReset(1); }
        else if (ball.x - ball.radius > canvas.width) { playerPaddle.score++; scoreReset(-1); }
    }
}
function detectCollision(b, p) { /* ... (keep implementation) ... */
    let pTop = p.y, pBottom = p.y + p.height, pLeft = p.x, pRight = p.x + p.width;
    let bTop = b.y - b.radius, bBottom = b.y + b.radius, bLeft = b.x - b.radius, bRight = b.x + b.radius;
    return pLeft < bRight && pRight > bLeft && pTop < bBottom && pBottom > bTop;
}
function moveBotPaddle() { /* ... (keep implementation using activeRightBotSpeedFactor) ... */
    if (gamePaused) return;
    let targetY = ball.y - botPaddle.height / 2;
    if (Math.abs(botPaddle.y + botPaddle.height / 2 - ball.y) > botPaddle.height * 0.2) {
         botPaddle.y = lerp(botPaddle.y, targetY, activeRightBotSpeedFactor);
    } else {
         botPaddle.y = lerp(botPaddle.y, targetY, activeRightBotSpeedFactor / 2);
    }
    botPaddle.y = clamp(botPaddle.y, 0, canvas.height - botPaddle.height);
}

// --- MODIFIED: Reset displayed tariffs on score ---
function scoreReset(direction) {
    rallyHits = 0; // Reset actual rally count
    // Reset DISPLAYED tariffs
    displayedTariffP1 = 0;
    displayedTariffP2 = 0;

    gamePaused = true; ball.trail = [];
    updateTariffsDisplay(); // Update display to 0% and reset effects

    setTimeout(() => {
        // updateVisualEffects(); // Not needed here, updateTariffsDisplay calls it
        ball.x = canvas.width / 2; ball.y = canvas.height / 2;
        ball.speedX = INITIAL_BALL_SPEED_X * direction;
        ball.speedY = INITIAL_BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.6 + 0.7);
        gamePaused = false;
    }, 800);
}

// --- REMOVED old updateTariffs function ---

// --- NEW FUNCTION: Updates display and triggers visual effects ---
function updateTariffsDisplay() {
    player1ScoreDisplay.textContent = `${displayedTariffP1}%`;
    player2ScoreDisplay.textContent = `${displayedTariffP2}%`;
    // Visual effects now depend on the *displayed* tariffs
    updateVisualEffects();
}
// --- End New Function ---


function movePlayerPaddleAI() { /* ... (keep implementation using activeLeftBotSpeedFactor) ... */
     if (gamePaused) return;
    let targetY = ball.y - playerPaddle.height / 2;
    if (Math.abs(playerPaddle.y + playerPaddle.height / 2 - ball.y) > playerPaddle.height * 0.2) {
         playerPaddle.y = lerp(playerPaddle.y, targetY, activeLeftBotSpeedFactor);
    } else {
         playerPaddle.y = lerp(playerPaddle.y, targetY, activeLeftBotSpeedFactor / 2);
    }
    playerPaddle.y = clamp(playerPaddle.y, 0, canvas.height - playerPaddle.height);
}

// --- MODIFIED: Visual Effects based on displayed tariffs ---
function updateVisualEffects() {
    const maxTariffEffect = 300;
    // Use displayed values for effects
    const p1Intensity = clamp(displayedTariffP1 / maxTariffEffect, 0, 1);
    const p2Intensity = clamp(displayedTariffP2 / maxTariffEffect, 0, 1);

    // Update canvas background (can still use displayed values)
    const p1ColorStart = `rgb(${lerp(0, 0, p1Intensity)}, ${lerp(31, 180, p1Intensity)}, ${lerp(63, 255, p1Intensity)})`;
    const p2ColorEnd = `rgb(${lerp(61, 255, p2Intensity)}, ${lerp(0, 180, p2Intensity)}, ${lerp(0, 0, p2Intensity)})`;
    canvas.style.background = `linear-gradient(to right, ${p1ColorStart} 49.7%, rgba(170,170,170,0.6) 49.7%, rgba(170,170,170,0.6) 50.3%, ${p2ColorEnd} 50.3%)`;

    // Player Area Effects use displayed values
    const lowThreshold = 30, mediumThreshold = 90, highThreshold = 180;
    const transformThreshold = 250, eyesThreshold = 220;
    setPowerLevelClass(player1Area, displayedTariffP1, lowThreshold, mediumThreshold, highThreshold);
    setPowerLevelClass(player2Area, displayedTariffP2, lowThreshold, mediumThreshold, highThreshold);
    player1Area.classList.toggle('transformed', displayedTariffP1 >= transformThreshold);
    player2Area.classList.toggle('transformed', displayedTariffP2 >= transformThreshold);
    player1Area.classList.toggle('glowing-eyes', displayedTariffP1 >= eyesThreshold);
    player2Area.classList.toggle('glowing-eyes', displayedTariffP2 >= eyesThreshold);
    player1Area.style.setProperty('--scale', displayedTariffP1 >= transformThreshold ? '1.08' : (displayedTariffP1 >= highThreshold ? '1.05' : '1'));
    player2Area.style.setProperty('--scale', displayedTariffP2 >= transformThreshold ? '1.08' : (displayedTariffP2 >= highThreshold ? '1.05' : '1'));

    // Particle Emission uses displayed values
    if (!gamePaused) {
        if (displayedTariffP1 > 20) createAmbientParticles('p1', Math.ceil(displayedTariffP1 / 60));
        if (displayedTariffP2 > 20) createAmbientParticles('p2', Math.ceil(displayedTariffP2 / 60));
    }
}
function setPowerLevelClass(element, tariff, low, med, high) { /* ... (keep implementation) ... */
    element.classList.remove('powered-low', 'powered-medium', 'powered-high');
    if (tariff >= high) element.classList.add('powered-high');
    else if (tariff >= med) element.classList.add('powered-medium');
    else if (tariff >= low) element.classList.add('powered-low');
}
function createHitSparks(playerType, x, y) { /* ... (keep implementation) ... */
    const particleContainer = (playerType === 'p1') ? player1Particles : player2Particles;
    const count = 8 + Math.floor(rallyHits / 2); // Sparks can still use rallyHits for intensity
    const containerRect = particleContainer.parentElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const relativeX = clamp(((x - canvasRect.left) / canvasRect.width) * 100, 0, 100);
    const relativeY = clamp(((y - canvasRect.top) / canvasRect.height) * 100, 0, 100);
    let spawnXPercent = 0;
    if (playerType === 'p1') spawnXPercent = lerp(80, 100, (relativeX / 50));
    else spawnXPercent = lerp(0, 20, (relativeX - 50) / 50);
    const spawnYPercent = relativeY;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle', 'hit-spark', playerType);
        const size = Math.random() * 5 + 2;
        particle.style.width = `${size}px`; particle.style.height = `${size * 0.3}px`;
        particle.style.left = `${spawnXPercent}%`; particle.style.top = `${spawnYPercent}%`;
        const angle = Math.random() * Math.PI * 2;
        const endDist = Math.random() * 40 + 20;
        const tx = Math.cos(angle) * 5, ty = Math.sin(angle) * 5;
        const txEnd = Math.cos(angle) * endDist, tyEnd = Math.sin(angle) * endDist;
        particle.style.setProperty('--tx', `${tx}px`); particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--tx-end', `${txEnd}px`); particle.style.setProperty('--ty-end', `${tyEnd}px`);
        particleContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 300);
    }
}
function createAmbientParticles(playerType, count = 1) { /* ... (keep implementation, uses displayed tariffs via updateVisualEffects) ... */
     const container = (playerType === 'p1') ? player1Particles : player2Particles;
    // Use displayed tariff for intensity/duration calculation
    const tariff = (playerType === 'p1') ? displayedTariffP1 : displayedTariffP2;
    const maxTariffEffect = 300;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle', playerType);
        const size = lerp(3, 8, Math.random());
        particle.style.width = `${size}px`; particle.style.height = `${size}px`;
        const duration = lerp(4.5, 2.0, clamp(tariff / maxTariffEffect, 0, 1));
        const intensity = clamp(tariff / maxTariffEffect, 0, 1);
        const riseBias = intensity * 0.8;
        let startX = `${Math.random() * 100}%`;
        let startY, startTransform, endTransform;
        if (Math.random() > (0.7 - riseBias)) { // Rising
            startY = `${100 + Math.random() * 10}%`;
            startTransform = `translateY(0) translateX(${(Math.random() - 0.5) * 20}px)`;
            endTransform = `translateY(-${container.offsetHeight * 1.3}px) translateX(${(Math.random() - 0.5) * 60}px)`;
        } else { // Falling
            startY = `${-10 - Math.random() * 10}%`;
            startTransform = `translateY(0) translateX(${(Math.random() - 0.5) * 20}px)`;
            endTransform = `translateY(${container.offsetHeight * 1.3}px) translateX(${(Math.random() - 0.5) * 60}px)`;
        }
        particle.style.left = startX; particle.style.top = startY;
        particle.style.setProperty('--transform-start', startTransform);
        particle.style.setProperty('--transform-end', endTransform);
        particle.style.animationDuration = `${duration}s`;
        container.appendChild(particle);
        setTimeout(() => particle.remove(), duration * 1000);
    }
}

// --- Game Loop --- (Unchanged)
function gameLoop(timestamp) {
    if (!gamePaused) {
        moveBall();
        moveBotPaddle();
        if (gameMode === 'bot') { movePlayerPaddleAI(); }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height, playerPaddle.color);
    drawRect(botPaddle.x, botPaddle.y, botPaddle.width, botPaddle.height, botPaddle.color);
    drawBall();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Event Listeners --- (Unchanged)
function handleMouseMove(event) {
    if (gamePaused || gameMode !== 'player') return;
    let rect = canvas.getBoundingClientRect();
    let mouseY = event.clientY - rect.top;
    playerPaddle.y = clamp(mouseY - playerPaddle.height / 2, 0, canvas.height - playerPaddle.height);
}

// --- Initialization ---
// --- MODIFIED: Call updateTariffsDisplay on reset/resize ---
function resizeCanvas() {
    const containerRect = gameContainer.getBoundingClientRect();
    canvasWidth = containerRect.width; canvasHeight = containerRect.height;
    canvas.width = canvasWidth; canvas.height = canvasHeight;
    playerPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    botPaddle.x = canvas.width - PADDLE_WIDTH - 15;
    botPaddle.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    if (!ball.x || ball.x > canvas.width || ball.y > canvas.height) {
        ball.x = canvas.width / 2; ball.y = canvas.height / 2; ball.trail = [];
        ball.speedX = INITIAL_BALL_SPEED_X * (Math.random() < 0.5 ? 1 : -1);
        ball.speedY = INITIAL_BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.6 + 0.7);
        rallyHits = 0;
        displayedTariffP1 = 0; // Reset displayed tariffs
        displayedTariffP2 = 0;
        updateTariffsDisplay(); // Update display/effects
    } else {
         updateTariffsDisplay(); // Update display/effects based on current state
    }
}

// --- MODIFIED: Call updateTariffsDisplay on reset ---
async function initializeGame() {
    console.log("Initializing game...");
    document.removeEventListener('mousemove', handleMouseMove);

    try {
        const response = await fetch('/api/getmode');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        gameMode = data.mode || 'player';
        console.log(`Game mode set to: ${gameMode}`);

        if (gameMode === 'bot') {
            instructionsDiv.textContent = 'Bot vs. Bot Match (Stronger AI)';
            activeLeftBotSpeedFactor = BOTMATCH_LEFT_BOT_SPEED_FACTOR;
            activeRightBotSpeedFactor = BOTMATCH_RIGHT_BOT_SPEED_FACTOR;
            console.log(`Using Botmatch AI Speeds: Left=${activeLeftBotSpeedFactor}, Right=${activeRightBotSpeedFactor}`);
        } else {
            instructionsDiv.textContent = 'Move mouse to control left paddle';
            activeLeftBotSpeedFactor = DEFAULT_LEFT_BOT_SPEED_FACTOR;
            activeRightBotSpeedFactor = DEFAULT_RIGHT_BOT_SPEED_FACTOR;
            document.addEventListener('mousemove', handleMouseMove);
            console.log(`Using Player vs Bot AI Speed: Right=${activeRightBotSpeedFactor}`);
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Initial sizing and positioning (also resets tariffs display)
        // scoreReset(1); // Don't need scoreReset here, resizeCanvas handles initial state

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
        console.log("Game loop started.");

    } catch (error) {
        console.error("Failed to fetch game mode, defaulting to player vs bot:", error);
        gameMode = 'player';
        activeLeftBotSpeedFactor = DEFAULT_LEFT_BOT_SPEED_FACTOR;
        activeRightBotSpeedFactor = DEFAULT_RIGHT_BOT_SPEED_FACTOR;
        instructionsDiv.textContent = 'Move mouse to control left paddle (Mode fetch failed)';
        document.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Also resets tariffs display here
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
         console.log(`Game loop started with default mode. AI Speed: Right=${activeRightBotSpeedFactor}`);
    }
}

// --- Start Game ---
initializeGame();