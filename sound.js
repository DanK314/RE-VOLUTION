import { asset } from "./load.js";

let currentBGM = null;
let fadeInterval = null;

function clampVolume(value) {
    return Math.max(0, Math.min(1, value));
}

export function playSound(name, force) {
    const audio = asset.sound[name];

    if (!audio) {
        console.log('no audio named : "' + name + '"');
        return;
    }

    if (!audio.paused && !force) return;

    audio.currentTime = 0;
    audio.play();
}

export function playBGM(name, fadeTime = 1000) {
    const next = asset.sound[name];

    if (!next) {
        if (currentBGM) {
            currentBGM.pause();
            currentBGM.currentTime = 0;
            currentBGM = null;
        }
        console.log('no audio named : "' + name + '"');
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

    // 처음 재생
    if (!currentBGM) {
        next.volume = 0;
        next.currentTime = 0;
        next.play();

        fade(next, 0, 0.99, fadeTime);

        currentBGM = next;
        return;
    }

    const old = currentBGM;

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

            currentBGM = next;

            clearInterval(fadeInterval);
        }
    }, fadeTime / 20);
}

function fade(audio, from, to, duration) {
    audio.volume = clampVolume(from);

    const step = ((to - from) / 20);

    const interval = setInterval(() => {
        audio.volume = clampVolume(audio.volume + step);

        const reached =
            step > 0
                ? audio.volume >= to
                : audio.volume <= to;

        if (reached) {
            audio.volume = to;
            clearInterval(interval);
        }
    }, duration / 20);
}

export function stopBGM(fadeTime = 1000) {
    if (!currentBGM) return;

    clearInterval(fadeInterval);

    const bgm = currentBGM;

    fadeInterval = setInterval(() => {
        bgm.volume = clampVolume(bgm.volume - 0.05);

        if (bgm.volume <= 0) {
            bgm.pause();
            bgm.currentTime = 0;
            bgm.volume = 1;

            currentBGM = null;

            clearInterval(fadeInterval);
        }
    }, fadeTime / 20);
}