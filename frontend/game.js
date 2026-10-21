let scene, camera, renderer;
let playerCar, environmentGroup;
let obstacles = [];
let buildings = [];
let trees = [];

let currentSpeed = 0;
let maxSpeed = 1.8;
let acceleration = 0.02;
let deceleration = 0.01;
let handling = 0.22;

let score = 0, gameTime = 0, highScore = 0;
let isGameOver = false, isPlaying = false;
let selectedMode = 'moderate';

// Colorful Car Palettes (NO BLACK COLOR)
const carColors = [0xff2200, 0x00a8ff, 0x2ed573, 0xffbe76, 0x9b59b6]; // Red, Blue, Green, Yellow, Purple
let colorIndex = 0;

let gameTimer, scoreTimer;

// Audio System using Web Audio API for Loud & Clear Music
let audioCtx = null;
let bgmInterval = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Play Melodic Note Function
function playNote(freq, duration, type = 'sine', volume = 0.2) {
    if (!audioCtx || isGameOver) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// Continuous Energetic Background Music Loop
function startMelodicBGM() {
    initAudio();
    stopBGM();

    // Notes sequence (Upbeat Driving Rhythm)
    const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 440.00, 349.23]; 
    let step = 0;

    bgmInterval = setInterval(() => {
        if (isPlaying && !isGameOver) {
            let note = melody[step % melody.length];
            playNote(note, 0.25, 'triangle', 0.25); // Loud Clear Synth Tone
            playNote(note / 2, 0.3, 'sawtooth', 0.15); // Bass Backing Line
            step++;
        }
    }, 200); // Fast Upbeat Tempo
}

function stopBGM() {
    if (bgmInterval) {
        clearInterval(bgmInterval);
        bgmInterval = null;
    }
}

// Special Game-Over / Crash Music
function playGameOverMelody() {
    initAudio();
    stopBGM();

    // Sad/Descending Loss Notes
    const sadNotes = [400, 350, 300, 220, 150];
    sadNotes.forEach((freq, idx) => {
        setTimeout(() => {
            playNote(freq, 0.4, 'sawtooth', 0.3);
        }, idx * 180);
    });
}

const startMenu = document.getElementById('startMenu');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreValue');
const timeDisplay = document.getElementById('timeValue');
const speedDisplay = document.getElementById('speedValue');
const highScoreDisplay = document.getElementById('highScoreValue');

let keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
    let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(k)) keys[k] = true;
});
window.addEventListener('keyup', (e) => {
    let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(k)) keys[k] = false;
});

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2536);
    scene.fog = new THREE.FogExp2(0x1a2536, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3.2, 7.5);
    camera.lookAt(0, 1, -5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createEnvironment();

    // Player Car with initial color
    playerCar = createSportsCar(carColors[colorIndex]);
    playerCar.position.set(0, 0, 0);
    scene.add(playerCar);

    window.addEventListener('resize', onWindowResize);
}

function createEnvironment() {
    environmentGroup = new THREE.Group();

    // Grass
    const grassGeo = new THREE.PlaneGeometry(400, 1200);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x1e824c, roughness: 0.8 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.01;
    environmentGroup.add(grass);

    // Road
    const roadGeo = new THREE.PlaneGeometry(18, 1200);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    environmentGroup.add(road);

    // Curbs
    for (let side of [-9.2, 9.2]) {
        const curbGeo = new THREE.BoxGeometry(0.5, 0.25, 1200);
        const curbMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(side, 0.1, 0);
        environmentGroup.add(curb);
    }

    // Buildings & Trees
    for (let z = -500; z < 500; z += 40) {
        createBuilding(-25, z);
        createBuilding(25, z);
        createTree(-14, z + 20);
        createTree(14, z + 20);
    }

    scene.add(environmentGroup);
}

function createBuilding(x, z) {
    const height = 15 + Math.random() * 25;
    const geo = new THREE.BoxGeometry(12, height, 18);
    const mat = new THREE.MeshStandardMaterial({
        color: [0x34495e, 0x2c3e50, 0x7f8c8d, 0x95a5a6][Math.floor(Math.random() * 4)],
        roughness: 0.3
    });
    const bldg = new THREE.Mesh(geo, mat);
    bldg.position.set(x, height / 2, z);
    environmentGroup.add(bldg);
    buildings.push(bldg);
}

function createTree(x, z) {
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 3),
        new THREE.MeshStandardMaterial({ color: 0x5c4033 })
    );
    trunk.position.y = 1.5;
    treeGroup.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x27ae60 })
    );
    leaves.position.y = 4.5;
    treeGroup.add(leaves);

    treeGroup.position.set(x, 0, z);
    environmentGroup.add(treeGroup);
    trees.push(treeGroup);
}

