import { Enemy, Projectile, Particle } from "../class.js";
import { playSound } from "../sound.js";

export class Boss_Wind extends Enemy {
    constructor(x, y) {
        super(x, y);

        this.isBoss = true;
        this.musicSrc = 'wind_boss_theme';

        this.width = 80;   // 보스는 덩치가 큼
        this.height = 80;
        this.hp = 750;     // 압도적인 체력
        this.maxHp = 750;
        this.color = '#8e44ad'; // 보라색
        this.speed = 2;
        this.damage = 10;  // 닿으면 아픔
        this.phase = 1;
        this.lastShootTime = 0;
        this.lastDashTime = 0;
        this.isDashing = false;
        this.expReward = 3000; // 처치 시 보상 경험치
        this.particles = [];
        this.dying = false;
        this.state = "idle";

        this.stateEndTime = 0;

        this.dashCount = 0;

        this.dashVX = 0;
        this.dashVY = 0;

        this.patternCooldown = 0;

        this.spawnX = x;
        this.spawnY = y;

        this.detectRadius = 900;
        this.forgetRadius = 1600;

        this.isReturningHome = false;

        this.fade = 1;
    }

    update(player, shootCb) {

        // =====================================
        // Home 복귀
        // =====================================

        if (this.isReturningHome) {

            // 서서히 사라짐
            this.fade -= 0.03;

            this.vx *= 0.9;
            this.vy *= 0.9;

            // 완전히 사라지면 텔레포트
            if (this.fade <= 0) {

                this.x = this.spawnX;
                this.y = this.spawnY;

                this.vx = 0;
                this.vy = 0;

                this.state = "idle";

                this.fade = 1;

                this.isReturningHome = false;
            }

            return;
        }

        const now = Date.now();

        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        const dx = pCenterX - centerX;
        const dy = pCenterY - centerY;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.forgetRadius) {

            this.isReturningHome = true;
            this.state = "idle"

            return;
        }

        // =====================================
        // 감지 범위 밖
        // =====================================

        if (dist > this.detectRadius) {

            // 천천히 정지
            this.vx *= 0.9;
            this.vy *= 0.9;

            this.x += this.vx;
            this.y += this.vy;

            return;
        }
        // =====================================
        // 풍압 패시브
        // =====================================

        const range = 500;

        if (dist < range) {

            const force = (1 - dist / range);

            player.vx += (dx / dist) * force * 0.4;

            player.movementSlowness = Math.max(
                player.movementSlowness,
                force * 0.45
            );
        }

        // =====================================
        // 페이즈 전환
        // =====================================

        if (
            this.hp < this.maxHp / 2 &&
            this.phase === 1
        ) {
            this.phase = 2;
        }

        // =====================================
        // 상태 종료
        // =====================================

        if (
            this.state !== "idle" &&
            now > this.stateEndTime
        ) {

            // 3연 돌진 처리
            if (
                this.state === "triple_dash"
            ) {

                this.dashCount++;

                if (this.dashCount < 3) {

                    const angle = Math.atan2(dy, dx);

                    this.dashVX =
                        Math.cos(angle) * 18;

                    this.dashVY =
                        Math.sin(angle) * 18;

                    this.vx = this.dashVX;
                    this.vy = this.dashVY;

                    this.stateEndTime = now + 300;

                } else {

                    this.state = "idle";
                    this.patternCooldown = now + 700;
                    this.dashCount = 0;
                }
            }

            else {

                this.state = "idle";
                this.patternCooldown = now + 500;
            }
        }

        // =====================================
        // idle
        // =====================================

