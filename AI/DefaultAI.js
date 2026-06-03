export class DefaultAI {
    update(enemy, player) {
        const now = Date.now();

        // ==========================================
        // 안전 초기화
        // ==========================================
        if (isNaN(enemy.patrolTimer) || enemy.patrolTimer == null) {
            enemy.patrolTimer = 0;
        }

        // ==========================================
        // 기준 좌표 계산
        // ==========================================
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;

        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;

        const dx = pCenterX - centerX;
        const dy = pCenterY - centerY;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // ==========================================
        // 방향 갱신
        // ==========================================
        if (dx > 0) enemy.facingDirection = 1;
        else enemy.facingDirection = -1;
        enemy.detectRadius = 400;
        enemy.patrolSpeed = 1.0;
        enemy.chaseSpeed = 3;

        if (
            Math.abs(dx) < enemy.detectRadius &&
            Math.abs(dy) < 200
        ) {

            enemy.vx += Math.sign(dx) * 0.3;

            if (enemy.vx > enemy.chaseSpeed) {
                enemy.vx = enemy.chaseSpeed;
            }

            if (enemy.vx < -enemy.chaseSpeed) {
                enemy.vx = -enemy.chaseSpeed;
            }

            enemy.patrolTimer = 0;
        }

        else {

            enemy.patrolTimer--;

            if (
                enemy.patrolTimer <= 0 ||
                enemy.isTouchingLeftWall ||
                enemy.isTouchingRightWall
            ) {

                enemy.facingDirection =
                    Math.random() > 0.5 ? 1 : -1;

                enemy.patrolTimer =
                    Math.floor(Math.random() * 120) + 60;
            }

            enemy.vx += enemy.facingDirection * 0.1;

            if (enemy.vx > enemy.patrolSpeed) {
                enemy.vx = enemy.patrolSpeed;
            }

            if (enemy.vx < -enemy.patrolSpeed) {
                enemy.vx = -enemy.patrolSpeed;
            }
        }
    }
}