function createSportsCar(carColor) {
    const carGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: carColor,
        metalness: 0.85,
        roughness: 0.15
    });

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 4.4), bodyMat);
    lowerBody.position.y = 0.35;
    carGroup.add(lowerBody);

    const cabinGeo = new THREE.BoxGeometry(1.5, 0.45, 2.0);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.75, -0.1);
    carGroup.add(cabin);

    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), lightMat);
    l1.position.set(-0.7, 0.4, -2.2);
    const l2 = l1.clone();
    l2.position.x = 0.7;
    carGroup.add(l1);
    carGroup.add(l2);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

    const positions = [
        [-1.05, 0.35, -1.3],
        [1.05, 0.35, -1.3],
        [-1.05, 0.35, 1.3],
        [1.05, 0.35, 1.3]
    ];

    positions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        carGroup.add(w);
    });

    return carGroup;
}

function selectMode(mode) {
    selectedMode = mode;
    if (mode === 'easy') { maxSpeed = 1.2; acceleration = 0.015; }
    else if (mode === 'moderate') { maxSpeed = 1.8; acceleration = 0.025; }
    else if (mode === 'hard') { maxSpeed = 2.5; acceleration = 0.035; }

    startMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    resetGame();
}

function resetGame() {
    // Change car color sequentially (Red -> Blue -> Green -> Yellow -> Purple)
    colorIndex = (colorIndex + 1) % carColors.length;
    scene.remove(playerCar);
    playerCar = createSportsCar(carColors[colorIndex]);
    playerCar.position.set(0, 0, 0);
    scene.add(playerCar);

    currentSpeed = 0;
    obstacles.forEach(obs => scene.remove(obs.mesh));
    obstacles = [];

    score = 0;
    gameTime = 0;
    isGameOver = false;
    isPlaying = true;

    startMelodicBGM(); // Start loud melodic driving music

    clearInterval(gameTimer);
    clearInterval(scoreTimer);

    gameTimer = setInterval(() => {
        if (!isGameOver && isPlaying) {
            gameTime++;
            timeDisplay.textContent = gameTime;
        }
    }, 1000);

    scoreTimer = setInterval(() => {
        if (!isGameOver && isPlaying && currentSpeed > 0.1) {
            score += Math.floor(currentSpeed * 10);
            scoreDisplay.textContent = score;
        }
    }, 200);

    spawnObstacle();
}

function spawnObstacle() {
    if (!isPlaying || isGameOver) return;

    const lanes = [-5.5, 0, 5.5];
    const randomX = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = [0xff4757, 0x2ed573, 0xffa502, 0x9b59b6];

    const obsCar = createSportsCar(colors[Math.floor(Math.random() * colors.length)]);
    obsCar.position.set(randomX, 0, -140);
    scene.add(obsCar);

    obstacles.push({ mesh: obsCar });

    let spawnDelay = Math.max(800, 2000 - currentSpeed * 500);
    setTimeout(spawnObstacle, spawnDelay);
}

function animate() {
    requestAnimationFrame(animate);

    if (isPlaying && !isGameOver) {
        if (keys.ArrowUp || keys.w) {
            if (currentSpeed < maxSpeed) currentSpeed += acceleration;
        } else if (keys.ArrowDown || keys.s) {
            if (currentSpeed > 0) currentSpeed -= acceleration * 2;
        } else {
            if (currentSpeed > 0) currentSpeed -= deceleration;
        }

        if (currentSpeed < 0) currentSpeed = 0;

        if (keys.ArrowLeft || keys.a) {
            if (playerCar.position.x > -6.5) {
                playerCar.position.x -= handling;
                playerCar.rotation.y = 0.08;
            }
        } else if (keys.ArrowRight || keys.d) {
            if (playerCar.position.x < 6.5) {
                playerCar.position.x += handling;
                playerCar.rotation.y = -0.08;
            }
        } else {
            playerCar.rotation.y = 0;
        }

        buildings.forEach(b => {
            b.position.z += currentSpeed * 20;
            if (b.position.z > 100) b.position.z -= 800;
        });

        trees.forEach(t => {
            t.position.z += currentSpeed * 20;
            if (t.position.z > 100) t.position.z -= 800;
        });

        speedDisplay.textContent = Math.floor(currentSpeed * 120);

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.mesh.position.z += currentSpeed * 15 + 0.5;

            let dx = playerCar.position.x - obs.mesh.position.x;
            let dz = playerCar.position.z - obs.mesh.position.z;

            if (Math.abs(dx) < 1.8 && Math.abs(dz) < 3.8) {
                triggerGameOver();
            }

            if (obs.mesh.position.z > 20) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

function triggerGameOver() {
    isGameOver = true;
    isPlaying = false;
    
    playGameOverMelody(); // Play loss sound/music effect

    clearInterval(gameTimer);
    clearInterval(scoreTimer);

    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalTime').textContent = gameTime;

    gameOverScreen.classList.remove('hidden');

    fetch('http://127.0.0.1:5000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: score })
    })
    .then(res => res.json())
    .then(data => { highScoreDisplay.textContent = data.high_score; })
    .catch(() => console.log('Offline Mode'));
}

function returnToMenu() {
    stopBGM();
    gameOverScreen.classList.add('hidden');
    hud.classList.add('hidden');
    startMenu.classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init3D();
animate();