(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const finalScoreEl = document.getElementById('final-score');
    const newRecordEl = document.getElementById('new-record');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const confettiContainer = document.getElementById('confetti');

    const GRID_SIZE = 20;
    const TICK_MS = 130;
    const HIGH_SCORE_KEY = 'snake_high_score';
    const FRUITS = ['🍎', '🍌', '🍓', '🍉', '🍇', '🍒', '🍊', '🥝', '🍑', '🍍'];

    let cellSize = 16;
    let cols = GRID_SIZE;
    let rows = GRID_SIZE;
    let snake = [];
    let direction = { x: 1, y: 0 };
    let pendingDirection = { x: 1, y: 0 };
    let food = { x: 0, y: 0, emoji: '🍎' };
    let score = 0;
    let highScore = +localStorage.getItem(HIGH_SCORE_KEY) || 0;
    let running = false;
    let lastTick = 0;
    let rafId = null;
    let flashUntil = 0;

    highScoreEl.textContent = highScore;

    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const maxW = wrapper.clientWidth;
        const maxH = wrapper.clientHeight;
        const size = Math.floor(Math.min(maxW, maxH));
        cellSize = Math.floor(size / GRID_SIZE);
        const dim = cellSize * GRID_SIZE;
        canvas.width = dim;
        canvas.height = dim;
        canvas.style.width = dim + 'px';
        canvas.style.height = dim + 'px';
        cols = GRID_SIZE;
        rows = GRID_SIZE;
        draw();
    }

    function resetGame() {
        const mid = Math.floor(GRID_SIZE / 2);
        snake = [
            { x: mid - 1, y: mid },
            { x: mid, y: mid },
            { x: mid + 1, y: mid }
        ];
        direction = { x: 1, y: 0 };
        pendingDirection = { x: 1, y: 0 };
        score = 0;
        flashUntil = 0;
        scoreEl.textContent = score;
        spawnFood();
    }

    function spawnFood() {
        while (true) {
            const x = Math.floor(Math.random() * cols);
            const y = Math.floor(Math.random() * rows);
            if (!snake.some(s => s.x === x && s.y === y)) {
                const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
                food = { x, y, emoji };
                return;
            }
        }
    }

    function step() {
        direction = pendingDirection;
        const head = snake[snake.length - 1];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };

        if (
            newHead.x < 0 || newHead.x >= cols ||
            newHead.y < 0 || newHead.y >= rows ||
            snake.some(s => s.x === newHead.x && s.y === newHead.y)
        ) {
            gameOver();
            return;
        }

        snake.push(newHead);

        if (newHead.x === food.x && newHead.y === food.y) {
            score++;
            scoreEl.textContent = score;
            playEat();
            flashUntil = performance.now() + 200;
            spawnFood();
        } else {
            snake.shift();
        }
    }

    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 255, 65, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 1; i < cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }

        const fx = food.x * cellSize + cellSize / 2;
        const fy = food.y * cellSize + cellSize / 2;
        ctx.font = `${Math.floor(cellSize * 0.95)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(food.emoji, fx, fy);

        const flashing = performance.now() < flashUntil;
        snake.forEach((seg, i) => {
            const isHead = i === snake.length - 1;
            if (flashing) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 16;
                ctx.shadowColor = '#ffffff';
            } else {
                ctx.fillStyle = isHead ? '#00ff41' : '#00cc33';
                ctx.shadowBlur = isHead ? 10 : 0;
                ctx.shadowColor = '#00ff41';
            }
            const pad = 1;
            ctx.fillRect(
                seg.x * cellSize + pad,
                seg.y * cellSize + pad,
                cellSize - pad * 2,
                cellSize - pad * 2
            );
            ctx.shadowBlur = 0;
        });
    }

    function loop(ts) {
        if (!running) return;
        if (ts - lastTick >= TICK_MS) {
            lastTick = ts;
            step();
            if (!running) return;
        }
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function startGame() {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        newRecordEl.classList.add('hidden');
        clearConfetti();
        resetGame();
        draw();
        running = true;
        lastTick = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function gameOver() {
        running = false;
        cancelAnimationFrame(rafId);
        finalScoreEl.textContent = score;
        const isNewRecord = score > highScore;
        if (isNewRecord) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
            highScoreEl.textContent = highScore;
            newRecordEl.classList.remove('hidden');
            playVictory();
            launchConfetti();
        } else {
            playGameOver();
        }
        gameOverScreen.classList.remove('hidden');
    }

    function setDirection(dx, dy) {
        if (dx === -direction.x && dy === -direction.y) return;
        if (dx === direction.x && dy === direction.y) return;
        pendingDirection = { x: dx, y: dy };
    }

    let touchStart = null;
    const SWIPE_MIN = 24;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (!touchStart || !running) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            setDirection(dx > 0 ? 1 : -1, 0);
        } else {
            setDirection(0, dy > 0 ? 1 : -1);
        }
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        touchStart = null;
    });

    document.addEventListener('keydown', e => {
        if (!running) return;
        switch (e.key) {
            case 'ArrowUp': case 'w': setDirection(0, -1); break;
            case 'ArrowDown': case 's': setDirection(0, 1); break;
            case 'ArrowLeft': case 'a': setDirection(-1, 0); break;
            case 'ArrowRight': case 'd': setDirection(1, 0); break;
        }
    });

    let audioCtx = null;
    function getAudio() {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        return audioCtx;
    }

    function beep(freq, duration, type = 'square', volume = 0.15, delay = 0) {
        const ac = getAudio();
        if (!ac) return;
        const start = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(ac.destination);
        osc.start(start);
        osc.stop(start + duration);
    }

    function playEat() {
        beep(880, 0.08, 'square', 0.18);
        beep(1320, 0.08, 'square', 0.15, 0.06);
    }

    function playGameOver() {
        beep(220, 0.18, 'sawtooth', 0.2);
        beep(140, 0.25, 'sawtooth', 0.18, 0.15);
        beep(80, 0.35, 'sawtooth', 0.15, 0.35);
    }

    function playVictory() {
        const notes = [523, 659, 784, 1046, 1318];
        notes.forEach((f, i) => beep(f, 0.18, 'square', 0.18, i * 0.1));
        beep(1568, 0.4, 'square', 0.2, notes.length * 0.1);
    }

    function launchConfetti() {
        const colors = ['#ff3b3b', '#ffeb3b', '#3bff7d', '#3bb6ff', '#ff3bd0', '#ff9b3b'];
        const count = 80;
        for (let i = 0; i < count; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
            piece.style.animationDelay = Math.random() * 0.5 + 's';
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            confettiContainer.appendChild(piece);
        }
        setTimeout(clearConfetti, 4000);
    }

    function clearConfetti() {
        if (confettiContainer) confettiContainer.innerHTML = '';
    }

    startBtn.addEventListener('click', () => {
        getAudio();
        startGame();
    });
    restartBtn.addEventListener('click', () => {
        getAudio();
        startGame();
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    resizeCanvas();
    resetGame();
    draw();
})();
