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

    const GRID_SIZE = 20;
    const TICK_MS = 130;
    const HIGH_SCORE_KEY = 'snake_high_score';

    let cellSize = 16;
    let cols = GRID_SIZE;
    let rows = GRID_SIZE;
    let snake = [];
    let direction = { x: 1, y: 0 };
    let pendingDirection = { x: 1, y: 0 };
    let food = { x: 0, y: 0 };
    let score = 0;
    let highScore = +localStorage.getItem(HIGH_SCORE_KEY) || 0;
    let running = false;
    let lastTick = 0;
    let rafId = null;

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
        scoreEl.textContent = score;
        spawnFood();
    }

    function spawnFood() {
        while (true) {
            const x = Math.floor(Math.random() * cols);
            const y = Math.floor(Math.random() * rows);
            if (!snake.some(s => s.x === x && s.y === y)) {
                food = { x, y };
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

        ctx.fillStyle = '#ff3344';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff3344';
        const fx = food.x * cellSize + cellSize / 2;
        const fy = food.y * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(fx, fy, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        snake.forEach((seg, i) => {
            const isHead = i === snake.length - 1;
            ctx.fillStyle = isHead ? '#00ff41' : '#00cc33';
            ctx.shadowBlur = isHead ? 10 : 0;
            ctx.shadowColor = '#00ff41';
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
            draw();
        }
        rafId = requestAnimationFrame(loop);
    }

    function startGame() {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        newRecordEl.classList.add('hidden');
        resetGame();
        draw();
        running = true;
        lastTick = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function gameOver() {
        running = false;
        cancelAnimationFrame(rafId);
        playGameOver();
        finalScoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
            highScoreEl.textContent = highScore;
            newRecordEl.classList.remove('hidden');
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

    function beep(freq, duration, type = 'square', volume = 0.15) {
        const ac = getAudio();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
        osc.connect(gain).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration);
    }

    function playEat() {
        beep(880, 0.08, 'square', 0.18);
        setTimeout(() => beep(1320, 0.08, 'square', 0.15), 60);
    }

    function playGameOver() {
        beep(220, 0.18, 'sawtooth', 0.2);
        setTimeout(() => beep(140, 0.25, 'sawtooth', 0.18), 150);
        setTimeout(() => beep(80, 0.35, 'sawtooth', 0.15), 350);
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
