import { Slime } from "../enemy/Slime.js";
import { Enemy } from "../class.js";

export class Boss_Nature extends Enemy {
    constructor(x, y) {
        super(x, y, "nature");

        this.width = 120;
        this.height = 120;
        this.speed = 0;
        this.expReward = 3000;

        this.hp = 800;
        this.maxHp = 800;

        this.color = "darkgreen";

        this.damage = 15;

        this.minions = [];

        this.summonCooldown = 3000;
        this.lastSummonTime = 0;

        // 회복
        this.healInterval = 1000;
        this.lastHealTime = 0;

        // 뿌리 공격
        this.rootCooldown = 4000;
        this.lastRootTime = 0;

        this.enraged = false;
        this.rootAttackActive = false;
        this.rootAttackEndTime = 0;
        this.rootTarget = null;
        // Warning (pre-attack) state
        this.rootWarningActive = false;
        this.rootWarningStartTime = 0;
        this.rootWarningDuration = 1000; // ms before actual attack (increased to 1s)
        this.rootActiveDuration = 300; // ms attack visible
        this.rootWarningTarget = null;

        // attack tuning
        this.rootRange = 250; // effective range to trigger and hit (reduced)
        this.rootPushBase = 12; // base push amount (reduced)
        this.dying = false;
        this.deathStartTime = 0;
        this.deathDuration = 2000; // ms
    }

    death() {
        if (this.dying) return;
        this.dying = true;
        this.deathStartTime = Date.now();

        // mark minions to die as well
        this.minions.forEach((m) => {
            try { m.dying = true; m.death?.(); } catch (e) { }
            m.isDead = true;
        });
        // Ensure boss is removed after deathDuration even if update() isn't called
        setTimeout(() => {
            this.isDead = true;
        }, this.deathDuration);
    }

    update(player, spawnCallback) {
        const now = Date.now();

        // If dying, progress death timer and skip AI
        if (this.dying) {
            if (now > this.deathStartTime + this.deathDuration) {
                this.isDead = true;
            }
            return;
        }

        if (!player) return;

        if (!this.enraged && this.hp <= this.maxHp * 0.3) {
            this.enraged = true;
            this.summonCooldown *= 0.6;
            this.rootCooldown *= 0.7;
        }

        this.minions = this.minions.filter((m) => !m.isDead);

        const slime = this.summon(now);
        if (slime && typeof spawnCallback === "function") {
            this.minions.push(slime);
            spawnCallback(slime);
        }

        this.heal(now);
        this.rootAttack(now, player);

        if (this.rootAttackActive && now > this.rootAttackEndTime) {
            this.rootAttackActive = false;
            this.rootTarget = null;
        }
    }

    summon(now) {
        if (now - this.lastSummonTime < this.summonCooldown) return null;

        this.lastSummonTime = now;

        const angle = Math.random() * Math.PI * 2;
        const r = 80;

        const x = this.x + Math.cos(angle) * r;
        const y = this.y + Math.sin(angle) * r;

        return new Slime(x, y);
    }

    heal(now) {
        if (now - this.lastHealTime < this.healInterval) return;

        this.lastHealTime = now;

        const healAmount = this.minions.length * 5;

        this.hp = Math.min(this.maxHp, this.hp + healAmount);
    }

