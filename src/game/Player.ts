import { Vector2 } from './Vector2';
import { Weapon, WeaponType } from './Weapon';

export class Player {
  public position: Vector2;
  public health: number = 3;
  public weapon: Weapon | null = null;
  public shield: number = 0; // 0-100
  private shootCooldown: number = 0;
  private punchCooldown: number = 0;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.weapon = new Weapon(WeaponType.PISTOL); // Start with pistol
  }

  update(deltaTime: number, keys: Set<string>, mouse: { x: number; y: number }, width: number, height: number): boolean {
    const speed = 200; // pixels per second
    const movement = new Vector2(0, 0);

    // Support WASD and Arrow Keys
    if (keys.has('w') || keys.has('arrowup')) movement.y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) movement.y += 1;
    if (keys.has('a') || keys.has('arrowleft')) movement.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) movement.x += 1;

    let moved = false;
    if (movement.length() > 0) {
      movement.normalize();
      this.position = this.position.add(movement.multiply(speed * (deltaTime / 1000)));
      moved = true;
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
    return this.shootCooldown <= 0 && this.weapon && this.weapon.canFire();
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
    return this.shootCooldown <= 0 && this.weapon && this.weapon.type === WeaponType.KATANA;
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

  render(ctx: CanvasRenderingContext2D, mousePos: Vector2) {
    // Draw player as a red circle
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

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
      const angle = Math.atan2(direction.y, direction.x);
      const weaponPos = this.position.add(direction.multiply(20));
      this.weapon.render(ctx, weaponPos, angle);
    }
  }
}
