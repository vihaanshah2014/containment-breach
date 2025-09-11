import { Vector2 } from './Vector2';

export class Footstep {
  public position: Vector2;
  public age: number = 0;
  private maxAge: number = 800; // 800ms lifetime
  private startSize: number = 3;
  private endSize: number = 8;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  update(deltaTime: number) {
    this.age += deltaTime;
  }

  isDead(): boolean {
    return this.age >= this.maxAge;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.isDead()) return;

    const t = this.age / this.maxAge;
    const alpha = Math.max(0, 1 - t * t); // Fade out quadratically
    const size = this.startSize + (this.endSize - this.startSize) * t;

    ctx.save();
    ctx.globalAlpha = alpha * 0.3; // Keep it subtle
    
    // Draw small dust cloud
    const gradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, size
    );
    gradient.addColorStop(0, '#8b7355'); // Dust brown
    gradient.addColorStop(0.7, '#8b735540');
    gradient.addColorStop(1, '#8b735500');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
