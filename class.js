// class.js

import { getAngle } from "./physics.js";
import { asset } from "./load.js";

export class FloatingText {
    constructor(x, y, text, options = {}) {
        this.x = x;
        this.y = y;

        this.text = text;

        this.triggerRadius = options.triggerRadius ?? 200;

        this.fontSize = options.fontSize ?? 24;
        this.color = options.color ?? "white";

        this.duration = options.duration ?? Infinity;

        this.isShowing = false;
        this.isTriggered = false;

        this.onlyOnce = options.onlyOnce ?? false;

        this.startTime = 0;
    }

    update(player) {
        if (this.onlyOnce && this.isTriggered) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const dist = Math.hypot(dx, dy);

        if (dist <= this.triggerRadius) {
            if (!this.isShowing) {
                this.isShowing = true;
                this.isTriggered = true;
                this.startTime = Date.now();
            }
        } else {
            this.isShowing = false;
        }

        if (
            this.isShowing &&
            Date.now() - this.startTime >= this.duration
        ) {
            this.isShowing = false;
        }
    }

    draw(ctx, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const prevAlpha = ctx.globalAlpha;
        const dist = Math.hypot(dx, dy);

        if (dist > this.triggerRadius) return;

        // 가까울수록 투명도 증가
        const alpha = 1 - (dist / this.triggerRadius);

        ctx.save();

        ctx.globalAlpha = alpha;

        ctx.font = `${this.fontSize}px Arial`;
        ctx.fillStyle = this.color;
        ctx.textAlign = "center";

        ctx.fillText(this.text, this.x, this.y);

        ctx.restore();
        ctx.globalAlpha = prevAlpha;
    }
}

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

        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * this.life;


        const glowSize = this.size * 0.1;

        ctx.fillStyle = 'white';

        ctx.fillRect(
            this.x-glowSize,
            this.y-glowSize,
            this.size+glowSize*2,
            this.size+glowSize*2
        );
        
        ctx.globalAlpha = prevAlpha * this.life;

        ctx.fillStyle = this.color;

        ctx.fillRect(
            this.x,
            this.y,
            this.size,
            this.size
        );

        ctx.globalAlpha = prevAlpha;

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
        this.level = 1; this.exp = 0; this.maxExp = 100;
        this.color = '#3498db';
        this.facingDirection = 1;

        this.stats = {
            health: 0,
            damage: 0,
            speed: 0,
            regen: 0,
            cooldown: 0,
        };
        this.maxStats = {
            health: 30,
            damage: 25,
            speed: 20,
            regen: 15,
            cooldown: 9
        };

        this.baseMaxHp = 100;
        this.baseSpeed = 7;
        this.baseMaxVx = 10;
        this.attackDamageMultiplier = 1;
        this.regenAmount = 5;
        this.cooldownReduction = 0;
        this.unspentStatPoints = 0;
        this.onLevelUp = null;

        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;

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
        this.movementSlowness = 0;
        this.healCoolEndTime = 0;
        this.effects = {};
    }

    hasEffect(name) {
        return Boolean(this.effects[name]);
    }

    takeEffect(effect) {
        if (!effect || !effect.effect) return;

        const now = Date.now();
        const name = effect.effect;
        const duration = effect.duration || 0;

        this.effects[name] = {
            ...effect,
            name,
            startTime: now,
            endTime: now + duration,
        };
    }

    // 좌클릭: 기본 공격 발동
    attack(mouseX, mouseY) {
        const now = Date.now();
        const cooldownReduction = this.getCooldownReduction();
        if (now < this.attackCooldownTime) return;
        this.isAttacking = true;
        this.attackEndTime = now + 200;
        this.attackCooldownTime = now + 400 * (1 - cooldownReduction);
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
            this.parryCooldownTime = now + 700 * (1 - this.getCooldownReduction());

            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            this.parryAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
        } else if (this.selectedSkill === 2) {
            if (now < this.dashCooldownTime) return;
            this.isDashing = true;
            this.dashEndTime = now + 200; // 0.2초 (200ms) 동안 순식간에 이동!
            this.dashCooldownTime = now + 3000 * (1 - this.getCooldownReduction());

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
            this.ultCooldown = now + 10000 * (1 - this.getCooldownReduction());
        }
    }

    // 경험치 획득 및 레벨업
    gainExp(amount) {
        this.exp += amount;
        while (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.level++;
            this.maxExp = Math.floor(this.maxExp * 1.5);
            this.recalculateStats();
            this.levelUpEffectEndTime = Date.now() + 1000;
            this.unspentStatPoints++;
        }

        if (
            this.unspentStatPoints > 0 &&
            this.hasUpgradeableStat() &&
            typeof this.onLevelUp === 'function'
        ) {
            this.onLevelUp();
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

    recalculateStats() {
        this.maxHp = this.baseMaxHp + this.stats.health * 20;
        this.speed = this.baseSpeed + Math.max(1.75, this.stats.speed * 0.1);
        this.maxvx = this.baseMaxVx + this.stats.speed * 0.5;
        this.attackDamageMultiplier = 1 + this.stats.damage * 0.02;
        this.regenAmount = 5 + this.stats.regen * 2;
        this.cooldownReduction = Math.min(0.45, this.stats.cooldown * 0.05);
    }

    getCooldownReduction() {
        return this.cooldownReduction;
    }

    getDamageMultiplier() {
        return this.attackDamageMultiplier;
    }

    getAttackPower() {
        return 15 * this.getDamageMultiplier();
    }

    getRegenAmount() {
        return this.regenAmount;
    }

    upgradeStat(stat) {
        if (!(stat in this.stats)) return false;

        if (this.stats[stat] >= this.maxStats[stat]) {
            return false;
        }

        this.stats[stat]++;

        this.recalculateStats();

        if (stat === 'health') {
            this.hp = Math.min(this.maxHp, this.hp + 15);
        }

        return true;
    }
    hasUpgradeableStat() {
        return Object.keys(this.stats).some(
            stat => this.stats[stat] < this.maxStats[stat]
        );
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
            const hpRatio = this.hp / this.maxHp;

            if (this.hasEffect("slowness")) {
                this.movementSlowness = 0.5;
            }
            else if (hpRatio < 0.25) {
                this.movementSlowness = 0.2;
            }
            else if (hpRatio < 0.5) {
                this.movementSlowness = 0.1;
            }
            else if (this.movementSlowness < 0.01) {
                this.movementSlowness = 0;
            }

            let speedMultiplier = 1;
            if (this.hasEffect("slowness")) {
                speedMultiplier = 0.3;
            } else if (hpRatio < 0.25) {
                speedMultiplier = 0.7;
            } else if (hpRatio < 0.5) {
                speedMultiplier = 0.9;
            }

            const currentMaxVx = this.maxvx * speedMultiplier;
            if (keys['ArrowLeft'] || keys['a']) this.vx -= this.speed * (1 - this.movementSlowness);
            if (keys['ArrowRight'] || keys['d']) this.vx += this.speed * (1 - this.movementSlowness);
            if (Math.abs(this.vx) > currentMaxVx && !this.isDashing) {
                this.vx = currentMaxVx * Math.sign(this.vx);
            }

            const centerX = this.x + this.width / 2;
            if (mouse.x < centerX) this.facingDirection = -1;
            else this.facingDirection = 1;

            const jumpKey = keys['ArrowUp'] || keys['w'] || keys[' '];
            if (jumpKey && !this.jumpKeyPressed) {
                if (this.isGrounded) { this.vy = -12 * (1 - this.movementSlowness); this.isGrounded = false; }
                else if (this.isTouchingLeftWall) { this.vy = -13 * (1 - this.movementSlowness); this.vx = 15 * (1 - this.movementSlowness); }
                else if (this.isTouchingRightWall) { this.vy = -13 * (1 - this.movementSlowness); this.vx = -15 * (1 - this.movementSlowness); }
                this.jumpKeyPressed = true;
            } else if (!jumpKey) this.jumpKeyPressed = false;
        }

        // 2. 쿨타임 및 지속시간 체크
        if (this.isInvincible && now > this.invincibleEndTime) this.isInvincible = false;
        if (this.isAttacking && now > this.attackEndTime) this.isAttacking = false;
        if (this.isParrying && now > this.parryEndTime) this.isParrying = false;
        Object.values(this.effects).forEach(effect => {
            if (effect.endTime < now) {
                delete this.effects[effect.name];
            }
        });

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
        this.movementSlowness *= 0.9;
        //자연 회복
        if (this.healCoolEndTime > now || this.hasEffect('bleed')) return;
        this.hp = Math.min(this.maxHp, this.hp + this.getRegenAmount() * (this.hp / this.maxHp));
        this.healCoolEndTime = now + 1000;
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
        this.ai = null;

        if (new.target === Enemy) {
            throw new Error("Enemy is abstract and cannot be instantiated directly");
        }
    }

    update(player) {
        this.ai?.update(this, player);
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.state = "chase";
    }
    draw(ctx) {
        throw new Error("draw() must be implemented by subclass");
    }
    onHit() {
        throw new Error("onHit must be implemented");
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