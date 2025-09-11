import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';
import type { SpriteFrame } from '../assets/SpriteSheet';

export class Player {
  public position: Vector2;
  public health: number = 3;
  public weapon: Weapon | null = null;
  public shield: number = 0; // 0-100
  public grenades: number = 1; // Start with 1 grenade
  public currentRoomIndex: number | null = null; // set by Game based on TileMap
  private shootCooldown: number = 0;
  private punchCooldown: number = 0;
  private grenadeCooldown: number = 0;
  public sprite?: SpriteFrame;
  
  // Animation state
  private walkAnimTime: number = 0;
  private isMoving: boolean = false;
  private footstepTimer: number = 0;
  private idleAnimTime: number = 0;
  private shootFlashTime: number = 0;
  private damageFlashTime: number = 0;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.weapon = new Weapon(WeaponType.PISTOL); // Start with pistol
  }

  update(
    deltaTime: number,
    keys: Set<string>,
    _mouse: { x: number; y: number },
    width: number,
    height: number,
    collider?: (from: Vector2, to: Vector2, radius: number) => Vector2
  ): boolean {
    const speed = 280; // pixels per second - balanced for good control
    const movement = new Vector2(0, 0);

    // Support WASD and Arrow Keys
    if (keys.has('w') || keys.has('arrowup')) movement.y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) movement.y += 1;
    if (keys.has('a') || keys.has('arrowleft')) movement.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) movement.x += 1;

    let moved = false;
    if (movement.length() > 0) {
      movement.normalize();
      const target = this.position.add(movement.multiply(speed * (deltaTime / 1000)));
      const oldPos = new Vector2(this.position.x, this.position.y);
      if (collider) {
        this.position = collider(this.position, target, 15);
      } else {
        this.position = target;
      }
      // Check if actually moved (not stuck against wall)
      moved = this.position.distanceTo(oldPos) > 0.5;
    }

    // Update animation states
    this.isMoving = moved;
    if (this.isMoving) {
      this.walkAnimTime += deltaTime;
      this.footstepTimer += deltaTime;
    } else {
      this.walkAnimTime = 0;
      this.footstepTimer = 0;
      this.idleAnimTime += deltaTime;
    }

    // Update animation timers
    if (this.shootFlashTime > 0) {
      this.shootFlashTime -= deltaTime;
    }
    if (this.damageFlashTime > 0) {
      this.damageFlashTime -= deltaTime;
    }

    // Keep player in bounds
    this.position.x = Math.max(20, Math.min(width - 20, this.position.x));
    this.position.y = Math.max(20, Math.min(height - 20, this.position.y));

    // Update shoot cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }

    // Update punch cooldown
    if (this.punchCooldown > 0) {
      this.punchCooldown -= deltaTime;
    }

    // Update grenade cooldown
    if (this.grenadeCooldown > 0) {
      this.grenadeCooldown -= deltaTime;
    }

    // Check if weapon is broken and remove it
    if (this.weapon && this.weapon.isBroken()) {
      this.weapon = null;
    }

    return moved;
  }

  canShoot(): boolean {
    return this.shootCooldown <= 0 && this.weapon !== null && this.weapon.canFire();
  }

  canPunch(): boolean {
    return this.punchCooldown <= 0;
  }
  shoot() {
    if (this.weapon) {
      this.weapon.fire();
      this.shootCooldown = this.weapon.fireRate;
      this.shootFlashTime = 150; // 150ms shoot flash
    }
  }

  punch() {
    this.punchCooldown = 600; // 600ms cooldown for punching
  }
  canMelee(): boolean {
    return this.shootCooldown <= 0 && this.weapon !== null && this.weapon.type === WeaponType.KATANA;
  }

  melee() {
    if (this.weapon && this.weapon.type === WeaponType.KATANA) {
      this.shootCooldown = this.weapon.fireRate;
    }
  }

  pickupWeapon(weapon: Weapon) {
    this.weapon = weapon;
  }

  throwWeapon(): Weapon | null {
    if (this.weapon && this.weapon.isThrowable) {
      const thrownWeapon = this.weapon;
      this.weapon = null;
      return thrownWeapon;
    }
    return null;
  }

  takeDamage() {
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - 25);
    } else {
      this.health--;
    }
    this.damageFlashTime = 200; // 200ms damage flash
  }

  addShield(amount: number) {
    this.shield = Math.min(100, this.shield + amount);
  }

  heal(amount: number) {
    this.health = Math.min(3, this.health + amount); // Maximum health is 3
  }

  canThrowGrenade(): boolean {
    return this.grenades > 0 && this.grenadeCooldown <= 0;
  }

  throwGrenade(): boolean {
    if (!this.canThrowGrenade()) return false;
    this.grenades--;
    this.grenadeCooldown = 1000; // 1 second cooldown between grenades
    return true;
  }

  addGrenades(count: number) {
    this.grenades += count;
  }

  // Get footstep particles if moving
  getFootstepParticles(): Array<{x: number, y: number, age: number}> {
    const particles: Array<{x: number, y: number, age: number}> = [];
    if (this.isMoving && this.footstepTimer >= 300) { // Every 300ms
      particles.push({
        x: this.position.x + (Math.random() - 0.5) * 8,
        y: this.position.y + (Math.random() - 0.5) * 8,
        age: 0
      });
      this.footstepTimer = 0;
    }
    return particles;
  }

  render(ctx: CanvasRenderingContext2D, mousePos: Vector2) {
    const x = this.position.x;
    const y = this.position.y;
    const dir = mousePos.subtract(this.position).normalize();
    const angle = Math.atan2(dir.y, dir.x);
    
    // Animation offsets
    let bobOffset = 0;
    let recoilOffset = 0;
    
    if (this.isMoving) {
      // Walking bob animation
      bobOffset = Math.sin(this.walkAnimTime * 0.01) * 2; // Subtle 2px bob
    } else {
      // Idle breathing animation
      bobOffset = Math.sin(this.idleAnimTime * 0.003) * 0.8; // Very subtle breathing
    }

    // Shooting recoil animation
    if (this.shootFlashTime > 0) {
      const recoilT = this.shootFlashTime / 150;
      recoilOffset = Math.sin(recoilT * Math.PI) * 3; // 3px recoil back
    }
    
    ctx.save();
    
    // Damage flash effect
    if (this.damageFlashTime > 0) {
      const flashAlpha = (this.damageFlashTime / 200) * 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flashAlpha;
    }

    if (this.sprite) {
      const drawW = 44;
      const drawH = 44;
      ctx.save();
      ctx.translate(x - recoilOffset * Math.cos(angle), y + bobOffset - recoilOffset * Math.sin(angle));
      // Rotate sprite 90° counterclockwise so its facing aligns with weapon
      ctx.rotate(angle - Math.PI / 2);
      ctx.drawImage(
        this.sprite.image,
        this.sprite.sx,
        this.sprite.sy,
        this.sprite.sw,
        this.sprite.sh,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();
    } else {
      // Fallback: simple agent body
      ctx.save();
      ctx.fillStyle = this.damageFlashTime > 0 ? '#ff8888' : '#ff4d4d';
      ctx.beginPath();
      ctx.ellipse(x - recoilOffset * Math.cos(angle), y + bobOffset - recoilOffset * Math.sin(angle), 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(x - recoilOffset * Math.cos(angle), y + bobOffset - recoilOffset * Math.sin(angle));
      ctx.rotate(angle - Math.PI / 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(4, -5, 8, 10);
      ctx.restore();
    }
    
    ctx.restore();

    // Draw shield ring if any
    if (this.shield > 0) {
      const radius = 18 + (this.shield / 100) * 8; // safety gets bigger with more shield
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw weapon with muzzle flash
    if (this.weapon) {
      const direction = mousePos.subtract(this.position).normalize();
      const angle2 = Math.atan2(direction.y, direction.x);
      const weaponPos = this.position.add(direction.multiply(20 - recoilOffset));
      this.weapon.render(ctx, weaponPos, angle2);
      
      // Muzzle flash effect
      if (this.shootFlashTime > 0) {
        const flashSize = 12 + Math.random() * 8;
        const flashDistance = 25 - recoilOffset;
        const flashPos = this.position.add(direction.multiply(flashDistance));
        
        ctx.save();
        ctx.globalAlpha = (this.shootFlashTime / 150) * 0.8;
        ctx.globalCompositeOperation = 'lighter';
        
        // Random muzzle flash shape
        const gradient = ctx.createRadialGradient(flashPos.x, flashPos.y, 0, flashPos.x, flashPos.y, flashSize);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffff88');
        gradient.addColorStop(0.6, '#ff8800');
        gradient.addColorStop(1, '#ff440000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(flashPos.x, flashPos.y, flashSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
