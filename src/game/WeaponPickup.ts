import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';

export class WeaponPickup {
  public position: Vector2;
  public weapon: Weapon;
  public bobOffset: number = 0;

  constructor(x: number, y: number, weaponType: WeaponType) {
    this.position = new Vector2(x, y);
    this.weapon = new Weapon(weaponType);
  }

  update(deltaTime: number) {
    this.bobOffset += deltaTime * 0.003;
  }

  render(ctx: CanvasRenderingContext2D) {
    const bobY = Math.sin(this.bobOffset) * 3;
    const renderPos = new Vector2(this.position.x, this.position.y + bobY);
    
    // Draw pickup glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.weapon.getColor();
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw weapon
    this.weapon.render(ctx, renderPos, 0);
  }
}