import {asset} from "./load.js"

export function playSound(name,force) {
    const audio = asset.sound[name];

    if (!audio) {
        console.log('no audio named : "'+name+'"')
        return;
    }

    // 이미 재생 중이면 무시
    if (!audio.paused && !force) return;

    audio.currentTime = 0;
    audio.play();
}