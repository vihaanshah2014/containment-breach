import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';
import type { SpriteFrame } from '../assets/SpriteSheet';

export class Enemy {
  public id: number;
  public position: Vector2;
  public weapon: Weapon | null = null;
  public shield: number = 0;
  public maxShield: number = 0;
  private speed: number;
  private shootCooldown: number = 0;
  private lastShotTime: number = 0;
  public sprite?: SpriteFrame;
  private stuckTime: number = 0;
  private sideBias: number = Math.random() < 0.5 ? 1 : -1;

  private static nextId = 1;

  constructor(x: number, y: number, weaponChance: number = 0.6, shieldHits: number = 0) {
    this.id = Enemy.nextId++;
    this.position = new Vector2(x, y);
    this.speed = 80 + Math.random() * 40; // Random speed between 80-120
    this.shield = shieldHits;
    this.maxShield = shieldHits;
    
    // Variable chance to have a weapon based on difficulty
    if (Math.random() < weaponChance) {
      const weaponTypes = [WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.SHOTGUN];
      const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      this.weapon = new Weapon(randomType);
    }
  }

  update(
    deltaTime: number,
    playerPosition: Vector2,
    collider?: (from: Vector2, to: Vector2, radius: number) => Vector2
  ): { bullets: any[], thrownWeapon: Weapon | null } {
    const result = { bullets: [] as any[], thrownWeapon: null as Weapon | null };
    
    // Move toward player
    const direction = playerPosition.subtract(this.position).normalize();
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    
    // If has weapon and close enough, try to shoot
    if (this.weapon && distanceToPlayer < this.weapon.range && distanceToPlayer > 50) {
      this.shootCooldown -= deltaTime;
      
      if (this.shootCooldown <= 0 && this.weapon.canFire()) {
        // Shoot at player
        const bulletDirection = direction;
        const bulletStart = this.position.add(bulletDirection.multiply(15));
        
        for (let i = 0; i < this.weapon.bulletsPerShot; i++) {
          const spread = (Math.random() - 0.5) * this.weapon.spread * (Math.PI / 180);
          const spreadDirection = new Vector2(
            Math.cos(Math.atan2(bulletDirection.y, bulletDirection.x) + spread),
            Math.sin(Math.atan2(bulletDirection.y, bulletDirection.x) + spread)
          );
          
          result.bullets.push({
            position: bulletStart,
            velocity: spreadDirection.multiply(300),
            isEnemyBullet: true,
            ownerId: this.id
          });
        }
        
        this.weapon.fire();
        this.shootCooldown = this.weapon.fireRate + Math.random() * 500; // Add some randomness
        
        // If out of ammo, throw weapon
        if (!this.weapon.canFire() && this.weapon.isThrowable) {
          result.thrownWeapon = this.weapon;
          this.weapon = null;
        }
      }
    }
    
    // Move toward player (slower if shooting)
    const moveSpeed = this.weapon && distanceToPlayer < this.weapon.range ? this.speed * 0.3 : this.speed;
    const target = this.position.add(direction.multiply(moveSpeed * (deltaTime / 1000)));
    if (collider) {
      this.position = collider(this.position, target, 12);
    } else {
      this.position = target;
    }
    
    return result;
  }

  render(ctx: CanvasRenderingContext2D, playerPosition: Vector2) {
    const x = this.position.x;
    const y = this.position.y;
    const dir = playerPosition.subtract(this.position).normalize();
    const angle = Math.atan2(dir.y, dir.x);
    if (this.sprite) {
      const drawW = 42;
      const drawH = 42;
      ctx.save();
      ctx.translate(x, y);
      // Rotate sprite 90° counterclockwise to align facing
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
      // Fallback hazmat ellipse
      ctx.save();
      ctx.fillStyle = '#ffd54d'; // hazmat yellow
      ctx.beginPath();
      ctx.ellipse(x, y, 11, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(x, y);
      ctx.rotate(angle - Math.PI / 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(4, -4, 7, 8);
      ctx.restore();
    }

    // Shield visual
    if (this.shield > 0) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Removed red outline accent for cleaner look

    // Draw weapon if enemy has one
    if (this.weapon) {
      const direction = playerPosition.subtract(this.position).normalize();
      const angle = Math.atan2(direction.y, direction.x);
      const weaponPos = this.position.add(direction.multiply(15));
      this.weapon.render(ctx, weaponPos, angle);
    }
  }
}
