// main.js
import { Player, Enemy, Boss, Projectile } from './class.js';
import { applyPhysics } from './physics.js';
import { drawMap, generateRPGMap, extractSpawners } from './map.js';

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
let spawnPoints = [];

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
    if (!player || typeof isGameOver !== 'undefined' && isGameOver) return;
    
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
}

// --- 게임 시작 및 초기화 ---
function startGame(isRevive = false) {
    isGameOver = false;
    projectiles = [];

    if (!isRevive) {
        player = new Player(100, 100);
        generateRPGMap(15);
        spawnPoints = extractSpawners();
    } else {
        player.x = 100; player.y = 100;
        player.vx = 0; player.vy = 0;
        player.hp = player.maxHp;
        player.isInvincible = false;
    }

    // 몬스터 소환 (마지막 위치는 보스)
    enemies = spawnPoints.map(pos => {
        if (pos.type === 'boss') {
            return new Boss(pos.x, pos.y);
        } else {
            return new Enemy(pos.x, pos.y);
        }
    });

    updateUI();
    camera.x = 0; camera.y = 0; camera.shakeAmount = 0;

    if (gameAnimationFrame) cancelAnimationFrame(gameAnimationFrame);
    gameLoop();
}

// main.js - gameLoop 전체 코드
// main.js - gameLoop 함수 완전판 전체 코드

