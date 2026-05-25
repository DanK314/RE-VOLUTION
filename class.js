// class.js

import { getAngle } from "./physics.js";
import { asset } from "./load.js";


export class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life; // 초기 수명 (1.0 = 100% 불투명)
        this.decay = Math.random() * 0.03 + 0.02; // 매 프레임 줄어드는 수명 (사라지는 속도)
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay; // 서서히 투명해짐
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha *= Math.max(0, this.life); // 투명도 적용
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= Math.max(0, this.life);
        ctx.restore();
    }
}
export class Entity {
    constructor(x, y, width, height, speed) {
        this.x = x; this.y = y; this.width = width; this.height = height; this.speed = speed;
        this.vx = 0; this.vy = 0;
        this.isGrounded = false;
        this.isTouchingLeftWall = false;
        this.isTouchingRightWall = false;
        this.ignoreGravity = false; this.ignoreFriction = false; this.ignoreCollision = false;
    }
}
// class.js - Player 클래스 완전판 (이동, 공격, 스킬, 직사각형 이펙트 모두 포함)

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 40, 40, 7);
        this.maxHp = 100; this.hp = this.maxHp;
        this.level = 1; this.exp = 0; this.maxExp = 50;
        this.color = '#3498db';
        this.facingDirection = 1;

        // 공격 관련
        this.isAttacking = false;
        this.attackEndTime = 0;
        this.attackCooldownTime = 0;
        this.attackAngle = 0;
        this.attackHitList = [];

        // 스킬 선택 시스템
        this.selectedSkill = 1;   // 1: 패링, 2: 돌진
        this.hasDash = true;
        this.hasUltimate = true;

        // 1번 스킬: 패링
        this.isParrying = false;
        this.parryEndTime = 0;
        this.parryCooldownTime = 0;
        this.parryAngle = 0;

        // 2번 스킬: 돌진
        this.isDashing = false;
        this.dashCooldown = 0;

        // 2번 선택 + Q: 궁극기
        this.isUltActive = false;
        this.ultEndTime = 0;
        this.ultCooldown = 0;
        this.lastUltShootTime = 0;

        // 상태 이상 및 물리
        this.isInvincible = false;
        this.invincibleEndTime = 0;
        this.levelUpEffectEndTime = 0;
        this.maxvx = 10;
        this.jumpKeyPressed = false;
    }

    // 좌클릭: 기본 공격 발동
    attack(mouseX, mouseY) {
        if (Date.now() < this.attackCooldownTime) return;
        this.isAttacking = true;
        this.attackEndTime = Date.now() + 200;
        this.attackCooldownTime = Date.now() + 400;
        this.attackHitList = [];

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        this.attackAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    }

    // 우클릭: 선택된 스킬 발동 (패링 or 돌진)
    useSelectedSkill(mouseX, mouseY) {
        const now = Date.now();
        if (this.selectedSkill === 1) {
            // [1번] 패링
            if (now < this.parryCooldownTime) return;
            this.isParrying = true;
            this.parryEndTime = now + 250;
            this.parryCooldownTime = now + 700;

            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            this.parryAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
        } else if (this.selectedSkill === 2) {
            if (now < this.dashCooldownTime) return;
            this.isDashing = true;
            this.dashEndTime = now + 200; // 0.2초 (200ms) 동안 순식간에 이동!
            this.dashCooldownTime = now + 3000; // 쿨타임 1.5초

            // 엄청난 속도로 돌진! (방향에 맞춰서)
            this.vx = this.facingDirection * 35; // 🔥 기존보다 훨씬 높은 수치!
            this.vy = 0; // 공중에서 대시해도 일직선으로 날아가게 함

            // 🌟 핵심: 대시 중에는 마찰력과 중력을 무시합니다!
            this.ignoreFriction = true;
            this.ignoreGravity = true;
        }
    }

    // Q키: 궁극기 발동
    useUltimate() {
        const now = Date.now();
        if (this.selectedSkill === 2 && this.hasUltimate && now >= this.ultCooldown) {
            this.isUltActive = true;
            this.ultEndTime = now + 5000;
            this.ultCooldown = now + 10000;
        }
    }

    // 경험치 획득 및 레벨업
    gainExp(amount) {
        this.exp += amount;
        while (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.level++;
            this.maxExp = Math.floor(this.maxExp * 1.5);
            this.maxHp += 20; this.hp = this.maxHp;
            this.levelUpEffectEndTime = Date.now() + 1000;
        }
    }

    // 데미지 처리
    takeDamage(amount) {
        if (this.hp <= 0) return true;
        if (this.isInvincible || this.isDashing || this.isParrying) return false;
        this.hp -= amount;
        this.vy = -6;
        if (this.hp <= 0) return true;
        this.isInvincible = true;
        this.invincibleEndTime = Date.now() + 800;
        return false;
    }

    // 🔥 삭제되었던 핵심 이동 및 업데이트 로직 복구
    update(keys, mouse, screenMouse, shootCb) {
        const now = Date.now();


        // 🔥 2. 대시 상태 유지 및 종료 처리
        if (this.isDashing) {
            // 대시 중에는 키보드 입력을 무시하고 돌진 속도를 그대로 유지
            this.vx = this.facingDirection * 35;

            // 대시 시간이 끝났다면?
            if (now > this.dashEndTime) {
                this.isDashing = false;

                // 🌟 마찰력과 중력을 다시 켜줍니다.
                this.ignoreFriction = false;
                this.ignoreGravity = false;

                // 끝날 때 미끄러지지 않도록 속도를 확 줄여줌 (브레이크)
                this.vx *= 0.1;
            }
        } else {
            if (keys['ArrowLeft'] || keys['a']) this.vx -= this.speed;
            if (keys['ArrowRight'] || keys['d']) this.vx += this.speed;
            if (Math.abs(this.vx) > this.maxvx && !this.isDashing) {
                this.vx = this.maxvx * Math.sign(this.vx);
            }

            const centerX = this.x + this.width / 2;
            if (mouse.x < centerX) this.facingDirection = -1;
            else this.facingDirection = 1;

            const jumpKey = keys['ArrowUp'] || keys['w'] || keys[' '];
            if (jumpKey && !this.jumpKeyPressed) {
                if (this.isGrounded) { this.vy = -12; this.isGrounded = false; }
                else if (this.isTouchingLeftWall) { this.vy = -13; this.vx = 15; }
                else if (this.isTouchingRightWall) { this.vy = -13; this.vx = -15; }
                this.jumpKeyPressed = true;
            } else if (!jumpKey) this.jumpKeyPressed = false;
        }

        // 2. 쿨타임 및 지속시간 체크
        if (this.isInvincible && now > this.invincibleEndTime) this.isInvincible = false;
        if (this.isAttacking && now > this.attackEndTime) this.isAttacking = false;
        if (this.isParrying && now > this.parryEndTime) this.isParrying = false;

        // 3. 궁극기 투사체 발사
        let camera = { x: mouse.x - screenMouse.x, y: mouse.y - screenMouse.y }
        if (this.isUltActive && shootCb) {
            if (now < this.ultEndTime) {
                if (now > this.lastUltShootTime + 50) {
                    const screenPlayerX = this.x - camera.x;
                    const screenPlayerY = this.y - camera.y;
                    const angle = getAngle(
                        screenMouse.x,
                        screenMouse.y,
                        screenPlayerX,
                        screenPlayerY
                    ) + Math.random() - 0.5;
                    const speed = 15;
                    const proj = new Projectile(this.x + this.width / 2, this.y + this.height / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 'player_blade');
                    proj.isReflected = true;
                    shootCb(proj);
                    this.lastUltShootTime = now;
                }
            } else {
                this.isUltActive = false;
            }
        }
    }

    draw(ctx) {
        // 1. 돌진 잔상 (클래스 내부에서 처리)
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
            ctx.fillRect(this.x - this.vx * 0.5, this.y, this.width, this.height);
        }

        // 2. 무적 상태 깜빡임
        if (this.isInvincible) {
            ctx.globalAlpha = Math.floor(Date.now() / 100) % 2 === 0 ? 0.2 : 0.8;
        }

        // 3. 플레이어 본체
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 눈 방향 표시
        ctx.fillStyle = 'white';
        let eyeX = this.facingDirection === 1 ? this.x + 25 : this.x + 7;
        ctx.fillRect(eyeX, this.y + 10, 8, 8);

        // 4. 패링 시각 효과 (직사각형)
        if (this.isParrying) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.parryAngle);
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'orange';
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.strokeRect(35, -50, 15, 100);
            ctx.fillRect(35, -50, 15, 100);
            ctx.restore();
        }

        // 5. 기본 공격 시각 효과 (직사각형 검기)
        if (this.isAttacking) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.attackAngle);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'white';
            // 실제 판정 범위와 유사한 직사각형 이펙트
            ctx.fillRect(25, -40, 90, 80);
            ctx.restore();
        }

        // 6. 궁극기/레벨업 UI 이펙트
        if (this.isUltActive) {
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
        }

        if (Date.now() < this.levelUpEffectEndTime) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL UP!', this.x + this.width / 2, this.y - 20);
        }

        ctx.globalAlpha = 1.0;
    }
}
// class.js - Enemy 클래스 캡슐화 완료

