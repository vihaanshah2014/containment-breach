import { Vector2 } from './Vector2';

export enum WeaponType {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  KATANA = 'katana'
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
      case WeaponType.PISTOL: return `rgba(102, 102, 102, ${alpha})`;
      case WeaponType.RIFLE: return `rgba(51, 51, 51, ${alpha})`;
      case WeaponType.SHOTGUN: return `rgba(68, 68, 68, ${alpha})`;
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
      case WeaponType.PISTOL:
        ctx.fillRect(-15, -3, 30, 6);
        ctx.fillRect(10, -5, 8, 10);
        break;
      case WeaponType.RIFLE:
        ctx.fillRect(-25, -2, 50, 4);
        ctx.fillRect(20, -4, 8, 8);
        break;
      case WeaponType.SHOTGUN:
        ctx.fillRect(-20, -4, 40, 8);
        ctx.fillRect(15, -6, 10, 12);
        break;
      case WeaponType.KATANA:
        ctx.fillRect(-30, -1, 60, 2);
        ctx.fillRect(-35, -3, 8, 6);
        break;
    }
    
    ctx.restore();
  }
}