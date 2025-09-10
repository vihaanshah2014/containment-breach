import { Vector2 } from './Vector2';

export class ShieldPickup {
  public position: Vector2;
  private bobOffset: number = 0;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  update(deltaTime: number) {
    this.bobOffset += deltaTime * 0.003;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bobY = Math.sin(this.bobOffset) * 3;
    const y = this.position.y + bobY;

    // Outer glow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shield icon (ring)
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.position.x, y, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.arc(this.position.x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

