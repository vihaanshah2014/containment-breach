import { Vector2 } from './Vector2';

export class Grenade {
  public position: Vector2;
  public velocity: Vector2;
  private fuseTime: number = 3000; // 3 seconds fuse
  private age: number = 0;
  private gravity: number = 200; // Gravity effect
  private bounceCount: number = 0;
  private maxBounces: number = 3;
  private bounceDecay: number = 0.6;
  public exploded: boolean = false;
  private blinkRate: number = 100; // Blink faster as fuse burns down

  constructor(startPos: Vector2, direction: Vector2, throwPower: number = 400) {
    this.position = new Vector2(startPos.x, startPos.y);
    this.velocity = direction.normalize().multiply(throwPower);
  }

  update(deltaTime: number): boolean {
    this.age += deltaTime;

    if (this.age >= this.fuseTime && !this.exploded) {
      this.exploded = true;
      return true; // Signal explosion
    }

    if (!this.exploded) {
      // Apply physics - gravity and movement
      this.velocity.y += this.gravity * (deltaTime / 1000);
      this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));

      // Simple ground bounce (assuming ground at y > some level)
      if (this.position.y > 600 && this.velocity.y > 0 && this.bounceCount < this.maxBounces) {
        this.velocity.y *= -this.bounceDecay;
        this.velocity.x *= 0.8; // Friction
        this.bounceCount++;
        this.position.y = 600; // Keep above ground
      }
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.exploded) return;

    const fuseProgress = this.age / this.fuseTime;
    const blinkSpeed = Math.max(50, this.blinkRate - (fuseProgress * 80)); // Blink faster
    const shouldBlink = Math.floor(this.age / blinkSpeed) % 2 === 0;

    ctx.save();
    
    // Grenade body
    ctx.fillStyle = shouldBlink ? '#ff4444' : '#2a2a2a';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Grenade pin/fuse
    ctx.strokeStyle = fuseProgress > 0.7 ? '#ff6666' : '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.position.x - 3, this.position.y - 6);
    ctx.lineTo(this.position.x - 1, this.position.y - 10);
    ctx.stroke();

    // Warning glow effect as fuse burns down
    if (fuseProgress > 0.5) {
      ctx.globalAlpha = (fuseProgress - 0.5) * 2 * 0.4;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 12 + Math.sin(this.age * 0.01) * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Get blast radius for damage calculation
  getBlastRadius(): number {
    return 80; // 80 pixel blast radius
  }

  // Get damage at distance from explosion
  getDamageAtDistance(distance: number): number {
    const maxDamage = 3; // Can kill enemies with shields
    const blastRadius = this.getBlastRadius();
    
    if (distance > blastRadius) return 0;
    
    // Linear damage falloff
    const damageRatio = 1 - (distance / blastRadius);
    return Math.ceil(maxDamage * damageRatio);
  }
}
