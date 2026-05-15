// load.js

export const asset = {
    image: {},
    sound: {}
};

export let checkAllLoaded = false;

let totalAssets = 0;
let loadedAssets = 0;

function checkLoad() {
    loadedAssets++;
    if (loadedAssets === totalAssets) {
        checkAllLoaded = true;
        console.log("모든 에셋 로드 완료!");
    }
}

function ensureAssetPath(type, character, action) {
    if (!asset[type][character]) asset[type][character] = {};
    if (!asset[type][character][action]) asset[type][character][action] = [];
}

function loadImage(character, action, frame, src) {
    ensureAssetPath('image', character, action);
    totalAssets++;
    const img = new Image();
    img.src = src;
    img.onload = checkLoad;
    img.onerror = () => console.error(`이미지 로드 실패: ${src}`);
    asset.image[character][action][frame] = img;
}

function loadSound(character, action, frame, src) {
    ensureAssetPath('sound', character, action);
    totalAssets++;
    const audio = new Audio();
    audio.src = src;
    audio.oncanplaythrough = checkLoad;
    audio.onerror = () => console.error(`사운드 로드 실패: ${src}`);
    asset.sound[character][action][frame] = audio;
}

// ==========================================
// 여기서부터 핵심! 에셋 리스트(Manifest)를 작성합니다.
// ==========================================

const assetManifest = {
    images: [
        // { 캐릭터명, 동작, 프레임 수, 파일 경로(프레임 번호 앞까지) }
        { char: 'player', action: 'walk', frames: 16, path: 'assets/images/player/walk/frame_' },
        { char: 'player', action: 'attack', frames: 16, path: 'assets/images/player/attack/frame_' },
        { char: 'enemy_slime', action: 'idle', frames: 16, path: 'assets/images/enemy/slime_idle_' }
    ],
    sounds: [
        // 사운드는 보통 프레임이 없으므로 단일 파일 경로만 적습니다.
        { char: 'player', action: 'walk', path: 'assets/sounds/player_walk.mp3' },
        { char: 'player', action: 'attack', path: 'assets/sounds/player_attack.mp3' }
    ]
};

// 메인 실행 함수
export function initLoad() {
    console.log("에셋 로딩 시작...");

    // 1. 이미지 리스트를 순회하며 자동 로드
    assetManifest.images.forEach(item => {
        for (let i = 0; i < item.frames; i++) {
            loadImage(item.char, item.action, i, `${item.path}${i}.png`);
        }
    });

    // 2. 사운드 리스트를 순회하며 자동 로드
    assetManifest.sounds.forEach(item => {
        loadSound(item.char, item.action, 0, item.path);
    });

    if (totalAssets === 0) {
        checkAllLoaded = true;
        console.log("로드할 에셋이 없습니다.");
    }
}