        if (
            this.state === "idle"
        ) {

            // 이동
            if (dist > 180) {

                this.vx += Math.sign(dx) * 0.4;

                const maxMoveSpeed =
                    this.phase === 1 ? 3 : 5;

                if (this.vx > maxMoveSpeed) {
                    this.vx = maxMoveSpeed;
                }

                if (this.vx < -maxMoveSpeed) {
                    this.vx = -maxMoveSpeed;
                }
            }

            // 패턴 선택
            if (now > this.patternCooldown) {

                const rand = Math.random();

                // =========================
                // 패턴 1
                // 탄환 + 돌진
                // =========================

                if (rand < 0.4) {

                    this.state = "spread_dash";

                    const angle =
                        Math.atan2(dy, dx);

                    for (let i = -2; i <= 2; i++) {

                        const a =
                            angle + i * 0.25;

                        shootCb(
                            new Projectile(
                                centerX,
                                centerY,
                                Math.cos(a) * 8,
                                Math.sin(a) * 8,
                                'boss_magic'
                            )
                        );
                    }
                    playSound('shoot',true);

                    this.stateEndTime =
                        now + 700;
                }

                // =========================
                // 패턴 2
                // 연사
                // =========================

                else if (rand < 0.75) {

                    this.state = "rapid_fire";

                    let shots = 0;

                    const rapid = setInterval(() => {

                        if (
                            shots >= 5 ||
                            this.isDead
                        ) {
                            clearInterval(rapid);
                            return;
                        }

                        const angle =
                            Math.atan2(
                                player.y - this.y,
                                player.x - this.x
                            );

                        shootCb(
                            new Projectile(
                                centerX,
                                centerY,
                                Math.cos(angle) * 10,
                                Math.sin(angle) * 10,
                                'boss_magic'
                            )
                        );
                        playSound('shoot',true)

                        shots++;

                    }, 120);

                    this.stateEndTime =
                        now + 900;
                }

                // =========================
                // 패턴 3
                // 3연 돌진
                // =========================

                else {

                    this.state = "triple_dash";

                    this.dashCount = 0;

                    const angle =
                        Math.atan2(dy, dx);

                    this.dashVX =
                        Math.cos(angle) * 18;

                    this.dashVY =
                        Math.sin(angle) * 18;

                    this.vx = this.dashVX;
                    this.vy = this.dashVY;

                    playSound('dash',true);

                    this.stateEndTime =
                        now + 300;
                }
            }
        }

        // =====================================
        // 패턴 처리
        // =====================================

        if (
            this.state === "spread_dash"
        ) {

            this.vx *= 0.92;

            if (
                now >
                this.stateEndTime - 200
            ) {

                const angle =
                    Math.atan2(dy, dx);

                this.vx =
                    Math.cos(angle) * 16;

                this.vy =
                    Math.sin(angle) * 16;

                playSound('dash',true);
            }
        }
        const range2 = 500;

        if (dist < range2) {

            const force = 1 - dist / range2;

            // =========================
            // 밀어내기
            // =========================

            player.vx += (dx / dist) * force * 0.4;
            player.vy += (dy / dist) * force * 0.15;

            // 초근접 추가 압박
            if (dist < 90) {

                player.vx += (dx / dist) * force * 0.8;
                player.vy += (dy / dist) * force * 0.3;
            }

            // =========================
            // 조작 둔화
            // =========================

            player.movementSlowness = Math.max(
                player.movementSlowness,
                force * 0.45
            );
        }

        //근접시 공격

        const hitRange = 50;
        if(dist < hitRange){
            player.takeDamage(this.damage);
            player.takeEffect({ effect: 'bleed', duration: 1000 });
        }

        // =====================================
        // 마찰
        // =====================================

        this.vx *= 0.95;
        this.vy *= 0.95;

        // =====================================
        // 실제 이동
        // =====================================

        this.x += this.vx;
        this.y += this.vy;
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

        const wave = (Math.sin(time * 2) + 1) / 2;

        ctx.save();

        const prevAlpha = ctx.globalAlpha;

        // ⭐ 바깥 글로우
        ctx.globalAlpha = prevAlpha * 0.25;

        ctx.beginPath();
        ctx.arc(cx, cy, 25 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // ⭐ 중간 코어
        ctx.globalAlpha = prevAlpha * 0.6;

        ctx.beginPath();
        ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // ⭐ 핵심 심장 점
        ctx.globalAlpha = prevAlpha;

        ctx.beginPath();
        ctx.arc(cx, cy, 3 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 복구
        ctx.globalAlpha = prevAlpha;

        ctx.restore();
        ctx.save();

        const prevAlpha2 = ctx.globalAlpha;

        ctx.globalAlpha =
            prevAlpha2 * 0.08 * (1 - wave);

        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            30 + wave * 80,
            0,
            Math.PI * 2
        );

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.stroke();

        ctx.globalAlpha = prevAlpha2;

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
        playSound('wind_boss_death')

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