class DavesArcadeAsteroids {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.touchControls = {
            joystick: { x: 0, y: 0, active: false },
            shootPressed: false,
            pausePressed: false,
            soundPressed: false
        };
        
        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.score = 0;
        this.highScore = localStorage.getItem('davesAsteroidsHighScore') || 0;
        this.lives = 3;
        this.level = 1;
        this.money = 0;
        this.exWifeMode = false;
        this.firstDeath = true;
        this.soundEnabled = true;
        
        // Power-ups
        this.powerUps = {
            rapidFire: { active: false, duration: 0, maxDuration: 300 },
            shield: { active: false, duration: 0, maxDuration: 400 }
        };
        
        // Dave (player)
        this.dave = {
            x: this.width / 2,
            y: this.height / 2,
            size: 20,
            speed: 5,
            angle: 0,
            velocity: { x: 0, y: 0 },
            friction: 0.98,
            name: "DAVE",
            invulnerable: false,
            invulnerabilityTime: 0
        };
        
        // Ex-wife (the monster!)
        this.exWife = {
            x: -100,
            y: -100,
            size: 35,
            speed: 2,
            angle: 0,
            velocity: { x: 0, y: 0 },
            active: false,
            name: "KAREN"
        };
        
        // Game objects
        this.needles = [];
        this.asteroids = [];
        this.particles = [];
        this.moneyParticles = [];
        this.surferTrails = [];
        this.powerUpItems = [];
        
        // Audio elements
        this.audio = {
            shoot: document.getElementById('shootSound'),
            explosion: document.getElementById('explosionSound'),
            exWife: document.getElementById('exWifeSound'),
            money: document.getElementById('moneySound'),
            powerUp: document.getElementById('powerUpSound'),
            background: document.getElementById('backgroundMusic')
        };
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        this.setupMobileControls();
        
