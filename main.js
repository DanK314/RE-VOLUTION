// main.js
import { Player, Projectile, Particle } from './class.js';
import { FloatingText, Portal } from './worldObjects.js';
import { applyPhysics } from './physics.js';
import { drawMap, generateRPGMap, extractSpawners, extractRespawnPoints, getBiomeColorAtX, getBiomeAtX } from './map.js';
import { initLoad, asset, checkAllLoaded } from './load.js';

import { Boss_Wind } from './boss/boss_wind.js';
import { Boss_Nature } from './boss/boss_nature.js';

import { Slime } from './enemy/Slime.js';
import { Rock } from './enemy/Rock.js';

import { playSound, playBGM, stopBGM } from './sound.js';
import { Eagle } from './enemy/Eagle.js';

import { BIOME_COLORS } from './map.js';

const loadPromise = initLoad();

// UI 요소
const mainScreen = document.getElementById('main-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const loadScreen = document.getElementById('loading-screen');
const startBtn = document.getElementById('start-btn');
const reviveBtn = document.getElementById('revive-btn');
const toMainBtn = document.getElementById('to-main-btn');
const hpValue = document.getElementById('hpValue');
const expValue = document.getElementById('expValue');
const levelValue = document.getElementById('levelValue');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const dummyAsset = { image: {} };

let player;
let enemies = [];
let projectiles = []; // 🔥 원거리 공격 탄환 배열
let particles = []; //파티클!
let spawnPoints = [];
let respawnPoints = [];
let playerSpawnX = 100;
let playerSpawnY = 100;
let floatingTexts = [
    new FloatingText(250, 700, "W,A,D로 이동(오른쪽으로 가세요)", {}),
    new FloatingText(500, 700, "클릭으로 공격", {}),
    new FloatingText(1000, 700, "우클릭으로 공격 반사(패링)", {}),
    new FloatingText(20338, -40, "숫자키로 바람 스킬을 선택하고 우클릭으로 대쉬해 절벽을 뛰어 넘으세요!", { triggerRadius: 200, fontSize: 18 }),
    new FloatingText(20838, 0, "===>", { triggerRadius: 500, fontSize: 30, color: "#00FFFF" }),
];
let portals = [
    new Portal(170,650,19000,500)
]

let gameAnimationFrame;
let isGameOver = false;

// 배경 요소
let farHills = [];
let midHills = [];
let nearHills = [];

function generateBackground() {

    farHills = [];
    midHills = [];
    nearHills = [];

    // 먼 산
    for (let x = -1000; x < 30000; x += 250) {
        farHills.push({
            x,
            y: 180 + Math.random() * 100
        });
    }

    // 중간 산
    for (let x = -1000; x < 30000; x += 180) {
        midHills.push({
            x,
            y: 250 + Math.random() * 120
        });
    }

    // 가까운 숲/언덕
    for (let x = -1000; x < 30000; x += 120) {
        nearHills.push({
            x,
            y: 350 + Math.random() * 80
        });
    }
}
generateBackground();

const skillUI = document.getElementById("skill-ui");

const skillBar = {
    mainFill: null,
    subFill: null,
    label: null,
    subLabel: null
};

function createSkillUI(player) {
    skillUI.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "skill-vertical";

    const label = document.createElement("div");
    label.className = "skill-label";

    const mainBar = document.createElement("div");
    mainBar.className = "bar vertical-main";

    const mainFill = document.createElement("div");
    mainFill.className = "fill";

    mainBar.appendChild(mainFill);

    wrap.appendChild(label);
    wrap.appendChild(mainBar);

    const subLabel = document.createElement("div");
    subLabel.className = "skill-sub-label";

    const subBar = document.createElement("div");
    subBar.className = "bar vertical-sub";

    const subFill = document.createElement("div");
    subFill.className = "fill sub";

    subBar.appendChild(subFill);

    wrap.appendChild(subLabel);
    wrap.appendChild(subBar);

    skillUI.appendChild(wrap);

    skillBar.mainFill = mainFill;
    skillBar.subFill = subFill;
    skillBar.label = label;
    skillBar.subLabel = subLabel;
}

function updateSkillUI(player) {
    const skill = player.skills[player.selectedSkill];
    const now = Date.now();

    if (!skill) return;

    const cd = skill.cooldown * (1 - player.getCooldownReduction());

    skillBar.label.innerText = skill.name;

    const remaining = skill.readyAt - now;
    const mainRatio = cd > 0 ? Math.min(1, Math.max(0, 1 - remaining / cd)) : 0;
    const displayedMainRatio = remaining > cd - 50 ? 0 : mainRatio;

    skillBar.mainFill.style.height = `${displayedMainRatio * 100}%`;

    if (skill.hasSub && skill.sub) {
        const subCd = skill.sub.cooldown * (1 - player.getCooldownReduction());
        const subRemaining = skill.sub.readyAt - now;

        const subRatio = subCd > 0 ? Math.min(1, Math.max(0, 1 - subRemaining / subCd)) : 0;
        const displayedSubRatio = subRemaining > subCd - 50 ? 0 : subRatio;

        skillBar.subLabel.innerText = skill.sub.name;
        skillBar.subFill.style.height = `${displayedSubRatio * 100}%`;
    } else {
        skillBar.subLabel.innerText = "";
        skillBar.subFill.style.height = "0%";
    }
}

function isPlayerInBossRoom(player) {
    if (!player) return false;
    const playerCenterX = player.x + (player.width || 0) / 2;
    return getBiomeAtX(playerCenterX) === 'boss';
}

function getBiomeMusic(x) {
    return `${getBiomeAtX(x)}_bgm`;
}

const keys = {};
const mouse = { x: 0, y: 0 };

const camera = {
    x: 0,
    y: 0,
    easing: 0.08,
    maxSpeed: 15,
    shakeAmount: 0 // 🔥 화면 흔들림 효과 강도
};

const statHealthValue = document.getElementById('statHealth');
const statDamageValue = document.getElementById('statDamage');
const statSpeedValue = document.getElementById('statSpeed');
const statRegenValue = document.getElementById('statRegen');
const statCooldownValue = document.getElementById('statCooldown');
const levelUpModal = document.getElementById('level-up-modal');
const statButtons = document.querySelectorAll('.stat-option');
let isStatUpgradeOpen = false;

// --- 입력 관리 ---
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
// main.js - 마우스 입력 부분 수정

// 화면(모니터) 상의 순수 마우스 좌표를 저장할 변수
let screenMouse = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    screenMouse.x = e.clientX - rect.left;
    screenMouse.y = e.clientY - rect.top;
});

