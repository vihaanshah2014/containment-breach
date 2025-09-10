import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';

export class Enemy {
  public id: number;
  public position: Vector2;
  public weapon: Weapon | null = null;
  public shield: number = 0;
  public maxShield: number = 0;
  private speed: number;
  private shootCooldown: number = 0;
  private lastShotTime: number = 0;

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

  update(deltaTime: number, playerPosition: Vector2): { bullets: any[], thrownWeapon: Weapon | null } {
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
    this.position = this.position.add(direction.multiply(moveSpeed * (deltaTime / 1000)));
    
    return result;
  }

  render(ctx: CanvasRenderingContext2D, playerPosition: Vector2) {
    // Draw enemy body
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.position.x - 10, this.position.y - 10, 20, 20);

    // Shield visual
    if (this.shield > 0) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Red outline
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.position.x - 10, this.position.y - 10, 20, 20);

    // Draw weapon if enemy has one
    if (this.weapon) {
      const direction = playerPosition.subtract(this.position).normalize();
      const angle = Math.atan2(direction.y, direction.x);
      const weaponPos = this.position.add(direction.multiply(15));
      this.weapon.render(ctx, weaponPos, angle);
    }
  }
}
