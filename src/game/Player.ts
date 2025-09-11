import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';
import type { SpriteFrame } from '../assets/SpriteSheet';

export class Player {
  public position: Vector2;
  public health: number = 3;
  public weapon: Weapon | null = null;
  public shield: number = 0; // 0-100
  public currentRoomIndex: number | null = null; // set by Game based on TileMap
  private shootCooldown: number = 0;
  private punchCooldown: number = 0;
  public sprite?: SpriteFrame;
  
  // Walking animation state
  private walkAnimTime: number = 0;
  private isMoving: boolean = false;
  private footstepTimer: number = 0;

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

    // Update walking animation state
    this.isMoving = moved;
    if (this.isMoving) {
      this.walkAnimTime += deltaTime;
      this.footstepTimer += deltaTime;
    } else {
      this.walkAnimTime = 0;
      this.footstepTimer = 0;
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
  }

  addShield(amount: number) {
    this.shield = Math.min(100, this.shield + amount);
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
    
    // Walking bob animation
    let bobOffset = 0;
    if (this.isMoving) {
      bobOffset = Math.sin(this.walkAnimTime * 0.01) * 2; // Subtle 2px bob
    }
    
    if (this.sprite) {
      const drawW = 44;
      const drawH = 44;
      ctx.save();
      ctx.translate(x, y + bobOffset);
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
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.ellipse(x, y + bobOffset, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(x, y + bobOffset);
      ctx.rotate(angle - Math.PI / 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(4, -5, 8, 10);
      ctx.restore();
    }

    // Draw shield ring if any
    if (this.shield > 0) {
      const radius = 18 + (this.shield / 100) * 8; // safety gets bigger with more shield
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw weapon
    if (this.weapon) {
      const direction = mousePos.subtract(this.position).normalize();
      const angle2 = Math.atan2(direction.y, direction.x);
      const weaponPos = this.position.add(direction.multiply(20));
      this.weapon.render(ctx, weaponPos, angle2);
    }
  }
}
