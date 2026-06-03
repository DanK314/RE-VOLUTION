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

function loadImage(character, action, src, info = {}) {
    ensureAssetPath('image', character, action);

    totalAssets++;

    const img = new Image();
    img.src = src;

    img.onload = checkLoad;
    img.onerror = () => console.error(`이미지 로드 실패: ${src}`);

    asset.image[character][action] = {
        image: img,
        ...info
    };
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
        // { 캐릭터명, 동작, 파일 경로, 가로, 세로, 프레임 수 }
        {
            char: 'enemy_slime',
            action: 'idle',

            path: './asset/images/enemy/slime_idle.png',

            frameWidth: 32,
            frameHeight: 32,
            frames: 8
        }
    ],
    sounds: [
        // 사운드는 보통 프레임이 없으므로 단일 파일 경로만 적습니다.
    ]
};

// 메인 실행 함수
export function initLoad() {
    console.log("에셋 로딩 시작...");

    // 1. 이미지 리스트를 순회하며 자동 로드
    assetManifest.images.forEach(item => {
        loadImage(
            item.char,
            item.action,
            item.path,
            {
                frameWidth: item.frameWidth,
                frameHeight: item.frameHeight,
                frames: item.frames
            }
        );
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