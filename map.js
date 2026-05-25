// map.js

export const TILE_SIZE = 75;
export const TILE_AIR = 0;
export const TILE_GROUND = 1;
export const TILE_SPAWNER = 2;       // 일반 몹 (M)
export const TILE_BOSS_SPAWNER = 3;  // 보스 (B) 🔥 추가

function stringToMap(str) {
    return str.trim().split('\n').map(row => 
        row.trim().split('').map(char => {
            if (char === '#') return TILE_GROUND;
            if (char === 'M') return TILE_SPAWNER;
            if (char === 'B') return TILE_BOSS_SPAWNER; // 🔥 B 인식
            return TILE_AIR;
        })
    );
}
const townString = `
................
................
................
................
................
................
................
................
................
.......B........
################
################
`;
// 보스 전용 구역 문자열 수정
const bossString = `
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#..............#
#......####....#
#..............#
#.......B......#
################
################
`;

const townChunk = stringToMap(townString);
const bossChunk = stringToMap(bossString);

// 중간 필드용 랜덤 청크들 (M을 곳곳에 배치)
// 🔥 모든 청크가 정확히 12줄이어야 마을/보스맵과 자연스럽게 연결됩니다!
const mapChunks = [
    // 1. 점프 발판 지형
    `
    ................
    ................
    ................
    ................
    .......MM.......
    .....######.....
    ................
    ...M#.......M...
    .####......####.
    ................
    ################
    ################
    `,
    // 2. 만드셨던 거대한 산 지형 (위쪽에 빈 공간 4줄을 추가해 12줄로 맞춤)
    `
    ................
    ................
    ................
    ................
    .......MMMM.....
    .....####.......
    ..############..
    ################
    ################
    ################
    ################
    ################
    `,
    // 3. 평지와 몬스터 군단 지형
    `
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ....MMMMMMMM....
    ................
    ################
    ################
    `
].map(stringToMap);
export let currentMap = townChunk; 

export function generateRPGMap(randomChunkCount = 10) {
    let newMap = [];
    let mapHeight = 12; 

    for (let r = 0; r < mapHeight; r++) newMap[r] = [];
    for (let r = 0; r < mapHeight; r++) newMap[r] = newMap[r].concat(townChunk[r]);
    for (let i = 0; i < randomChunkCount; i++) {
        const randomChunk = mapChunks[Math.floor(Math.random() * mapChunks.length)];
        for (let r = 0; r < mapHeight; r++) newMap[r] = newMap[r].concat(randomChunk[r]);
    }
    for (let r = 0; r < mapHeight; r++) newMap[r] = newMap[r].concat(bossChunk[r]);

    currentMap = newMap;
}

export function extractSpawners() {
    let spawns = [];
    for (let row = 0; row < currentMap.length; row++) {
        for (let col = 0; col < currentMap[row].length; col++) {
            let type = null;
            if (currentMap[row][col] === TILE_SPAWNER) type = 'normal';
            if (currentMap[row][col] === TILE_BOSS_SPAWNER) type = 'boss'; // 🔥 보스 타입 체크

            if (type) {
                spawns.push({ 
                    x: col * TILE_SIZE, 
                    y: row * TILE_SIZE,
                    type: type // 스폰 지점의 타입을 함께 넘겨줌
                });
                currentMap[row][col] = TILE_AIR; 
            }
        }
    }
    return spawns;
}
export function drawMap(ctx, asset) {
    for (let row = 0; row < currentMap.length; row++) {
        for (let col = 0; col < currentMap[row].length; col++) {
            if (currentMap[row][col] === TILE_GROUND) {
                const x = col * TILE_SIZE;
                const y = row * TILE_SIZE;

                ctx.fillStyle = '#8B4513'; 
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#5c2e0e';
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

export function getTileAt(x, y) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (row < 0 || row >= currentMap.length || col < 0 || col >= currentMap[0].length) return TILE_AIR; 
    return currentMap[row][col];
}