        // Initialize game
        this.resizeCanvas();
        this.spawnAsteroids();
        this.gameLoop();
        this.updateUI();
    }
    
    resizeCanvas() {
        if (this.isMobile) {
            const container = this.canvas.parentElement;
            const containerWidth = container.clientWidth - 20; // Account for padding
            const containerHeight = Math.min(containerWidth * 0.75, window.innerHeight * 0.4);
            
            this.canvas.style.width = containerWidth + 'px';
            this.canvas.style.height = containerHeight + 'px';
            
            // Maintain aspect ratio
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyP') {
                this.togglePause();
            }
            
            if (e.code === 'KeyM') {
                this.toggleSound();
            }
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.gameRunning && !this.gamePaused) {
                    this.shootNeedle();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Mobile resume button
        const mobileResumeBtn = document.getElementById('mobileResumeBtn');
        if (mobileResumeBtn) {
            mobileResumeBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    setupMobileControls() {
        if (!this.isMobile) return;
        
        // Joystick controls
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystickKnob');
        
        if (joystick && joystickKnob) {
            let joystickRect = joystick.getBoundingClientRect();
            let isDragging = false;
            
            const updateJoystick = (clientX, clientY) => {
                const rect = joystick.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const deltaX = clientX - centerX;
                const deltaY = clientY - centerY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const maxDistance = rect.width / 2 - 15;
                
                if (distance > maxDistance) {
                    const angle = Math.atan2(deltaY, deltaX);
                    const x = centerX + Math.cos(angle) * maxDistance;
                    const y = centerY + Math.sin(angle) * maxDistance;
                    joystickKnob.style.left = (x - rect.left) + 'px';
                    joystickKnob.style.top = (y - rect.top) + 'px';
                } else {
                    joystickKnob.style.left = (clientX - rect.left) + 'px';
                    joystickKnob.style.top = (clientY - rect.top) + 'px';
                }
                
                // Calculate normalized joystick values
                const normalizedX = (deltaX / maxDistance) * Math.min(distance / maxDistance, 1);
                const normalizedY = (deltaY / maxDistance) * Math.min(distance / maxDistance, 1);
                
                this.touchControls.joystick.x = normalizedX;
                this.touchControls.joystick.y = normalizedY;
                this.touchControls.joystick.active = true;
                joystick.classList.add('active');
            };
            
            const resetJoystick = () => {
                joystickKnob.style.left = '50%';
                joystickKnob.style.top = '50%';
                joystickKnob.style.transform = 'translate(-50%, -50%)';
                this.touchControls.joystick.x = 0;
                this.touchControls.joystick.y = 0;
                this.touchControls.joystick.active = false;
                joystick.classList.remove('active');
                isDragging = false;
            };
            
            // Touch events
            joystick.addEventListener('touchstart', (e) => {
                e.preventDefault();
                isDragging = true;
                const touch = e.touches[0];
                updateJoystick(touch.clientX, touch.clientY);
            });
            
            joystick.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (isDragging) {
                    const touch = e.touches[0];
                    updateJoystick(touch.clientX, touch.clientY);
                }
            });
            
            joystick.addEventListener('touchend', (e) => {
                e.preventDefault();
                resetJoystick();
            });
            
            // Mouse events for testing
            joystick.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                updateJoystick(e.clientX, e.clientY);
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    updateJoystick(e.clientX, e.clientY);
                }
            });
            
            document.addEventListener('mouseup', () => {
                resetJoystick();
            });
        }
        
        // Action buttons
        const shootBtn = document.getElementById('shootBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const soundBtn = document.getElementById('soundBtn');
        
        if (shootBtn) {
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchControls.shootPressed = true;
                if (this.gameRunning && !this.gamePaused) {
                    this.shootNeedle();
                }
            });
            
            shootBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchControls.shootPressed = false;
            });
            
            // Mouse events for testing
            shootBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.touchControls.shootPressed = true;
                if (this.gameRunning && !this.gamePaused) {
                    this.shootNeedle();
                }
            });
            
            shootBtn.addEventListener('mouseup', () => {
                this.touchControls.shootPressed = false;
            });
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.togglePause();
            });
            
            pauseBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.togglePause();
            });
        }
        
        if (soundBtn) {
            soundBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.toggleSound();
            });
            
            soundBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.toggleSound();
            });
        }
        
        // Auto-shoot for mobile
        setInterval(() => {
            if (this.touchControls.shootPressed && this.gameRunning && !this.gamePaused) {
                this.shootNeedle();
            }
        }, 200);
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (this.soundEnabled) {
            this.audio.background.volume = 0.3;
            this.audio.background.play().catch(() => {});
        } else {
            this.audio.background.pause();
        }
    }
    
    playSound(audioElement) {
        if (this.soundEnabled && audioElement) {
            audioElement.currentTime = 0;
            audioElement.play().catch(() => {});
        }
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (this.gamePaused) {
            pauseMenu.classList.remove('hidden');
            this.audio.background.pause();
        } else {
            pauseMenu.classList.add('hidden');
            if (this.soundEnabled) {
                this.audio.background.play().catch(() => {});
            }
        }
    }
    
    shootNeedle() {
        const fireRate = this.powerUps.rapidFire.active ? 5 : 15;
        if (this.needles.length > 0 && this.needles[this.needles.length - 1].life > 60 - fireRate) return;
        
        const needle = {
            x: this.dave.x + Math.cos(this.dave.angle) * this.dave.size,
            y: this.dave.y + Math.sin(this.dave.angle) * this.dave.size,
            velocity: {
                x: Math.cos(this.dave.angle) * 15,
                y: Math.sin(this.dave.angle) * 15
            },
            size: 3,
            life: 100,
            color: this.powerUps.rapidFire.active ? '#ff00ff' : '#00ff00'
        };
        
        this.needles.push(needle);
        this.playSound(this.audio.shoot);
    }
    
    spawnPowerUp() {
        if (Math.random() < 0.02) { // 2% chance per frame
            const powerUp = {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                type: Math.random() < 0.5 ? 'rapidFire' : 'shield',
                size: 15,
                rotation: 0,
                rotationSpeed: 0.05
            };
            this.powerUpItems.push(powerUp);
        }
    }
    
    spawnAsteroids() {
        const count = 3 + this.level * 2;
        
        for (let i = 0; i < count; i++) {
            const asteroid = {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 30 + 20,
                velocity: {
                    x: (Math.random() - 0.5) * 4,
                    y: (Math.random() - 0.5) * 4
                },
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                vertices: Math.floor(Math.random() * 8) + 6,
                moneyValue: Math.floor(Math.random() * 50) + 10,
                color: this.getAsteroidColor()
            };
            
            // Ensure asteroids don't spawn on top of Dave
            const distance = Math.sqrt(
                Math.pow(asteroid.x - this.dave.x, 2) + 
                Math.pow(asteroid.y - this.dave.y, 2)
            );
            
            if (distance > 100) {
                this.asteroids.push(asteroid);
            }
        }
    }
    
    getAsteroidColor() {
        const colors = ['#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#ff6b6b'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateDave() {
        // Handle keyboard input
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.dave.velocity.x += Math.cos(this.dave.angle) * 0.8;
            this.dave.velocity.y += Math.sin(this.dave.angle) * 0.8;
        }
        
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.dave.velocity.x -= Math.cos(this.dave.angle) * 0.8;
            this.dave.velocity.y -= Math.sin(this.dave.angle) * 0.8;
        }
        
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.dave.angle -= 0.15;
        }
        
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.dave.angle += 0.15;
        }
        
        // Handle touch input
        if (this.touchControls.joystick.active) {
            const joystick = this.touchControls.joystick;
            const sensitivity = 0.8;
            
            // Move forward/backward based on Y axis
            if (joystick.y < -0.2) {
                this.dave.velocity.x += Math.cos(this.dave.angle) * sensitivity;
                this.dave.velocity.y += Math.sin(this.dave.angle) * sensitivity;
            } else if (joystick.y > 0.2) {
                this.dave.velocity.x -= Math.cos(this.dave.angle) * sensitivity;
                this.dave.velocity.y -= Math.sin(this.dave.angle) * sensitivity;
            }
            
            // Rotate based on X axis
            if (joystick.x < -0.2) {
                this.dave.angle -= 0.15;
            } else if (joystick.x > 0.2) {
                this.dave.angle += 0.15;
            }
        }
        
        // Apply velocity and friction
        this.dave.x += this.dave.velocity.x;
        this.dave.y += this.dave.velocity.y;
        this.dave.velocity.x *= this.dave.friction;
        this.dave.velocity.y *= this.dave.friction;
        
        // Create surfer trail effect
        if (Math.abs(this.dave.velocity.x) > 0.1 || Math.abs(this.dave.velocity.y) > 0.1) {
            this.createSurferTrail();
        }
        
        // Wrap around screen
        if (this.dave.x < 0) this.dave.x = this.width;
        if (this.dave.x > this.width) this.dave.x = 0;
        if (this.dave.y < 0) this.dave.y = this.height;
        if (this.dave.y > this.height) this.dave.y = 0;
        
        // Update invulnerability
        if (this.dave.invulnerable) {
            this.dave.invulnerabilityTime--;
            if (this.dave.invulnerabilityTime <= 0) {
                this.dave.invulnerable = false;
            }
        }
    }
    
    updatePowerUps() {
        // Update active power-ups
        for (let powerUp in this.powerUps) {
            if (this.powerUps[powerUp].active) {
                this.powerUps[powerUp].duration--;
                if (this.powerUps[powerUp].duration <= 0) {
                    this.powerUps[powerUp].active = false;
                }
            }
        }
        
        // Update power-up items
        for (let i = this.powerUpItems.length - 1; i >= 0; i--) {
            const powerUp = this.powerUpItems[i];
            powerUp.rotation += powerUp.rotationSpeed;
            
            // Check collision with Dave
            const distance = Math.sqrt(
                Math.pow(this.dave.x - powerUp.x, 2) + 
                Math.pow(this.dave.y - powerUp.y, 2)
            );
            
            if (distance < powerUp.size + this.dave.size) {
                this.activatePowerUp(powerUp.type);
                this.powerUpItems.splice(i, 1);
                this.playSound(this.audio.powerUp);
            }
        }
    }
    
    activatePowerUp(type) {
        this.powerUps[type].active = true;
        this.powerUps[type].duration = this.powerUps[type].maxDuration;
    }
    
    createSurferTrail() {
        const trail = {
            x: this.dave.x - Math.cos(this.dave.angle) * 15,
            y: this.dave.y - Math.sin(this.dave.angle) * 15,
            life: 25
        };
        this.surferTrails.push(trail);
    }
    
    updateExWife() {
        if (!this.exWife.active) return;
        
        // Calculate direction to Dave
        const dx = this.dave.x - this.exWife.x;
        const dy = this.dave.y - this.exWife.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Move towards Dave
            this.exWife.velocity.x = (dx / distance) * this.exWife.speed;
            this.exWife.velocity.y = (dy / distance) * this.exWife.speed;
        }
        
        // Update position
        this.exWife.x += this.exWife.velocity.x;
        this.exWife.y += this.exWife.velocity.y;
        
        // Wrap around screen
        if (this.exWife.x < -this.exWife.size) this.exWife.x = this.width + this.exWife.size;
        if (this.exWife.x > this.width + this.exWife.size) this.exWife.x = -this.exWife.size;
        if (this.exWife.y < -this.exWife.size) this.exWife.y = this.height + this.exWife.size;
        if (this.exWife.y > this.height + this.exWife.size) this.exWife.y = -this.exWife.size;
    }
    
    updateNeedles() {
        for (let i = this.needles.length - 1; i >= 0; i--) {
            const needle = this.needles[i];
            
            needle.x += needle.velocity.x;
            needle.y += needle.velocity.y;
            needle.life--;
            
            // Wrap around screen
            if (needle.x < 0) needle.x = this.width;
            if (needle.x > this.width) needle.x = 0;
            if (needle.y < 0) needle.y = this.height;
            if (needle.y > this.height) needle.y = 0;
            
            // Remove expired needles
            if (needle.life <= 0) {
                this.needles.splice(i, 1);
            }
        }
    }
    
    updateAsteroids() {
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            asteroid.x += asteroid.velocity.x;
            asteroid.y += asteroid.velocity.y;
            asteroid.rotation += asteroid.rotationSpeed;
            
            // Wrap around screen
            if (asteroid.x < -asteroid.size) asteroid.x = this.width + asteroid.size;
            if (asteroid.x > this.width + asteroid.size) asteroid.x = -asteroid.size;
            if (asteroid.y < -asteroid.size) asteroid.y = this.height + asteroid.size;
            if (asteroid.y > this.height + asteroid.size) asteroid.y = -asteroid.size;
        }
    }
    
    checkCollisions() {
        // Needles vs Asteroids
        for (let i = this.needles.length - 1; i >= 0; i--) {
            const needle = this.needles[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                
                const distance = Math.sqrt(
                    Math.pow(needle.x - asteroid.x, 2) + 
                    Math.pow(needle.y - asteroid.y, 2)
                );
                
                if (distance < asteroid.size) {
                    // Create explosion particles
                    this.createExplosion(asteroid.x, asteroid.y, asteroid.size, asteroid.color);
                    
                    // Add money
                    this.money += asteroid.moneyValue;
                    
                    // Split asteroid if large enough
                    if (asteroid.size > 15) {
                        this.splitAsteroid(asteroid);
                    }
                    
                    // Remove needle and asteroid
                    this.needles.splice(i, 1);
                    this.asteroids.splice(j, 1);
                    
                    // Add score
                    this.score += Math.floor(asteroid.size * 10);
                    
                    this.playSound(this.audio.explosion);
                    break;
                }
            }
        }
        
        // Dave vs Asteroids (only if not invulnerable and no shield)
        if (!this.dave.invulnerable && !this.powerUps.shield.active) {
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i];
                
                const distance = Math.sqrt(
                    Math.pow(this.dave.x - asteroid.x, 2) + 
                    Math.pow(this.dave.y - asteroid.y, 2)
                );
                
                if (distance < asteroid.size + this.dave.size) {
                    // Create explosion
                    this.createExplosion(this.dave.x, this.dave.y, 30, '#ff0000');
                    
                    // Lose life
                    this.lives--;
                    
                    // Remove asteroid
                    this.asteroids.splice(i, 1);
                    
                    // Reset Dave position and make invulnerable
                    this.dave.x = this.width / 2;
                    this.dave.y = this.height / 2;
                    this.dave.velocity = { x: 0, y: 0 };
                    this.dave.invulnerable = true;
                    this.dave.invulnerabilityTime = 120; // 2 seconds
                    
                    // Activate ex-wife mode after first death
                    if (this.firstDeath && this.lives > 0) {
                        this.activateExWifeMode();
                    }
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                    
                    break;
                }
            }
        }
        
        // Dave vs Ex-Wife
        if (this.exWife.active && !this.powerUps.shield.active) {
            const distance = Math.sqrt(
                Math.pow(this.dave.x - this.exWife.x, 2) + 
                Math.pow(this.dave.y - this.exWife.y, 2)
            );
            
            if (distance < this.exWife.size + this.dave.size) {
                this.exWifeCaughtDave();
            }
        }
    }
    
    activateExWifeMode() {
        this.firstDeath = false;
        this.exWifeMode = true;
        this.exWife.active = true;
        this.exWife.x = -50;
        this.exWife.y = -50;
        
        // Show warning with countdown
        const warning = document.getElementById('exWifeWarning');
        warning.classList.remove('hidden');
        this.playSound(this.audio.exWife);
        
        let countdown = 3;
        const timer = document.getElementById('warningTimer');
        const countdownInterval = setInterval(() => {
            countdown--;
            timer.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                warning.classList.add('hidden');
            }
        }, 1000);
    }
    
    exWifeCaughtDave() {
        // Make all money fall out!
        this.createMoneyExplosion();
        this.money = 0;
        
        // Create big explosion
        this.createExplosion(this.dave.x, this.dave.y, 50, '#ff0000');
        
        // Reset Dave position
        this.dave.x = this.width / 2;
        this.dave.y = this.height / 2;
        this.dave.velocity = { x: 0, y: 0 };
        
        // Deactivate ex-wife temporarily
        this.exWife.active = false;
        this.exWife.x = -100;
        this.exWife.y = -100;
        
        setTimeout(() => {
            if (this.lives > 0) {
                this.exWife.active = true;
            }
        }, 2000);
        
        this.playSound(this.audio.money);
    }
    
    createMoneyExplosion() {
        const moneyCount = Math.min(this.money / 10, 50);
        
        for (let i = 0; i < moneyCount; i++) {
            const moneyParticle = {
                x: this.dave.x + (Math.random() - 0.5) * 100,
                y: this.dave.y + (Math.random() - 0.5) * 100,
                velocity: {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                },
                life: Math.random() * 60 + 60,
                value: Math.floor(Math.random() * 20) + 1
            };
            
            this.moneyParticles.push(moneyParticle);
        }
    }
    
    splitAsteroid(asteroid) {
        const pieces = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < pieces; i++) {
            const newAsteroid = {
                x: asteroid.x + (Math.random() - 0.5) * 20,
                y: asteroid.y + (Math.random() - 0.5) * 20,
                size: asteroid.size * 0.6,
                velocity: {
                    x: asteroid.velocity.x + (Math.random() - 0.5) * 4,
                    y: asteroid.velocity.y + (Math.random() - 0.5) * 4
                },
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                vertices: Math.floor(Math.random() * 6) + 4,
                moneyValue: Math.floor(asteroid.moneyValue * 0.6),
                color: asteroid.color
            };
            
            this.asteroids.push(newAsteroid);
        }
    }
    
    createExplosion(x, y, size, color) {
        const particleCount = Math.floor(size / 2);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = {
                x: x + (Math.random() - 0.5) * size,
                y: y + (Math.random() - 0.5) * size,
                velocity: {
                    x: (Math.random() - 0.5) * 8,
                    y: (Math.random() - 0.5) * 8
                },
                size: Math.random() * 3 + 1,
                life: Math.random() * 30 + 20,
                color: color || `hsl(${Math.random() * 60 + 15}, 100%, 50%)`
            };
            
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.velocity.x *= 0.98;
            particle.velocity.y *= 0.98;
            particle.life--;
            particle.size *= 0.99;
            
            if (particle.life <= 0 || particle.size < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateMoneyParticles() {
        for (let i = this.moneyParticles.length - 1; i >= 0; i--) {
            const particle = this.moneyParticles[i];
            
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.velocity.y += 0.2; // Gravity
            particle.life--;
            
            if (particle.life <= 0) {
                this.moneyParticles.splice(i, 1);
            }
        }
    }
    
    updateSurferTrails() {
        for (let i = this.surferTrails.length - 1; i >= 0; i--) {
            const trail = this.surferTrails[i];
            trail.life--;
            
            if (trail.life <= 0) {
                this.surferTrails.splice(i, 1);
            }
        }
    }
    
    checkLevelComplete() {
        if (this.asteroids.length === 0) {
            this.showLevelComplete();
            setTimeout(() => {
                this.level++;
                this.spawnAsteroids();
                document.getElementById('levelComplete').classList.add('hidden');
            }, 2000);
        }
    }
    
    showLevelComplete() {
        const levelComplete = document.getElementById('levelComplete');
        const levelBonus = document.getElementById('levelBonus');
        const bonus = this.level * 1000;
        this.money += bonus;
        levelBonus.textContent = `$${bonus}`;
        levelComplete.classList.remove('hidden');
    }
    
    drawDave() {
        this.ctx.save();
        this.ctx.translate(this.dave.x, this.dave.y);
        this.ctx.rotate(this.dave.angle);
        
        // Shield effect
        if (this.powerUps.shield.active) {
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.dave.size + 10, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
        
        // Invulnerability flash
        if (this.dave.invulnerable && Math.floor(this.dave.invulnerabilityTime / 10) % 2) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Surfboard
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(-15, -5, 30, 10);
        
        // Dave's body
        this.ctx.fillStyle = '#ffd93d';
        this.ctx.beginPath();
        this.ctx.arc(0, -8, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Dave's arms
        this.ctx.strokeStyle = '#ffd93d';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -5);
        this.ctx.lineTo(-15, -15);
        this.ctx.moveTo(5, -5);
        this.ctx.lineTo(15, -15);
        this.ctx.stroke();
        
        // Surfboard details
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-15, -5, 30, 10);
        
        // Dave's name
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DAVE', 0, -25);
        
        this.ctx.restore();
    }
    
    drawExWife() {
        if (!this.exWife.active) return;
        
        this.ctx.save();
        this.ctx.translate(this.exWife.x, this.exWife.y);
        
        // Ex-wife body (scary monster!)
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.exWife.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Angry eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(-8, -5, 4, 0, Math.PI * 2);
        this.ctx.arc(8, -5, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(-8, -5, 2, 0, Math.PI * 2);
        this.ctx.arc(8, -5, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Angry mouth
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 5, 8, 0, Math.PI);
        this.ctx.stroke();
        
        // Ex-wife name
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('KAREN', 0, -this.exWife.size - 10);
        
        this.ctx.restore();
    }
    
    drawPowerUps() {
        for (const powerUp of this.powerUpItems) {
            this.ctx.save();
            this.ctx.translate(powerUp.x, powerUp.y);
            this.ctx.rotate(powerUp.rotation);
            
            // Power-up background
            this.ctx.fillStyle = powerUp.type === 'rapidFire' ? '#ff00ff' : '#00d4ff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, powerUp.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Power-up symbol
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(powerUp.type === 'rapidFire' ? '⚡' : '🛡️', 0, 5);
            
            this.ctx.restore();
        }
    }
    
    drawNeedles() {
        for (const needle of this.needles) {
            this.ctx.fillStyle = needle.color;
            this.ctx.beginPath();
            this.ctx.arc(needle.x, needle.y, needle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Needle trail
            this.ctx.strokeStyle = needle.color;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(needle.x, needle.y);
            this.ctx.lineTo(
                needle.x - needle.velocity.x * 0.5,
                needle.y - needle.velocity.y * 0.5
            );
            this.ctx.stroke();
        }
    }
    
    drawAsteroids() {
        for (const asteroid of this.asteroids) {
            this.ctx.save();
            this.ctx.translate(asteroid.x, asteroid.y);
            this.ctx.rotate(asteroid.rotation);
            
            this.ctx.fillStyle = asteroid.color;
            
            this.ctx.beginPath();
            for (let i = 0; i < asteroid.vertices; i++) {
                const angle = (i / asteroid.vertices) * Math.PI * 2;
                const radius = asteroid.size + Math.sin(angle * 3) * 5;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Asteroid outline
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 50;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawMoneyParticles() {
        for (const particle of this.moneyParticles) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = particle.life / 120;
            this.ctx.fillText('$' + particle.value, particle.x, particle.y);
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawSurferTrails() {
        for (const trail of this.surferTrails) {
            this.ctx.fillStyle = `rgba(0, 255, 65, ${trail.life / 25})`;
            this.ctx.beginPath();
            this.ctx.arc(trail.x, trail.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    updateUI() {
        // Update score display
        document.getElementById('score').textContent = this.score.toString().padStart(6, '0');
        document.getElementById('highScore').textContent = this.highScore.toString().padStart(6, '0');
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('money').textContent = '$' + this.money;
        
        // Update power-up bars
        const rapidFireBar = document.getElementById('rapidFireBar');
        const shieldBar = document.getElementById('shieldBar');
        
        if (rapidFireBar) {
            rapidFireBar.style.width = (this.powerUps.rapidFire.duration / this.powerUps.rapidFire.maxDuration * 100) + '%';
        }
        if (shieldBar) {
            shieldBar.style.width = (this.powerUps.shield.duration / this.powerUps.shield.maxDuration * 100) + '%';
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw game objects
        this.drawSurferTrails();
        this.drawParticles();
        this.drawMoneyParticles();
        this.drawAsteroids();
        this.drawPowerUps();
        this.drawNeedles();
        this.drawExWife();
        this.drawDave();
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.updateDave();
        this.updateExWife();
        this.updatePowerUps();
        this.updateNeedles();
        this.updateAsteroids();
        this.updateParticles();
        this.updateMoneyParticles();
        this.updateSurferTrails();
        this.checkCollisions();
        this.checkLevelComplete();
        this.spawnPowerUp();
        this.updateUI();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        document.getElementById('pauseMenu').classList.add('hidden');
        
        if (this.soundEnabled) {
            this.audio.background.volume = 0.3;
            this.audio.background.play().catch(() => {});
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('davesAsteroidsHighScore', this.highScore);
        }
        
        document.getElementById('finalScore').textContent = this.score.toString().padStart(6, '0');
        document.getElementById('finalMoney').textContent = '$' + this.money;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('gameOver').classList.remove('hidden');
        this.audio.background.pause();
    }
    
    restartGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.money = 0;
        this.exWifeMode = false;
        this.firstDeath = true;
        this.needles = [];
        this.asteroids = [];
        this.particles = [];
        this.moneyParticles = [];
        this.surferTrails = [];
        this.powerUpItems = [];
        
        // Reset power-ups
        for (let powerUp in this.powerUps) {
            this.powerUps[powerUp].active = false;
            this.powerUps[powerUp].duration = 0;
        }
        
        // Reset touch controls
        this.touchControls = {
            joystick: { x: 0, y: 0, active: false },
            shootPressed: false,
            pausePressed: false,
            soundPressed: false
        };
        
        this.dave.x = this.width / 2;
        this.dave.y = this.height / 2;
        this.dave.velocity = { x: 0, y: 0 };
        this.dave.angle = 0;
        this.dave.invulnerable = false;
        this.dave.invulnerabilityTime = 0;
        
        this.exWife.active = false;
        this.exWife.x = -100;
        this.exWife.y = -100;
        
        document.getElementById('gameOver').classList.add('hidden');
        this.spawnAsteroids();
        this.startGame();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    const game = new DavesArcadeAsteroids();
    game.startGame();
}); 