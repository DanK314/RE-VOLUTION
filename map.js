// map.js

export const TILE_SIZE = 75;
export const TILE_AIR = 0;
export const TILE_GROUND = 1;
export const TILE_SPAWNER = 2;       // 일반 몹 (M)
export const TILE_BOSS_SPAWNER = 3;  // 보스 (B) 🔥 추가
export const TILE_SPAWNPOINT = 4;

function stringToMap(str) {
    return str.trim().split('\n').map(row =>
        row.trim().split('').map(char => {
            if (char === '#') return TILE_GROUND;
            if (char === 'M') return TILE_SPAWNER;
            if (char === 'B') return TILE_BOSS_SPAWNER; // 🔥 B 인식
            if (char === 'S') return TILE_SPAWNPOINT;
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
................
################
################
`;
const bossString = `
##############.#
#..............#
#..............#
#..............#
#..............#
#..............#
##.............#
#...####.......#
..........#....#
S.......B...####
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
    ....MMMMMMMM#...
    .......##.......
    ################
    ################
    `
].map(stringToMap);
export let currentMap = townChunk;

// 🎨 Biome System
export const BIOME_TOWN = 'town';
export const BIOME_FOREST = 'forest';
export const BIOME_DESERT = 'desert';
export const BIOME_BOSS = 'boss';

export const BIOME_COLORS = {
    town: {
        ground: '#8B4513',
        stroke: '#5c2e0e',
        bgTop: '#1B2735',
        bgBottom: '#3A506B',
        far: '#6C7A89',
        mid: '#4E6378',
        near: '#263238'
    },
    forest: {
        ground: '#603e00',
        stroke: '#1a3009',
        bgTop: '#0d1f0d',
        bgBottom: '#1a4d1a',
        far: '#3d7d3d',
        mid: '#2d6d2d',
        near: '#1a4d1a'
    },
    desert: {
        ground: '#daa520',
        stroke: '#b8860b',
        bgTop: '#f5deb3',
        bgBottom: '#f0e68c',
        far: '#deb887',
        mid: '#d4a574',
        near: '#cd853f'
    },
    boss: {
        ground: '#8b0000',
        stroke: '#4d0000',
        bgTop: '#2b0000',
        bgBottom: '#660000',
        far: '#8b0000',
        mid: '#660000',
        near: '#4d0000'
    }
};

let biomeRegions = [
    { startX: 0, endX: 16, biome: BIOME_TOWN },
    { startX: 16, endX: 256, biome: BIOME_FOREST },
    { startX: 256, endX: 272, biome: BIOME_BOSS },
    { startX: 272, endX: 512, biome: BIOME_DESERT },
    { startX: 512, endX: 528, biome: BIOME_BOSS }
]; // Array of {startX, endX, biome}
const biomeSections = [
    { biome: BIOME_FOREST, chunks: 15 },
    { biome: BIOME_DESERT, chunks: 15 }
];
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function getBiomeColorAtX(x, key) {

    const col = x / TILE_SIZE;

    const region = biomeRegions.find(
        region =>
            col >= region.startX &&
            col < region.endX
    );

    if (!region) {
        return BIOME_COLORS[BIOME_TOWN][key];
    }

    return BIOME_COLORS[region.biome][key];
}

export function getBiomeAtX(x) {
    const blendInfo = getBiomeBlendInfo(x);
    return blendInfo.biomeB ? blendInfo.biomeA : blendInfo.biomeA;
}

export function generateRPGMap() {

    let newMap = [];
    const mapHeight = 12;
    biomeRegions = [];
    let currentX = 0;

    for (let r = 0; r < mapHeight; r++) {
        newMap[r] = [];
    }

    // =========================
    // 시작 마을
    // =========================
    biomeRegions.push({ startX: currentX, endX: currentX + townChunk[0].length, biome: BIOME_TOWN });

    for (let r = 0; r < mapHeight; r++) {
        newMap[r] = newMap[r].concat(townChunk[r]);
    }
    currentX += townChunk[0].length;

    // =========================
    // 랜덤 구간
    // =========================

    for (const section of biomeSections) {

        const sectionStart = currentX;

        // 청크 생성
        for (let i = 0; i < section.chunks; i++) {

            const randomChunk =
                mapChunks[
                Math.floor(Math.random() * mapChunks.length)
                ];

            for (let r = 0; r < mapHeight; r++) {
                newMap[r] = newMap[r].concat(randomChunk[r]);
            }

            currentX += randomChunk[0].length;
        }

        // biome region은 섹션 단위로 딱 1개만
        biomeRegions.push({
            startX: sectionStart,
            endX: currentX,
            biome: section.biome
        });

        // 보스맵
        const bossStart = currentX;

        for (let r = 0; r < mapHeight; r++) {
            newMap[r] = newMap[r].concat(bossChunk[r]);
        }

        currentX += bossChunk[0].length;

        biomeRegions.push({
            startX: bossStart,
            endX: currentX,
            biome: BIOME_BOSS
        });
    }

    currentMap = newMap;
    console.table(
        biomeRegions.map(r => ({
            start: r.startX,
            end: r.endX,
            biome: r.biome
        }))
    );
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

export function extractRespawnPoints() {
    let points = [];
    for (let row = 0; row < currentMap.length; row++) {
        for (let col = 0; col < currentMap[row].length; col++) {
            if (currentMap[row][col] === TILE_SPAWNPOINT) {
                points.push({
                    x: col * TILE_SIZE,
                    y: row * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE
                });
                currentMap[row][col] = TILE_AIR;
            }
        }
    }
    return points;
}
export function drawMap(
    ctx,
    asset,
    camera,
    canvas
) {

    const startCol =
        Math.floor(camera.x / TILE_SIZE);

    const endCol =
        startCol +
        Math.ceil(canvas.width / TILE_SIZE) + 2;

    const startRow =
        Math.floor(camera.y / TILE_SIZE);

    const endRow =
        startRow +
        Math.ceil(canvas.height / TILE_SIZE) + 2;

    for (let row = startRow; row < endRow; row++) {

        if (!currentMap[row]) continue;

        for (let col = startCol; col < endCol; col++) {

            if (
                currentMap[row][col]
                === TILE_GROUND
            ) {

                const x = col * TILE_SIZE;
                const y = row * TILE_SIZE;

                const fillColor =
                    getBiomeColorAtX(
                        x + TILE_SIZE / 2,
                        'ground'
                    );

                const strokeColor =
                    getBiomeColorAtX(
                        x + TILE_SIZE / 2,
                        'stroke'
                    );

                ctx.fillStyle = fillColor;

                ctx.fillRect(
                    x,
                    y,
                    TILE_SIZE,
                    TILE_SIZE
                );

                ctx.strokeStyle = strokeColor;

                /*
                ctx.strokeRect(
                    x,
                    y,
                    TILE_SIZE,
                    TILE_SIZE
                );
                */
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