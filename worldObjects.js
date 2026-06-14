import { Particle } from "./class.js";

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
export class Portal {
    constructor(
        x,
        y,
        targetX,
        targetY,
        text = "포탈 사용"
    ) {
        this.x = x;
        this.y = y;

        this.width = 75;
        this.height = 150;

        this.targetX = targetX;
        this.targetY = targetY;

        this.particles = [];

        this.prompt = new FloatingText(
            x + this.width / 2,
            y - 10,
            `[F] ${text}`,
            {
                triggerRadius: 150,
                fontSize: 20,
                color: "#00ffff"
            }
        );
    }

    intersects(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }

    interact(player) {
        player.x = this.targetX;
        player.y = this.targetY;
    }

    spawnParticle(player) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        const angle = Math.random() * Math.PI * 2;
        this.visualRadius ??= 50;

        const targetRadius =
            this.intersects(player) ? 150 : 50;

        this.visualRadius +=
            (targetRadius - this.visualRadius) * 0.01;
        const radius =
            this.visualRadius + Math.random() * 25;

        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;

        let dx = cx - px;
        let dy = cy - py;

        const len = Math.hypot(dx, dy);

        dx /= len;
        dy /= len;

        const swirl = 2.5;

        const vx =
            dx * 2 +
            (-dy) * swirl;

        const vy =
            dy * 2 +
            dx * swirl;

        const color =
            Math.random() < 0.5
                ? "#8a2be2"
                : "#ff00ff";

        this.particles.push(
            new Particle(
                px,
                py,
                vx,
                vy,
                color,
                1 + Math.random() * 2,
                Math.random() + 0.3
            )
        );
    }

    update(player) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        this.prompt.update(player);

        // 파티클 생성
        for (let i = 0; i < 5; i++) {
            this.spawnParticle(player);
        }

        // 파티클 업데이트
        for (const particle of this.particles) {
            particle.update();
            const dx = particle.x - cx;
            const dy = particle.y - cy;

            if (Math.hypot(dx, dy) < 8) {
                particle.life = 0;
            }
        }

        this.particles =
            this.particles.filter(
                p => p.life > 0
            );

    }

    draw(ctx, player) {



        // 파티클
        for (const particle of this.particles) {
            particle.draw(ctx);
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        const pulse =
            0.4 + Math.sin(Date.now() * 0.005) * 0.1;

        ctx.save();

        ctx.globalAlpha = 0.15;

        const r = 10 * pulse + 60;

        const g = ctx.createRadialGradient(
            cx, cy, 0,
            cx, cy, r
        );

        g.addColorStop(0, "#8a2be2");
        g.addColorStop(1, "transparent");

        ctx.fillStyle = g;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 안내문
        this.prompt.draw(ctx, player);
    }
}