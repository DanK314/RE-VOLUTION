export class EagleAI {
    constructor() {
        this.state = "idle";

        this.baseHeight = 120;
        this.groundLimit = this.baseHeight + 180;

        this.detectRange = 800;

        // 공격 타겟
        this.diveTargetX = 0;
        this.diveTargetY = 0;

        this.diveSpeed = 0;

        this.windupTime = 0;
        this.recoverTime = 0;

        // 🔥 추가: 도망 상태 타이머
        this.retreatTime = 0;

        // 🔥 도망 거리
        this.retreatDistance = 500;
    }

    update(enemy, player) {
        const pX = player.x + player.width / 2;
        const pY = player.y + player.height / 2;

        const eX = enemy.x + enemy.width / 2;
        const eY = enemy.y + enemy.height / 2;

        const dx = pX - eX;
        const dy = pY - eY;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // ==========================================
        // idle (호버 + 감지)
        // ==========================================
        if (this.state === "idle") {
            enemy.isAttacking = false;

            enemy.vx += Math.sin(Date.now() * 0.001) * 0.08;

            const heightError = this.baseHeight - enemy.y;
            enemy.vy += heightError * 0.01;

            if (dist < this.detectRange) {
                this.state = "windup";
                this.windupTime = 400;
            }

            return;
        }

        // ==========================================
        // windup
        // ==========================================
        if (this.state === "windup") {
            enemy.vx *= 0.85;
            enemy.vy *= 0.85;

            this.windupTime -= 16;

            if (this.windupTime <= 0) {
                this.state = "dive";

                this.diveTargetX = pX;
                this.diveTargetY = pY;

                this.diveSpeed = 0;
            }

            return;
        }

        // ==========================================
        // dive
        // ==========================================
        if (this.state === "dive") {
            enemy.isAttacking = true;

            const adx = this.diveTargetX - eX;
            const ady = this.diveTargetY - eY;

            const len = Math.sqrt(adx * adx + ady * ady);

            this.diveSpeed += 0.7;
            const speed = Math.min(this.diveSpeed, 16);

            enemy.vx = (adx / len) * speed;
            enemy.vy = (ady / len) * speed;

            if (len < 35) {
                enemy.isAttacking = false;

                this.state = "recover";
                this.recoverTime = 700;

                enemy.vx *= 0.25;
                enemy.vy *= 0.25;
            }

            return;
        }

        // ==========================================
        // recover
        // ==========================================
        if (this.state === "recover") {
            enemy.isAttacking = false;

            this.recoverTime -= 16;

            const heightError = this.baseHeight - enemy.y;
            enemy.vy += heightError * 0.008;

            enemy.vx *= 0.95;
            enemy.vy *= 0.9;

            if (this.recoverTime <= 0) {
                this.state = "retreat";

                this.retreatTime = 900;

                // 🔥 플레이어 반대 방향으로 도망 목표 설정
                const dir = Math.sign(eX - pX) || 1;

                this.diveTargetX = eX + dir * this.retreatDistance;
                this.diveTargetY = this.baseHeight;
            }

            return;
        }

        // ==========================================
        // retreat (멀리 도망)
        // ==========================================
        if (this.state === "retreat") {
            enemy.isAttacking = false;

            this.retreatTime -= 16;

            const adx = this.diveTargetX - eX;
            const ady = this.diveTargetY - eY;

            const len = Math.sqrt(adx * adx + ady * ady);

            const speed = 10;

            enemy.vx = (adx / len) * speed;
            enemy.vy = (ady / len) * speed;

            // 바닥 방지 + 고도 복귀
            const heightError = this.baseHeight - enemy.y;
            enemy.vy += heightError * 0.01;

            if (len < 60 || this.retreatTime <= 0) {
                this.state = "idle";
            }

            return;
        }
    }
}