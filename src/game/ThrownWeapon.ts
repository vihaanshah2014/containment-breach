import { Vector2 } from './Vector2';
import { Weapon } from './Weapon';

export class ThrownWeapon {
  public position: Vector2;
  private velocity: Vector2;
  public weapon: Weapon;
  private rotation: number = 0;
  private rotationSpeed: number;

  constructor(position: Vector2, velocity: Vector2, weapon: Weapon) {
    this.position = position;
    this.velocity = velocity;
    this.weapon = weapon;
    this.rotationSpeed = (Math.random() - 0.5) * 20; // Random spin
  }

  update(deltaTime: number) {
    this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
    this.velocity = this.velocity.multiply(0.98); // Friction
    this.rotation += this.rotationSpeed * (deltaTime / 1000);
  }

  render(ctx: CanvasRenderingContext2D) {
    this.weapon.render(ctx, this.position, this.rotation);
  }
}