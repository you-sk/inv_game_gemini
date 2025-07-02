// DOMの読み込みを待つ
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // オリジナルの解像度に近い値で設定
    const GAME_WIDTH = 224 * 2;
    const GAME_HEIGHT = 256 * 2;

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // ゲームの状態管理
    // Invader properties
    const INVADER_WIDTH = 12; // Adjusted for sprite size
    const INVADER_HEIGHT = 12; // Adjusted for sprite size
    const INVADER_ROWS = 5;
    const INVADER_COLS = 11;
    const INVADER_SPACING_X = 10; // Spacing between invaders horizontally
    const INVADER_SPACING_Y = 10; // Spacing between invaders vertically
    const INVADER_START_X = 50; // Starting X position for the first invader
    const INVADER_START_Y = 80; // Starting Y position for the first invader
    const INVADER_MOVE_SPEED = 1; // Initial invader horizontal move speed
    const INVADER_DROP_AMOUNT = 20; // How much invaders drop when hitting edge

    // Invader pixel art patterns (2 frames for animation)
    const INVADER_SPRITES = [
        // Type 0 (Top row - 30 points)
        [
            [ // Frame 0
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                " x  x ",
                "x x x ",
            ],
            [ // Frame 1
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                "x x x ",
                " x  x ",
            ]
        ],
        // Type 1 (20 points)
        [
            [ // Frame 0
                " xxxx ",
                "xxxxxx",
                "xx  xx",
                "xxxxxx",
                "x x x ",
                "x x x ",
            ],
            [ // Frame 1
                " xxxx ",
                "xxxxxx",
                "xx  xx",
                "xxxxxx",
                " x x x",
                "x x x ",
            ]
        ],
        // Type 2 (20 points)
        [
            [ // Frame 0
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                " x  x ",
                "x x x ",
            ],
            [ // Frame 1
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                "x x x ",
                " x  x ",
            ]
        ],
        // Type 3 (10 points)
        [
            [ // Frame 0
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                " x  x ",
                "x x x ",
            ],
            [ // Frame 1
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                "x x x ",
                " x  x ",
            ]
        ],
        // Type 4 (10 points)
        [
            [ // Frame 0
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                " x  x ",
                "x x x ",
            ],
            [ // Frame 1
                "  xx  ",
                " xxx ",
                "xxxxxx",
                "xx  xx",
                "x x x ",
                " x  x ",
            ]
        ]
    ];

    // Invader movement direction
    let invaderDirection = 1; // 1 for right, -1 for left
    let invaderMoveCounter = 0;
    const INVADER_MOVE_INTERVAL = 60; // How many frames before invaders move (slower initially)
    const INVADER_SOUND_FREQUENCIES = [100, 120, 140, 160]; // 4 pitch changes
    let currentInvaderSoundIndex = 0;
    let invaderAnimationFrame = 0; // Current animation frame for invaders

    // Shield properties
    const SHIELD_COUNT = 4;
    const SHIELD_WIDTH = 4; // Adjusted for sprite size
    const SHIELD_HEIGHT = 4; // Adjusted for sprite size
    const SHIELD_Y = GAME_HEIGHT - 120;
    const SHIELD_SPACING = (GAME_WIDTH - (SHIELD_WIDTH * SHIELD_COUNT)) / (SHIELD_COUNT + 1);
    const SHIELD_SEGMENT_SIZE = 1; // Size of each small block within a shield

    // UFO properties
    const UFO_WIDTH = 14; // Adjusted for sprite size
    const UFO_HEIGHT = 8; // Adjusted for sprite size
    const UFO_SPEED = 2;
    const UFO_Y = 60; // Y position for UFO
    let ufoSpawnTimer = 0;
    const UFO_SPAWN_INTERVAL = 1000; // Frames between potential UFO spawns

    // AudioContext for sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.1; // Master volume

    // Function to play a simple sound
    function playSound(frequency, duration, type = 'sine') {
        const oscillator = audioContext.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.connect(gainNode);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    // Player pixel art pattern
    const PLAYER_SPRITE = [
        "  x  ",
        " xxx ",
        "xxxxx",
        "xxxxx",
        "x x x",
        "x x x",
    ];

    // UFO pixel art pattern
    const UFO_SPRITE = [
        "  x x  ",
        " xxxxx ",
        "xxxxxxx",
        "x x x x",
    ];

    // Invader bullet pixel art patterns
    const INVADER_BULLET_SPRITES = [
        // Type 0: Normal bullet
        [
            "x",
            "x",
            "x",
            "x",
        ],
        // Type 1: Thick bullet
        [
            "xx",
            "xx",
            "xx",
            "xx",
        ],
        // Type 2: Diagonal bullet (example, can be more complex)
        [
            "x ",
            " x",
            "x ",
            " x",
        ],
    ];

    // Shield pixel art pattern (a simple block for now)
    const SHIELD_SPRITE_SEGMENT = [
        "xxxx",
        "xxxx",
        "xxxx",
        "xxxx",
    ];

    const gameState = {
        player: {
            x: 0,
            y: 0,
            width: 12, // Adjusted based on sprite size and pixel size
            height: 12, // Adjusted based on sprite size and pixel size
            speed: 3,
            lives: 3,
        },
        invaders: [],
        bullets: [],
        invaderBullets: [],
        shields: [],
        ufo: null, // { x, y, width, height, direction, alive, score }
        score: 0,
        highScore: 0,
        level: 1,
        isGameOver: false,
        gameStarted: false, // New flag for game state
        lastBonusScore: 0, // Track last score for bonus life
        keys: {},
    };

    // --- 初期化処理 ---
    function init() {
        if (gameState.gameStarted && !gameState.isGameOver) return;
        // プレイヤーの初期位置
        gameState.player.x = (GAME_WIDTH - gameState.player.width) / 2;
        gameState.player.y = GAME_HEIGHT - 50;
        
        // ハイスコアをLocalStorageから読み込み
        gameState.highScore = localStorage.getItem('invadersHighScore') || 0;

        createInvaders();
        createShields();

        gameState.gameStarted = true;
    }

    // New function to create invaders
    function createInvaders() {
        gameState.invaders = [];
        for (let row = 0; row < INVADER_ROWS; row++) {
            for (let col = 0; col < INVADER_COLS; col++) {
                let scoreValue;
                if (row === 0) {
                    scoreValue = 30; // Top row
                } else if (row === 1 || row === 2) {
                    scoreValue = 20; // Middle two rows
                } else {
                    scoreValue = 10; // Bottom two rows
                }

                gameState.invaders.push({
                    x: INVADER_START_X + col * (INVADER_WIDTH + INVADER_SPACING_X),
                    y: INVADER_START_Y + row * (INVADER_HEIGHT + INVADER_SPACING_Y),
                    width: INVADER_WIDTH,
                    height: INVADER_HEIGHT,
                    score: scoreValue,
                    alive: true,
                    type: row, // 0-4 for different invader types
                    animationFrame: 0, // For future animation
                });
            }
        }
    }

    // New function to create shields
    function createShields() {
        gameState.shields = [];
        for (let i = 0; i < SHIELD_COUNT; i++) {
            const shieldX = SHIELD_SPACING + i * (SHIELD_WIDTH + SHIELD_SPACING);
            const shield = {
                x: shieldX,
                y: SHIELD_Y,
                width: SHIELD_WIDTH,
                height: SHIELD_HEIGHT,
                segments: [],
            };

            // Create segments for the shield with a more detailed shape
            const shieldShape = [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            ]; // This is a placeholder, actual shape needs to be designed

            for (let r = 0; r < shieldShape.length; r++) {
                for (let c = 0; c < shieldShape[r].length; c++) {
                    if (shieldShape[r][c] === 1) {
                        shield.segments.push({
                            x: shieldX + c * SHIELD_SEGMENT_SIZE,
                            y: SHIELD_Y + r * SHIELD_SEGMENT_SIZE,
                            width: SHIELD_SEGMENT_SIZE,
                            height: SHIELD_SEGMENT_SIZE,
                            intact: true,
                        });
                    }
                }
            }
            gameState.shields.push(shield);
        }
    }

    // --- ゲームループ ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!lastTime) {
            lastTime = timestamp;
        }
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (!gameState.gameStarted) {
            drawTitleScreen();
        } else if (gameState.isGameOver) {
            drawGameOver();
        } else {
            update(deltaTime);
            draw();
        }

        requestAnimationFrame(gameLoop);
    }

    // --- 更新処理 ---
    function update(deltaTime) {
        // プレイヤーの移動
        if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) {
            gameState.player.x -= gameState.player.speed;
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) {
            gameState.player.x += gameState.player.speed;
        }

        // プレイヤーの画面端チェック
        if (gameState.player.x < 0) {
            gameState.player.x = 0;
        }
        if (gameState.player.x > GAME_WIDTH - gameState.player.width) {
            gameState.player.x = GAME_WIDTH - gameState.player.x; // Fix: Should be gameState.player.width
        }

        // 弾の発射
        if (gameState.keys['Space'] || gameState.keys['KeyJ']) {
            if (gameState.bullets.length === 0) {
                gameState.bullets.push({
                    x: gameState.player.x + gameState.player.width / 2 - 2,
                    y: gameState.player.y,
                    width: 4,
                    height: 10,
                    speed: 7,
                });
                playSound(440, 0.05); // Player bullet sound
            }
        }

        // 弾の更新
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            bullet.y -= bullet.speed;

            // 弾が画面外に出たら削除
            if (bullet.y < 0) {
                gameState.bullets.splice(i, 1);
            }
        }

        // Invader movement
        const aliveInvadersCount = gameState.invaders.filter(inv => inv.alive).length;
        let currentInvaderMoveInterval = INVADER_MOVE_INTERVAL;

        if (aliveInvadersCount < 10) {
            currentInvaderMoveInterval = 10; // Very fast
        } else if (aliveInvadersCount < 20) {
            currentInvaderMoveInterval = 20; // Faster
        } else if (aliveInvadersCount < 30) {
            currentInvaderMoveInterval = 30; // Medium
        }

        invaderMoveCounter++;
        if (invaderMoveCounter >= currentInvaderMoveInterval) {
            invaderMoveCounter = 0;

            let hitEdge = false;
            for (const invader of gameState.invaders) {
                if (invader.alive) {
                    invader.x += INVADER_MOVE_SPEED * invaderDirection;

                    // Check if any invader hit the edge
                    if (invaderDirection === 1 && invader.x + invader.width > GAME_WIDTH - INVADER_START_X) {
                        hitEdge = true;
                    } else if (invaderDirection === -1 && invader.x < INVADER_START_X) {
                        hitEdge = true;
                    }
                }
            }

            if (hitEdge) {
                invaderDirection *= -1; // Reverse direction
                for (const invader of gameState.invaders) {
                    if (invader.alive) {
                        invader.y += INVADER_DROP_AMOUNT; // Drop down
                    }
                }
            }
            // Update invader animation frame
            invaderAnimationFrame = 1 - invaderAnimationFrame; // Toggle between 0 and 1

            // Play invader move sound
            playSound(INVADER_SOUND_FREQUENCIES[currentInvaderSoundIndex], 0.05);
            currentInvaderSoundIndex = (currentInvaderSoundIndex + 1) % INVADER_SOUND_FREQUENCIES.length;
        }

        // Invader bullet firing
        if (Math.random() < 0.02) { // Adjust probability as needed
            const aliveInvaders = gameState.invaders.filter(inv => inv.alive);
            if (aliveInvaders.length > 0) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                gameState.invaderBullets.push({
                    x: shooter.x + shooter.width / 2 - 2,
                    y: shooter.y + shooter.height,
                    width: 4,
                    height: 10,
                    speed: 3,
                    type: Math.floor(Math.random() * 3), // 0: normal, 1: thick, 2: diagonal (TODO: implement different types)
                });
                playSound(200, 0.05); // Invader bullet sound
            }
        }

        // Invader bullet update
        for (let i = gameState.invaderBullets.length - 1; i >= 0; i--) {
            const bullet = gameState.invaderBullets[i];
            bullet.y += bullet.speed;

            if (bullet.y > GAME_HEIGHT) {
                gameState.invaderBullets.splice(i, 1);
            }
        }

        // Collision Detection: Player bullet vs Invaders
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            for (let j = gameState.invaders.length - 1; j >= 0; j--) {
                const invader = gameState.invaders[j];
                if (invader.alive && checkCollision(bullet, invader)) {
                    invader.alive = false;
                    gameState.score += invader.score;
                    gameState.bullets.splice(i, 1); // Remove player bullet
                    // Update high score
                    if (gameState.score > gameState.highScore) {
                        gameState.highScore = gameState.score;
                        localStorage.setItem('invadersHighScore', gameState.highScore);
                    }
                    playSound(800, 0.05); // Invader hit sound
                    // Check for bonus life
                    if (gameState.score >= gameState.lastBonusScore + 1000) {
                        gameState.player.lives++;
                        gameState.lastBonusScore = gameState.score; // Update last bonus score
                        playSound(900, 0.1, 'square'); // Bonus life sound
                    }
                    break; // Only one invader can be hit by one bullet
                }
            }
        }

        // Collision Detection: Invader bullet vs Player
        for (let i = gameState.invaderBullets.length - 1; i >= 0; i--) {
            const invaderBullet = gameState.invaderBullets[i];
            if (checkCollision(invaderBullet, gameState.player)) {
                gameState.player.lives--;
                gameState.invaderBullets.splice(i, 1); // Remove invader bullet
                playSound(50, 0.5, 'sawtooth'); // Player explosion sound
                if (gameState.player.lives <= 0) {
                    gameState.isGameOver = true;
                    playSound(30, 1, 'triangle'); // Game over sound
                }
                break; // Player can only be hit by one bullet at a time
            }
        }

        // Collision Detection: Player bullet vs Shields
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            for (const shield of gameState.shields) {
                for (const segment of shield.segments) {
                    if (segment.intact && checkCollision(bullet, segment)) {
                        segment.intact = false;
                        gameState.bullets.splice(i, 1); // Remove player bullet
                        break; // Bullet is destroyed
                    }
                }
                if (gameState.bullets.length === 0) break; // If bullet was removed, stop checking
            }
        }

        // Collision Detection: Invader bullet vs Shields
        for (let i = gameState.invaderBullets.length - 1; i >= 0; i--) {
            const invaderBullet = gameState.invaderBullets[i];
            for (const shield of gameState.shields) {
                for (const segment of shield.segments) {
                    if (segment.intact && checkCollision(invaderBullet, segment)) {
                        segment.intact = false;
                        gameState.invaderBullets.splice(i, 1); // Remove invader bullet
                        break; // Bullet is destroyed
                    }
                }
                if (gameState.invaderBullets.length === 0) break; // If bullet was removed, stop checking
            }
        }

        // Check if invaders reached the bottom
        for (const invader of gameState.invaders) {
            if (invader.alive && invader.y + invader.height >= gameState.player.y) {
                gameState.isGameOver = true;
                break;
            }
        }

        // UFO spawning and movement
        ufoSpawnTimer++;
        if (ufoSpawnTimer > UFO_SPAWN_INTERVAL && !gameState.ufo) {
            if (Math.random() < 0.01) { // Small chance to spawn after interval
                createUFO();
                ufoSpawnTimer = 0;
            }
        }

        if (gameState.ufo) {
            gameState.ufo.x += gameState.ufo.speed * gameState.ufo.direction;
            if (gameState.ufo.direction === 1 && gameState.ufo.x > GAME_WIDTH) {
                gameState.ufo = null; // UFO off screen
            } else if (gameState.ufo.direction === -1 && gameState.ufo.x + UFO_WIDTH < 0) {
                gameState.ufo = null; // UFO off screen
            }
        }

        // Collision Detection: Player bullet vs UFO
        for (let i = gameState.bullets.length - 1; i >= 0; i--) {
            const bullet = gameState.bullets[i];
            if (gameState.ufo && gameState.ufo.alive && checkCollision(bullet, gameState.ufo)) {
                const scores = [50, 100, 150, 300];
                gameState.score += scores[Math.floor(Math.random() * scores.length)];
                gameState.ufo.alive = false;
                gameState.ufo = null; // Remove UFO
                gameState.bullets.splice(i, 1); // Remove player bullet
                // Update high score
                if (gameState.score > gameState.highScore) {
                    gameState.highScore = gameState.score;
                    localStorage.setItem('invadersHighScore', gameState.highScore);
                }
                // TODO: UFO hit sound
                playSound(1000, 0.1); // UFO hit sound
                playSound(1200, 0.05); // Score addition sound (bonus)
                break;
            }
        }
    }

    // New function to create UFO
    function createUFO() {
        const direction = Math.random() < 0.5 ? 1 : -1; // 1: right to left, -1: left to right
        const startX = direction === 1 ? -UFO_WIDTH : GAME_WIDTH;
        gameState.ufo = {
            x: startX,
            y: UFO_Y,
            width: UFO_WIDTH,
            height: UFO_HEIGHT,
            speed: UFO_SPEED,
            direction: direction,
            alive: true,
        };
        playSound(600, 0.1); // UFO appearance sound
    }

    // Generic collision detection function (AABB)
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Helper function to draw pixel art sprites
    function drawSprite(sprite, x, y, color, pixelSize = 2) {
        ctx.fillStyle = color;
        for (let r = 0; r < sprite.length; r++) {
            for (let c = 0; c < sprite[r].length; c++) {
                if (sprite[r][c] === 'x') {
                    ctx.fillRect(x + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    // --- 描画処理 ---
    function draw() {
        // 背景をクリア
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // UIを描画
        drawUI();
        
        // プレイヤーを描画
        drawPlayer();

        // 弾を描画
        drawBullets();

        // インベーダーを描画
        drawInvaders();

        // インベーダーの弾を描画
        drawInvaderBullets();

        // 遮蔽物を描画
        drawShields();

        // UFOを描画
        drawUFO();
    }

    // New function to draw UFO
    function drawUFO() {
        if (gameState.ufo && gameState.ufo.alive) {
            drawSprite(UFO_SPRITE, gameState.ufo.x, gameState.ufo.y, 'red', 2);
        }
    }

    // New function to draw shields
    function drawShields() {
        ctx.fillStyle = 'green'; // Color for intact shield segments
        for (const shield of gameState.shields) {
            for (const segment of shield.segments) {
                if (segment.intact) {
                    drawSprite(SHIELD_SPRITE_SEGMENT, segment.x, segment.y, 'green', 1);
                }
            }
        }
    }
    
    function drawUI() {
        ctx.fillStyle = 'white';
        ctx.font = '16px "Press Start 2P", sans-serif'; // 仮のフォント
        
        // SCORE
        ctx.fillText('SCORE<1>', 20, 30);
        ctx.fillText(String(gameState.score).padStart(4, '0'), 40, 50);

        // HI-SCORE
        ctx.fillText('HI-SCORE', GAME_WIDTH / 2 - 50, 30);
        ctx.fillText(String(gameState.highScore).padStart(4, '0'), GAME_WIDTH / 2 - 30, 50);
        
        // LIVES
        ctx.fillText(String(gameState.player.lives), 20, GAME_HEIGHT - 10);
        for (let i = 0; i < gameState.player.lives; i++) {
            ctx.fillStyle = 'lime';
            ctx.fillRect(20 + (i * (gameState.player.width + 5)), GAME_HEIGHT - 30, gameState.player.width, gameState.player.height);
        }
    }

    function drawPlayer() {
        drawSprite(PLAYER_SPRITE, gameState.player.x, gameState.player.y, 'lime', 2);
    }

    function drawBullets() {
        ctx.fillStyle = 'white';
        for (const bullet of gameState.bullets) {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }

    // New function to draw invaders
    function drawInvaders() {
        for (const invader of gameState.invaders) {
            if (invader.alive) {
                const sprite = INVADER_SPRITES[invader.type][invaderAnimationFrame];
                drawSprite(sprite, invader.x, invader.y, 'white', 2);
            }
        }
    }

    function drawInvaderBullets() {
        for (const bullet of gameState.invaderBullets) {
            const sprite = INVADER_BULLET_SPRITES[bullet.type];
            const pixelSize = 2; // Size of each pixel in the bullet sprite

            ctx.fillStyle = 'white'; // Invader bullets are typically white
            for (let r = 0; r < sprite.length; r++) {
                for (let c = 0; c < sprite[r].length; c++) {
                    if (sprite[r][c] === 'x') {
                        ctx.fillRect(bullet.x + c * pixelSize, bullet.y + r * pixelSize, pixelSize, pixelSize);
                    }
                }
            }
        }
    }
    
    function drawGameOver() {
        ctx.fillStyle = 'red';
        ctx.font = '40px "Press Start 2P", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);

        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P", sans-serif';
        ctx.fillText('PRESS ENTER TO RESTART', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    }

    function drawTitleScreen() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.fillStyle = 'white';
        ctx.font = '40px "Press Start 2P", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE INVADERS', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);

        ctx.font = '20px "Press Start 2P", sans-serif';
        ctx.fillText('PRESS ENTER TO START', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);

        ctx.font = '12px "Press Start 2P", sans-serif';
        ctx.fillText('© 1978 TAITO CORPORATION', GAME_WIDTH / 2, GAME_HEIGHT - 30);
    }

    // --- イベントリスナー ---
    window.addEventListener('keydown', (e) => {
        gameState.keys[e.code] = true;
        if (e.code === 'Enter') {
            if (!gameState.gameStarted || gameState.isGameOver) {
                // Reset game state for restart
                gameState.score = 0;
                gameState.player.lives = 3;
                gameState.isGameOver = false;
                gameState.ufo = null;
                gameState.bullets = [];
                gameState.invaderBullets = [];
                gameState.lastBonusScore = 0;
                createInvaders();
                createShields();
                gameState.player.x = (GAME_WIDTH - gameState.player.width) / 2;
                gameState.player.y = GAME_HEIGHT - 50;
                gameState.gameStarted = true; // Ensure gameStarted is true after restart
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        gameState.keys[e.code] = false;
    });

    // Initial call to gameLoop to start the animation frame requests
    gameLoop();
});
