import { Enemy } from "../class.js";
import { RockAI } from "../AI/RockAI.js";

export class DefaultEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 60;
        this.maxHp = 60;

        this.damage = 15;
        this.expReward = 20;

        this.color = "#e74c3c";
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
        return {};
    }
}