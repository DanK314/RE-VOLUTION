// physics.js

import { getTileAt, TILE_SIZE, TILE_GROUND, TILE_BOSS_WALL } from './map.js';

const GRAVITY = 0.6; 
const FRICTION = 0.8; 
export function getAngle(mx, my, px, py) {
    const dx = mx - px;
    const dy = my - py;

    // 라디안 값
    const rad = Math.atan2(dy, dx);

    // 도(degree)로 변환
    const deg = rad * 180 / Math.PI;

    return rad;
}
export function applyPhysics(entity, isBossAlive) {
    if (!entity.ignoreGravity) entity.vy += GRAVITY;
    if (!entity.ignoreFriction) entity.vx *= FRICTION;
    
    if (Math.abs(entity.vx) < 0.1) entity.vx = 0;

    if (entity.ignoreCollision) {
        entity.x += entity.vx;
        entity.y += entity.vy;
        return;
    }

    // ==========================================
    // 상태 초기화
    // ==========================================
    entity.isTouchingLeftWall = false;
    entity.isTouchingRightWall = false;
    entity.isGrounded = false;

    // ==========================================
    // X축 이동 및 충돌
    // ==========================================
    entity.x += entity.vx;
    
    if (entity.vx > 0) {
        if (isSolid(entity.x + entity.width, entity.y, isBossAlive) || isSolid(entity.x + entity.width, entity.y + entity.height - 1,isBossAlive)) {
            entity.x = Math.floor((entity.x + entity.width) / TILE_SIZE) * TILE_SIZE - entity.width;
            entity.vx = 0;
        }
    } else if (entity.vx < 0) {
        if (isSolid(entity.x, entity.y, isBossAlive) || isSolid(entity.x, entity.y + entity.height - 1, isBossAlive)) {
            entity.x = Math.floor(entity.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
            entity.vx = 0;
        }
    }

    // ==========================================
    // Y축 이동 및 충돌
    // ==========================================
    entity.y += entity.vy;

    if (entity.vy > 0) {
        if (isSolid(entity.x, entity.y + entity.height, isBossAlive) || isSolid(entity.x + entity.width - 1, entity.y + entity.height, isBossAlive)) {
            entity.y = Math.floor((entity.y + entity.height) / TILE_SIZE) * TILE_SIZE - entity.height;
            entity.vy = 0;
            entity.isGrounded = true; 
        }
    } else if (entity.vy < 0) {
        if (isSolid(entity.x, entity.y,isBossAlive) || isSolid(entity.x + entity.width - 1, entity.y, isBossAlive)) {
            entity.y = Math.floor(entity.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
            entity.vy = 0; 
        }
    }

    // ==========================================
    // 🔥 [NEW] 벽 감지 및 벽 타기 (Wall Slide) 로직
    // ==========================================
    // 바닥과 천장을 벽으로 오해하지 않게 y좌표를 위아래로 1픽셀씩 줄여서 검사
    const yTop = entity.y + 1;
    const yBottom = entity.y + entity.height - 2;

    // 캐릭터의 바로 왼쪽(1px)이나 오른쪽(1px)에 벽이 있는지 확인
    if (isSolid(entity.x - 1, yTop, isBossAlive) || isSolid(entity.x - 1, yBottom, isBossAlive)) {
        entity.isTouchingLeftWall = true;
    }
    if (isSolid(entity.x + entity.width, yTop, isBossAlive) || isSolid(entity.x + entity.width, yBottom, isBossAlive)) {
        entity.isTouchingRightWall = true;
    }

    // 땅에 없는데 벽에 비비며 아래로 떨어지는 중이라면? -> 마찰력 발동 (천천히 미끄러짐)
    if (!entity.isGrounded && entity.vy > 0) {
        if (entity.isTouchingLeftWall || entity.isTouchingRightWall) {
            entity.vy = Math.min(entity.vy, 2); // 떨어지는 최대 속도를 2로 제한
        }
    }
}

function isSolid(x, y,isBossAlive) {
    return getTileAt(x, y) === TILE_GROUND || (isBossAlive && getTileAt(x,y) === TILE_BOSS_WALL);
}