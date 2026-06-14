import { asset } from "./load.js";

let currentBGM = null;
let currentBGMName = null;
let fadeInterval = null;

function clampVolume(value) {
    return Math.max(0, Math.min(1, value));
}

export function playSound(name, force = false) {
    const audio = asset.sound[name];

    if (!audio) {
        console.log(`no audio named : "${name}"`);
        return;
    }

    if (!audio.paused && !force) return;

    audio.currentTime = 0;
    audio.play();
}
export function playBGM(name, fadeTime = 500) {
    if (!name) {
        stopBGM(fadeTime);
        return;
    }

    const next = asset.sound[name];

    if (!next) {
        console.log('no audio named : "' + name + '"');
        stopBGM(fadeTime);
        return;
    }

    if (currentBGM === next) {
        if (next.paused) {
            next.play();
        }
        return;
    }

    clearInterval(fadeInterval);

    next.loop = true;

    // 첫 재생
    if (!currentBGM) {
        next.volume = 0;
        next.currentTime = 0;
        next.play();

        fade(next, 0, 0.99, fadeTime);

        currentBGM = next;
        return;
    }

    const old = currentBGM;

    // 🔥 전환 시작 시 바로 현재 BGM 갱신
    currentBGM = next;

    fadeInterval = setInterval(() => {
        old.volume = clampVolume(old.volume - 0.05);

        if (old.volume <= 0) {
            old.pause();
            old.currentTime = 0;
            old.volume = 1;

            next.volume = 0;
            next.currentTime = 0;
            next.play();

            fade(next, 0, 0.99, fadeTime);

            clearInterval(fadeInterval);
            fadeInterval = null;
        }
    }, fadeTime / 20);
}

function fade(audio, from, to, duration) {
    audio.volume = clampVolume(from);

    const steps = 20;
    let step = 0;

    const interval = setInterval(() => {
        step++;

        const t = step / steps;

        audio.volume = clampVolume(
            from + (to - from) * t
        );

        if (step >= steps) {
            audio.volume = to;
            clearInterval(interval);
        }
    }, duration / steps);
}

export function stopBGM(fadeTime = 500) {
    if (!currentBGM) return;

    clearInterval(fadeInterval);
    fadeInterval = null;

    const bgm = currentBGM;

    const steps = 20;
    let step = 0;

    fadeInterval = setInterval(() => {
        step++;

        const t = step / steps;

        bgm.volume = clampVolume(0.99 * (1 - t));

        if (step >= steps) {
            bgm.pause();
            bgm.currentTime = 0;
            bgm.volume = 1;

            currentBGM = null;
            currentBGMName = null;

            clearInterval(fadeInterval);
            fadeInterval = null;
        }
    }, fadeTime / steps);
}