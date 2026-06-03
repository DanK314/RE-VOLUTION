// main.js
import { Player, Projectile, Particle, FloatingText } from './class.js';
import { applyPhysics } from './physics.js';
import { drawMap, generateRPGMap, extractSpawners } from './map.js';
import { initLoad, asset } from './load.js';
initLoad();

import { Boss_Wind } from './boss/boss_wind.js';
import { Boss_Nature } from './boss/boss_nature.js';

import { Slime } from './enemy/Slime.js';
import { Rock } from './enemy/Rock.js';

// UI 요소
const mainScreen = document.getElementById('main-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
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
let floatingTexts = [
    new FloatingText(250, 700, "W,A,D로 이동(오른쪽으로 가세요)", {}),
    new FloatingText(500, 700, "클릭으로 공격", {}),
    new FloatingText(1000, 700, "우클릭으로 공격 반사(패링)", {}),
    new FloatingText(20338, -40, "숫자키로 바람 스킬을 선택하고 우클릭으로 대쉬해 절벽을 뛰어 넘으세요!", { triggerRadius: 200, fontSize: 18 }),
    new FloatingText(20838, 0, "===>", { triggerRadius: 500, fontSize: 30, color: "#00FFFF" }),
];

let gameAnimationFrame;
let isGameOver = false;

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
window.addEventListener('keyup', (e) => keys[e.key] = false);
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
        player.selectedSkill = 1;
    }
    // 숫자 2: 보스 잡은 후 돌진 선택
    if (e.key === '2' && player.hasDash) {
        player.selectedSkill = 2;
    }

    // Q 키: 2번이 선택되어 있을 때만 궁극기 바로 발동
    if (e.key.toLowerCase() === 'q' && player.selectedSkill === 2) {
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

statButtons.forEach(button => {
    button.addEventListener('click', () => {
        chooseStat(button.dataset.stat);
    });
});

// main.js의 updateUI 함수 수정
function updateUI() {
    hpValue.innerText = `${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`;
    expValue.innerText = `${player.exp} / ${player.maxExp}`;
    levelValue.innerText = player.level;

    // 🔥 추가: 인벤토리 슬롯 업데이트
    const slot1 = document.getElementById('slot-1');
    const slot2 = document.getElementById('slot-2');

    if (player.selectedSkill === 1) {
        slot1.classList.add('active');
        slot2.classList.remove('active');
    } else {
        slot1.classList.remove('active');
        slot2.classList.add('active');
    }
    // 🔥 2번 슬롯(돌진) 잠금 및 활성화 로직
    if (!player.hasDash) {
        slot2.classList.add('locked');
        slot2.querySelector('.icon').innerText = "🔒"; // 자물쇠 아이콘
        slot2.querySelector('.skill-name').innerText = "잠김";
        slot2.classList.remove('active');
    } else {
        slot2.classList.remove('locked');
        slot2.querySelector('.icon').innerText = "🌬️"; // 바람 아이콘
        slot2.querySelector('.skill-name').innerText = "돌진";

        // 돌진이 해금된 상태에서만 active 클래스 적용
        if (player.selectedSkill === 2) {
            slot2.classList.add('active');
        } else {
            slot2.classList.remove('active');
        }
    }

    if (statHealthValue) statHealthValue.innerText = player.stats.health;
    if (statDamageValue) statDamageValue.innerText = player.stats.damage;
    if (statSpeedValue) statSpeedValue.innerText = player.stats.speed;
    if (statRegenValue) statRegenValue.innerText = player.stats.regen;
    if (statCooldownValue) statCooldownValue.innerText = `${Math.round(player.cooldownReduction * 100)}%`;
}


let bossIndex = 0;


// --- 게임 시작 및 초기화 ---
function startGame(isRevive = false) {
    isGameOver = false;
    projectiles = [];
    closeStatUpgradeModal();

    if (!isRevive) {
        player = new Player(100, 100);
        generateRPGMap(15);
        spawnPoints = extractSpawners();
    } else {
        player.x = 100; player.y = 100;
        player.vx = 0; player.vy = 0;
        player.hp = player.maxHp;
        player.isInvincible = false;
        player.isUltActive = false;
        player.isAttacking = false;
        player.isDashing = false;
        player.isParrying = false;
        player.effects = {};

        spawnPoints.forEach(sp => {
            sp.spawned = false;
        });
    }

    if (player) {
        player.onLevelUp = openStatUpgradeModal;
        player.recalculateStats?.();
    }

    // 몬스터 소환
    enemies = [];
    bossIndex = 0;

    updateUI();
    camera.x = 0; camera.y = 0; camera.shakeAmount = 0;

    if (gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
    gameLoop();
}

// main.js - gameLoop 전체 코드
// main.js - gameLoop 함수 완전판 전체 코드

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

                    if (bossIndex === 0) {
                        enemy = new Boss_Wind(spawner.x, spawner.y);
                    }

                    else if (bossIndex === 1) {
                        enemy = new Boss_Nature(spawner.x, spawner.y);
                    }

                    bossIndex++;
                }

                else {
                    // 일반 몬스터는 랜덤으로 슬라임/바위 생성
                    if (Math.random() < 0.7) { // 슬라임이 나올 확률 70%
                        enemy = new Slime(spawner.x, spawner.y);
                    } else { // 바위는 밸런스 조정을 위해 30%로 줄임
                        enemy = new Rock(spawner.x, spawner.y);
                    }
                }

                enemies.push(enemy);

                spawner.spawned = true;
            }
        }

        // =========================
        // 3. 적 업데이트 + 전투
        // =========================
        const spawnedEnemies = [];
        enemies = enemies.filter(enemy => {

            // ❗ 1) 죽음 시작 트리거
            if (enemy.hp <= 0 && !enemy.dying) {
                player.gainExp(enemy.expReward || 10);
                if (enemy instanceof Boss_Wind) {
                    player.hasDash = true;
                    player.hasUltimate = true;
                }
                enemy.death?.();
            }

            // ❗ 2) 완전 삭제 조건
            if (enemy.isDead) return false;

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

                        enemy.update(player);

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
                    enemy.takeDamage(40 * player.getDamageMultiplier());

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

                        if (camera) camera.shakeAmount = 20;
                    }

                } else if (!player.isInvincible && !player.isDashing) {
                    player.takeDamage(enemy.damage || 15);
                    enemy.isAttacking = false;
                    const hitEffect = enemy.onHit();
                    player.takeEffect(hitEffect);
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
                    "#0000aa"
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

                        enemy.vx = cosA * 5;
                        enemy.vy = sinA * 5 - 5;

                        player.attackHitList.push(enemy);

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
        floatingTexts.forEach((f) => {
            f.update(player);
        });
        // =========================
        // 9. 카메라
        // =========================
        let targetX = player.x - canvas.width / 2 + player.width / 2;
        let targetY = player.y - canvas.height / 2 + player.height / 2;

        camera.x += (targetX - camera.x) * camera.easing;
        camera.y += (targetY - camera.y) * camera.easing;

        if (camera.x < 0) camera.x = 0;

        camera.shakeAmount *= 0.9;
    }
    let sx = (Math.random() - 0.5) * camera.shakeAmount;
    let sy = (Math.random() - 0.5) * camera.shakeAmount;
    // =========================
    // 10. 렌더
    // =========================
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#92afaf";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(camera.x + sx), -Math.floor(camera.y + sy));

    drawMap(
        ctx,
        dummyAsset,
        camera,
        canvas
    );

    const allEntities = [...enemies, ...particles, ...projectiles, ...floatingTexts, player];
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
        if (e instanceof FloatingText) {
            e.draw(ctx, player);
        } else {
            e.draw(ctx);
        }
    });

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

    if (!isGameOver) {
        gameAnimationFrame = requestAnimationFrame(gameLoop);
    }
}
function handleGameOver() {
    isGameOver = true;
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// 버튼 초기화
startBtn.addEventListener('click', () => { mainScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); startGame(false); });
reviveBtn.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); startGame(true); });
toMainBtn.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); mainScreen.classList.remove('hidden'); });