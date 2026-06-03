import { Enemy } from "../class.js";
import { SlimeAI } from "../AI/SlimeAI.js";
import { asset } from "../load.js";

export class Slime extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 50;
        this.maxHp = 50;
        this.speed = 3;

        this.damage = 8;
        this.expReward = 15;

        this.color = "rgba(100, 255, 120, 0.7)";
        this.ai = new SlimeAI();
    }
    draw(ctx) {
        const sprite = asset.image.enemy_slime.idle;

        const frame =
            Math.floor(performance.now() / 100) % sprite.frames;

        ctx.drawImage(
            sprite.image,

            frame * sprite.frameWidth,
            0,

            sprite.frameWidth,
            sprite.frameHeight,

            this.x,
            this.y,

            this.width,
            this.height
        );

        // HP 바
        const hpBarWidth = this.width;
        const hpBarHeight = 5;
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - hpBarHeight - 2, hpBarWidth, hpBarHeight);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - hpBarHeight - 2, hpBarWidth * hpRatio, hpBarHeight);
    }
    onHit() {
        return {
            effect: "slowness",
            duration: 2000
        };
    }
}