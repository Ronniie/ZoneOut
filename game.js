// Game settings - tweak these to adjust difficulty and feel
const gameConfig = {
    difficulties: {
        easy: {
            lives: Infinity,
            timer: 180, // 3 min timer
            baseSpeed: 2,
            speedVariation: 0.8, // Makes squares move at slightly different speeds
            initialSquares: 10,
            maxSquares: 15,
            squaresPerLevel: 2,
            speedIncrease: 0.2,
            redSquareRatio: 0.2, // 1 in 5 squares are red
            timeBonus: 30 // 30s bonus for completing level
        },
        medium: {
            lives: 5,
            timer: 120, // 2 min timer
            baseSpeed: 3,
            speedVariation: 0.8,
            initialSquares: 15,
            maxSquares: 20,
            squaresPerLevel: 3,
            speedIncrease: 0.3,
            redSquareRatio: 0.3, // 1 in 3 squares are red
            timeBonus: 20
        },
        hard: {
            lives: 3,
            timer: 90, // 1.5 min timer
            baseSpeed: 4,
            speedVariation: 1,
            initialSquares: 20,
            maxSquares: 25,
            squaresPerLevel: 4,
            speedIncrease: 0.4,
            redSquareRatio: 0.4, // 2 in 5 squares are red
            timeBonus: 15
        }
    },
    colors: {
        good: '#4ecca3',    // Green
        bad: '#ff6b6b',     // Red
        bonus: '#ffd93d'    // Yellow
    },
    trailLength: 20,        // How long the square trails are
    particleCount: 20,      // Number of particles in explosions
    trailParticleSize: 3,   // Size of trail particles
    sparkleCount: 8,        // Number of sparkles around bonus squares
    backgroundStars: 100    // Number of stars in the background
};

// Cookie handling - saves player preferences
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Game state - tracks everything that changes during gameplay
let gameState = {
    selectedDifficulty: getCookie('difficulty') || 'medium',
    selectedMode: getCookie('mode') || 'levels',
    isPlaying: false,
    score: 0,
    level: 1,
    lives: 5,
    startTime: null,
    gameTime: 0,
    currentSpeed: 0,
    levelStartTime: null,
    levelTime: 0,
    remainingTime: 0,
    currentCombo: 0,
    maxCombo: 0,
    lastUpdateTime: null // Used for accurate timer updates
};

// DOM Elements
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const restartButton = document.getElementById('restart-game');

// Add popup elements
const lifeLossPopup = document.createElement('div');
lifeLossPopup.className = 'life-loss-popup';
document.body.appendChild(lifeLossPopup);

const pointGainPopup = document.createElement('div');
pointGainPopup.className = 'point-gain-popup';
document.body.appendChild(pointGainPopup);

function showLifeLossPopup(livesLost) {
    lifeLossPopup.textContent = `-${livesLost} ${livesLost === 1 ? 'Life' : 'Lives'}`;
    lifeLossPopup.classList.add('show');
    setTimeout(() => {
        lifeLossPopup.classList.remove('show');
    }, 1000);
}

function showPointGainPopup(points) {
    pointGainPopup.textContent = `+${points} ${points === 1 ? 'Point' : 'Points'}`;
    pointGainPopup.classList.add('show');
    setTimeout(() => {
        pointGainPopup.classList.remove('show');
    }, 1000);
}

// Add death screen handling
const deathScreen = document.querySelector('.death-screen');
const finalScore = document.querySelector('.final-score');
const finalLevel = document.querySelector('.final-level');
const finalTime = document.querySelector('.final-time');

