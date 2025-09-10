import { Player } from './Player';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';
import { Vector2 } from './Vector2';
import { Particle } from './Particle';
import { WeaponPickup } from './WeaponPickup';
import { ThrownWeapon } from './ThrownWeapon';
import { Weapon, WeaponType } from './Weapon';

export class Game {
  private width: number;
  private height: number;
  private player: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private weaponPickups: WeaponPickup[] = [];
  private thrownWeapons: ThrownWeapon[] = [];
  private score: number = 0;
  private timeScale: number = 1;
  private enemySpawnTimer: number = 0;
  private enemySpawnRate: number = 2000; // ms
  private difficultyTimer: number = 0;
  private baseSpawnRate: number = 2000;
  private weaponSpawnTimer: number = 0;
  private waveNumber: number = 1;
  private enemiesKilledThisWave: number = 0;
  private enemiesPerWave: number = 5;

  public onScoreUpdate?: (score: number) => void;
  public onHealthUpdate?: (health: number) => void;
  public onGameOver?: () => void;
  public onWaveUpdate?: (wave: number) => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.player = new Player(width / 2, height / 2);
  }

  update(deltaTime: number, keys: Set<string>, mouse: { x: number; y: number; clicked: boolean; rightClicked: boolean }) {
    // Calculate time scale based on player movement
    const playerMoving = keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d');
    this.timeScale = playerMoving ? 1 : 0.1;

    const scaledDeltaTime = deltaTime * this.timeScale;

    // Update player
    this.player.update(scaledDeltaTime, keys, mouse, this.width, this.height);

    // Shooting or punching
    if (mouse.clicked) {
      if (this.player.weapon && this.player.canShoot()) {
        const direction = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y).normalize();
        const bulletStart = this.player.position.add(direction.multiply(20));
        
        // Handle different weapon types
        if (this.player.weapon.type === 'katana') {
          // Melee attack - check for enemies in range
          this.handleMeleeAttack(direction);
        } else {
          // Ranged attack
          for (let i = 0; i < this.player.weapon.bulletsPerShot; i++) {
            const spread = (Math.random() - 0.5) * this.player.weapon.spread * (Math.PI / 180);
            const spreadDirection = new Vector2(
              Math.cos(Math.atan2(direction.y, direction.x) + spread),
              Math.sin(Math.atan2(direction.y, direction.x) + spread)
            );
            this.bullets.push(new Bullet(bulletStart, spreadDirection.multiply(500)));
          }
        }
        this.player.shoot();
      } else if (!this.player.weapon && this.player.canPunch()) {
        // Punch attack when no weapon
        const direction = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y).normalize();
        this.handlePunchAttack(direction);
        this.player.punch();
      }
    }

    // Weapon throwing
    if (mouse.rightClicked && this.player.weapon) {
      const thrownWeapon = this.player.throwWeapon();
      if (thrownWeapon) {
        const direction = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y).normalize();
        this.thrownWeapons.push(new ThrownWeapon(
          this.player.position.add(direction.multiply(25)),
          direction.multiply(400),
          thrownWeapon
        ));
      }
    }

    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.update(scaledDeltaTime);
      return bullet.position.x > 0 && bullet.position.x < this.width &&
             bullet.position.y > 0 && bullet.position.y < this.height;
    });

    // Update enemies
    this.enemies.forEach(enemy => {
      const result = enemy.update(scaledDeltaTime, this.player.position);
      
      // Add enemy bullets
      result.bullets.forEach(bulletData => {
        this.bullets.push(new Bullet(bulletData.position, bulletData.velocity, bulletData.isEnemyBullet));
      });
      
      // Add thrown weapons from enemies
      if (result.thrownWeapon) {
        const direction = this.player.position.subtract(enemy.position).normalize();
        this.thrownWeapons.push(new ThrownWeapon(
          enemy.position.add(direction.multiply(20)),
          direction.multiply(200),
          result.thrownWeapon
        ));
      }
    });

    // Update weapon pickups
    this.weaponPickups.forEach(pickup => {
      pickup.update(scaledDeltaTime);
    });

    // Update thrown weapons
    this.thrownWeapons = this.thrownWeapons.filter(thrownWeapon => {
      thrownWeapon.update(scaledDeltaTime);
      return thrownWeapon.position.x > -50 && thrownWeapon.position.x < this.width + 50 &&
             thrownWeapon.position.y > -50 && thrownWeapon.position.y < this.height + 50;
    });

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.update(scaledDeltaTime);
      return particle.life > 0;
    });

    // Spawn enemies based on wave system
    this.enemySpawnTimer += scaledDeltaTime;
    if (this.enemySpawnTimer >= this.enemySpawnRate && this.enemies.length < this.enemiesPerWave) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    // Spawn weapon pickups occasionally
    this.weaponSpawnTimer += scaledDeltaTime;
    if (this.weaponSpawnTimer >= 12000 - (this.waveNumber * 500)) { // Faster weapon spawns in later waves
      this.spawnWeaponPickup();
      this.weaponSpawnTimer = 0;
    }

    // Check for wave completion
    if (this.enemies.length === 0 && this.enemiesKilledThisWave >= this.enemiesPerWave) {
      this.nextWave();
    }

    // Collision detection
    this.checkCollisions();

    // Check game over
    if (this.player.health <= 0) {
      this.onGameOver?.();
    }

    // Update callbacks
    this.onHealthUpdate?.(this.player.health);
  }

  private nextWave() {
    this.waveNumber++;
    this.enemiesKilledThisWave = 0;
    this.enemiesPerWave = Math.min(15, 5 + Math.floor(this.waveNumber / 2)); // Increase enemies per wave
    this.enemySpawnRate = Math.max(300, this.baseSpawnRate - (this.waveNumber * 150)); // Faster spawning
    this.onWaveUpdate?.(this.waveNumber);
    
    // Spawn a weapon pickup at the start of each wave
    this.spawnWeaponPickup();
  }

  private handlePunchAttack(direction: Vector2) {
    const punchRange = 40;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const distance = this.player.position.distanceTo(enemy.position);
      
      if (distance <= punchRange) {
        // Create punch particles
        for (let k = 0; k < 6; k++) {
          this.particles.push(new Particle(
            enemy.position.x,
            enemy.position.y,
            Math.random() * 360,
            80 + Math.random() * 120,
            '#ffff00'
          ));
        }
        
        // Drop weapon if enemy had one
        if (enemy.weapon) {
          this.weaponPickups.push(new WeaponPickup(
            enemy.position.x,
            enemy.position.y,
            enemy.weapon.type
          ));
        }
        
        this.enemies.splice(i, 1);
        this.score++;
        this.enemiesKilledThisWave++;
        this.onScoreUpdate?.(this.score);
        break; // Only punch one enemy at a time
      }
    }
  }

  private handleMeleeAttack(direction: Vector2) {
    const meleeRange = 60;
    const meleeAngle = Math.PI / 3; // 60 degrees
    const attackDirection = Math.atan2(direction.y, direction.x);
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const distance = this.player.position.distanceTo(enemy.position);
      
      if (distance <= meleeRange) {
        const enemyDirection = Math.atan2(
          enemy.position.y - this.player.position.y,
          enemy.position.x - this.player.position.x
        );
        
        let angleDiff = Math.abs(attackDirection - enemyDirection);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        if (angleDiff <= meleeAngle / 2) {
          // Create particles
          for (let k = 0; k < 8; k++) {
            this.particles.push(new Particle(
              enemy.position.x,
              enemy.position.y,
              Math.random() * 360,
              100 + Math.random() * 150,
              '#ff0000'
            ));
          }
          
          // Drop weapon if enemy had one
          if (enemy.weapon) {
            this.weaponPickups.push(new WeaponPickup(
              enemy.position.x,
              enemy.position.y,
              enemy.weapon.type
            ));
          }
          
          this.enemies.splice(i, 1);
          this.score++;
          this.enemiesKilledThisWave++;
          this.onScoreUpdate?.(this.score);
        }
      }
    }
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.width;
        y = -20;
        break;
      case 1: // Right
        x = this.width + 20;
        y = Math.random() * this.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.width;
        y = this.height + 20;
        break;
      case 3: // Left
        x = -20;
        y = Math.random() * this.height;
        break;
      default:
        x = 0;
        y = 0;
    }

    // Increase weapon chance with wave number
    const weaponChance = Math.min(0.9, 0.4 + (this.waveNumber * 0.1));
    this.enemies.push(new Enemy(x, y, weaponChance));
  }

  private spawnWeaponPickup() {
    const weaponTypes = [WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.KATANA];
    const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    const x = 100 + Math.random() * (this.width - 200);
    const y = 100 + Math.random() * (this.height - 200);
    
    this.weaponPickups.push(new WeaponPickup(x, y, randomType));
  }

  private checkCollisions() {
    // Bullet vs Enemy
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Skip enemy bullets hitting enemies
      if (bullet.isEnemyBullet) continue;
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (bullet.position.distanceTo(enemy.position) < 15) {
          // Create particles
          for (let k = 0; k < 5; k++) {
            this.particles.push(new Particle(
              enemy.position.x,
              enemy.position.y,
              Math.random() * 360,
              50 + Math.random() * 100
            ));
          }
          
          // Drop weapon if enemy had one
          if (enemy.weapon) {
            this.weaponPickups.push(new WeaponPickup(
              enemy.position.x,
              enemy.position.y,
              enemy.weapon.type
            ));
          }
          
          this.bullets.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score++;
          this.enemiesKilledThisWave++;
          this.onScoreUpdate?.(this.score);
          break;
        }
      }
    }

    // Enemy bullets vs Player
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      if (bullet.isEnemyBullet && bullet.position.distanceTo(this.player.position) < 18) {
        this.bullets.splice(i, 1);
        this.player.takeDamage();
        
        // Create damage particles
        for (let k = 0; k < 5; k++) {
          this.particles.push(new Particle(
            this.player.position.x,
            this.player.position.y,
            Math.random() * 360,
            50 + Math.random() * 100,
            '#ff0000'
          ));
        }
      }
    }

    // Enemy vs Player
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (enemy.position.distanceTo(this.player.position) < 20) {
        // Drop weapon if enemy had one
        if (enemy.weapon) {
          this.weaponPickups.push(new WeaponPickup(
            enemy.position.x,
            enemy.position.y,
            enemy.weapon.type
          ));
        }
        
        this.enemies.splice(i, 1);
        this.player.takeDamage();
        
        // Create damage particles
        for (let k = 0; k < 3; k++) {
          this.particles.push(new Particle(
            this.player.position.x,
            this.player.position.y,
            Math.random() * 360,
            30 + Math.random() * 50,
            '#ff0000'
          ));
        }
      }
    }

    // Player vs Weapon Pickups
    for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
      const pickup = this.weaponPickups[i];
      
      if (pickup.position.distanceTo(this.player.position) < 30) {
        this.player.pickupWeapon(pickup.weapon);
        this.weaponPickups.splice(i, 1);
      }
    }

    // Thrown weapons vs Enemies
    for (let i = this.thrownWeapons.length - 1; i >= 0; i--) {
      const thrownWeapon = this.thrownWeapons[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (thrownWeapon.position.distanceTo(enemy.position) < 20) {
          // Create particles
          for (let k = 0; k < 6; k++) {
            this.particles.push(new Particle(
              enemy.position.x,
              enemy.position.y,
              Math.random() * 360,
              80 + Math.random() * 120
            ));
          }
          
          // Drop weapon if enemy had one
          if (enemy.weapon) {
            this.weaponPickups.push(new WeaponPickup(
              enemy.position.x,
              enemy.position.y,
              enemy.weapon.type
            ));
          }
          
          // Convert thrown weapon to pickup
          this.weaponPickups.push(new WeaponPickup(
            thrownWeapon.position.x,
            thrownWeapon.position.y,
            thrownWeapon.weapon.type
          ));
          
          this.thrownWeapons.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score++;
          this.enemiesKilledThisWave++;
          this.onScoreUpdate?.(this.score);
          break;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, mouse: { x: number; y: number }) {
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.width, this.height);

    // Render particles
    this.particles.forEach(particle => particle.render(ctx));

    // Render weapon pickups
    this.weaponPickups.forEach(pickup => pickup.render(ctx));

    // Render thrown weapons
    this.thrownWeapons.forEach(thrownWeapon => thrownWeapon.render(ctx));

    // Render bullets
    this.bullets.forEach(bullet => bullet.render(ctx));

    // Render enemies
    this.enemies.forEach(enemy => enemy.render(ctx, this.player.position));

    // Render player
    this.player.render(ctx, new Vector2(mouse.x, mouse.y));

    // Time scale indicator
    if (this.timeScale < 1) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  reset() {
    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.weaponPickups = [];
    this.thrownWeapons = [];
    this.score = 0;
    this.waveNumber = 1;
    this.enemiesKilledThisWave = 0;
    this.enemiesPerWave = 5;
    this.enemySpawnTimer = 0;
    this.enemySpawnRate = this.baseSpawnRate;
    this.difficultyTimer = 0;
    this.weaponSpawnTimer = 0;
  }
}