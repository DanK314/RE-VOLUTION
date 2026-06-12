import { Enemy } from "../class.js";
import { RockAI } from "../AI/RockAI.js";
import { asset } from "../load.js";

export class Nature_Minion extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 50;
        this.maxHp = 50;
        this.speed = 3;

        this.damage = 0;
        this.expReward = 0;

        this.color = "rgba(0, 129, 17, 0.7)";
        this.ai = new RockAI();
    }
    draw(ctx) {
        ctx.fillRect(this.x,this.y,this.width,this.height)

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
            duration: 1000
        };
    }
}