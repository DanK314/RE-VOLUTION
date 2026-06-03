import { Enemy } from "../class.js";
import { RockAI } from "../AI/RockAI.js";

export class Rock extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 50;
        this.maxHp = 50;

        this.damage = 35;
        this.expReward = 50;

        this.color = "#888";
        this.ai = new RockAI();
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
            effect: "bleed",
            duration: 10000, // 10초 동안 출혈 효과
        };
    }
}