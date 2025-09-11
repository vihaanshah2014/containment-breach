import { Vector2 } from './Vector2';

export class AmmoPickup {
  public position: Vector2;
  private bobOffset: number = 0;
  private sparkleOffset: number = 0;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  update(deltaTime: number) {
    this.bobOffset += deltaTime * 0.003;
    this.sparkleOffset += deltaTime * 0.008;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bobY = Math.sin(this.bobOffset) * 3;
    const y = this.position.y + bobY;
    const sparkle = Math.sin(this.sparkleOffset) * 0.5 + 0.5;

    // Outer glow with sparkle effect
    ctx.save();
    ctx.globalAlpha = 0.15 + sparkle * 0.1;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ammo box base
    ctx.fillStyle = '#8b6914'; // Dark golden brown
    ctx.fillRect(this.position.x - 8, y - 6, 16, 12);
    
    // Ammo box top
    ctx.fillStyle = '#daa520'; // Golden
    ctx.fillRect(this.position.x - 7, y - 5, 14, 10);
    
    // Ammo box highlight
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(this.position.x - 6, y - 4, 12, 2);
    
    // Ammo symbols (bullets)
    ctx.fillStyle = '#2a2a2a';
    for (let i = 0; i < 3; i++) {
      const bulletX = this.position.x - 4 + i * 4;
      ctx.beginPath();
      ctx.arc(bulletX, y - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add metallic shine
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(this.position.x - 7, y - 5, 14, 1);
    ctx.globalAlpha = 1;
  }
}
