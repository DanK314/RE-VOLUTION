// class.js

import { getAngle } from "./physics.js";

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
        this.hasDash = false;
        this.hasUltimate = false;

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
            if(now < this.dashCooldownTime) return;
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
    update(keys, mouse,screenMouse, shootCb) {
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
        let camera = {x:mouse.x-screenMouse.x,y:mouse.y-screenMouse.y}
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
    constructor(x, y) {
        super(x, y, 40, 40, 2);
        this.hp = 50;
        this.maxHp = 50;
        this.color = '#e74c3c';
        this.expReward = 20;
        this.damage = 15;

        this.isAttacking = false;
        this.attackEndTime = 0;
        this.attackCooldownTime = 0;
        this.isPreparingAttack = false;
        this.attackPrepEndTime = 0;
    }

    // 🔥 메인에 있던 거리 계산, 기 모으기, 돌진 등 AI 로직을 모두 클래스 안으로 숨김!
    update(player) {
        const now = Date.now();
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        const dx = pCenterX - centerX;
        const dy = pCenterY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. 공격 범위 내 진입 시 기 모으기 시작
        if (dist < 120 && now > this.attackCooldownTime && !this.isAttacking && !this.isPreparingAttack) {
            this.isPreparingAttack = true;
            this.attackPrepEndTime = now + 500; // 0.5초 대기
        }

        // 2. 기 모으는 중 (제자리 멈춤 & 돌진 준비)
        if (this.isPreparingAttack) {
            this.vx = 0;

            // 준비 시간 끝나면 돌진!
            if (now > this.attackPrepEndTime) {
                this.isPreparingAttack = false;
                this.isAttacking = true;
                this.attackEndTime = now + 400;
                this.attackCooldownTime = now + 2500;

                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * 24;
                this.vy = -6;
            }
        }

        // 3. 공격 지속 시간 끝남
        if (this.isAttacking && now > this.attackEndTime) {
            this.isAttacking = false;
        }

        // 4. 일반 이동 (공격이나 준비 중이 아닐 때만 플레이어 추적)
        if (!this.isPreparingAttack && !this.isAttacking) {
            if (centerX < pCenterX) this.vx += this.speed;
            else this.vx -= this.speed;

            if (this.vx > 4) this.vx = 4;
            if (this.vx < -4) this.vx = -4;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
    }

    draw(ctx) {
        let drawColor = this.color;

        if (this.isPreparingAttack) {
            if (Math.floor(Date.now() / 100) % 2 === 0) drawColor = 'white';
            ctx.fillStyle = 'red';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', this.x + this.width / 2, this.y - 15);
        }

        if (this.isAttacking) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'red';
        }

        ctx.fillStyle = drawColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.hp / this.maxHp), 5);
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

export class Boss extends Enemy {
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
    }

    draw(ctx) {
        // 보스 본체 (직사각형)
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.phase === 1 ? 'purple' : 'red';
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 보스 체력바 (화면 상단이 아니라 보스 머리 위에 표시)
        const barWidth = this.width + 40;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 20, this.y - 20, barWidth, 10);
        ctx.fillStyle = this.phase === 1 ? '#9b59b6' : '#e74c3c';
        ctx.fillRect(this.x - 20, this.y - 20, (this.hp / this.maxHp) * barWidth, 10);

        ctx.restore();
    }
}