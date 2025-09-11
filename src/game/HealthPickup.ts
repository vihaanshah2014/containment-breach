import { Vector2 } from './Vector2';

export class HealthPickup {
  public position: Vector2;
  private bobOffset: number = 0;
  private pulseOffset: number = 0;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  update(deltaTime: number) {
    this.bobOffset += deltaTime * 0.003;
    this.pulseOffset += deltaTime * 0.005;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bobY = Math.sin(this.bobOffset) * 3;
    const y = this.position.y + bobY;
    const pulse = Math.sin(this.pulseOffset) * 0.3 + 0.7;

    // Outer glow with pulsing effect
    ctx.save();
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Health cross icon
    ctx.fillStyle = '#ff4444';
    
    // Vertical bar of cross
    ctx.fillRect(this.position.x - 2, y - 10, 4, 20);
    
    // Horizontal bar of cross
    ctx.fillRect(this.position.x - 10, y - 2, 20, 4);
    
    // Add white highlights
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(this.position.x - 1, y - 10, 2, 20);
    ctx.fillRect(this.position.x - 10, y - 1, 20, 2);
    ctx.globalAlpha = 1;
  }
}
