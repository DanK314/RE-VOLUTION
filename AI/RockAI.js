export class RockAI {
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
        enemy.detectRadius = 350;
        enemy.patrolSpeed = 0.2;
        enemy.chaseSpeed = 1.2;

        // 공격 종료
        if (enemy.isAttacking && now > enemy.attackEndTime) {
            enemy.isAttacking = false;
        }

        // ==========================================
        // 플레이어 발견
        // ==========================================
        if (
            Math.abs(dx) < enemy.detectRadius &&
            Math.abs(dy) < 160
        ) {

            // 진짜 가까울 때만 움직임
            if (dist < 120) {

                enemy.vx += Math.sign(dx) * 0.15;

                if (enemy.vx > enemy.chaseSpeed) {
                    enemy.vx = enemy.chaseSpeed;
                }

                if (enemy.vx < -enemy.chaseSpeed) {
                    enemy.vx = -enemy.chaseSpeed;
                }
            }

            // 초근접 공격
            if (
                dist < 70 &&
                enemy.isGrounded &&
                now > enemy.attackCooldownTime
            ) {

                enemy.isAttacking = true;

                enemy.attackEndTime = now + 500;
                enemy.attackCooldownTime = now + 2600;

                // 낮은 점프 + 강한 돌진
                enemy.vy = -6;
                enemy.vx = Math.sign(dx) * 16;
            }

            enemy.patrolTimer = 0;
        }

        // ==========================================
        // 배회
        // ==========================================
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
                    Math.floor(Math.random() * 240) + 120;
            }

            // 거의 안 움직임
            enemy.vx += enemy.facingDirection * 0.02;

            if (enemy.vx > enemy.patrolSpeed) {
                enemy.vx = enemy.patrolSpeed;
            }

            if (enemy.vx < -enemy.patrolSpeed) {
                enemy.vx = -enemy.patrolSpeed;
            }
        }
    }
}