export class Enemy extends Entity {
    constructor(x, y, type = "NOTHING") {
        super(x, y, 40, 40, 2);

        this.type = type;

        // ==========================================
        // 기본 스탯
        // ==========================================
        this.hp = 50;
        this.maxHp = 50;
        this.expReward = 20;
        this.damage = 15;

        this.color = "red";

        // ==========================================
        // 타입별 스탯
        // ==========================================
        switch (this.type) {

            // 슬라임
            case "slime":
                this.hp = 35;
                this.maxHp = 35;

                this.damage = 8;
                this.expReward = 15;

                this.color = "rgba(100, 255, 120, 0.7)";
                break;

            // 돌 몬스터
            case "rock":
                this.hp = 50;
                this.maxHp = 50;

                this.damage = 35;
                this.expReward = 50;

                this.color = "#888";
                break;

            // 기본 적
            default:
                this.hp = 60;
                this.maxHp = 60;

                this.damage = 15;
                this.expReward = 20;

                this.color = "#e74c3c";
                break;
        }

        // ==========================================
        // 전투 상태
        // ==========================================
        this.isAttacking = false;
        this.attackEndTime = 0;

        this.attackCooldownTime = 0;

        this.isPreparingAttack = false;
        this.attackPrepEndTime = 0;

        // ==========================================
        // AI 상태
        // ==========================================
        this.detectRadius = 300;

        this.patrolSpeed = 1.0;
        this.chaseSpeed = 3.5;

        this.state = "patrol";

        this.patrolTimer = 0;

        this.facingDirection =
            Math.random() > 0.5 ? 1 : -1;
    }

