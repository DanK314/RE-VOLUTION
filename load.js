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
    if (type === 'sound') {
        if (!asset.sound[character]) {
            asset.sound[character] = {};
        }
        return;
    }

    if (type === 'image') {
        if (!asset.image[character]) {
            asset.image[character] = {};
        }

        if (!asset.image[character][action]) {
            asset.image[character][action] = {};
        }
    }
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

function loadSound(name,src,volume) {
    ensureAssetPath('sound',name);
    totalAssets++;
    const audio = new Audio();
    audio.src = src;
    audio.volume = volume;
    audio.oncanplaythrough = checkLoad;
    audio.onerror = () => console.error(`사운드 로드 실패: ${src}`);
    asset.sound[name] = audio;
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
        {
            name : 'hit',
            path : './asset/sounds/hit.wav',
            volume : 0.3
        },
        {
            name : 'crit_hit',
            path : './asset/sounds/crit_hit.wav',
            volume : 0.4
        },
        {
            name : 'shoot',
            path : './asset/sounds/shoot.wav',
            volume : 0.2
        },
        {
            name : 'dash',
            path : './asset/sounds/dash.wav',
            volume : 0.2
        },
        {
            name : 'death',
            path : './asset/sounds/death.wav',
            volume : 0.1
        },
        {
            name : 'wind_boss_death',
            path : './asset/sounds/wind_boss_death.wav',
            volume : 0.7
        },
        {
            name : 'sweep',
            path : './asset/sounds/sweep.wav',
            volume : 0.4
        },
        {
            name : 'parry_projectile',
            path : './asset/sounds/parry_projectile.wav',
            volume : 0.2
        },
        {
            name : 'parry',
            path : './asset/sounds/parry.wav',
            volume : 0.2
        },
        {
            name : 'wind_boss_theme',
            path : './asset/sounds/wind_boss_theme.wav',
            volume : 0.1
        },
        {
            name : 'nature_boss_theme',
            path : './asset/sounds/nature_boss_theme.wav',
            volume : 0.1
        },
        {
            name : 'heal',
            path : './asset/sounds/heal.wav',
            volume : 0.3
        },
        {
            name : 'town_bgm',
            path : './asset/sounds/town_bgm.wav',
            volume : 0.1
        }
    ]
};

// 메인 실행 함수
export function initLoad() {
    console.log("에셋 로딩 시작...");

    const promises = [];

    assetManifest.images.forEach(item => {
        promises.push(
            new Promise((resolve, reject) => {
                ensureAssetPath('image', item.char, item.action);

                const img = new Image();

                img.onload = () => {
                    asset.image[item.char][item.action] = {
                        image: img,
                        frameWidth: item.frameWidth,
                        frameHeight: item.frameHeight,
                        frames: item.frames
                    };

                    resolve();
                };

                img.onerror = reject;
                img.src = item.path;
            })
        );
    });

    assetManifest.sounds.forEach(item => {
        promises.push(
            new Promise((resolve, reject) => {
                const audio = new Audio();

                audio.oncanplaythrough = resolve;
                audio.onerror = reject;

                audio.src = item.path;
                audio.volume = item.volume;

                asset.sound[item.name] = audio;
            })
        );
    });

    return Promise.all(promises);
}