window.addEventListener('mousedown', (e) => {
    if (!player || typeof isGameOver !== 'undefined' && isGameOver || isStatUpgradeOpen) return;

    // 🔥 핵심: 클릭할 당시의 화면 좌표에 카메라 위치를 더해 '실제 맵(월드) 좌표'를 구함!
    const worldMouseX = screenMouse.x + (camera.x || 0);
    const worldMouseY = screenMouse.y + (camera.y || 0);

    // 구한 실제 맵 좌표를 스킬/공격 함수에 전달
    if (e.button === 0) {
        player.attack(worldMouseX, worldMouseY);
    } else if (e.button === 2) {
        player.useSelectedSkill(worldMouseX, worldMouseY);
    }
});


// main.js 파일 상단 또는 이벤트 리스너 모여있는 곳

// 🔥 키보드 입력 (스킬 선택 & 궁극기)
window.addEventListener('keydown', (e) => {
    if (isStatUpgradeOpen) {
        const keyIndex = ['1', '2', '3', '4', '5'].indexOf(e.key);
        const statKeys = ['health', 'damage', 'speed', 'regen', 'cooldown'];
        if (keyIndex >= 0) {
            chooseStat(statKeys[keyIndex]);
        }
        return;
    }

    keys[e.key.toLowerCase()] = true;

    // 숫자 1: 패링 선택
    if (e.key === '1') {
        player.selectedSkill = 0;
    }
    // 숫자 2: 보스 잡은 후 돌진 선택
    if (e.key === '2' && player.skills[1].has) {
        player.selectedSkill = 1;
    }
    // 3 : Heal Skill(if have)
    if (e.key === '3' && player.skills[2]?.has) {
        player.selectedSkill = 2;
    }

    // Q 키: 2번이 선택되어 있을 때만 궁극기 바로 발동
    if (e.key.toLowerCase() === 'q') {
        player.useUltimate();
    }
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

function openStatUpgradeModal() {
    if (!player || !player.unspentStatPoints) return;
    isStatUpgradeOpen = true;
    updateStatModal();
    levelUpModal.classList.remove('hidden');
}

function closeStatUpgradeModal() {
    isStatUpgradeOpen = false;
    levelUpModal.classList.add('hidden');
}

function updateStatModal() {
    if (!player) return;
    statButtons.forEach(button => {
        const stat = button.dataset.stat;
        const currentValue = player.stats[stat];
        const label = stat === 'cooldown' ? `${Math.round(player.cooldownReduction * 100)}% cooldown reduction` : `Level ${currentValue}`;
        button.setAttribute('title', label);
    });
}

function chooseStat(stat) {
    if (!player || !player.unspentStatPoints) return;

    if (!player.upgradeStat(stat)) return;

    player.unspentStatPoints--;

    updateUI();

    if (player.unspentStatPoints > 0) {
        updateStatModal();
    } else {
        closeStatUpgradeModal();
    }
}

function updateUI() {
    hpValue.innerText = `${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`;
    expValue.innerText = `${player.exp} / ${player.maxExp}`;
    levelValue.innerText = player.level;

    // 스킬 슬롯 자동 처리
    player.skills.forEach((skill, i) => {
        const slot = document.getElementById(`slot-${i + 1}`);
        if (!slot) return;

        const icon = slot.querySelector('.icon');
        const name = slot.querySelector('.skill-name');

        // active 초기화
        slot.classList.remove('active');

        if (!skill.has) {
            slot.classList.add('locked');
            icon.innerText = "🔒";
            name.innerText = "잠김";
        } else {
            slot.classList.remove('locked');

            // 스킬 정보 표시
            icon.innerText = skill.icon ?? "?";
            name.innerText = skill.name ?? "스킬";

            if (player.selectedSkill === i) {
                slot.classList.add('active');
            }
        }
    });

    if (statHealthValue) statHealthValue.innerText = player.stats.health;
    if (statDamageValue) statDamageValue.innerText = player.stats.damage;
    if (statSpeedValue) statSpeedValue.innerText = player.stats.speed;
    if (statRegenValue) statRegenValue.innerText = player.stats.regen;
    if (statCooldownValue) {
        statCooldownValue.innerText =
            `${Math.round(player.cooldownReduction * 100)}%`;
    }

    updateSkillUI(player);
}


let defeatedBossSpawners = new Set(); // Track which boss spawners have been defeated


// --- 게임 시작 및 초기화 ---
function startGame(isRevive = false) {
    isGameOver = false;
    projectiles = [];
    closeStatUpgradeModal();

    if (!isRevive) {
        player = new Player(100, 100);
        generateRPGMap();
        spawnPoints = extractSpawners();
        respawnPoints = extractRespawnPoints();
        playerSpawnX = 100;
        playerSpawnY = 100;
        defeatedBossSpawners.clear();
    } else {
        player.x = playerSpawnX; player.y = playerSpawnY;
        player.vx = 0; player.vy = 0;
        player.hp = player.maxHp;
        player.isInvincible = false;
        player.isUltActive = false;
        player.isAttacking = false;
        player.isDashing = false;
        player.isParrying = false;
        player.effects = {};

        spawnPoints.forEach((sp, index) => {
            if (sp.type === "boss") {
                // Only reset spawn for bosses that haven't been defeated
                if (!defeatedBossSpawners.has(index)) {
                    sp.spawned = false;
                }
            } else {
                sp.spawned = false;
            }
        });
    }

    if (player) {
        player.onLevelUp = openStatUpgradeModal;
        player.recalculateStats?.();
        createSkillUI(player);
    }

    // 몬스터 소환
    enemies = [];

    updateUI();
    camera.x = 0; camera.y = 0; camera.shakeAmount = 0;

    if (gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
    gameLoop();
}

function gameLoop() {
    if (isGameOver) return;

    // =========================
    // 1. 마우스 월드 좌표
    // =========================
    mouse.x = screenMouse.x + camera.x;
    mouse.y = screenMouse.y + camera.y;

    if (!isStatUpgradeOpen) {
        // =========================
        // 2. 플레이어 물리 & 업데이트
        // =========================
        applyPhysics(player);

        if (!player.isDashing) {
            player.dashHitList = [];
        }

        player.update(keys, mouse, screenMouse, (p) => projectiles.push(p));

        // 🔥 플레이어 리스폰 포인트 체크
        for (const rp of respawnPoints) {
            if (player.x < rp.x + rp.width &&
                player.x + player.width > rp.x &&
                player.y < rp.y + rp.height &&
                player.y + player.height > rp.y) {
                playerSpawnX = rp.x;
                playerSpawnY = rp.y - player.height;
            }
        }

        // =========================
        // 2.5 런닝 파티클
        if (player.isSprinting && !player.isDashing) {
            for (let i = 0; i < 2; i++) {
                particles.push(new Particle(
                    player.x + player.width / 2 + (Math.random() - 0.5) * 24,
                    player.y + player.height + 4,
                    (Math.random() - 0.5) * 0.4,
                    Math.random() * 0.4 + 0.6,
                    '#a8ff9b',
                    3,
                    0.5
                ));
            }
        }

        // =========================
        // 적 스폰
        // =========================

        const SPAWN_DISTANCE = 1200;

        for (const spawner of spawnPoints) {

            // 이미 생성됨
            if (spawner.spawned) continue;

            const dx = player.x - spawner.x;

            // 플레이어 근처 오면 생성
            if (Math.abs(dx) < SPAWN_DISTANCE) {

                let enemy;

                if (spawner.type === "boss") {
                    // Check if this boss spawner has already been defeated
                    const spawnerIndex = spawnPoints.indexOf(spawner);
                    if (!defeatedBossSpawners.has(spawnerIndex)) {
                        // Determine boss type based on which boss spawner this is (0 = Wind, 1 = Nature, etc.)
                        const bosses = spawnPoints.filter(sp => sp.type === "boss");
                        const bossTypeIndex = bosses.indexOf(spawner);

                        if (bossTypeIndex === 0) {
                            enemy = new Boss_Wind(spawner.x, spawner.y);
                        } else if (bossTypeIndex === 1) {
                            enemy = new Boss_Nature(spawner.x, spawner.y);
                        }

                        if (enemy) {
                            enemy.spawnerIndex = spawnerIndex;
                        }
                    }
                }

                else {
                    if (getBiomeAtX(spawner.x) === 'plain') {
                        
                        if (Math.random() < 0.8) { 
                            enemy = new Slime(spawner.x, spawner.y);
                        } else { 
                            enemy = new Rock(spawner.x, spawner.y);
                        }
                    } else if (getBiomeAtX(spawner.x) === 'forest') {
                        
                        if (Math.random() < 0.6) {
                            enemy = new Slime(spawner.x, spawner.y);
                        } else {
                            enemy = new Rock(spawner.x, spawner.y);
                        }
                    }
                }

                if (enemy) {
                    enemies.push(enemy);
                    spawner.spawned = true;
                }


            }
        }

        // =========================
        // 3. 적 업데이트 + 전투
        // =========================
        const spawnedEnemies = [];
        enemies = enemies.filter(enemy => {

            // ❗ 1) 죽음 시작 트리거
            if (enemy.hp <= 0 && !enemy.dying) {
                enemy.death?.();
            }

            // ❗ 2) 완전 삭제 조건
            if (enemy.isDead) {
                player.gainExp(enemy.expReward || 10);
                if (enemy instanceof Boss_Wind || enemy instanceof Boss_Nature) {
                    // Mark this boss as defeated using the linked spawner index
                    if (typeof enemy.spawnerIndex === 'number' && spawnPoints[enemy.spawnerIndex]?.type === 'boss') {
                        defeatedBossSpawners.add(enemy.spawnerIndex);
                    }
                }
                if (enemy instanceof Boss_Wind) {
                    player.skills[1].has = true; // 돌진 스킬 해금
                }
                if (enemy instanceof Boss_Nature) {
                    player.skills[2].has = true; // 회복 스킬 해금
                }
                return false;
            }

            // =========================
            // AI / 물리 업데이트
            // =========================
            if (!enemy.dying) {

                const activeDistance = 1800;

                // 너무 멀면 AI/물리 중지
                if (
                    Math.abs(enemy.x - player.x)
                    < activeDistance
                ) {

                    if (enemy instanceof Boss_Wind) {

                        enemy.update(
                            player,
                            (p) => projectiles.push(p)
                        );
                    } else if (enemy instanceof Boss_Nature) {
                        enemy.update(player, (minion) => {
                            spawnedEnemies.push(minion);
                        });
                    } else {

                        enemy.update(player,(p) => projectiles.push(p));

                        applyPhysics(enemy);
                    }
                }
            }

            // =========================
            // 전투 판정 (살아있는 적만)
            // =========================
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const eCenterX = enemy.x + enemy.width / 2;
            const eCenterY = enemy.y + enemy.height / 2;

            const dx = pCenterX - eCenterX;
            const dy = pCenterY - eCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // -------------------------
            // 대시 공격
            // -------------------------
            if (player.isDashing && dist < 60) {
                if (!player.dashHitList) player.dashHitList = [];

                if (!player.dashHitList.includes(enemy)) {
                    enemy.takeDamage(20 * player.getDamageMultiplier());

                    enemy.vx = player.vx > 0 ? 15 : (player.vx < 0 ? -15 : 0);
                    enemy.vy = -8;

                    player.dashHitList.push(enemy);

                    if (camera) camera.shakeAmount = 15;
                }
            }

            // -------------------------
            // 패링 / 피격
            // -------------------------
            if (enemy.isAttacking && dist < 60) {
                if (player.isParrying) {
                    const angleToEnemy = Math.atan2(-dy, -dx);

                    let angleDiff = angleToEnemy - player.parryAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    if (Math.abs(angleDiff) <= Math.PI / 2) {
                        enemy.vx = Math.cos(angleToEnemy) * -20;
                        enemy.vy = -10;
                        enemy.takeDamage(30 * player.getDamageMultiplier());

                        enemy.isAttacking = false;

                        playSound("crit_hit");

                        if (camera) camera.shakeAmount = 20;
                    }

                } else if (!player.isInvincible && !player.isDashing) {
                    player.takeDamage(enemy.damage || 15);
                    enemy.isAttacking = false;
                    const hitEffect = enemy.onHit();
                    player.takeEffect(hitEffect);
                    playSound("hit");
                    if (camera) camera.shakeAmount = 5;
                }
            }

            return true;
        });

        if (spawnedEnemies.length > 0) {
            enemies.push(...spawnedEnemies);
        }

        // =========================
        // 4. 투사체
        // =========================
        projectiles = projectiles.filter((proj) => {
            proj.update();

            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;

            const dx = proj.x - pCenterX;
            const dy = proj.y - pCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 패링 반사
            if (player.isParrying && !proj.isReflected) {
                const angleToProj = Math.atan2(dy, dx);

                let angleDiff = angleToProj - player.parryAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (dist <= 60 && Math.abs(angleDiff) <= Math.PI / 2) {
                    proj.vx *= -2;
                    proj.vy *= -2;
                    proj.isReflected = true;
                    proj.damage *= player.getDamageMultiplier();

                    if (camera) camera.shakeAmount = 10;
                    playSound('parry_projectile', true)
                    return true;
                }
            }

            // 반사 탄환 적 히트
            if (proj.isReflected) {
                let hitEnemy = false;

                for (let enemy of enemies) {
                    if (
                        proj.x > enemy.x && proj.x < enemy.x + enemy.width &&
                        proj.y > enemy.y && proj.y < enemy.y + enemy.height
                    ) {
                        enemy.takeDamage(30);
                        hitEnemy = true;

                        if (camera) camera.shakeAmount = 8;
                        break;
                    }
                }

                if (hitEnemy) return false;
            }

            // 플레이어 피격
            else if (dist < 20 + (proj.radius || 10)) {
                if (!player.isInvincible && !player.isDashing) {
                    player.takeDamage(proj.damage || 10);
                    return false;
                }
            }

            return proj.x > camera.x - 500 &&
                proj.x < camera.x + canvas.width + 500 &&
                proj.y > camera.y - 500 &&
                proj.y < camera.y + canvas.height + 500;
        });

        // =========================
        // 5. 플레이어 효과 파티클 (global)
        // =========================
        if (player.isDashing) {
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(
                    player.x + player.width / 2 + Math.random() * 30 - 15,
                    player.y + player.height / 2,
                    0, 0.5,
                    "#FFFFFF", 1, 1
                ));
            }
        }

        if (player.isUltActive) {
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    "#00FFFF", 1, 1
                ));
            }
        }

        // =========================
        // bleed particle
        // =========================

        if (player.hasEffect('bleed')) {

            for (let i = 0; i < 2; i++) {

                particles.push(new Particle(

                    player.x + player.width / 2 + (Math.random() - 0.5) * 20,
                    player.y + player.height / 2 + (Math.random() - 0.5) * 30,

                    (Math.random() - 0.5) * 2,
                    Math.random() * -1.5,

                    "#aa0000",
                    2,
                    0.8
                ));
            }
        }
        if (player.hasEffect('slowness')) {

            for (let i = 0; i < 2; i++) {
                particles.push(
                    new Particle(
                        player.x + player.width / 2 + (Math.random() - 0.5) * 20,
                        player.y + player.height / 2 + (Math.random() - 0.5) * 30,
                        (Math.random() - 0.5) * 1,
                        Math.random() * -1,
                        "#00aa00"
                        , 2, 0.8
                    )
                );
            }
        }
        if (player.hasEffect('heal')) {

            for (let i = 0; i < 2; i++) {
                particles.push(
                    new Particle(
                        player.x + player.width / 2 + (Math.random() - 0.5) * 20,
                        player.y + player.height / 2 + (Math.random() - 0.5) * 30,
                        (Math.random() - 0.5) * 1,
                        Math.random() * -5,
                        "#7aff7a"
                        , 2, 0.8
                    )
                );
            }
        }
        if (player.hasEffect('superHeal')) {

            for (let i = 0; i < 10; i++) {
                particles.push(
                    new Particle(
                        player.x + player.width / 2 + (Math.random() - 0.5) * 50,
                        player.y + player.height / 2 + (Math.random() - 0.5) * 50,
                        (Math.random() - 0.5) * 5,
                        Math.random() * 5 - 2.5,
                        "#00ff00"
                        , 2, 0.8
                    )
                );
            }
        }
        // =========================
        // 6. global particles
        // =========================
        if (particles.length > 1200) {
            particles.splice(
                0,
                particles.length - 1200
            );
        }
        particles = particles.filter(p => {
            p.update();
            return p.life > 0;
        });

        // =========================
        // 7. 플레이어 기본 공격
        // =========================
        if (player.isAttacking) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;

            const attackRange = 85;

            const cosA = Math.cos(player.attackAngle);
            const sinA = Math.sin(player.attackAngle);

            const hitWidth = Math.abs(cosA) * attackRange + 60;
            const hitHeight = Math.abs(sinA) * attackRange + 60;

            const hitX = pCenterX + cosA * attackRange * 0.5 - hitWidth / 2;
            const hitY = pCenterY + sinA * attackRange * 0.5 - hitHeight / 2;

            enemies.forEach(enemy => {
                if (!player.attackHitList.includes(enemy)) {
                    if (
                        hitX < enemy.x + enemy.width &&
                        hitX + hitWidth > enemy.x &&
                        hitY < enemy.y + enemy.height &&
                        hitY + hitHeight > enemy.y
                    ) {
                        enemy.takeDamage(player.getAttackPower());
                        const knockback = 4;
                        enemy.vx = cosA * knockback;
                        enemy.vy = sinA * knockback - knockback;

                        player.attackHitList.push(enemy);

                        playSound("hit");

                        if (camera) camera.shakeAmount = 5;
                    }
                }
            });
        }

        // =========================
        // 8. 플레이어 죽음
        // =========================
        if (player.hp <= 0 || player.y > canvas.height + 5000) {
            handleGameOver();
            return;
        }
        // =========================
        // 월드 오브젝트 업데이트
        // =========================
        floatingTexts.forEach((f) => {
            f.update(player);
        });
        portals.forEach((p) => {
            p.update(player);
            if(keys['f'] && p.intersects(player)){
                p.interact(player);
            }
        })
        // =========================
        // 9. 카메라
        // =========================
        let targetX = player.x - canvas.width / 2 + player.width / 2;
        let targetY = player.y - canvas.height / 2 + player.height / 2;

        camera.x += (targetX - camera.x) * camera.easing;
        camera.y += (targetY - camera.y) * camera.easing;

        const maxCameraY = 400;

        if (camera.x < 0) camera.x = 0;
        if (camera.y < -150) camera.y = -150;
        if (camera.y > maxCameraY) camera.y = maxCameraY;

        camera.shakeAmount *= 0.9;
    }
    let sx = (Math.random() - 0.5) * camera.shakeAmount;
    let sy = (Math.random() - 0.5) * camera.shakeAmount;
    // =========================
    // 10. 렌더
    // =========================
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cameraCenterX = camera.x + canvas.width / 2;
    const bgTop = getBiomeColorAtX(cameraCenterX, 'bgTop');
    const bgBottom = getBiomeColorAtX(cameraCenterX, 'bgBottom');
    const farColor = getBiomeColorAtX(cameraCenterX, 'far');
    const midColor = getBiomeColorAtX(cameraCenterX, 'mid');
    const nearColor = getBiomeColorAtX(cameraCenterX, 'near');

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, bgTop);
    grad.addColorStop(1, bgBottom);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ===== 배경 레이어 1 (가장 멀리) =====

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = farColor;

    ctx.beginPath();

    ctx.moveTo(
        farHills[0].x - camera.x * 0.03,
        canvas.height
    );

    for (const p of farHills) {
        ctx.lineTo(
            p.x - camera.x * 0.03,
            p.y
        );
    }

    ctx.lineTo(
        farHills[farHills.length - 1].x - camera.x * 0.03,
        canvas.height
    );

    ctx.closePath();
    ctx.fill();

    // ===== 배경 레이어 2 (조금 가까움) =====

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = midColor;

    ctx.beginPath();

    ctx.moveTo(
        midHills[0].x - camera.x * 0.08,
        canvas.height
    );

    for (const p of midHills) {
        ctx.lineTo(
            p.x - camera.x * 0.08,
            p.y
        );
    }

    ctx.lineTo(
        midHills[midHills.length - 1].x - camera.x * 0.08,
        canvas.height
    );

    ctx.closePath();
    ctx.fill();

    // 안개 레이어
    const fog = ctx.createLinearGradient(
        0,
        canvas.height - 400,
        0,
        canvas.height - 150
    );

    fog.addColorStop(0, "rgba(220,230,240,0)");
    fog.addColorStop(0.5, "rgba(220,230,240,0.05)");
    fog.addColorStop(1, "rgba(220,230,240,0)");

    ctx.fillStyle = fog;
    ctx.fillRect(
        0,
        canvas.height - 400,
        canvas.width,
        250
    );

    // ===== 배경 레이어 3 (가장 가까움) =====
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = nearColor;

    ctx.beginPath();

    ctx.moveTo(
        nearHills[0].x - camera.x * 0.15,
        canvas.height
    );

    for (const p of nearHills) {
        ctx.lineTo(
            p.x - camera.x * 0.15,
            p.y
        );
    }

    ctx.lineTo(
        nearHills[nearHills.length - 1].x - camera.x * 0.15,
        canvas.height
    );

    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(-Math.floor(camera.x + sx), -Math.floor(camera.y + sy));

    drawMap(
        ctx,
        dummyAsset,
        camera,
        canvas
    );

    // 🔥 리스폰 포인트 그리기
    for (const rp of respawnPoints) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillRect(rp.x, rp.y, rp.width, rp.height);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(rp.x, rp.y, rp.width, rp.height);
    }

    const allEntities = [...enemies, ...particles, ...projectiles, ...floatingTexts,...portals, player];
    allEntities.forEach(e => {

        if (!e?.draw) return;

        // 화면 밖 오브젝트 스킵
        if (
            e.x + 200 < camera.x ||
            e.x > camera.x + canvas.width + 100 ||
            e.y + 200 < camera.y ||
            e.y > camera.y + canvas.height + 100
        ) {
            return;
        }
        if (e instanceof FloatingText || e instanceof Portal) {
            e.draw(ctx, player);
        } else {
            e.draw(ctx);
        }
    });

    const barWidth = 52;
    const barHeight = 8;
    const barX = player.x + player.width / 2 - barWidth / 2;
    const barY = player.y - 14;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillAmount = Math.max(0, Math.min(1, player.stamina / player.maxStamina));
    ctx.fillStyle = '#ccbf2e';
    ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * fillAmount, barHeight - 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(
        `X: ${Math.floor(player.x)} Y: ${Math.floor(player.y)}`,
        20,
        30
    );
    ctx.restore();
    // =========================
    // 11. UI
    // =========================
    updateUI();

    // =========================
    // 12.사운드
    // =========================

    const activeBosses = enemies.filter(
        e => e.isBoss && !e.dying && !e.isDead
    );
    if (
        isPlayerInBossRoom(player) &&
        activeBosses.length > 0
    ) {
        const nearestBoss = activeBosses.reduce((a, b) => {
            const da = Math.abs(a.x - player.x);
            const db = Math.abs(b.x - player.x);
            return da < db ? a : b;
        });

        playBGM(nearestBoss.musicSrc);
    } else {
        playBGM(getBiomeMusic(player.x));
    }

    if (!isGameOver) {
        gameAnimationFrame = requestAnimationFrame(gameLoop);
    }
}
function handleGameOver() {
    isGameOver = true;
    stopBGM(1000)
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// 버튼 초기화
startBtn.addEventListener('click', async () => {
    mainScreen.classList.add('hidden');
    loadScreen.classList.remove('hidden');
    await loadPromise;
    loadScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startGame(false);
});
reviveBtn.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); startGame(true); });
toMainBtn.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); mainScreen.classList.remove('hidden'); });