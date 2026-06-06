import { Enemy } from "../class.js";
import { EagleAI } from "../AI/EagleAI.js";
import { asset } from "../load.js";

export class Eagle extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 3;

        this.damage = 30;
        this.expReward = 50;

        this.color = "rgba(0, 0, 0, 1)";
        this.ai = new EagleAI();
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x,this.y,this.width,this.height);

        // HP 바
        const hpBarWidth = this.width;
        const hpBarHeight = 5;
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - hpBarHeight - 2, hpBarWidth, hpBarHeight);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - hpBarHeight - 2, hpBarWidth * hpRatio, hpBarHeight);
    }
    onHit() {}
}