    update(player) {
        const now = Date.now();

        // ==========================================
        // 안전 초기화
        // ==========================================
        if (isNaN(this.patrolTimer) || this.patrolTimer == null) {
            this.patrolTimer = 0;
        }

        // ==========================================
        // 기준 좌표 계산
        // ==========================================
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        const dx = pCenterX - centerX;
        const dy = pCenterY - centerY;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // ==========================================
        // 방향 갱신
        // ==========================================
        if (dx > 0) this.facingDirection = 1;
        else this.facingDirection = -1;

        // ==========================================
        // 타입별 AI
        // ==========================================
        switch (this.type) {

            // ##################################################
            // 슬라임
            // ##################################################
            case "slime": {

                this.detectRadius = 500;
                this.patrolSpeed = 1.5;
                this.chaseSpeed = 4;

                // 공격 종료
                if (this.isAttacking && now > this.attackEndTime) {
                    this.isAttacking = false;
                }

                // 점프 타이머
                if (!this.lastJumpTime) {
                    this.lastJumpTime = 0;
                }

                // ==========================================
                // 공격 준비
                // ==========================================
                if (this.isPreparingAttack) {

                    this.vx *= 0.7;

                    // 떨림
                    this.vx += (Math.random() - 0.5) * 1.2;

                    if (now > this.attackPrepEndTime) {

                        this.isPreparingAttack = false;
                        this.isAttacking = true;

                        this.attackEndTime = now + 350;
                        this.attackCooldownTime = now + 1500;

                        // 낮고 빠른 공격 점프
                        this.vx = Math.sign(dx) * 18;
                        this.vy = -4;
                    }

                    return;
                }

                // ==========================================
                // 공격 중
                // ==========================================
                if (this.isAttacking) {
                    return;
                }

                // ==========================================
                // 플레이어 감지
                // ==========================================
                if (
                    Math.abs(dx) < this.detectRadius &&
                    Math.abs(dy) < 220
                ) {

                    // 가까우면 공격 준비
                    if (
                        dist < 90 &&
                        this.isGrounded &&
                        now > this.attackCooldownTime
                    ) {

                        this.isPreparingAttack = true;
                        this.attackPrepEndTime = now + 220;

                        this.vx *= 0.3;
                    }

                    // 슬라임 점프 이동
                    else {

                        if (
                            this.isGrounded &&
                            now > this.lastJumpTime + 500
                        ) {

                            this.lastJumpTime = now;

                            this.vx = Math.sign(dx) * (
                                this.chaseSpeed +
                                Math.random() * 2
                            );

                            this.vy = -(7 + Math.random() * 2);
                        }
                    }

                    this.patrolTimer = 0;
                }

                // ==========================================
                // 배회
                // ==========================================
                else {

                    this.patrolTimer--;

                    if (
                        this.patrolTimer <= 0 ||
                        this.isTouchingLeftWall ||
                        this.isTouchingRightWall
                    ) {

                        this.facingDirection =
                            Math.random() > 0.5 ? 1 : -1;

                        this.patrolTimer =
                            Math.floor(Math.random() * 120) + 60;
                    }

                    // 배회도 점프로 이동
                    if (
                        this.isGrounded &&
                        now > this.lastJumpTime + 700
                    ) {

                        this.lastJumpTime = now;

                        this.vx = this.facingDirection * (
                            this.patrolSpeed +
                            Math.random()
                        );

                        this.vy = -(5 + Math.random() * 2);
                    }
                }

                break;
            }

            // ##################################################
            // 바위 몬스터
            // ##################################################
            case "rock": {

                this.detectRadius = 350;
                this.patrolSpeed = 0.2;
                this.chaseSpeed = 1.2;

                // 공격 종료
                if (this.isAttacking && now > this.attackEndTime) {
                    this.isAttacking = false;
                }

                // ==========================================
                // 플레이어 발견
                // ==========================================
                if (
                    Math.abs(dx) < this.detectRadius &&
                    Math.abs(dy) < 160
                ) {

                    // 진짜 가까울 때만 움직임
                    if (dist < 120) {

                        this.vx += Math.sign(dx) * 0.15;

                        if (this.vx > this.chaseSpeed) {
                            this.vx = this.chaseSpeed;
                        }

                        if (this.vx < -this.chaseSpeed) {
                            this.vx = -this.chaseSpeed;
                        }
                    }

                    // 초근접 공격
                    if (
                        dist < 70 &&
                        this.isGrounded &&
                        now > this.attackCooldownTime
                    ) {

                        this.isAttacking = true;

                        this.attackEndTime = now + 500;
                        this.attackCooldownTime = now + 2600;

                        // 낮은 점프 + 강한 돌진
                        this.vy = -6;
                        this.vx = Math.sign(dx) * 16;
                    }

                    this.patrolTimer = 0;
                }

                // ==========================================
                // 배회
                // ==========================================
                else {

                    this.patrolTimer--;

                    if (
                        this.patrolTimer <= 0 ||
                        this.isTouchingLeftWall ||
                        this.isTouchingRightWall
                    ) {

                        this.facingDirection =
                            Math.random() > 0.5 ? 1 : -1;

                        this.patrolTimer =
                            Math.floor(Math.random() * 240) + 120;
                    }

                    // 거의 안 움직임
                    this.vx += this.facingDirection * 0.02;

                    if (this.vx > this.patrolSpeed) {
                        this.vx = this.patrolSpeed;
                    }

                    if (this.vx < -this.patrolSpeed) {
                        this.vx = -this.patrolSpeed;
                    }
                }

                break;
            }

            // ##################################################
            // 기본 AI
            // ##################################################
            default: {

                this.detectRadius = 400;
                this.patrolSpeed = 1.0;
                this.chaseSpeed = 3;

                if (
                    Math.abs(dx) < this.detectRadius &&
                    Math.abs(dy) < 200
                ) {

                    this.vx += Math.sign(dx) * 0.3;

                    if (this.vx > this.chaseSpeed) {
                        this.vx = this.chaseSpeed;
                    }

                    if (this.vx < -this.chaseSpeed) {
                        this.vx = -this.chaseSpeed;
                    }

                    this.patrolTimer = 0;
                }

                else {

                    this.patrolTimer--;

                    if (
                        this.patrolTimer <= 0 ||
                        this.isTouchingLeftWall ||
                        this.isTouchingRightWall
                    ) {

                        this.facingDirection =
                            Math.random() > 0.5 ? 1 : -1;

                        this.patrolTimer =
                            Math.floor(Math.random() * 120) + 60;
                    }

                    this.vx += this.facingDirection * 0.1;

                    if (this.vx > this.patrolSpeed) {
                        this.vx = this.patrolSpeed;
                    }

                    if (this.vx < -this.patrolSpeed) {
                        this.vx = -this.patrolSpeed;
                    }
                }

                break;
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.state = "chase";
    }

    draw(ctx) {

        // 이미지 있으면 이미지 렌더
        if (asset.image[this.type]) {

            ctx.drawImage(
                asset.image[this.type]["normal"],
                this.x,
                this.y,
                this.width,
                this.height
            );

        } else {

            let drawColor = this.color;

            // 공격 준비 효과
            if (this.isPreparingAttack) {

                if (Math.floor(Date.now() / 100) % 2 === 0) {
                    drawColor = "white";
                }

                ctx.fillStyle = "red";
                ctx.font = "bold 24px Arial";
                ctx.textAlign = "center";

                ctx.fillText(
                    "!",
                    this.x + this.width / 2,
                    this.y - 15
                );
            }

            // 공격 중 효과
            if (this.isAttacking) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "red";
            }

            // 슬라임 반투명 처리
            if (this.type === "slime") {
                ctx.globalAlpha = 0.7;
            }

            ctx.fillStyle = drawColor;

            ctx.fillRect(
                this.x,
                this.y,
                this.width,
                this.height
            );

            ctx.globalAlpha = 1;

            ctx.shadowBlur = 0;

            // HP 바 배경
            ctx.fillStyle = "#333";

            ctx.fillRect(
                this.x,
                this.y - 10,
                this.width,
                5
            );

            // HP 바
            ctx.fillStyle = "#2ecc71";

            ctx.fillRect(
                this.x,
                this.y - 10,
                this.width * (this.hp / this.maxHp),
                5
            );
        }
    }
    death() {
        // 기본: 그냥 삭제 플래그
        this.isDead = true;
    }
}
export class Projectile {
    constructor(x, y, vx, vy, type) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.radius = 8;
        this.isReflected = false;
        this.type = type;

