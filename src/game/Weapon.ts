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
    
    const durabilityPercent = this.getDurabilityPercentage();
    
    switch (this.type) {
      case WeaponType.SHURIKEN: {
        this.renderShuriken(ctx, durabilityPercent);
        break;
      }
      case WeaponType.PISTOL: {
        this.renderPistol(ctx, durabilityPercent);
        break;
      }
      case WeaponType.RIFLE: {
        this.renderRifle(ctx, durabilityPercent);
        break;
      }
      case WeaponType.SHOTGUN: {
        this.renderShotgun(ctx, durabilityPercent);
        break;
      }
      case WeaponType.KATANA: {
        this.renderKatana(ctx, durabilityPercent);
        break;
      }
    }
    
    ctx.restore();
  }

  private renderShuriken(ctx: CanvasRenderingContext2D, durability: number) {
    // Create metallic gradient
    const metalGrad = ctx.createLinearGradient(-9, -9, 9, 9);
    metalGrad.addColorStop(0, durability > 0.5 ? '#c0c0c0' : '#707070');
    metalGrad.addColorStop(0.3, durability > 0.5 ? '#e8e8e8' : '#909090');
    metalGrad.addColorStop(0.7, durability > 0.5 ? '#a0a0a0' : '#606060');
    metalGrad.addColorStop(1, durability > 0.5 ? '#808080' : '#404040');

    // Main star body
    ctx.fillStyle = metalGrad;
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

    // Edge highlights
    if (durability > 0.3) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(2, -2);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Damage scratches
    if (durability < 0.7) {
      ctx.strokeStyle = '#303030';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 1 - durability;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-4 + i * 2, -2);
        ctx.lineTo(-2 + i * 2, 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private renderPistol(ctx: CanvasRenderingContext2D, durability: number) {
    // Gun metal gradient
    const metalGrad = ctx.createLinearGradient(-12, -6, -12, 6);
    metalGrad.addColorStop(0, durability > 0.5 ? '#4a4a4a' : '#2a2a2a');
    metalGrad.addColorStop(0.2, durability > 0.5 ? '#6a6a6a' : '#4a4a4a');
    metalGrad.addColorStop(0.5, durability > 0.5 ? '#5a5a5a' : '#3a3a3a');
    metalGrad.addColorStop(1, durability > 0.5 ? '#3a3a3a' : '#1a1a1a');

    // Main body (slide/barrel)
    ctx.fillStyle = metalGrad;
    ctx.fillRect(-12, -3, 24, 6);
    
    // Barrel tip
    ctx.fillStyle = durability > 0.5 ? '#2a2a2a' : '#1a1a1a';
    ctx.fillRect(10, -1, 2, 2);

    // Grip gradient
    const gripGrad = ctx.createLinearGradient(4, -6, 10, 12);
    gripGrad.addColorStop(0, durability > 0.5 ? '#3a3a3a' : '#2a2a2a');
    gripGrad.addColorStop(0.5, durability > 0.5 ? '#4a4a4a' : '#3a3a3a');
    gripGrad.addColorStop(1, durability > 0.5 ? '#2a2a2a' : '#1a1a1a');
    
    ctx.fillStyle = gripGrad;
    ctx.fillRect(4, -6, 6, 12);

    // Grip texture
    if (durability > 0.4) {
      ctx.strokeStyle = '#606060';
      ctx.lineWidth = 0.5;
      for (let i = -4; i <= 4; i += 2) {
        ctx.beginPath();
        ctx.moveTo(5, i);
        ctx.lineTo(9, i);
        ctx.stroke();
      }
    }

    // Top highlights
    if (durability > 0.3) {
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-12, -3);
      ctx.lineTo(12, -3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Damage effects
    if (durability < 0.6) {
      this.addWeaponDamage(ctx, durability, [-10, -8, -2, 5], [-2, 1, -1, 0], [8, 6, 4, 3]);
    }
  }

  private renderRifle(ctx: CanvasRenderingContext2D, durability: number) {
    // Barrel gradient
    const barrelGrad = ctx.createLinearGradient(-28, -2, -28, 2);
    barrelGrad.addColorStop(0, durability > 0.5 ? '#2d4a2d' : '#1d2a1d');
    barrelGrad.addColorStop(0.3, durability > 0.5 ? '#4d6a4d' : '#3d4a3d');
    barrelGrad.addColorStop(0.7, durability > 0.5 ? '#3d5a3d' : '#2d3a2d');
    barrelGrad.addColorStop(1, durability > 0.5 ? '#1d3a1d' : '#0d1a0d');

    // Main barrel
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-28, -2, 56, 4);

    // Barrel bands/rifling
    if (durability > 0.4) {
      ctx.fillStyle = '#1a3a1a';
      ctx.fillRect(-20, -2, 1, 4);
      ctx.fillRect(-8, -2, 1, 4);
      ctx.fillRect(4, -2, 1, 4);
    }

    // Magazine gradient
    const magGrad = ctx.createLinearGradient(6, -8, 12, 16);
    magGrad.addColorStop(0, durability > 0.5 ? '#3a3a3a' : '#2a2a2a');
    magGrad.addColorStop(0.5, durability > 0.5 ? '#4a4a4a' : '#3a3a3a');
    magGrad.addColorStop(1, durability > 0.5 ? '#2a2a2a' : '#1a1a1a');
    
    ctx.fillStyle = magGrad;
    ctx.fillRect(6, -8, 6, 16);

    // Stock gradient
    const stockGrad = ctx.createLinearGradient(-22, -3, -12, 6);
    stockGrad.addColorStop(0, durability > 0.5 ? '#654321' : '#432110');
    stockGrad.addColorStop(0.5, durability > 0.5 ? '#8b6f47' : '#6b4f27');
    stockGrad.addColorStop(1, durability > 0.5 ? '#5d4037' : '#3d2017');

    ctx.fillStyle = stockGrad;
    ctx.fillRect(-22, -3, 10, 6);

    // Wood grain effect on stock
    if (durability > 0.5) {
      ctx.strokeStyle = '#4a3728';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.6;
      for (let i = -20; i <= -14; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, -2);
        ctx.lineTo(i + 1, 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Scope/sights
    if (durability > 0.3) {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-5, -4, 2, 2);
      ctx.fillRect(15, -4, 2, 2);
    }

    // Damage effects
    if (durability < 0.7) {
      this.addWeaponDamage(ctx, durability, [-25, -15, -5, 10], [-1, 1, -1, 0], [12, 8, 6, 4]);
    }
  }

  private renderShotgun(ctx: CanvasRenderingContext2D, durability: number) {
    // Thick barrel with brown/bronze finish
    const barrelGrad = ctx.createLinearGradient(-24, -4, -24, 4);
    barrelGrad.addColorStop(0, durability > 0.5 ? '#8b4513' : '#5b2503');
    barrelGrad.addColorStop(0.3, durability > 0.5 ? '#cd853f' : '#9d653f');
    barrelGrad.addColorStop(0.7, durability > 0.5 ? '#a0522d' : '#70321d');
    barrelGrad.addColorStop(1, durability > 0.5 ? '#654321' : '#351201');

    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-24, -4, 48, 8);

    // Double barrel effect
    if (durability > 0.4) {
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(20, -2, 4, 1);
      ctx.fillRect(20, 1, 4, 1);
    }

    // Pump/forend with wood texture
    const pumpGrad = ctx.createLinearGradient(2, -6, 16, 12);
    pumpGrad.addColorStop(0, durability > 0.5 ? '#8b6914' : '#5b3904');
    pumpGrad.addColorStop(0.5, durability > 0.5 ? '#daa520' : '#aa7510');
    pumpGrad.addColorStop(1, durability > 0.5 ? '#b8860b' : '#885600');

    ctx.fillStyle = pumpGrad;
    ctx.fillRect(2, -6, 14, 12);

    // Pump action grooves
    if (durability > 0.5) {
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      for (let i = 4; i <= 12; i += 3) {
        ctx.beginPath();
        ctx.moveTo(i, -5);
        ctx.lineTo(i, 5);
        ctx.stroke();
      }
    }

    // Barrel bands
    if (durability > 0.3) {
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(-18, -4, 2, 8);
      ctx.fillRect(-6, -4, 2, 8);
    }

    // Damage effects
    if (durability < 0.6) {
      this.addWeaponDamage(ctx, durability, [-20, -10, 0, 8], [-3, 2, -2, 1], [10, 8, 6, 5]);
    }
  }

  private renderKatana(ctx: CanvasRenderingContext2D, durability: number) {
    // Blade gradient - silver to white
    const bladeGrad = ctx.createLinearGradient(-30, -1, -30, 1);
    bladeGrad.addColorStop(0, durability > 0.5 ? '#e8e8e8' : '#c8c8c8');
    bladeGrad.addColorStop(0.1, durability > 0.5 ? '#ffffff' : '#e0e0e0');
    bladeGrad.addColorStop(0.5, durability > 0.5 ? '#f0f0f0' : '#d0d0d0');
    bladeGrad.addColorStop(0.9, durability > 0.5 ? '#ffffff' : '#e0e0e0');
    bladeGrad.addColorStop(1, durability > 0.5 ? '#e8e8e8' : '#c8c8c8');

    // Main blade
    ctx.fillStyle = bladeGrad;
    ctx.fillRect(-30, -1, 60, 2);

    // Blade edge highlight
    if (durability > 0.4) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-30, -1);
      ctx.lineTo(30, -1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Handle/tsuka
    const handleGrad = ctx.createLinearGradient(-35, -3, -27, 6);
    handleGrad.addColorStop(0, durability > 0.5 ? '#8b0000' : '#5b0000');
    handleGrad.addColorStop(0.3, durability > 0.5 ? '#dc143c' : '#ac1434');
    handleGrad.addColorStop(0.7, durability > 0.5 ? '#b22222' : '#821212');
    handleGrad.addColorStop(1, durability > 0.5 ? '#800000' : '#500000');

    ctx.fillStyle = handleGrad;
    ctx.fillRect(-35, -3, 8, 6);

    // Handle wrap texture
    if (durability > 0.5) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.4;
      for (let i = -34; i <= -28; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, -2);
        ctx.lineTo(i + 1, 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Guard (tsuba)
    if (durability > 0.3) {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-28, -2, 2, 4);
    }

    // Blade pattern (hamon)
    if (durability > 0.6) {
      ctx.strokeStyle = '#f8f8f8';
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-25, 0);
      for (let x = -25; x <= 25; x += 5) {
        ctx.lineTo(x, Math.sin(x * 0.2) * 0.3);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Damage effects (nicks and chips)
    if (durability < 0.7) {
      this.addWeaponDamage(ctx, durability, [-20, -10, 0, 10, 20], [-1, 1, -1, 0, -1], [3, 2, 3, 2, 3]);
    }
  }

  private addWeaponDamage(ctx: CanvasRenderingContext2D, durability: number, xPositions: number[], yPositions: number[], sizes: number[]) {
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = Math.max(0.3, 1 - durability);
    
    for (let i = 0; i < xPositions.length; i++) {
      if (Math.random() < (1 - durability)) {
        ctx.beginPath();
        ctx.arc(xPositions[i], yPositions[i], sizes[i] * (1 - durability), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
}
