export class SlimeAI {
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
        // ==========================================
        // 행동 결정
        // ==========================================
        // ##################################################
        // 슬라임
        // ##################################################
        enemy.detectRadius = 500;
        enemy.patrolSpeed = 1.5;
        enemy.chaseSpeed = 4;

        // 공격 종료
        if (enemy.isAttacking && now > enemy.attackEndTime) {
            enemy.isAttacking = false;
        }

        // 점프 타이머
        if (!enemy.lastJumpTime) {
            enemy.lastJumpTime = 0;
        }

        // ==========================================
        // 공격 준비
        // ==========================================
        if (enemy.isPreparingAttack) {

            enemy.vx *= 0.7;

            // 떨림
            enemy.vx += (Math.random() - 0.5) * 1.2;

            if (now > enemy.attackPrepEndTime) {

                enemy.isPreparingAttack = false;
                enemy.isAttacking = true;

                enemy.attackEndTime = now + 350;
                enemy.attackCooldownTime = now + 1000;

                // 낮고 빠른 공격 점프
                enemy.vx = Math.sign(dx) * 28;
                enemy.vy = -4;
            }

            return;
        }

        // ==========================================
        // 공격 중
        // ==========================================
        if (enemy.isAttacking) {
            return;
        }

        // ==========================================
        // 플레이어 감지
        // ==========================================
        if (
            Math.abs(dx) < enemy.detectRadius &&
            Math.abs(dy) < 220
        ) {

            // 가까우면 공격 준비
            if (
                dist < 150 &&
                enemy.isGrounded &&
                now > enemy.attackCooldownTime
            ) {

                enemy.isPreparingAttack = true;
                enemy.attackPrepEndTime = now + 220;

                enemy.vx *= 0.3;
            }

            // 슬라임 점프 이동
            else {

                if (
                    enemy.isGrounded &&
                    now > enemy.lastJumpTime + 500
                ) {

                    enemy.lastJumpTime = now;

                    enemy.vx = Math.sign(dx) * (
                        enemy.chaseSpeed +
                        Math.random() * 2
                    );

                    enemy.vy = -(7 + Math.random() * 2);
                }
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
                    Math.floor(Math.random() * 120) + 60;
            }

            // 배회도 점프로 이동
            if (
                enemy.isGrounded &&
                now > enemy.lastJumpTime + 700
            ) {

                enemy.lastJumpTime = now;

                enemy.vx = enemy.facingDirection * (
                    enemy.patrolSpeed +
                    Math.random()
                );

                enemy.vy = -(5 + Math.random() * 2);
            }
        }
    }
}