function showDeathScreen() {
    // Update final stats
    finalScore.textContent = gameState.score;
    finalLevel.textContent = gameState.level;
    
    // Format time
    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = Math.floor(gameState.gameTime % 60);
    finalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Hide level display in endless mode
    const levelRow = document.querySelector('.death-screen .stat-row:nth-child(2)');
    if (gameState.selectedMode === 'endless') {
        levelRow.style.display = 'none';
    } else {
        levelRow.style.display = 'flex';
    }
    
    // Update mode and difficulty badges with proper capitalization
    const modeText = gameState.selectedMode.charAt(0).toUpperCase() + gameState.selectedMode.slice(1);
    const difficultyText = gameState.selectedDifficulty.charAt(0).toUpperCase() + gameState.selectedDifficulty.slice(1);
    
    document.querySelector('.mode-text').textContent = modeText;
    document.querySelector('.difficulty-text').textContent = difficultyText;
    
    // Show death screen
    deathScreen.classList.add('show');
}

// Set initial active states
function setInitialStates() {
    // Set difficulty
    difficultyButtons.forEach(button => {
        if (button.dataset.difficulty === gameState.selectedDifficulty) {
            button.classList.add('active');
        }
    });
    
    // Set game mode
    modeButtons.forEach(button => {
        if (button.dataset.mode === gameState.selectedMode) {
            button.classList.add('active');
        }
    });
    
    // Show initial explanations
    document.querySelector(`.${gameState.selectedDifficulty}-info`).style.display = 'block';
    document.querySelector(`.${gameState.selectedMode}-info`).style.display = 'block';
}

// Event Listeners
difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        difficultyButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        gameState.selectedDifficulty = button.dataset.difficulty;
        setCookie('difficulty', gameState.selectedDifficulty, 365);
        
        // Update info text visibility
        document.querySelectorAll('.difficulty-info .info-text').forEach(info => info.style.display = 'none');
        document.querySelector(`.${gameState.selectedDifficulty}-info`).style.display = 'block';
        
        restartGame();
    });
});

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        gameState.selectedMode = button.dataset.mode;
        setCookie('mode', gameState.selectedMode, 365);
        
        // Update info text visibility
        document.querySelectorAll('.mode-info .info-text').forEach(info => info.style.display = 'none');
        document.querySelector(`.${gameState.selectedMode}-info`).style.display = 'block';
        
        restartGame();
    });
});

restartButton.addEventListener('click', restartGame);

// Set initial states when the page loads
setInitialStates();

// Start game automatically
window.addEventListener('load', () => {
    startGame();
});

function restartGame() {
    // Clear timer interval
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // Remove existing canvas if it exists
    const existingCanvas = document.getElementById('gameCanvas');
    if (existingCanvas) {
        existingCanvas.remove();
    }
    
    // Reset game state
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 5;
    gameState.currentSpeed = 0;
    gameState.currentCombo = 0;
    gameState.maxCombo = 0;
    updateStats();
    
    // Reset timers
    gameState.startTime = null;
    gameState.levelStartTime = null;
    gameState.lastUpdateTime = null;
    gameState.gameTime = 0;
    gameState.levelTime = 0;
    gameState.remainingTime = 0;
    
    // Start new game
    startGame();
}

function startGame() {
    gameState.isPlaying = true;
    gameState.startTime = Date.now();
    gameState.levelStartTime = Date.now();
    gameState.lastUpdateTime = Date.now();
    gameState.gameTime = 0;
    gameState.levelTime = 0;
    
    // Initialize remaining time based on difficulty
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    gameState.remainingTime = config.timer;
    
    // Hide death screen
    deathScreen.classList.remove('show');
    
    // Create game canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.querySelector('.container').appendChild(canvas);
    
    // Initialize game
    initializeGame();
    updateStats();
    
    // Start timer update interval
    startTimerUpdate();
}

// Creates a particle effect when squares are collected
function createParticle(x, y, color) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = color;
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.borderRadius = '50%';
    document.body.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => particle.remove(), 500);
}

// Creates sparkle effects around bonus squares
function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;
    sparkle.style.width = '20px';
    sparkle.style.height = '20px';
    sparkle.style.background = 'radial-gradient(circle, #fff 0%, transparent 70%)';
    document.body.appendChild(sparkle);
    
    setTimeout(() => sparkle.remove(), 1000);
}

