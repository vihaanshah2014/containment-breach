import { Vector2 } from './Vector2';

export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  KATANA = 'katana',
  SHURIKEN = 'shuriken'
}

export class Weapon {
  public type: WeaponType;
  public ammo: number;
  public maxAmmo: number;
  public durability: number;
  public maxDurability: number;
  public damage: number;
  public fireRate: number; // ms between shots
  public range: number;
  public spread: number; // degrees
  public bulletsPerShot: number;
  public isThrowable: boolean;

  constructor(type: WeaponType) {
    this.type = type;
    this.isThrowable = true;

    switch (type) {
      case WeaponType.SHURIKEN:
        this.ammo = 12;
        this.maxAmmo = 12;
        this.durability = 60;
        this.maxDurability = 60;
        this.damage = 1;
        this.fireRate = 200;
        this.range = 450;
        this.spread = 0;
        this.bulletsPerShot = 0; // Uses thrown projectile, not bullets
        break;
      case WeaponType.PISTOL:
        this.ammo = 8;
        this.maxAmmo = 8;
        this.durability = 100;
        this.maxDurability = 100;
        this.damage = 1;
        this.fireRate = 300;
        this.range = 400;
        this.spread = 5;
        this.bulletsPerShot = 1;
        break;
      case WeaponType.RIFLE:
        this.ammo = 30;
        this.maxAmmo = 30;
        this.durability = 150;
        this.maxDurability = 150;
        this.damage = 1;
        this.fireRate = 150;
        this.range = 500;
        this.spread = 2;
        this.bulletsPerShot = 1;
        break;
      case WeaponType.SHOTGUN:
        this.ammo = 6;
        this.maxAmmo = 6;
        this.durability = 80;
        this.maxDurability = 80;
        this.damage = 1;
        this.fireRate = 800;
        this.range = 200;
        this.spread = 30;
        this.bulletsPerShot = 5;
        break;
      case WeaponType.KATANA:
        this.ammo = Infinity;
        this.maxAmmo = Infinity;
        this.durability = 200;
        this.maxDurability = 200;
        this.damage = 1;
        this.fireRate = 400;
        this.range = 50;
        this.spread = 0;
        this.bulletsPerShot = 0;
        this.isThrowable = false;
        break;
    }
  }

  canFire(): boolean {
    return (this.ammo > 0 || this.type === WeaponType.KATANA) && this.durability > 0;
  }

  fire(): boolean {
    if (!this.canFire()) return false;
    if (this.type !== WeaponType.KATANA) {
      this.ammo--;
    }
    this.durability -= this.type === WeaponType.KATANA ? 8 : 5;
    return true;
  }

  getDurabilityPercentage(): number {
    return this.durability / this.maxDurability;
  }

  isBroken(): boolean {
    return this.durability <= 0;
  }
  getColor(): string {
    const durabilityPercent = this.getDurabilityPercentage();
    const alpha = Math.max(0.3, durabilityPercent);
    
    switch (this.type) {
      case WeaponType.SHURIKEN: return `rgba(80, 80, 80, ${alpha})`; // dark gray, not blue
      case WeaponType.PISTOL: return `rgba(160, 160, 160, ${alpha})`; // light gray
      case WeaponType.RIFLE: return `rgba(46, 139, 87, ${alpha})`; // sea green
      case WeaponType.SHOTGUN: return `rgba(139, 69, 19, ${alpha})`; // saddle brown
      case WeaponType.KATANA: return `rgba(255, 0, 0, ${alpha})`;
      default: return `rgba(0, 0, 0, ${alpha})`;
    }
  }

  render(ctx: CanvasRenderingContext2D, position: Vector2, angle: number) {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);
    
    ctx.fillStyle = this.getColor();
    
    // Add visual degradation effects
    const durabilityPercent = this.getDurabilityPercentage();
    if (durabilityPercent < 0.5) {
      ctx.globalAlpha = 0.7 + (durabilityPercent * 0.3);
    }
    
    switch (this.type) {
      case WeaponType.SHURIKEN: {
        // 4-point star, slightly larger for visibility
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(2, -2);
        ctx.lineTo(9, 0);
        ctx.lineTo(2, 2);
        ctx.lineTo(0, 9);
        ctx.lineTo(-2, 2);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-2, -2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case WeaponType.PISTOL: {
        // Compact body + grip
        ctx.fillRect(-12, -3, 24, 6);
        ctx.fillRect(4, -6, 6, 12);
        break;
      }
      case WeaponType.RIFLE: {
        // Long barrel + mag
        ctx.fillRect(-28, -2, 56, 4);
        ctx.fillRect(6, -8, 6, 16); // mag
        ctx.fillRect(-22, -3, 10, 6); // stock
        break;
      }
      case WeaponType.SHOTGUN: {
        // Thick barrel + pump
        ctx.fillRect(-24, -4, 48, 8);
        ctx.fillRect(2, -6, 14, 12); // pump/forend
        break;
      }
      case WeaponType.KATANA: {
        ctx.fillRect(-30, -1, 60, 2);
        ctx.fillRect(-35, -3, 8, 6);
        break;
      }
    }
    
    ctx.restore();
  }
}
