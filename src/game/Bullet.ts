import { Vector2 } from './Vector2';

export class Bullet {
  public position: Vector2;
  private velocity: Vector2;
  public isEnemyBullet: boolean;

  constructor(position: Vector2, velocity: Vector2, isEnemyBullet: boolean = false) {
    this.position = position;
    this.velocity = velocity;
    this.isEnemyBullet = isEnemyBullet;
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.isEnemyBullet ? '#000000' : '#ff0000';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Add outline for enemy bullets
    if (this.isEnemyBullet) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}