function gameLoop() {
    if (isGameOver) return; // 게임 오버 시 루프 중단

    // 1. 마우스 월드 좌표 갱신 (카메라 위치 반영)
    mouse.x = screenMouse.x + camera.x;
    mouse.y = screenMouse.y + camera.y;

    // 🔥 2. 플레이어 업데이트 및 물리 적용
    applyPhysics(player); // 대시 중이든 아니든 물리 엔진(좌표 이동)은 무조건 돌아가야 함!
    
    if (!player.isDashing) {
        player.dashHitList = []; // 대시가 끝났을 때만 타격 목록 초기화
    }
    
    player.update(keys, mouse,screenMouse, (p) => projectiles.push(p));

    // 3. 적 업데이트 (보스 포함) 및 피격/패링/대시 공격 판정
    enemies = enemies.filter(enemy => {
        // 체력이 다한 적 처리
        if (enemy.hp <= 0) {
            player.gainExp(enemy.expReward || 10);
            if (enemy instanceof Boss) {
                player.hasDash = true;
                player.hasUltimate = true;
            }
            return false;
        }

        // AI 행동 패턴 및 물리 엔진 처리 (클래스 내부 캡슐화)
        if (enemy instanceof Boss) {
            enemy.update(player, (p) => projectiles.push(p)); 
        } else {
            enemy.update(player); 
            applyPhysics(enemy);  
        }

        // 플레이어와 적 사이의 거리 및 각도 계산
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const eCenterX = enemy.x + enemy.width / 2;
        const eCenterY = enemy.y + enemy.height / 2;
        const dx = pCenterX - eCenterX; 
        const dy = pCenterY - eCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 🔥 [NEW] 대시(돌진) 관통 공격 판정
        if (player.isDashing && dist < 60) {
            if (!player.dashHitList) player.dashHitList = [];
            
            if (!player.dashHitList.includes(enemy)) {
                enemy.takeDamage(40); // 대시 데미지
                // 대시 방향으로 적 넉백
                enemy.vx = player.vx > 0 ? 15 : (player.vx < 0 ? -15 : 0); 
                enemy.vy = -8; 
                player.dashHitList.push(enemy); 
                if (camera) camera.shakeAmount = 15; 
            }
        }

        // 근접 패링 및 피격 판정
        if (enemy.isAttacking && dist < 60) {
            if (player.isParrying) {
                const angleToEnemy = Math.atan2(-dy, -dx);
                let angleDiff = angleToEnemy - player.parryAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // 금색 방패 이펙트에 닿았는지 판정
                if (Math.abs(angleDiff) <= Math.PI / 2) {
                    enemy.vx = Math.cos(angleToEnemy) * -20; 
                    enemy.vy = -10; 
                    enemy.takeDamage(30); // 패링 반사 딜
                    enemy.isAttacking = false; 
                    if (camera) camera.shakeAmount = 20; 
                }
            } 
            // 패링 실패 시 데미지
            else if (!player.isInvincible && !player.isDashing) {
                player.takeDamage(enemy.damage || 15);
                enemy.isAttacking = false; 
                if (camera) camera.shakeAmount = 5; 
            }
        }
        return true;
    });

    // 4. 투사체 업데이트 및 충돌 판정
    projectiles = projectiles.filter((proj) => {
        proj.update();
        
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const dx = proj.x - pCenterX;
        const dy = proj.y - pCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1) 투사체 패링(반사) 판정
        if (player.isParrying && !proj.isReflected) {
            const angleToProj = Math.atan2(dy, dx);
            let angleDiff = angleToProj - player.parryAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (dist <= 60 && Math.abs(angleDiff) <= Math.PI / 2) {
                proj.vx *= -2; // 반사 속도 버프
                proj.vy *= -2;
                proj.isReflected = true; 
                if (camera) camera.shakeAmount = 10;
                return true; 
            }
        }

        // 2) 반사된 투사체가 적에게 맞았을 때의 피격 판정
        if (proj.isReflected) {
            let hitEnemy = false;
            for (let i = 0; i < enemies.length; i++) {
                let enemy = enemies[i];
                if (proj.x > enemy.x && proj.x < enemy.x + enemy.width &&
                    proj.y > enemy.y && proj.y < enemy.y + enemy.height) {
                    
                    enemy.takeDamage(30); 
                    hitEnemy = true;
                    if (camera) camera.shakeAmount = 8; 
                    break; 
                }
            }
            if (hitEnemy) return false; // 맞췄으면 투사체 삭제
        } 
        // 3) 플레이어가 맞았을 때
        else if (dist < 20 + (proj.radius || 10)) {
            if (!player.isInvincible && !player.isDashing) {
                player.takeDamage(proj.damage || 10);
                return false; 
            }
        }

        // 4) 화면 밖으로 멀리 나간 투사체 삭제
        return proj.x > camera.x - 500 && proj.x < camera.x + canvas.width + 500 &&
               proj.y > camera.y - 500 && proj.y < camera.y + canvas.height + 500;
    });

    // 5. 플레이어 기본 공격(좌클릭) 직사각형 판정
    if (player.isAttacking) {
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const attackRange = 85; 

        const cosA = Math.cos(player.attackAngle);
        const sinA = Math.sin(player.attackAngle);

        const hitWidth = Math.abs(cosA) * attackRange + 60;  
        const hitHeight = Math.abs(sinA) * attackRange + 60;
        
        const hitX = pCenterX + (cosA * attackRange * 0.5) - hitWidth / 2;
        const hitY = pCenterY + (sinA * attackRange * 0.5) - hitHeight / 2;

        enemies.forEach(enemy => {
            if (!player.attackHitList.includes(enemy)) {
                if (hitX < enemy.x + enemy.width && hitX + hitWidth > enemy.x &&
                    hitY < enemy.y + enemy.height && hitY + hitHeight > enemy.y) {
                    
                    enemy.takeDamage(15); 
                    enemy.vx = cosA * 10; 
                    enemy.vy = sinA * 10 - 5; 
                    player.attackHitList.push(enemy); 
                    if (camera) camera.shakeAmount = 5; 
                }
            }
        });
    }

    // 6. 플레이어 사망 (게임 오버) 체크
    if (player.hp <= 0 || player.y > canvas.height + 5000) {
        handleGameOver(); 
        return;
    }

    // 7. 카메라 업데이트 
    let targetX = player.x - canvas.width / 2 + player.width / 2;
    let targetY = player.y - canvas.height / 2 + player.height / 2;
    camera.x += (targetX - camera.x) * camera.easing;
    camera.y += (targetY - camera.y) * camera.easing;
    if (camera.x < 0) camera.x = 0; 

    let sx = (Math.random() - 0.5) * camera.shakeAmount;
    let sy = (Math.random() - 0.5) * camera.shakeAmount;
    camera.shakeAmount *= 0.9; 

    // ==========================================
    // 8. 렌더링 (모든 그리기 로직)
    // ==========================================
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // 카메라 이동 적용
    ctx.translate(-Math.floor(camera.x + sx), -Math.floor(camera.y + sy));
    
    drawMap(ctx, dummyAsset);

    // 맵 -> 적 -> 투사체 -> 플레이어 순서대로 그림
    const allEntities = [...enemies, ...projectiles, player];
    allEntities.forEach(entity => {
        if (entity && typeof entity.draw === 'function') {
            entity.draw(ctx);
        }
    });

    ctx.restore();

    // 9. UI 업데이트
    updateUI();

    // 다음 프레임 예약
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