// Checks if level is complete - either no squares left or only red squares
function isLevelComplete(squares) {
    if (squares.length === 0) return true;
    return squares.every(square => square.color === gameConfig.colors.bad);
}

// Calculates how many squares should be in the current level
function getSquaresForLevel() {
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    return Math.min(
        config.initialSquares + (gameState.level - 1) * config.squaresPerLevel,
        config.maxSquares
    );
}

// Gets the speed for the current level
function getSpeedForLevel() {
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    return config.baseSpeed + (gameState.level - 1) * config.speedIncrease;
}

// Calculates how many red squares should be in the current level
function getRedSquaresForLevel() {
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    const totalSquares = getSquaresForLevel();
    const redSquares = Math.floor(totalSquares * config.redSquareRatio);
    return Math.min(redSquares, totalSquares - 2); // Always leave at least 2 non-red squares
}

// Spawns a new square with random properties
function spawnSquare(canvas, squares, isRed = false) {
    const size = 30;
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    const baseSpeed = getSpeedForLevel();
    
    // Add some randomness to square speeds
    const speedVariation = (Math.random() - 0.5) * config.speedVariation;
    const speed = baseSpeed + speedVariation;
    
    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    const square = {
        x: Math.random() * (canvas.width - size),
        y: Math.random() * (canvas.height - size),
        size: size,
        vx: vx,
        vy: vy,
        color: isRed ? gameConfig.colors.bad : 
               Math.random() < 0.7 ? gameConfig.colors.good : gameConfig.colors.bonus,
        trail: [],
        isHighlighted: false
    };
    squares.push(square);
}

// Handles level completion - calculates bonuses and spawns next level
function handleLevelCompletion(squares) {
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    
    // Calculate time bonuses
    const baseTimeBonus = config.timeBonus;
    const levelTime = (Date.now() - gameState.levelStartTime) / 1000;
    const speedBonus = Math.max(0, Math.floor((config.timer - levelTime) * 0.5));
    const comboBonus = Math.min(30, gameState.maxCombo * 2); // 2s per combo, max 30s
    
    const finalBonus = baseTimeBonus + speedBonus + comboBonus;
    
    // Show bonus notification
    let bonusMessage = `<span class="bonus-change">Level Complete! +${finalBonus}s</span>`;
    if (speedBonus > 0) {
        bonusMessage += `<br><span class="score-change">Speed Bonus: +${speedBonus}s</span>`;
    }
    if (comboBonus > 0) {
        bonusMessage += `<br><span class="score-change">Combo Bonus: +${comboBonus}s</span>`;
    }
    showNotification(bonusMessage, 2000);
    
    // Clear squares with effects
    squares.forEach(square => {
        for (let i = 0; i < gameConfig.particleCount * 2; i++) {
            const angle = (Math.PI * 2 * i) / (gameConfig.particleCount * 2);
            const x = square.x + square.size / 2;
            const y = square.y + square.size / 2;
            createParticle(x, y, square.color);
        }
    });
    
    squares.length = 0;
    gameState.level++;
    updateStats();
    
    // Reset combo tracking
    gameState.currentCombo = 0;
    gameState.maxCombo = 0;
    
    // Spawn next level
    const canvas = document.getElementById('gameCanvas');
    const numSquares = getSquaresForLevel();
    const numRedSquares = getRedSquaresForLevel();
    
    // Spawn red squares first
    for (let i = 0; i < numRedSquares; i++) {
        spawnSquare(canvas, squares, true);
    }
    
    // Spawn remaining squares
    for (let i = numRedSquares; i < numSquares; i++) {
        spawnSquare(canvas, squares, false);
    }
    
    // Reset level timer with bonus
    gameState.levelStartTime = Date.now() - (finalBonus * 1000);
    gameState.levelTime = 0;
}

