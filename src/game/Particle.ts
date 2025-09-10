import { Vector2 } from './Vector2';

export class Particle {
  public position: Vector2;
  private velocity: Vector2;
  public life: number = 1;
  private maxLife: number;
  private color: string;

  constructor(x: number, y: number, angle: number, speed: number, color: string = '#ff0000') {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(
      Math.cos(angle * Math.PI / 180) * speed,
      Math.sin(angle * Math.PI / 180) * speed
    );
    this.maxLife = 500 + Math.random() * 500; // 0.5-1 second
    this.life = this.maxLife;
    this.color = color;
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
    this.velocity = this.velocity.multiply(0.95); // Friction
    this.life -= deltaTime;
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}