        // 🔥 투사체별 데미지 확장성 부여
        if (type === 'boss_magic') this.damage = 25;
        else if (type === 'player_blade') this.damage = 50;
        else this.damage = 10;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isReflected ? 'gold' : (this.type === 'boss_magic' ? 'purple' : 'red');
        ctx.fill();
        ctx.closePath();
    }
}
// class.js 맨 아래에 추가

export class Boss_Wind extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 80;   // 보스는 덩치가 큼
        this.height = 80;
        this.hp = 500;     // 압도적인 체력
        this.maxHp = 500;
        this.color = '#8e44ad'; // 보라색
        this.speed = 2;
        this.damage = 30;  // 닿으면 아픔
        this.phase = 1;
        this.lastShootTime = 0;
        this.lastDashTime = 0;
        this.isDashing = false;
        this.expReward = 500; // 처치 시 보상 경험치
        this.particles = [];
        this.dying = false;
    }

    update(player, shootCb) {
        const now = Date.now();
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // 1. 페이즈 전환 (체력 50% 이하)
        if (this.hp < this.maxHp / 2 && this.phase === 1) {
            this.phase = 2;
            this.color = '#c0392b'; // 더 진한 빨강으로 변함
            this.speed = 4;        // 빨라짐
        }

        // 2. 이동 로직 (플레이어 근처로 슬금슬금 접근)
        const dist = Math.sqrt((pCenterX - centerX) ** 2 + (pCenterY - centerY) ** 2);
        if (dist > 200 && !this.isDashing) {
            const dx = pCenterX - centerX;
            this.vx = dx > 0 ? this.speed : -this.speed;
        } else if (!this.isDashing) {
            this.vx *= 0.9; // 근처에 오면 멈춤
        }

        // 3. 공격 패턴: 발사 (shootCb는 projectiles.push를 수행하는 콜백)
        const shootInterval = this.phase === 1 ? 1500 : 1000;
        if (now > this.lastShootTime + shootInterval) {
            const angle = Math.atan2(pCenterY - centerY, pCenterX - centerX);

            if (this.phase === 1) {
                // 1페이즈: 조준 단발 사격
                shootCb(new Projectile(centerX, centerY, Math.cos(angle) * 8, Math.sin(angle) * 8, 'boss_magic'));
            } else {
                // 2페이즈: 3방향 확산탄
                for (let i = -1; i <= 1; i++) {
                    const spreadAngle = angle + (i * 0.3);
                    shootCb(new Projectile(centerX, centerY, Math.cos(spreadAngle) * 10, Math.sin(spreadAngle) * 10, 'boss_magic'));
                }
            }
            this.lastShootTime = now;
        }

        // 4. 공격 패턴: 돌진 (2페이즈 전용)
        if (this.phase === 2 && now > this.lastDashTime + 4000 && !this.isDashing) {
            const dx = pCenterX - centerX;
            this.vx = dx > 0 ? 15 : -15; // 순간 돌진
            this.isDashing = true;
            setTimeout(() => { this.isDashing = false; }, 600); // 0.6초간 돌진
            this.lastDashTime = now;
        }
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dx = player.x + player.width / 2 - cx;
        const dy = player.y + player.height / 2 - cy;

        const range = 500; // 영향 범위

        if (dist < range) {
            const force = (1 - dist / range); // 가까울수록 강함

            player.x += (dx / dist) * force * 4;
            player.y += (dy / dist) * force * 4;
            if (dist < 50) {
                player.x += (dx / dist) * force * 10;
                player.y += (dy / dist) * force * 10;
            }
        }
    }
    drawParticles(ctx) {
        ctx.save();

        for (const p of this.particles) {
            ctx.shadowBlur = this.phase === 1 ? 6 : 12;
            ctx.shadowColor = '#ffffff';

            p.draw(ctx);
        }

        ctx.restore();
    }
    draw(ctx) {
        //죽음 처리
        if (this.dying) {
            this.fade -= 0.01;

            ctx.globalAlpha = this.fade;

            if (this.fade <= 0) {
                this.isDead = true;
                return;
            }
        }
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // 1. 바람 파티클 생성
        this.spawnWindParticles(cx, cy);

        // 2. 파티클 업데이트
        this.updateParticles();

        // 3. 파티클 렌더링 (보스 뒤에 깔림)
        this.drawParticles(ctx);

        // 4. 바람 오라
        //this.drawWindAura(ctx);

        // 5. 본체 = Particle
        //구분용 코어
        const time = Date.now() * 0.006;

        // 박동 (심장 느낌)
        const pulse = 1 + Math.sin(time * 2) * 0.25;

        // 중심 크기
        const coreSize = 10 * pulse;

        ctx.save();

        // ⭐ 바깥 글로우 (심장 에너지)
        ctx.globalAlpha *= 0.25;
        ctx.beginPath();
        ctx.arc(cx, cy, 25 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.globalAlpha /= 0.25;

        // ⭐ 중간 코어
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.globalAlpha /= 0.6;

        // ⭐ 핵심 심장 점
        ctx.globalAlpha *= 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 3 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.globalAlpha /= 1;

        ctx.restore();

        const wave = (Math.sin(time * 2) + 1) / 2;

        ctx.save();
        ctx.globalAlpha *= 0.08 * (1 - wave);

        ctx.beginPath();
        ctx.arc(cx, cy, 30 + wave * 80, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha /= 0.08 * (1 - wave);

        ctx.restore();

        // 6. HP바
        this.drawHPBar(ctx);

        // 7. 이동 잔상
        //this.drawWindTrail(ctx);
    }
    spawnWindParticles(cx, cy) {
        const now = Date.now();

        const baseDelay = this.phase === 1 ? 20 : 8;
        if (now < this.windTime) return;
        this.windTime = now + baseDelay;

        const count = this.phase === 1 ? 3 : 8; // ⭐ 핵심 증가

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const t = Math.random();

            const radius = this.phase === 1
                ? (1 - t) * 80
                : (1 - t) * 110;

            const x = cx + Math.cos(angle) * radius;
            const y = cy + 60 - t * 120;

            const spin = this.phase === 1
                ? 2 + (1 - t) * 2
                : 4 + Math.random() * 3;

            const vx = -Math.sin(angle) * spin;
            const vy = Math.cos(angle) * spin - (1.5 + t * 2);

            this.particles.push(
                new Particle(
                    x,
                    y,
                    vx,
                    vy,
                    '#ffffff',
                    this.phase === 1 ? 2 : 3,
                    1
                )
            );
        }
    }
    updateParticles() {
        for (const p of this.particles) {
            p.update();

            if (this.dying) {
                // ⭐ 중력 강화 (가라앉는 핵심)
                p.vy += 0.08;

                // ⭐ 점점 감속
                p.vx *= 0.98;
                p.vy *= 0.98;

                // ⭐ 살짝 중심으로 끌림 (붕괴 느낌)
                const cx = this.x + this.width / 2;
                const dx = cx - p.x;

                p.vx += dx * 0.001;
            }
        }

        this.particles = this.particles.filter(p => p.life > 0);
    }
    drawWindAura(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.save();
        ctx.globalAlpha = 0.12;

        const time = Date.now() * 0.003;

        for (let i = 0; i < 8; i++) {
            const radius = 40 + i * 10 + Math.sin(time + i) * 6;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);

            ctx.strokeStyle = this.phase === 1 ? '#8e44ad' : '#e74c3c';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
    drawWindTrail(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.1;

        const steps = 6;

        for (let i = 1; i <= steps; i++) {
            ctx.fillStyle = this.color;

            ctx.fillRect(
                this.x - this.vx * i * 1.8,
                this.y - this.vy * i * 1.8,
                this.width,
                this.height
            );
        }

        ctx.restore();
    }
    drawHPBar(ctx) {
        const barWidth = this.width + 50;
        const barHeight = 10;

        const x = this.x - 25;
        const y = this.y - 20;

        ctx.save();

        // 배경
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, barWidth, barHeight);

        // HP
        const ratio = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = this.phase === 1 ? '#9b59b6' : '#e74c3c';
        ctx.fillRect(x, y, barWidth * ratio, barHeight);

        // 테두리
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x, y, barWidth, barHeight);

        ctx.restore();
    }
    death() {
        this.dying = true;
        this.fade = 1;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 40;

            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            this.particles.push(new Particle(
                x,
                y,
                (Math.random() - 0.5) * 2,   // 약한 좌우 흔들림
                Math.random() * 3 + 2,       // ⭐ 아래로 가라앉음
                '#ffffff',
                3,
                1
            ));
        }
    }
}