// Handles square collection - scoring, effects, and game state updates
function handleSquareClick(square, squares) {
    const index = squares.indexOf(square);
    if (index > -1) {
        let scoreChange = 0;
        let livesChange = 0;
        let bonusChange = 0;
        let bonusLife = false;
        let notificationParts = [];
        
        // Handle scoring
        if (square.color === gameConfig.colors.good) {
            scoreChange = 1;
            gameState.currentCombo++;
            notificationParts.push(`<span class="score-change">+${scoreChange} Point${scoreChange !== 1 ? 's' : ''}</span>`);
        } else if (square.color === gameConfig.colors.bonus) {
            scoreChange = 2;
            bonusChange = 2;
            gameState.currentCombo += 2;
            notificationParts.push(`<span class="bonus-change">+${scoreChange} Bonus Point${scoreChange !== 1 ? 's' : ''}</span>`);
            // Bonus life logic (medium only, if lost a life)
            const config = gameConfig.difficulties[gameState.selectedDifficulty];
            if (
                gameState.selectedDifficulty === 'medium' &&
                gameState.lives < config.lives &&
                Math.random() < 0.1 // 10% chance
            ) {
                gameState.lives += 1;
                bonusLife = true;
                notificationParts.push('<span class="lives-change">+1 Bonus Life</span>');
            }
        }
        
        // Handle red squares
        if (square.color === gameConfig.colors.bad) {
            const config = gameConfig.difficulties[gameState.selectedDifficulty];
            if (config.lives !== Infinity) {
                livesChange = -1;
                gameState.currentCombo = 0;
                notificationParts.push('<span class="lives-change">-1 Life</span>');
                if (gameState.lives <= 0) {
                    gameState.isPlaying = false;
                    showDeathScreen();
                }
            }
        }
        
        // Update game state
        gameState.score += scoreChange;
        gameState.lives += livesChange;
        
        // Create notification message
        if (notificationParts.length > 0) {
            showNotification(notificationParts.join(', '));
        }
        
        // Create effects
        for (let i = 0; i < gameConfig.particleCount; i++) {
            const angle = (Math.PI * 2 * i) / gameConfig.particleCount;
            const x = square.x + square.size / 2;
            const y = square.y + square.size / 2;
            createParticle(x, y, square.color);
        }
        
        // Extra sparkles for bonus squares
        if (square.color === gameConfig.colors.bonus) {
            for (let i = 0; i < gameConfig.sparkleCount; i++) {
                const angle = (Math.PI * 2 * i) / gameConfig.sparkleCount;
                const x = square.x + square.size / 2 + Math.cos(angle) * 20;
                const y = square.y + square.size / 2 + Math.sin(angle) * 20;
                createSparkle(x, y);
            }
        }
        
        squares.splice(index, 1);
        
        // Update max combo
        if (gameState.currentCombo > gameState.maxCombo) {
            gameState.maxCombo = gameState.currentCombo;
        }
        
        // Check for level completion
        if (isLevelComplete(squares)) {
            handleLevelCompletion(squares);
        }
        
        updateStats();
    }
}

function initializeGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to fullscreen
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create background stars
    const stars = Array.from({ length: gameConfig.backgroundStars }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.3
    }));
    
    // Game objects
    const squares = [];
    let selectionBox = null;
    let isSelecting = false;
    let startX, startY;
    let isDragging = false;
    
    // Spawn initial squares with correct red square ratio
    const numSquares = getSquaresForLevel();
    const numRedSquares = getRedSquaresForLevel();
    
    // Spawn red squares first
    for (let i = 0; i < numRedSquares; i++) {
        spawnSquare(canvas, squares, true);
    }
    
    // Spawn remaining squares
    for (let i = numRedSquares; i < numSquares; i++) {
        spawnSquare(canvas, squares, false);
    }
    
    // Function to handle selected squares
    function handleSelectedSquares(selectionBox) {
        if (!selectionBox) return;
        
        // Calculate selection bounds
        const left = Math.min(selectionBox.x, selectionBox.x + selectionBox.width);
        const right = Math.max(selectionBox.x, selectionBox.x + selectionBox.width);
        const top = Math.min(selectionBox.y, selectionBox.y + selectionBox.height);
        const bottom = Math.max(selectionBox.y, selectionBox.y + selectionBox.height);
        
        // Check for squares in selection
        const selectedSquares = squares.filter(square => {
            const squareCenterX = square.x + square.size / 2;
            const squareCenterY = square.y + square.size / 2;
            
            return squareCenterX >= left && 
                   squareCenterX <= right && 
                   squareCenterY >= top && 
                   squareCenterY <= bottom;
        });
        
        // If only one square is selected and the selection box is very small,
        // treat it as a click on that square
        if (selectedSquares.length === 1 && 
            Math.abs(selectionBox.width) < 5 && 
            Math.abs(selectionBox.height) < 5) {
            handleSquareClick(selectedSquares[0], squares);
            return;
        }
        
        // Calculate total changes
        let totalScoreChange = 0;
        let totalBonusChange = 0;
        let totalLivesChange = 0;
        let bonusLife = false;
        let notificationParts = [];
        
        // Handle each selected square
        selectedSquares.forEach(square => {
            if (square.color === gameConfig.colors.good) {
                totalScoreChange += 1;
                gameState.currentCombo++;
            } else if (square.color === gameConfig.colors.bonus) {
                totalScoreChange += 2;
                totalBonusChange += 2;
                gameState.currentCombo += 2;
                
                // Bonus life logic (medium only, if lost a life)
                const config = gameConfig.difficulties[gameState.selectedDifficulty];
                if (
                    gameState.selectedDifficulty === 'medium' &&
                    gameState.lives < config.lives &&
                    Math.random() < 0.1 // 10% chance
                ) {
                    totalLivesChange += 1;
                    bonusLife = true;
                }
            } else if (square.color === gameConfig.colors.bad) {
                const config = gameConfig.difficulties[gameState.selectedDifficulty];
                if (config.lives !== Infinity) {
                    totalLivesChange -= 1;
                    gameState.currentCombo = 0;
                }
            }
            
            // Create effects
            for (let i = 0; i < gameConfig.particleCount; i++) {
                const angle = (Math.PI * 2 * i) / gameConfig.particleCount;
                const x = square.x + square.size / 2;
                const y = square.y + square.size / 2;
                createParticle(x, y, square.color);
            }
            
            // Extra sparkles for bonus squares
            if (square.color === gameConfig.colors.bonus) {
                for (let i = 0; i < gameConfig.sparkleCount; i++) {
                    const angle = (Math.PI * 2 * i) / gameConfig.sparkleCount;
                    const x = square.x + square.size / 2 + Math.cos(angle) * 20;
                    const y = square.y + square.size / 2 + Math.sin(angle) * 20;
                    createSparkle(x, y);
                }
            }
        });
        
        // Build notification message
        if (totalScoreChange > 0) {
            notificationParts.push(`<span class="score-change">+${totalScoreChange} Point${totalScoreChange !== 1 ? 's' : ''}</span>`);
        }
        if (totalBonusChange > 0) {
            notificationParts.push(`<span class="bonus-change">+${totalBonusChange} Bonus Point${totalBonusChange !== 1 ? 's' : ''}</span>`);
        }
        if (totalLivesChange > 0) {
            notificationParts.push(`<span class="lives-change">+${totalLivesChange} Bonus Life${totalLivesChange !== 1 ? 's' : ''}</span>`);
        }
        if (totalLivesChange < 0) {
            notificationParts.push(`<span class="lives-change">${totalLivesChange} Life${totalLivesChange !== -1 ? 's' : ''}</span>`);
        }
        
        // Show notification if there are any changes
        if (notificationParts.length > 0) {
            showNotification(notificationParts.join(', '));
        }
        
        // Update game state
        gameState.score += totalScoreChange;
        gameState.lives += totalLivesChange;
        
        // Check for game over
        if (gameState.lives <= 0) {
            gameState.isPlaying = false;
            showDeathScreen();
        }
        
        // Remove selected squares
        selectedSquares.forEach(square => {
            const index = squares.indexOf(square);
            if (index > -1) {
                squares.splice(index, 1);
            }
        });
        
        // Update max combo
        if (gameState.currentCombo > gameState.maxCombo) {
            gameState.maxCombo = gameState.currentCombo;
        }
        
        // Check for level completion
        if (isLevelComplete(squares)) {
            handleLevelCompletion(squares);
        }
        
        updateStats();
    }

    // Function to clear selection
    function clearSelection() {
        if (isSelecting && selectionBox) {
            // Handle any squares in the selection before clearing
            handleSelectedSquares(selectionBox);
        }
        isSelecting = false;
        isDragging = false;
        selectionBox = null;
    }
    
    // Mouse event listeners
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        startX = (e.clientX - rect.left) * scaleX;
        startY = (e.clientY - rect.top) * scaleY;
        
        // Only allow direct clicking in easy and medium difficulties
        if (gameState.selectedDifficulty !== 'hard') {
            // Check if we clicked directly on a square
            const clickedSquare = squares.find(square => {
                return startX >= square.x && 
                       startX <= square.x + square.size && 
                       startY >= square.y && 
                       startY <= square.y + square.size;
            });
            
            if (clickedSquare) {
                handleSquareClick(clickedSquare, squares);
                return;
            }
        }
        
        // Start selection box (for hard mode or when clicking empty space)
        isSelecting = true;
        isDragging = true;
        selectionBox = {
            x: startX,
            y: startY,
            width: 0,
            height: 0
        };
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        // Update selection box
        selectionBox.width = currentX - startX;
        selectionBox.height = currentY - startY;
        
        // Highlight squares that would be selected
        squares.forEach(square => {
            const squareCenterX = square.x + square.size / 2;
            const squareCenterY = square.y + square.size / 2;
            const left = Math.min(selectionBox.x, selectionBox.x + selectionBox.width);
            const right = Math.max(selectionBox.x, selectionBox.x + selectionBox.width);
            const top = Math.min(selectionBox.y, selectionBox.y + selectionBox.height);
            const bottom = Math.max(selectionBox.y, selectionBox.y + selectionBox.height);
            
            square.isHighlighted = squareCenterX >= left && 
                                 squareCenterX <= right && 
                                 squareCenterY >= top && 
                                 squareCenterY <= bottom;
        });
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (!isSelecting) return;
        
        if (isDragging && selectionBox) {
            handleSelectedSquares(selectionBox);
        }
        
        isSelecting = false;
        isDragging = false;
        selectionBox = null;
        
        // Clear highlights
        squares.forEach(square => {
            square.isHighlighted = false;
        });
    });
    
    // Handle window blur
    window.addEventListener('blur', () => {
        isSelecting = false;
        isDragging = false;
        selectionBox = null;
        squares.forEach(square => {
            square.isHighlighted = false;
        });
    });
    
    // Handle mouse leave
    canvas.addEventListener('mouseleave', () => {
        isSelecting = false;
        isDragging = false;
        selectionBox = null;
        squares.forEach(square => {
            square.isHighlighted = false;
        });
    });
    
    // Handle mouse up outside canvas
    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            if (isDragging && selectionBox) {
                handleSelectedSquares(selectionBox);
            }
            isSelecting = false;
            isDragging = false;
            selectionBox = null;
            squares.forEach(square => {
                square.isHighlighted = false;
            });
        }
    });
    
    // Game loop
    function gameLoop() {
        if (!gameState.isPlaying) return;
        
        // Update game time
        if (gameState.startTime) {
            gameState.gameTime = (Date.now() - gameState.startTime) / 1000;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw animated background
        const time = Date.now() / 1000;
        
        // Draw stars
        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
            
            const pulse = Math.sin(time * 2 + star.x) * 0.2 + 0.8;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * pulse})`;
            ctx.fill();
        });
        
        // Draw selection box
        if (selectionBox) {
            // Draw selection box with gradient
            const gradient = ctx.createLinearGradient(
                selectionBox.x, selectionBox.y,
                selectionBox.x + selectionBox.width,
                selectionBox.y + selectionBox.height
            );
            gradient.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
            gradient.addColorStop(1, 'rgba(96, 165, 250, 0.1)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
            
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
        }
        
        // Update and draw squares
        squares.forEach(square => {
            // Update trail
            const trailPoint = {
                x: square.x + square.size / 2,
                y: square.y + square.size / 2,
                size: gameConfig.trailParticleSize,
                alpha: 1,
                angle: Math.atan2(square.vy, square.vx)
            };
            
            square.trail.unshift(trailPoint);
            if (square.trail.length > gameConfig.trailLength) {
                square.trail.pop();
            }
            
            // Update position
            square.x += square.vx;
            square.y += square.vy;
            
            // Bounce off walls
            if (square.x <= 0 || square.x + square.size >= canvas.width) {
                square.vx *= -1;
            }
            if (square.y <= 0 || square.y + square.size >= canvas.height) {
                square.vy *= -1;
            }
            
            // Draw trail
            square.trail.forEach((particle, index) => {
                const progress = index / gameConfig.trailLength;
                const alpha = 1 - progress;
                const size = particle.size * (1 - progress * 0.5);
                
                // Draw trail particle
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.angle);
                
                // Draw elongated particle
                ctx.beginPath();
                ctx.moveTo(-size * 2, -size);
                ctx.lineTo(size * 2, -size);
                ctx.lineTo(size * 2, size);
                ctx.lineTo(-size * 2, size);
                ctx.closePath();
                
                // Add glow effect
                const gradient = ctx.createLinearGradient(-size * 2, 0, size * 2, 0);
                gradient.addColorStop(0, `${square.color}00`);
                gradient.addColorStop(0.5, `${square.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, `${square.color}00`);
                
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.restore();
            });
            
            // Draw square with highlight effect if selected
            if (square.isHighlighted) {
                ctx.shadowColor = '#60a5fa';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            ctx.fillStyle = square.color;
            ctx.fillRect(square.x, square.y, square.size, square.size);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Draw sparkles for bonus squares
            if (square.color === gameConfig.colors.bonus) {
                const time = Date.now() / 1000;
                for (let i = 0; i < gameConfig.sparkleCount; i++) {
                    const angle = time + (Math.PI * 2 * i) / gameConfig.sparkleCount;
                    const distance = 25 + Math.sin(time * 3 + i) * 5;
                    const x = square.x + square.size / 2 + Math.cos(angle) * distance;
                    const y = square.y + square.size / 2 + Math.sin(angle) * distance;
                    
                    // Draw sparkle
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(angle);
                    
                    // Sparkle shape
                    ctx.beginPath();
                    ctx.moveTo(0, -3);
                    ctx.lineTo(0, 3);
                    ctx.moveTo(-3, 0);
                    ctx.lineTo(3, 0);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    // Sparkle glow
                    ctx.beginPath();
                    ctx.arc(0, 0, 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
        });
        
        // Spawn new squares if needed (for endless mode)
        if (gameState.selectedMode === 'endless' && 
            squares.length < gameConfig.difficulties[gameState.selectedDifficulty].maxSquares) {
            const config = gameConfig.difficulties[gameState.selectedDifficulty];
            const totalSquares = config.maxSquares;
            const currentRedSquares = squares.filter(square => square.color === gameConfig.colors.bad).length;
            const targetRedSquares = Math.floor(totalSquares * config.redSquareRatio);
            
            // Spawn a red square if we're below the target ratio
            if (currentRedSquares < targetRedSquares) {
                spawnSquare(canvas, squares, true);
            } else {
                spawnSquare(canvas, squares, false);
            }
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // Start game loop
    gameLoop();
}

// Add timer update function
function startTimerUpdate() {
    // Clear any existing interval
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    // Update timer every 100ms for smoother display
    gameState.timerInterval = setInterval(() => {
        if (!gameState.isPlaying) {
            clearInterval(gameState.timerInterval);
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - gameState.lastUpdateTime) / 1000;
        gameState.lastUpdateTime = currentTime;
        
        // Update remaining time
        if (gameState.selectedMode === 'levels') {
            gameState.remainingTime = Math.max(0, gameState.remainingTime - deltaTime);
            
            // Check for time up
            if (gameState.remainingTime <= 0) {
                gameState.isPlaying = false;
                showDeathScreen();
                clearInterval(gameState.timerInterval);
            }
        }
        
        updateStats();
    }, 100);
}

// Add visibility change handler
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Store the time when the tab becomes hidden
        gameState.lastUpdateTime = Date.now();
    } else {
        // Update the last update time when the tab becomes visible again
        gameState.lastUpdateTime = Date.now();
    }
});

