import { Player } from './Player';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';
import { Vector2 } from './Vector2';
import { Particle } from './Particle';
import { WeaponPickup } from './WeaponPickup';
import { ShieldPickup } from './ShieldPickup';
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
  private shieldPickups: ShieldPickup[] = [];
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
  // Katana swing state
  private meleeSwingActive: boolean = false;
  private meleeSwingStart: number = 0; // radians (unwrapped)
  private meleeSwingEnd: number = 0;   // radians (unwrapped)
  private meleeSwingElapsed: number = 0;
  private meleeSwingDuration: number = 200; // ms
  private meleeHitThisSwing: Set<Enemy> = new Set();
  private aimDirection: Vector2 = new Vector2(1, 0);

  // Stats
  private bulletsFired: number = 0;
  private bulletsHit: number = 0;
  private friendlyFireKills: number = 0;
  private thrownKills: number = 0;
  private killsByWeapon: Record<string, number> = {
    [WeaponType.PISTOL]: 0,
    [WeaponType.RIFLE]: 0,
    [WeaponType.SHOTGUN]: 0,
    [WeaponType.KATANA]: 0,
    [WeaponType.SHURIKEN]: 0,
  };

  public getStats() {
    return {
      bulletsFired: this.bulletsFired,
      bulletsHit: this.bulletsHit,
      friendlyFireKills: this.friendlyFireKills,
      thrownKills: this.thrownKills,
      killsByWeapon: this.killsByWeapon,
    };
  }

  public onScoreUpdate?: (score: number) => void;
  public onHealthUpdate?: (health: number) => void;
  public onGameOver?: () => void;
  public onWaveUpdate?: (wave: number) => void;
  public onHudUpdate?: () => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.player = new Player(width / 2, height / 2);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Clamp player within new bounds
    this.player.position.x = Math.max(20, Math.min(this.width - 20, this.player.position.x));
    this.player.position.y = Math.max(20, Math.min(this.height - 20, this.player.position.y));
  }

  update(deltaTime: number, keys: Set<string>, mouse: { x: number; y: number; clicked: boolean; rightClicked: boolean }) {
    // Calculate time scale based on player movement
    const playerMoving =
      keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
      keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright');
    this.timeScale = playerMoving ? 1 : 0.1;

    const scaledDeltaTime = deltaTime * this.timeScale;

    // Update player
    // Track current aim direction toward mouse for blocking logic
    {
      const aim = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y);
      this.aimDirection = aim.length() > 0 ? aim.normalize() : new Vector2(1, 0);
    }

    const moved = this.player.update(scaledDeltaTime, keys, mouse, this.width, this.height);
    if (moved) this.onHudUpdate?.();

    // Shooting or punching
    if (mouse.clicked) {
      if (this.player.weapon && this.player.canShoot()) {
        const direction = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y).normalize();
        const bulletStart = this.player.position.add(direction.multiply(20));
        
        // Handle different weapon types
        let didShoot = false;
        if (this.player.weapon.type === 'katana') {
          // Start a katana swing (30% of a full circle)
          if (!this.meleeSwingActive) {
            const attackDir = Math.atan2(direction.y, direction.x);
            const swingSpan = Math.PI * 0.6; // ~108 degrees
            this.startKatanaSwing(attackDir, swingSpan);
            this.player.melee();
          }
        } else if (this.player.weapon.type === 'shuriken') {
          // Throw a shuriken as a projectile
          this.thrownWeapons.push(new ThrownWeapon(
            this.player.position.add(direction.multiply(25)),
            direction.multiply(500),
            new Weapon(WeaponType.SHURIKEN),
            true
          ));
          didShoot = true;
        } else {
          // Ranged attack
          for (let i = 0; i < this.player.weapon.bulletsPerShot; i++) {
            const spread = (Math.random() - 0.5) * this.player.weapon.spread * (Math.PI / 180);
            const spreadDirection = new Vector2(
              Math.cos(Math.atan2(direction.y, direction.x) + spread),
              Math.sin(Math.atan2(direction.y, direction.x) + spread)
            );
            this.bullets.push(new Bullet(bulletStart, spreadDirection.multiply(500), false, this.player.weapon.type));
            this.bulletsFired++;
          }
          didShoot = true;
        }
        if (didShoot) {
          this.player.shoot();
          this.onHudUpdate?.();
        }
      } else if (!this.player.weapon && this.player.canPunch()) {
        // Punch attack when no weapon
        const direction = new Vector2(mouse.x - this.player.position.x, mouse.y - this.player.position.y).normalize();
        this.handlePunchAttack(direction);
        this.player.punch();
      }
    }

    // Update katana swing
    if (this.meleeSwingActive) {
      this.meleeSwingElapsed += scaledDeltaTime;
      const t = Math.min(1, this.meleeSwingElapsed / this.meleeSwingDuration);
      const current = this.meleeSwingStart + (this.meleeSwingEnd - this.meleeSwingStart) * t;
      this.handleMeleeSweep(this.meleeSwingStart, current);
      if (t >= 1) {
        this.meleeSwingActive = false;
        this.meleeHitThisSwing.clear();
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
          thrownWeapon,
          true
        ));
        this.onHudUpdate?.();
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
        this.bullets.push(new Bullet(
          bulletData.position,
          bulletData.velocity,
          bulletData.isEnemyBullet,
          undefined,
          (bulletData as any).ownerId
        ));
      });
      
      // Add thrown weapons from enemies
      if (result.thrownWeapon) {
        const direction = this.player.position.subtract(enemy.position).normalize();
        this.thrownWeapons.push(new ThrownWeapon(
          enemy.position.add(direction.multiply(20)),
          direction.multiply(200),
          result.thrownWeapon,
          false
        ));
      }
    });

    // Update weapon pickups
    this.weaponPickups.forEach(pickup => {
      pickup.update(scaledDeltaTime);
    });

    // Update shield pickups
    this.shieldPickups.forEach(p => p.update(scaledDeltaTime));

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

    // Spawn pickups occasionally
    this.weaponSpawnTimer += scaledDeltaTime;
    if (this.weaponSpawnTimer >= 12000 - (this.waveNumber * 500)) { // Faster spawns in later waves
      if (Math.random() < 0.25) this.spawnShieldPickup(); else this.spawnWeaponPickup();
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
        if (enemy.shield > 0) {
          enemy.shield = Math.max(0, enemy.shield - 1);
        } else {
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
          
          if (enemy.shield > 0) {
            enemy.shield = Math.max(0, enemy.shield - 2);
          } else {
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
    const shieldChance = Math.min(0.5, 0.1 + (this.waveNumber * 0.05));
    const shieldHits = Math.random() < shieldChance ? 2 : 0;
    this.enemies.push(new Enemy(x, y, weaponChance, shieldHits));
  }

  private spawnWeaponPickup() {
    const weaponTypes = [WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.KATANA, WeaponType.SHURIKEN];
    const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    const x = 100 + Math.random() * (this.width - 200);
    const y = 100 + Math.random() * (this.height - 200);
    
    this.weaponPickups.push(new WeaponPickup(x, y, randomType));
  }

  private spawnShieldPickup() {
    const x = 100 + Math.random() * (this.width - 200);
    const y = 100 + Math.random() * (this.height - 200);
    this.shieldPickups.push(new ShieldPickup(x, y));
  }

  private checkCollisions() {
    // Bullet vs Enemy (friendly fire allowed, but no self-kills)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        // Prevent enemies from dying to their own bullet
        if (bullet.isEnemyBullet && bullet.enemyOwnerId && bullet.enemyOwnerId === enemy.id) {
          continue;
        }
        
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
          
          // Bullet impacts shield first
          if (enemy.shield > 0) {
            enemy.shield = Math.max(0, enemy.shield - 1);
            // Shield hit sparkle
            for (let k = 0; k < 4; k++) {
              this.particles.push(new Particle(
                enemy.position.x,
                enemy.position.y,
                Math.random() * 360,
                80 + Math.random() * 120,
                '#00ccff'
              ));
            }
            this.bullets.splice(i, 1);
            break;
          }
          
          // Player bullet hit counts toward accuracy
          if (!bullet.isEnemyBullet) {
            this.bulletsHit++;
          }
          
          // Bullet impacts shield first
          if (enemy.shield > 0) {
            enemy.shield = Math.max(0, enemy.shield - 1);
            this.bullets.splice(i, 1);
            if (!bullet.isEnemyBullet) {
              this.onHudUpdate?.();
            }
            break;
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
          if (bullet.isEnemyBullet) {
            this.friendlyFireKills++;
          } else if (bullet.playerWeaponType) {
            this.killsByWeapon[bullet.playerWeaponType] = (this.killsByWeapon[bullet.playerWeaponType] || 0) + 1;
          }
          this.onScoreUpdate?.(this.score);
          this.onHudUpdate?.();
          break;
        }
      }
    }

    // Enemy bullets vs Player (with katana blocking + swing arc)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Katana block: if player has katana and bullet is in front within radius
      if (bullet.isEnemyBullet && !bullet.playerWeaponType && this.player.weapon && this.player.weapon.type === WeaponType.KATANA) {
        const toBullet = bullet.position.subtract(this.player.position);
        const dist = toBullet.length();
        if (dist < 28) {
          const incoming = toBullet.normalize().multiply(-1); // direction bullet travels toward player
          const dot = incoming.x * this.aimDirection.x + incoming.y * this.aimDirection.y;
          // Allow block if bullet approaches within ~60 degrees of where player is facing
          if (dot > 0.5) {
            // Reduce katana durability by 10% of max
            const w = this.player.weapon;
            if (w) {
              w.durability = Math.max(0, w.durability - w.maxDurability * 0.1);
            }
            // Block particles
            for (let k = 0; k < 5; k++) {
              this.particles.push(new Particle(
                this.player.position.x,
                this.player.position.y,
                Math.random() * 360,
                100 + Math.random() * 140,
                '#aaaaaa'
              ));
            }
            this.bullets.splice(i, 1);
            this.onHudUpdate?.();
            continue;
          }
        }
        // Swing arc block: if a swing is active and the bullet is within the arc annulus
        if (this.meleeSwingActive) {
          const angle = Math.atan2(toBullet.y, toBullet.x);
          // Unwrap angle near swing start
          let a = angle;
          while (a < this.meleeSwingStart - Math.PI) a += Math.PI * 2;
          while (a > this.meleeSwingStart + Math.PI) a -= Math.PI * 2;
          const t = Math.min(1, this.meleeSwingElapsed / this.meleeSwingDuration);
          const current = this.meleeSwingStart + (this.meleeSwingEnd - this.meleeSwingStart) * t;
          const inAngle = a >= Math.min(this.meleeSwingStart, current) && a <= Math.max(this.meleeSwingStart, current);
          const inRadius = dist >= 16 && dist <= 72; // near the drawn arc
          if (inAngle && inRadius) {
            const w = this.player.weapon;
            if (w) {
              w.durability = Math.max(0, w.durability - w.maxDurability * 0.1);
            }
            for (let k = 0; k < 5; k++) {
              this.particles.push(new Particle(
                this.player.position.x,
                this.player.position.y,
                Math.random() * 360,
                100 + Math.random() * 140,
                '#aaaaaa'
              ));
            }
            this.bullets.splice(i, 1);
            this.onHudUpdate?.();
            continue;
          }
        }
      }

      if (bullet.isEnemyBullet && !bullet.playerWeaponType && bullet.position.distanceTo(this.player.position) < 18) {
        this.bullets.splice(i, 1);
        this.player.takeDamage();
        this.onHudUpdate?.();
        
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
        this.onHudUpdate?.();
        
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
        this.onHudUpdate?.();
      }
    }

    // Player vs Shield Pickups
    for (let i = this.shieldPickups.length - 1; i >= 0; i--) {
      const pickup = this.shieldPickups[i];
      if (pickup.position.distanceTo(this.player.position) < 30) {
        this.player.addShield(40);
        this.shieldPickups.splice(i, 1);
        // Shield pickup particles
        for (let k = 0; k < 8; k++) {
          this.particles.push(new Particle(
            this.player.position.x,
            this.player.position.y,
            Math.random() * 360,
            100 + Math.random() * 120,
            '#00ccff'
          ));
        }
        this.onHudUpdate?.();
      }
    }

    // Thrown weapons vs Enemies
    for (let i = this.thrownWeapons.length - 1; i >= 0; i--) {
      const thrownWeapon = this.thrownWeapons[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        if (thrownWeapon.position.distanceTo(enemy.position) < 20) {
          const shielded = enemy.shield > 0;
          // Create particles
          for (let k = 0; k < 6; k++) {
            this.particles.push(new Particle(
              enemy.position.x,
              enemy.position.y,
              Math.random() * 360,
              80 + Math.random() * 120,
              shielded ? '#00ccff' : '#ff0000'
            ));
          }
          
          if (enemy.shield > 0) {
            // Thrown weapons chunk more shield
            enemy.shield = Math.max(0, enemy.shield - 2);
            // For shurikens, disappear on impact; others become pickups
            if (thrownWeapon.weapon.type !== WeaponType.SHURIKEN) {
              this.weaponPickups.push(new WeaponPickup(
                thrownWeapon.position.x,
                thrownWeapon.position.y,
                thrownWeapon.weapon.type
              ));
            }
            this.thrownWeapons.splice(i, 1);
            break;
          }
          
          // Drop weapon if enemy had one
          if (enemy.weapon) {
            this.weaponPickups.push(new WeaponPickup(
              enemy.position.x,
              enemy.position.y,
              enemy.weapon.type
            ));
          }
          
          // Convert thrown weapon to pickup (except shurikens, which disappear)
          if (thrownWeapon.weapon.type !== WeaponType.SHURIKEN) {
            this.weaponPickups.push(new WeaponPickup(
              thrownWeapon.position.x,
              thrownWeapon.position.y,
              thrownWeapon.weapon.type
            ));
          }
          
          this.thrownWeapons.splice(i, 1);
          this.enemies.splice(j, 1);
          this.score++;
          this.enemiesKilledThisWave++;
          if (thrownWeapon.ownerIsPlayer) {
            this.thrownKills++;
          }
          this.onScoreUpdate?.(this.score);
          this.onHudUpdate?.();
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

    // Render shield pickups
    this.shieldPickups.forEach(pickup => pickup.render(ctx));

    // Render thrown weapons
    this.thrownWeapons.forEach(thrownWeapon => thrownWeapon.render(ctx));

    // Render bullets
    this.bullets.forEach(bullet => bullet.render(ctx));

    // Render enemies
    this.enemies.forEach(enemy => enemy.render(ctx, this.player.position));

    // Render player
    this.player.render(ctx, new Vector2(mouse.x, mouse.y));

    // Render katana swing arc
    if (this.meleeSwingActive) {
      const t = Math.min(1, this.meleeSwingElapsed / this.meleeSwingDuration);
      const current = this.meleeSwingStart + (this.meleeSwingEnd - this.meleeSwingStart) * t;
      const radiusOuter = 70;
      const radiusInner = 16;
      ctx.save();
      ctx.translate(this.player.position.x, this.player.position.y);
      ctx.beginPath();
      ctx.arc(0, 0, radiusOuter, this.meleeSwingStart, current, false);
      ctx.arc(0, 0, radiusInner, current, this.meleeSwingStart, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fill();
      ctx.restore();
    }

    // Time scale indicator
    if (this.timeScale < 1) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  reset() {
    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.weaponPickups = [];
    this.shieldPickups = [];
    this.thrownWeapons = [];
    this.score = 0;
    this.waveNumber = 1;
    this.enemiesKilledThisWave = 0;
    this.enemiesPerWave = 5;
    this.enemySpawnTimer = 0;
    this.enemySpawnRate = this.baseSpawnRate;
    this.difficultyTimer = 0;
    this.weaponSpawnTimer = 0;
    this.meleeSwingActive = false;
    this.meleeHitThisSwing.clear();
    this.bulletsFired = 0;
    this.bulletsHit = 0;
    this.friendlyFireKills = 0;
    this.thrownKills = 0;
    this.killsByWeapon[WeaponType.PISTOL] = 0;
    this.killsByWeapon[WeaponType.RIFLE] = 0;
    this.killsByWeapon[WeaponType.SHOTGUN] = 0;
    this.killsByWeapon[WeaponType.KATANA] = 0;
    this.killsByWeapon[WeaponType.SHURIKEN] = 0;
  }

  // Start a katana swing from a center direction with a given span
  private startKatanaSwing(centerDirection: number, span: number) {
    // Unwrap angles to a monotonically increasing interval
    const start = centerDirection - span / 2;
    const end = centerDirection + span / 2;
    this.meleeSwingStart = start;
    this.meleeSwingEnd = end;
    this.meleeSwingElapsed = 0;
    this.meleeSwingActive = true;
    this.meleeHitThisSwing.clear();
  }

  // Check enemies along the sweep from start..current (unwrapped radians)
  private handleMeleeSweep(start: number, current: number) {
    const meleeRange = 60;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (this.meleeHitThisSwing.has(enemy)) continue;
      const distance = this.player.position.distanceTo(enemy.position);
      if (distance > meleeRange) continue;
      let enemyDir = Math.atan2(
        enemy.position.y - this.player.position.y,
        enemy.position.x - this.player.position.x
      );
      // Unwrap enemy angle near start
      while (enemyDir < start - Math.PI) enemyDir += Math.PI * 2;
      while (enemyDir > start + Math.PI) enemyDir -= Math.PI * 2;
      if (enemyDir >= Math.min(start, current) && enemyDir <= Math.max(start, current)) {
        // Apply hit (katana chunks shield more)
        for (let k = 0; k < 8; k++) {
          this.particles.push(new Particle(
            enemy.position.x,
            enemy.position.y,
            Math.random() * 360,
            100 + Math.random() * 150,
            '#ff0000'
          ));
        }
        if (enemy.shield > 0) {
          enemy.shield = Math.max(0, enemy.shield - 2);
        } else {
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
        this.meleeHitThisSwing.add(enemy);
      }
    }
  }
}