    rootAttack(now, player) {
        // If currently in warning phase, check if it's time to execute the attack
        if (this.rootWarningActive) {
            if (now - this.rootWarningStartTime >= this.rootWarningDuration) {
                this.rootWarningActive = false;

                // Recompute vector to player at execution moment
                const dxExec = player.x - this.x;
                const dyExec = player.y - this.y;
                const distExec = Math.hypot(dxExec, dyExec);

                // Only apply damage if player is still within effective range
                if (distExec < this.rootRange) {
                    player.takeDamage(this.damage * 2);
                    player.takeEffect(this.onHit());

                    // Push player away from boss
                    const push = this.rootPushBase / (distExec || 1);
                    player.x += dxExec * push;
                    player.y += dyExec * push;
                }

                // Activate visual attack and set cooldown
                this.rootAttackActive = true;
                this.rootAttackEndTime = now + this.rootActiveDuration;
                this.rootTarget = { ...this.rootWarningTarget };
                this.lastRootTime = now;
            }

            return;
        }

        // If an attack is already active, do not start another
        if (this.rootAttackActive) return;

        // Enforce cooldown measured from last executed attack
        if (now - this.lastRootTime < this.rootCooldown) return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.rootRange) {
            // Start warning phase
            this.rootWarningActive = true;
            this.rootWarningStartTime = now;
            this.rootWarningTarget = {
                x: player.x + player.width / 2,
                y: player.y + player.height / 2
            };
        }
    }

    // Draw a branching root between two points
    drawRoot(ctx, x1, y1, x2, y2, color = 'sienna', thickness = 8, branches = 3) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        for (let b = 0; b < branches; b++) {
            const t = (b + 1) / (branches + 1);
            const mx = x1 + dx * t;
            const my = y1 + dy * t;

            const offset = (b - (branches - 1) / 2) * 12;
            const cx = mx + nx * offset;
            const cy = my + ny * offset;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineWidth = thickness * (1 - b * 0.2);
            ctx.strokeStyle = color;
            ctx.quadraticCurveTo(cx, cy, x2, y2);
            ctx.stroke();

            // small side branches
            const sx = x1 + dx * (t * 0.6);
            const sy = y1 + dy * (t * 0.6);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineWidth = Math.max(1, thickness * 0.3);
            ctx.strokeStyle = 'rgba(101,67,33,0.9)';
            ctx.quadraticCurveTo(sx + nx * 15, sy + ny * 15, cx, cy);
            ctx.stroke();
        }
    }

    // Draw a curved vine between boss and minion with gradient and leaf accents
    drawVine(ctx, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const midX = x1 + dx * 0.5;
        const midY = y1 + dy * 0.5;
        const nx = -dy / len;
        const ny = dx / len;

        // control point for a smooth curve (perpendicular offset)
        const cpOffset = Math.min(80, len * 0.25);
        const cpX = midX + nx * cpOffset;
        const cpY = midY + ny * cpOffset;

        // gradient along vine
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(101,67,33,0.95)');
        grad.addColorStop(0.5, 'rgba(88,141,60,0.95)');
        grad.addColorStop(1, 'rgba(112,189,82,0.95)');

        // soft glow layer
        ctx.save();
        ctx.strokeStyle = 'rgba(34,84,20,0.12)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        ctx.stroke();
        ctx.restore();

        // main vine
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        ctx.stroke();

        // inner highlight
        ctx.strokeStyle = 'rgba(220,255,200,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        ctx.stroke();

        // leaves along the vine
        const leafCount = Math.max(2, Math.floor(len / 120));
        for (let i = 0; i < leafCount; i++) {
            const t = (i + 1) / (leafCount + 1);
            // point on quadratic bezier
            const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpX + t * t * x2;
            const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpY + t * t * y2;

            const side = i % 2 === 0 ? 1 : -1;
            const lx = bx + nx * 12 * side;
            const ly = by + ny * 12 * side;

            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.atan2(by - cpY, bx - cpX) + side * 0.6);
            ctx.fillStyle = i % 2 === 0 ? '#7fbf3f' : '#379230';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    draw(ctx) {
        const centerX = this.x + 60;
        const centerY = this.y + 60;

        const now = Date.now();

        // Death animation overlay
        let deathProgress = 0;
        if (this.dying) {
            deathProgress = Math.min(1, (now - this.deathStartTime) / this.deathDuration);

            // outward root shards during death
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + (now % 1000) / 1000;
                const tx = centerX + Math.cos(ang) * (100 + deathProgress * 220);
                const ty = centerY + Math.sin(ang) * (60 + deathProgress * 160);
                this.drawRoot(ctx, centerX, centerY, tx, ty, `rgba(101,67,33,${0.9 - deathProgress * 0.9})`, 6 * (1 - deathProgress * 0.6), 2);
            }
        }
        // Warning phase: show pulsing circle and faint root hints
        if (this.rootWarningActive && this.rootWarningTarget) {
            const elapsed = now - this.rootWarningStartTime;
            const t = Math.min(1, Math.max(0, elapsed / this.rootWarningDuration));
            const pulseR = 70 + Math.sin(t * Math.PI * 2) * 6 + t * 10;

            ctx.save();
            ctx.strokeStyle = `rgba(160,82,45,${0.5 + 0.4 * (1 - t)})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12 * (1 - t);
            ctx.shadowColor = 'rgba(160,82,45,0.6)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // faint root hints
            this.drawRoot(ctx, centerX, centerY, this.rootWarningTarget.x, this.rootWarningTarget.y, 'rgba(160,82,45,0.35)', 4, 2);
        }

        // Active attack: draw thick branching roots
        if (this.rootAttackActive && this.rootTarget) {
            ctx.save();
            // multiple layered branches for depth
            this.drawRoot(ctx, centerX, centerY, this.rootTarget.x, this.rootTarget.y, 'rgba(101,67,33,0.95)', 12, 4);
            this.drawRoot(ctx, centerX, centerY, this.rootTarget.x + 6, this.rootTarget.y + 6, 'rgba(139,69,19,0.85)', 8, 3);
            ctx.restore();
        }
        // Boss body + HP (fade when dying)
        ctx.save();
        ctx.globalAlpha = this.dying ? (1 - deathProgress) : 1;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 60, this.y - 60, 120, 120);

        // HP 바 배경
        ctx.fillStyle = "#333";
        ctx.fillRect(this.x - 60, this.y - 80, 120, 10);

        // HP 바
        ctx.fillStyle = "green";
        ctx.fillRect(
            this.x - 60,
            this.y - 80,
            120 * (this.hp / this.maxHp),
            10
        );
        ctx.restore();

        // connection vines to minions
        this.minions.forEach((m) => {
            const bossX = this.x /*+ this.width / 2*/;
            const bossY = this.y/* + this.height / 2*/;
            const minX = (m.x != null && m.width != null) ? m.x + m.width / 2 : m.x;
            const minY = (m.y != null && m.height != null) ? m.y + m.height / 2 : m.y;
            this.drawVine(ctx, bossX, bossY, minX, minY);
        });
    }
    onHit() {
        return {
            effect: "slowness",
            duration: 2000
        };
    }
}