// Update game stats display
function updateStats() {
    // Update score
    document.querySelector('.stat-item.score .stat-value').textContent = gameState.score;
    
    // Update lives (only in levels mode or non-easy difficulties)
    const livesElement = document.querySelector('.stat-item.lives');
    const config = gameConfig.difficulties[gameState.selectedDifficulty];
    
    if (config.lives !== Infinity) {
        livesElement.classList.add('show');
        document.querySelector('.stat-item.lives .stat-value').textContent = gameState.lives;
    } else {
        livesElement.classList.remove('show');
    }
    
    // Update level (only in levels mode)
    const levelElement = document.querySelector('.stat-item.level');
    if (gameState.selectedMode === 'levels') {
        levelElement.style.display = 'flex';
        document.querySelector('.stat-item.level .stat-value').textContent = gameState.level;
    } else {
        levelElement.style.display = 'none';
    }
    
    // Update timer
    const timerElement = document.querySelector('.stat-item.timer');
    const timerValue = document.querySelector('.stat-item.timer .stat-value');
    
    if (gameState.selectedMode === 'levels') {
        timerElement.style.display = 'flex';
        
        // Format time
        const minutes = Math.floor(gameState.remainingTime / 60);
        const seconds = Math.floor(gameState.remainingTime % 60);
        timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add warning class when time is running low
        if (gameState.remainingTime <= 30) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    } else {
        timerElement.style.display = 'none';
    }
}

// Add event listener for the death screen restart button
document.querySelector('.death-screen .restart-btn').addEventListener('click', restartGame);

// Function to show time bonus popup
function showTimeBonusPopup(seconds, breakdown) {
    const timeBonusPopup = document.createElement('div');
    timeBonusPopup.className = 'time-bonus-popup';
    
    // Create detailed breakdown
    timeBonusPopup.innerHTML = `
        <div class="total-bonus">+${seconds}s</div>
        <div class="bonus-breakdown">
            <div class="bonus-item">Base: +${breakdown.base}s</div>
            <div class="bonus-item">Speed: +${breakdown.speed}s</div>
            <div class="bonus-item">Combo: +${breakdown.combo}s</div>
        </div>
    `;
    
    document.body.appendChild(timeBonusPopup);
    
    timeBonusPopup.classList.add('show');
    setTimeout(() => {
        timeBonusPopup.classList.remove('show');
        timeBonusPopup.remove();
    }, 2000);
}

// New notification system
function showNotification(message, duration = 1500) {
    const notificationContent = document.querySelector('.notification-content');
    notificationContent.innerHTML = message;
    notificationContent.classList.add('show');
    
    setTimeout(() => {
        notificationContent.classList.remove('show');
    }, duration);
} 