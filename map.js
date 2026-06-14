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
.#############.#
.#.............#
.#.............#
.#.............#
.#.............#
.#.............#
.##............#
.#...###.......#
.#........#....#
.S......B...####
################
################
`;

const townChunk = stringToMap(townString);
const bossChunk = stringToMap(bossString);

// 🎨 Biome System
export const BIOME_TOWN = 'town'; //시작지점
export const BIOME_PLAIN = 'plain';
export const BIOME_FOREST = 'forest';
export const BIOME_BOSS = 'boss';

// 중간 필드용 랜덤 청크들 (M을 곳곳에 배치)
// 🔥 모든 청크가 정확히 12줄이어야 마을/보스맵과 자연스럽게 연결됩니다!
const mapChunks = {
    plain: [
        `
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ..MM............
    ######..........
    ###########.M.##
    ################
    `,
        `
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    .........##.....
    ###.MMM.######..
    ################
    ################
    `,
        `
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ................
    ..............M.
    M.....M.......##
    #....#####...###
    ################
    `
    ].map(stringToMap),
    forest: [
        `
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ...M............
        ...#.......M....
        .M###......###M.
        .####.M....#####
        ################
        `,
        `
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ...M........M...
        ..###..M...###.M
        .#######..M#####
        ################
        `,
        `
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ..M..........M..
        .###..M.M.M.####
        ################
        `,
    ].map(stringToMap)
}
export let currentMap = townChunk;

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
    plain: {
        ground: '#b27400',
        stroke: '#1a3009',
        bgTop: '#60d7cd',
        bgBottom: '#0ed256',
        far: '#3d7d3d',
        mid: '#2d6d2d',
        near: '#1a4d1a'
    },
    forest: {
        ground: '#755000',
        stroke: '#b8860b',
        bgTop: '#338000',
        bgBottom: '#0c3a15',
        far: '#00c407',
        mid: '#288f00',
        near: '#135100'
    },
    boss: {
        ground: '#8b0000',
        stroke: '#4d0000',
        bgTop: '#000000',
        bgBottom: '#330000',
        far: '#8b0000',
        mid: '#660000',
        near: '#4d0000'
    }
};

let biomeRegions = [
    {
        biome: BIOME_TOWN,
        type: 'town'
    },
    {
        biome: BIOME_PLAIN,
        chunks: 5
    },
    {
        biome: BIOME_FOREST,
        chunks: 10
    },
    {
        biome: BIOME_BOSS,
        type: 'boss'
    }
];
let generatedBiomeRegions = [];
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function getBiomeColorAtX(x, key) {

    const col = x / TILE_SIZE;

    const region = generatedBiomeRegions.find(
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
    const tile = Math.floor(x / TILE_SIZE);

    for (let i = 0; i < generatedBiomeRegions.length; i++) {
        const b = generatedBiomeRegions[i];

        if (tile >= b.startX && tile < b.endX) {
            return b.biome;
        }
    }

    return BIOME_TOWN;
}
export function generateRPGMap() {

    let newMap = [];
    const mapHeight = 12;

    generatedBiomeRegions = [];

    let currentX = 0;

    for (let r = 0; r < mapHeight; r++) {
        newMap[r] = [];
    }

    for (const section of biomeRegions) {

        const sectionStart = currentX;

        // 시작 마을
        if (section.type === 'town') {

            for (let r = 0; r < mapHeight; r++) {
                newMap[r] = newMap[r].concat(townChunk[r]);
            }

            currentX += townChunk[0].length;
        }

        // 보스맵
        else if (section.type === 'boss') {

            for (let r = 0; r < mapHeight; r++) {
                newMap[r] = newMap[r].concat(bossChunk[r]);
            }

            currentX += bossChunk[0].length;
        }

        // 일반 바이옴
        else {

            const chunks = section.chunks ?? 1;

            for (let i = 0; i < chunks; i++) {

                const chunkList = mapChunks[section.biome];

                if (!chunkList) {
                    console.warn(
                        `No chunks for biome "${section.biome}"`
                    );
                    continue;
                }

                const randomChunk =
                    chunkList[
                        Math.floor(
                            Math.random() * chunkList.length
                        )
                    ];

                for (let r = 0; r < mapHeight; r++) {
                    newMap[r] =
                        newMap[r].concat(randomChunk[r]);
                }

                currentX += randomChunk[0].length;
            }
        }

        generatedBiomeRegions.push({
            startX: sectionStart,
            endX: currentX,
            biome: section.biome
        });
    }

    currentMap = newMap;

    console.table(
        generatedBiomeRegions.map(r => ({
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