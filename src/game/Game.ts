import { Player } from './Player';
import { Enemy } from './Enemy';
import { Bullet } from './Bullet';
import { Vector2 } from './Vector2';
import { Particle } from './Particle';
import { Footstep } from './Footstep';
import { WeaponPickup } from './WeaponPickup';
import { ShieldPickup } from './ShieldPickup';
import { HealthPickup } from './HealthPickup';
import { AmmoPickup } from './AmmoPickup';
import { ThrownWeapon } from './ThrownWeapon';
import { Grenade } from './Grenade';
import { Weapon, WeaponType } from './Weapon';
import { TileMap } from './TileMap';

export class Game {
  private width: number;
  private height: number;
  private player: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private footsteps: Footstep[] = [];
  private weaponPickups: WeaponPickup[] = [];
  private thrownWeapons: ThrownWeapon[] = [];
  private shieldPickups: ShieldPickup[] = [];
  private healthPickups: HealthPickup[] = [];
  private ammoPickups: AmmoPickup[] = [];
  private grenades: Grenade[] = [];
  private map: TileMap;
  private score: number = 0;
  private timeScale: number = 1;
  private enemySpawnTimer: number = 0;
  private enemySpawnRate: number = 1600; // ms (slightly faster for more action)
  private difficultyTimer: number = 0;
  private baseSpawnRate: number = 2000;
  private weaponSpawnTimer: number = 0;
  private waveNumber: number = 1;
  private enemiesKilledThisWave: number = 0;
  private enemiesPerWave: number = 7;
  private cameraX: number = 0;
  private cameraY: number = 0;
  // Minimap config
  private miniW: number = 200;
  private miniMargin: number = 12;
  // Nav grid (BFS from player)
  private navGrid: number[][] | null = null;
  private navCols: number = 0;
  private navRows: number = 0;
  private navRecalcTimer: number = 0;
  private lastPlayerTile: { tx: number; ty: number } | null = null;
  // Katana swing state
  private meleeSwingActive: boolean = false;
  private meleeSwingStart: number = 0; // radians (unwrapped)
  private meleeSwingEnd: number = 0;   // radians (unwrapped)
  private meleeSwingElapsed: number = 0;
  private meleeSwingDuration: number = 200; // ms
  private meleeHitThisSwing: Set<Enemy> = new Set();
  private aimDirection: Vector2 = new Vector2(1, 0);
  
  // Grenade throwing state
  private grenadeCharging: boolean = false;
  private grenadeChargeStart: number = 0;
  private grenadeChargeTime: number = 0;
  private maxGrenadeCharge: number = 2000; // 2 seconds max charge

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

  // Character sprites
  private playableSprites: any[] = [];
  private enemySprites: any[] = [];
  private unlockableSprites: any[] = [];

  public setCharacterSprites(sets: { playable: any[]; enemies: any[]; unlockable: any[] }) {
    this.playableSprites = sets.playable;
    this.enemySprites = sets.enemies;
    this.unlockableSprites = sets.unlockable;
    if (this.playableSprites.length) {
      // Start with skin 1 (index 0) instead of random
      (this.player as any).sprite = this.playableSprites[0];
    }
  }

  public selectPlayerSprite(index: number) {
    if (index >= 0 && index < this.playableSprites.length) {
      (this.player as any).sprite = this.playableSprites[index];
    }
  }

  public onScoreUpdate?: (score: number) => void;
  public onHealthUpdate?: (health: number) => void;
  public onGameOver?: () => void;
  public onWaveUpdate?: (wave: number) => void;
  public onHudUpdate?: () => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const worldW = Math.max(1600, Math.floor(width * 2.5));
    const worldH = Math.max(1200, Math.floor(height * 2.5));
    this.map = new TileMap(worldW, worldH);
    
    // Spawn player in a safe location (spawn tiles first, then room centers, then doors as fallback)
    let spawnTile = this.map.getRandomSpawnTile(); // Try spawn tiles first (room centers)
    
    if (!spawnTile) {
      // Fallback: try to spawn in center of a room
      const rooms = this.map.getRooms();
      if (rooms.length > 0) {
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        spawnTile = this.map.getRandomEmptyTileInRoom(rooms.indexOf(room));
      }
    }
    
    if (!spawnTile) {
      // Last resort: use a random empty tile (safer than doors)
      spawnTile = this.map.getRandomEmptyTile(false);
    }
    
    if (!spawnTile) {
      // Emergency fallback: door tile if nothing else works
      spawnTile = this.map.getRandomDoorTile();
    }
    
    if (!spawnTile) {
      throw new Error('CRITICAL: No safe spawn location found!');
    }
    
    const spawnPos = this.map.tileCenter(spawnTile.tx, spawnTile.ty);
    this.player = new Player(spawnPos.x, spawnPos.y);
    
    // Force spawn initial enemies for wave 1 immediately
    console.log(`🎮 GAME START - Spawning ${this.enemiesPerWave} initial enemies for Wave 1`);
    for (let i = 0; i < Math.min(3, this.enemiesPerWave); i++) {
      setTimeout(() => {
        this.spawnEnemy();
        console.log(`🚀 Initial enemy ${i + 1} spawned`);
      }, i * 500); // Spawn one every 500ms
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Clamp player within new bounds
    this.player.position.x = Math.max(20, Math.min(this.width - 20, this.player.position.x));
    this.player.position.y = Math.max(20, Math.min(this.height - 20, this.player.position.y));
    // keep world size fixed; do not resize map here
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
      const worldMouse = new Vector2(mouse.x + this.cameraX, mouse.y + this.cameraY);
      const aim = new Vector2(worldMouse.x - this.player.position.x, worldMouse.y - this.player.position.y);
      this.aimDirection = aim.length() > 0 ? aim.normalize() : new Vector2(1, 0);
    }

    const moved = this.player.update(
      scaledDeltaTime,
      keys,
      { x: mouse.x + this.cameraX, y: mouse.y + this.cameraY },
      this.map.getPixelWidth(),
      this.map.getPixelHeight(),
      (from, to, radius) => this.map.collideCircle(from, to, radius)
    );
    if (moved) this.onHudUpdate?.();

    // Shooting or punching
    if (mouse.clicked) {
      if (this.player.weapon && this.player.canShoot()) {
        const worldMouseX = mouse.x + this.cameraX;
        const worldMouseY = mouse.y + this.cameraY;
        const direction = new Vector2(worldMouseX - this.player.position.x, worldMouseY - this.player.position.y).normalize();
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

    // Grenade charging and throwing with Q key
    const qKeyPressed = keys.has('q');
    
    if (qKeyPressed && !this.grenadeCharging && this.player.canThrowGrenade()) {
      // Start charging grenade
      this.grenadeCharging = true;
      this.grenadeChargeStart = Date.now();
      this.grenadeChargeTime = 0;
      console.log(`💣 Grenade charging started...`);
    } else if (qKeyPressed && this.grenadeCharging) {
      // Continue charging (update charge time)
      this.grenadeChargeTime = Math.min(Date.now() - this.grenadeChargeStart, this.maxGrenadeCharge);
    } else if (!qKeyPressed && this.grenadeCharging) {
      // Q released - throw grenade with accumulated power
      const worldMouseX = mouse.x + this.cameraX;
      const worldMouseY = mouse.y + this.cameraY;
      const direction = new Vector2(worldMouseX - this.player.position.x, worldMouseY - this.player.position.y).normalize();
      
      if (this.player.throwGrenade()) {
        // Calculate throw power based on charge time (200-800 power)
        const chargeRatio = this.grenadeChargeTime / this.maxGrenadeCharge;
        const minPower = 200;
        const maxPower = 800;
        const throwPower = minPower + (chargeRatio * (maxPower - minPower));
        
        this.grenades.push(new Grenade(
          this.player.position.add(direction.multiply(30)),
          direction,
          throwPower
        ));
        
        console.log(`💣 Grenade thrown! Power: ${throwPower.toFixed(0)} (${(chargeRatio * 100).toFixed(0)}% charge), ${this.player.grenades} remaining`);
        this.onHudUpdate?.();
      }
      
      // Reset charging state
      this.grenadeCharging = false;
      this.grenadeChargeTime = 0;
    }

    // Weapon throwing
    if (mouse.rightClicked && this.player.weapon) {
      const thrownWeapon = this.player.throwWeapon();
      if (thrownWeapon) {
        const worldMouseX = mouse.x + this.cameraX;
        const worldMouseY = mouse.y + this.cameraY;
        const direction = new Vector2(worldMouseX - this.player.position.x, worldMouseY - this.player.position.y).normalize();
        this.thrownWeapons.push(new ThrownWeapon(
          this.player.position.add(direction.multiply(25)),
          direction.multiply(400),
          thrownWeapon,
          true
        ));
        this.onHudUpdate?.();
      }
    }

    // Update bullets and collide with tiles and objects
    this.bullets = this.bullets.filter(bullet => {
      bullet.update(scaledDeltaTime);
      
      // Check collision with breakable objects first
      const objectHit = this.map.checkObjectHit(bullet.position.x, bullet.position.y);
      if (objectHit.hit && objectHit.object) {
        const result = this.map.damageObject(objectHit.object.id, 1);
        
        // Create destruction particles
        const particleColor = result.destroyed ? '#ffaa00' : '#888888';
        const particleCount = result.destroyed ? 8 : 4;
        
        for (let k = 0; k < particleCount; k++) {
          this.particles.push(new Particle(
            bullet.position.x,
            bullet.position.y,
            Math.random() * 360,
            80 + Math.random() * 120,
            particleColor
          ));
        }
        
        // If a table was destroyed, spawn an item!
        if (result.destroyed && result.object?.type === 'table') {
          const shouldSpawnWeapon = Math.random() < 0.7; // 70% chance for weapon, 30% for shield
          if (shouldSpawnWeapon) {
            const weaponTypes = [WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.KATANA, WeaponType.SHURIKEN];
            const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
            this.weaponPickups.push(new WeaponPickup(
              result.object.x + result.object.width / 2,
              result.object.y + result.object.height / 2,
              randomType
            ));
          } else {
            this.shieldPickups.push(new ShieldPickup(
              result.object.x + result.object.width / 2,
              result.object.y + result.object.height / 2
            ));
          }
        }
        
        return false; // Remove bullet
      }
      
      // Check collision with tiles
      const hit = this.map.bulletHit(bullet.position.x, bullet.position.y);
      if (hit.hit) {
        if (hit.material === 'glass' && hit.tx !== undefined && hit.ty !== undefined) {
          this.map.breakGlass(hit.tx, hit.ty);
          for (let k = 0; k < 6; k++) {
            this.particles.push(new Particle(
              bullet.position.x,
              bullet.position.y,
              Math.random() * 360,
              80 + Math.random() * 120,
              '#a6f6ff'
            ));
          }
        }
        return false;
      }
      
      return bullet.position.x > 0 && bullet.position.x < this.map.getPixelWidth() &&
             bullet.position.y > 0 && bullet.position.y < this.map.getPixelHeight();
    });

    // Update enemies with improved navigation and LOS-aware firing
    const tileSize = (this.map as any).tileSize as number;
    const lineOfSight = (sx: number, sy: number, ex: number, ey: number) => {
      const steps = Math.max(1, Math.floor(Math.hypot(ex - sx, ey - sy) / (tileSize / 2)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = sx + (ex - sx) * t;
        const y = sy + (ey - sy) * t;
        const tx = Math.floor(x / tileSize);
        const ty = Math.floor(y / tileSize);
        const tt = (this.map as any).get(tx, ty);
        if (tt === 'wall' || tt === 'glass') return false;
      }
      return true;
    };

    // Track player's current room index (for HUD/AI consumers)
    {
      const __room = this.map.getRoomContaining(this.player.position.x, this.player.position.y);
      const __rooms: any[] = (this.map as any).getRooms ? (this.map as any).getRooms() : [];
      (this.player as any).currentRoomIndex = __room ? __rooms.indexOf(__room) : null;
    }

    this.enemies.forEach(enemy => {
      const epos = enemy['position'];
      const ppos = this.player.position;
      const los = lineOfSight(epos.x, epos.y, ppos.x, ppos.y);
      let moveTarget = ppos;

      if (!los) {
        const playerRoom = this.map.getRoomContaining(ppos.x, ppos.y);
        const enemyRoom = this.map.getRoomContaining(epos.x, epos.y);
        const rooms: any[] = (this.map as any).getRooms ? (this.map as any).getRooms() : [];
        (this.player as any).currentRoomIndex = playerRoom ? rooms.indexOf(playerRoom) : null;

        const eTile = this.map.worldToTile(epos.x, epos.y);
        if (playerRoom && enemyRoom && playerRoom !== enemyRoom) {
          // Head toward the closest door of the player's room
          const doorTile = this.findClosestDoorTile(playerRoom, eTile);
          if (doorTile) {
            const nextStep = this.findNextStep(eTile.tx, eTile.ty, doorTile.tx, doorTile.ty);
            if (nextStep) {
              const c = this.map.tileCenter(nextStep.tx, nextStep.ty);
              moveTarget = new Vector2(c.x, c.y);
            } else {
              // Nudge directly toward the door if BFS fails
              const c = this.map.tileCenter(doorTile.tx, doorTile.ty);
              moveTarget = new Vector2(c.x, c.y);
            }
          } else {
            // Fallback: room center
            const roomCenter = this.map.getRoomCenter(playerRoom);
            const targetTile = this.map.worldToTile(roomCenter.x, roomCenter.y);
            const nextStep = this.findNextStep(eTile.tx, eTile.ty, targetTile.tx, targetTile.ty);
            if (nextStep) {
              const c = this.map.tileCenter(nextStep.tx, nextStep.ty);
              moveTarget = new Vector2(c.x, c.y);
            } else {
              moveTarget = epos;
            }
          }
        } else {
          // Same room or unknown: head straight to player via BFS
          const pTile = this.map.worldToTile(ppos.x, ppos.y);
          const nextStep = this.findNextStep(eTile.tx, eTile.ty, pTile.tx, pTile.ty);
          if (nextStep) {
            const c = this.map.tileCenter(nextStep.tx, nextStep.ty);
            moveTarget = new Vector2(c.x, c.y);
          } else {
            const nearbyEmpty = this.findNearbyEmptyTile(epos);
            moveTarget = nearbyEmpty || epos;
          }
        }
      }

      const result = enemy.update(
        scaledDeltaTime,
        moveTarget,
        (from: Vector2, to: Vector2, radius: number) => this.map.collideCircle(from, to, radius)
      );
      
      // Add enemy bullets only when LOS is clear to player
      if (los) {
        result.bullets.forEach(bulletData => {
          this.bullets.push(new Bullet(
            bulletData.position,
            bulletData.velocity,
            bulletData.isEnemyBullet,
            undefined,
            (bulletData as any).ownerId
          ));
        });
      }
      
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
    
    // Update health pickups
    this.healthPickups.forEach(p => p.update(scaledDeltaTime));
    
    // Update ammo pickups
    this.ammoPickups.forEach(p => p.update(scaledDeltaTime));

    // Update grenades and handle explosions
    this.grenades = this.grenades.filter(grenade => {
      const exploded = grenade.update(scaledDeltaTime);
      
      if (exploded) {
        this.handleGrenadeExplosion(grenade);
        return false; // Remove grenade after explosion
      }
      
      return true; // Keep grenade
    });

    // Update thrown weapons
    this.thrownWeapons = this.thrownWeapons.filter(thrownWeapon => {
      thrownWeapon.update(scaledDeltaTime);
      return (
        thrownWeapon.position.x > -50 &&
        thrownWeapon.position.x < this.map.getPixelWidth() + 50 &&
        thrownWeapon.position.y > -50 &&
        thrownWeapon.position.y < this.map.getPixelHeight() + 50
      );
    });

    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.update(scaledDeltaTime);
      return particle.life > 0;
    });

    // Generate footstep particles from player
    const playerFootsteps = this.player.getFootstepParticles();
    playerFootsteps.forEach(fp => {
      this.footsteps.push(new Footstep(fp.x, fp.y));
    });

    // Generate footstep particles from enemies
    this.enemies.forEach(enemy => {
      const enemyFootsteps = enemy.getFootstepParticles();
      enemyFootsteps.forEach(fp => {
        this.footsteps.push(new Footstep(fp.x, fp.y));
      });
    });

    // Update footstep particles
    this.footsteps = this.footsteps.filter(footstep => {
      footstep.update(scaledDeltaTime);
      return !footstep.isDead();
    });

    // Spawn enemies continuously - keep the action going!
    this.enemySpawnTimer += scaledDeltaTime;
    const currentEnemies = this.enemies.length;
    const targetEnemies = this.enemiesPerWave;
    
    // Speed up spawning if we're behind on enemy count
    const adjustedSpawnRate = currentEnemies < Math.floor(targetEnemies * 0.5) 
      ? this.enemySpawnRate * 0.6 // Spawn faster if less than 50% of target enemies
      : this.enemySpawnRate;
    
    if (this.enemySpawnTimer >= adjustedSpawnRate && currentEnemies < Math.max(8, targetEnemies * 1.5)) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
      console.log(`⚔️ Enemy spawned (${currentEnemies + 1}) - Wave ${this.waveNumber}`);
    }

    // Spawn pickups occasionally - frequency and quality scale with waves
    this.weaponSpawnTimer += scaledDeltaTime;
    const pickupInterval = Math.max(3000, 12000 - (this.waveNumber * 800)); // Much more frequent at higher waves
    
    if (this.weaponSpawnTimer >= pickupInterval) {
      const pickupRoll = Math.random();
      
      // AGGRESSIVE pickup scaling - more health/ammo at higher waves
      const healthChance = Math.min(0.4, 0.05 + (this.waveNumber * 0.04));
      const ammoChance = healthChance + Math.min(0.35, 0.08 + (this.waveNumber * 0.03));
      const shieldChance = ammoChance + Math.min(0.4, 0.12 + (this.waveNumber * 0.025));
      
      if (pickupRoll < healthChance) {
        this.spawnHealthPickup();
      } else if (pickupRoll < ammoChance) {
        this.spawnAmmoPickup();
      } else if (pickupRoll < shieldChance) {
        this.spawnShieldPickup();
      } else {
        this.spawnWeaponPickup();
      }
      
      this.weaponSpawnTimer = 0;
      console.log(`📦 Pickup spawned at wave ${this.waveNumber} (next in ${pickupInterval}ms)`);
    }

    // Check for wave completion - advance immediately when kill target is reached
    if (this.enemiesKilledThisWave >= this.enemiesPerWave) {
      console.log(`🚀 WAVE ${this.waveNumber} → ${this.waveNumber + 1} ADVANCE! Killed ${this.enemiesKilledThisWave}/${this.enemiesPerWave} enemies`);
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
    // Update camera follow
    this.cameraX = Math.max(0, Math.min(this.map.getPixelWidth() - this.width, this.player.position.x - this.width / 2));
    this.cameraY = Math.max(0, Math.min(this.map.getPixelHeight() - this.height, this.player.position.y - this.height / 2));
  }

  private nextWave() {
    this.waveNumber++;
    this.enemiesKilledThisWave = 0;
    
    // SUPER FAST scaling - noticeable difficulty increase every wave
    this.enemiesPerWave = Math.min(25, 3 + Math.floor(this.waveNumber * 1.5));
    
    // Blazing fast spawning as waves progress
    this.enemySpawnRate = Math.max(150, this.baseSpawnRate - (this.waveNumber * 250));
    
    console.log(`🌊 WAVE ${this.waveNumber} START - Enemies: ${this.enemiesPerWave}, Spawn Rate: ${this.enemySpawnRate}ms`);
    
    this.onWaveUpdate?.(this.waveNumber);
    
    // Wave completion celebration particles
    for (let i = 0; i < 12; i++) {
      this.particles.push(new Particle(
        this.player.position.x + (Math.random() - 0.5) * 80,
        this.player.position.y + (Math.random() - 0.5) * 80,
        Math.random() * 360,
        120 + Math.random() * 180,
        this.waveNumber >= 10 ? '#ff4444' : this.waveNumber >= 5 ? '#ffaa00' : '#00ccff'
      ));
    }
    
    // Give player a grenade every wave
    this.player.addGrenades(1);
    console.log(`💣 +1 Grenade! Total: ${this.player.grenades}`);
    
    // Guaranteed weapon pickup at start of each wave
    this.spawnWeaponPickup();
    
    // Bonus pickups based on wave number
    if (this.waveNumber >= 3) {
      this.spawnShieldPickup();
    }
    if (this.waveNumber >= 5) {
      this.spawnAmmoPickup();
    }
    if (this.waveNumber >= 7 && this.waveNumber % 3 === 1) {
      this.spawnHealthPickup();
    }
    
    // Extra weapon every 5th wave
    if (this.waveNumber % 5 === 0) {
      setTimeout(() => {
        this.spawnWeaponPickup();
        console.log(`🎉 WAVE ${this.waveNumber} BONUS WEAPON!`);
      }, 1000);
    }
    
    // Reset weapon spawn timer for faster pickup spawning in higher waves
    this.weaponSpawnTimer = 0;
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
    // Bias spawns toward rooms nearer to the player for more encounters
    const rooms: any[] = (this.map as any).getRooms ? (this.map as any).getRooms() : [];
    let tile: { tx: number; ty: number } | null = null;
    if (rooms.length) {
      const ppos = this.player.position;
      // Sort rooms by distance to player center
      const ranked = rooms
        .map((r, idx) => ({ idx, cx: (r.x + r.w / 2) * (this.map as any).tileSize, cy: (r.y + r.h / 2) * (this.map as any).tileSize }))
        .map(r => ({ ...r, d2: (r.cx - ppos.x) * (r.cx - ppos.x) + (r.cy - ppos.y) * (r.cy - ppos.y) }))
        .sort((a, b) => a.d2 - b.d2);
      // Pick from nearest few rooms but avoid the player's current room most of the time
      const playerRoom = this.map.getRoomContaining(ppos.x, ppos.y);
      const playerRoomIndex = playerRoom ? rooms.indexOf(playerRoom) : -1;
      const candidates = ranked.filter(r => r.idx !== playerRoomIndex).slice(0, Math.min(4, ranked.length));
      const pick = (candidates.length && Math.random() < 0.7) ? candidates[Math.floor(Math.random() * candidates.length)] : ranked[Math.floor(Math.random() * Math.min(rooms.length, 6))];
      if (pick) {
        tile = this.map.getRandomEmptyTileInRoom(pick.idx);
      }
    }
    // Fallback to uniform random
    if (!tile) {
      let roomIndex = this.map.getRandomRoomIndex();
      if (roomIndex === null) return;
      tile = this.map.getRandomEmptyTileInRoom(roomIndex);
    }
    if (!tile) tile = this.map.getRandomEmptyTile(false);
    if (!tile) return;
    const { x, y } = this.map.tileCenter(tile.tx, tile.ty);

    // SUPER AGGRESSIVE difficulty scaling - visible progression every wave!
    const weaponChance = Math.min(0.98, 0.2 + (this.waveNumber * 0.15)); // Weapons scale fast
    const shieldChance = Math.min(0.9, 0.05 + (this.waveNumber * 0.12)); // Shields scale fast
    
    // Scale shield strength aggressively with wave number
    let shieldHits = 0;
    if (Math.random() < shieldChance) {
      if (this.waveNumber <= 2) {
        shieldHits = 1; // 1 shield hit early
      } else if (this.waveNumber <= 5) {
        shieldHits = 1 + Math.floor(Math.random() * 3); // 1-3 shield hits
      } else if (this.waveNumber <= 10) {
        shieldHits = 2 + Math.floor(Math.random() * 4); // 2-5 shield hits
      } else {
        shieldHits = 3 + Math.floor(Math.random() * 6); // 3-8 shield hits for insane waves
      }
    }
    
    const e = new Enemy(x, y, weaponChance, shieldHits);
    console.log(`👹 Enemy spawned: Wave ${this.waveNumber}, Weapon: ${(weaponChance * 100).toFixed(0)}%, Shield: ${shieldHits}`);
    // Assign a random enemy sprite if available
    if (this.enemySprites.length) {
      e.sprite = this.enemySprites[Math.floor(Math.random() * this.enemySprites.length)];
    }
    this.enemies.push(e);
  }

  private spawnWeaponPickup() {
    const weaponTypes = [WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.KATANA, WeaponType.SHURIKEN];
    const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    // Try to spawn on a table first, but place on the side for easier access
    const table = this.map.getRandomTable();
    if (table) {
      // Spawn on one of the four sides of the table with some offset
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      const offset = 25; // Distance from table edge
      
      switch (side) {
        case 0: // Top
          x = table.x + table.width / 2;
          y = table.y - offset;
          break;
        case 1: // Right
          x = table.x + table.width + offset;
          y = table.y + table.height / 2;
          break;
        case 2: // Bottom
          x = table.x + table.width / 2;
          y = table.y + table.height + offset;
          break;
        case 3: // Left
        default:
          x = table.x - offset;
          y = table.y + table.height / 2;
          break;
      }
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
      
      this.weaponPickups.push(new WeaponPickup(x, y, randomType));
      return;
    }
    
    // Fallback: spawn near a random door tile
    const doorTile = this.map.getRandomDoorTile();
    let x = this.map.getPixelWidth() / 2;
    let y = this.map.getPixelHeight() / 2;
    
    if (doorTile) {
      const center = this.map.tileCenter(doorTile.tx, doorTile.ty);
      // Spawn slightly offset from the door center
      const offsetDistance = 30 + Math.random() * 40; // 30-70 pixels away
      const offsetAngle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(offsetAngle) * offsetDistance;
      y = center.y + Math.sin(offsetAngle) * offsetDistance;
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
    }
    
    this.weaponPickups.push(new WeaponPickup(x, y, randomType));
  }

  private spawnShieldPickup() {
    // Try to spawn on a table first, but place on the side for easier access
    const table = this.map.getRandomTable();
    if (table) {
      // Spawn on one of the four sides of the table with some offset
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      const offset = 25; // Distance from table edge
      
      switch (side) {
        case 0: // Top
          x = table.x + table.width / 2;
          y = table.y - offset;
          break;
        case 1: // Right
          x = table.x + table.width + offset;
          y = table.y + table.height / 2;
          break;
        case 2: // Bottom
          x = table.x + table.width / 2;
          y = table.y + table.height + offset;
          break;
        case 3: // Left
        default:
          x = table.x - offset;
          y = table.y + table.height / 2;
          break;
      }
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
      
      this.shieldPickups.push(new ShieldPickup(x, y));
      return;
    }
    
    // Fallback: spawn near a random door tile
    const doorTile = this.map.getRandomDoorTile();
    let x = this.map.getPixelWidth() / 2;
    let y = this.map.getPixelHeight() / 2;
    
    if (doorTile) {
      const center = this.map.tileCenter(doorTile.tx, doorTile.ty);
      // Spawn slightly offset from the door center
      const offsetDistance = 30 + Math.random() * 40; // 30-70 pixels away
      const offsetAngle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(offsetAngle) * offsetDistance;
      y = center.y + Math.sin(offsetAngle) * offsetDistance;
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
    }
    
    this.shieldPickups.push(new ShieldPickup(x, y));
  }

  private spawnHealthPickup() {
    // Try to spawn on a table first, but place on the side for easier access
    const table = this.map.getRandomTable();
    if (table) {
      // Spawn on one of the four sides of the table with some offset
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      const offset = 25; // Distance from table edge
      
      switch (side) {
        case 0: // Top
          x = table.x + table.width / 2;
          y = table.y - offset;
          break;
        case 1: // Right
          x = table.x + table.width + offset;
          y = table.y + table.height / 2;
          break;
        case 2: // Bottom
          x = table.x + table.width / 2;
          y = table.y + table.height + offset;
          break;
        case 3: // Left
        default:
          x = table.x - offset;
          y = table.y + table.height / 2;
          break;
      }
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
      
      this.healthPickups.push(new HealthPickup(x, y));
      return;
    }
    
    // Fallback: spawn near a random door tile
    const doorTile = this.map.getRandomDoorTile();
    let x = this.map.getPixelWidth() / 2;
    let y = this.map.getPixelHeight() / 2;
    
    if (doorTile) {
      const center = this.map.tileCenter(doorTile.tx, doorTile.ty);
      // Spawn slightly offset from the door center
      const offsetDistance = 30 + Math.random() * 40; // 30-70 pixels away
      const offsetAngle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(offsetAngle) * offsetDistance;
      y = center.y + Math.sin(offsetAngle) * offsetDistance;
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
    }
    
    this.healthPickups.push(new HealthPickup(x, y));
  }

  private spawnAmmoPickup() {
    // Try to spawn on a table first, but place on the side for easier access
    const table = this.map.getRandomTable();
    if (table) {
      // Spawn on one of the four sides of the table with some offset
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      const offset = 25; // Distance from table edge
      
      switch (side) {
        case 0: // Top
          x = table.x + table.width / 2;
          y = table.y - offset;
          break;
        case 1: // Right
          x = table.x + table.width + offset;
          y = table.y + table.height / 2;
          break;
        case 2: // Bottom
          x = table.x + table.width / 2;
          y = table.y + table.height + offset;
          break;
        case 3: // Left
        default:
          x = table.x - offset;
          y = table.y + table.height / 2;
          break;
      }
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
      
      this.ammoPickups.push(new AmmoPickup(x, y));
      return;
    }
    
    // Fallback: spawn near a random door tile
    const doorTile = this.map.getRandomDoorTile();
    let x = this.map.getPixelWidth() / 2;
    let y = this.map.getPixelHeight() / 2;
    
    if (doorTile) {
      const center = this.map.tileCenter(doorTile.tx, doorTile.ty);
      // Spawn slightly offset from the door center
      const offsetDistance = 30 + Math.random() * 40; // 30-70 pixels away
      const offsetAngle = Math.random() * Math.PI * 2;
      x = center.x + Math.cos(offsetAngle) * offsetDistance;
      y = center.y + Math.sin(offsetAngle) * offsetDistance;
      
      // Ensure it's within world bounds
      x = Math.max(50, Math.min(this.map.getPixelWidth() - 50, x));
      y = Math.max(50, Math.min(this.map.getPixelHeight() - 50, y));
    }
    
    this.ammoPickups.push(new AmmoPickup(x, y));
  }

  private handleGrenadeExplosion(grenade: Grenade) {
    const explosionPos = grenade.position;
    const blastRadius = grenade.getBlastRadius();
    
    console.log(`💥 GRENADE EXPLOSION at (${explosionPos.x.toFixed(0)}, ${explosionPos.y.toFixed(0)}) - Radius: ${blastRadius}`);
    
    // Create massive explosion particles
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(
        explosionPos.x + (Math.random() - 0.5) * 40,
        explosionPos.y + (Math.random() - 0.5) * 40,
        Math.random() * 360,
        200 + Math.random() * 300,
        i < 10 ? '#ff4400' : '#ffaa00'
      ));
    }
    
    // Add shockwave particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = blastRadius * 0.8;
      this.particles.push(new Particle(
        explosionPos.x + Math.cos(angle) * distance,
        explosionPos.y + Math.sin(angle) * distance,
        angle * (180 / Math.PI),
        150 + Math.random() * 200,
        '#ffff88'
      ));
    }
    
    // Damage enemies in blast radius
    let enemiesKilled = 0;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const distance = explosionPos.distanceTo(enemy.position);
      
      if (distance <= blastRadius) {
        const damage = grenade.getDamageAtDistance(distance);
        console.log(`💥 Enemy hit by grenade: distance ${distance.toFixed(0)}, damage ${damage}`);
        
        // Grenades bypass shields and do massive damage
        if (damage >= 3 || enemy.shield === 0) {
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
          enemiesKilled++;
          this.onScoreUpdate?.(this.score);
        } else {
          // Reduce shield significantly
          enemy.shield = Math.max(0, enemy.shield - damage);
          console.log(`🛡️ Enemy shield reduced to ${enemy.shield}`);
        }
      }
    }
    
    // Damage player if too close (friendly fire!)
    const playerDistance = explosionPos.distanceTo(this.player.position);
    if (playerDistance <= blastRadius) {
      const playerDamage = grenade.getDamageAtDistance(playerDistance);
      if (playerDamage > 0) {
        console.log(`💥 PLAYER HIT BY OWN GRENADE! Distance: ${playerDistance.toFixed(0)}, Damage: ${playerDamage}`);
        
        // Player takes damage from their own grenade
        for (let i = 0; i < playerDamage; i++) {
          this.player.takeDamage();
        }
        
        // Visual feedback for player damage
        for (let k = 0; k < 8; k++) {
          this.particles.push(new Particle(
            this.player.position.x,
            this.player.position.y,
            Math.random() * 360,
            100 + Math.random() * 150,
            '#ff0000'
          ));
        }
        
        this.onHudUpdate?.();
      }
    }
    
    console.log(`💥 Grenade killed ${enemiesKilled} enemies`);
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
            (enemy as any).damageFlashTime = 150; // Add damage flash to enemy
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
            (enemy as any).damageFlashTime = 150; // Add damage flash to enemy
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
    
    // Player vs Health Pickups
    for (let i = this.healthPickups.length - 1; i >= 0; i--) {
      const pickup = this.healthPickups[i];
      if (pickup.position.distanceTo(this.player.position) < 30) {
        this.player.heal(25); // Heal 25 health
        this.healthPickups.splice(i, 1);
        // Health pickup particles
        for (let k = 0; k < 8; k++) {
          this.particles.push(new Particle(
            this.player.position.x,
            this.player.position.y,
            Math.random() * 360,
            100 + Math.random() * 120,
            '#ff4444'
          ));
        }
        this.onHudUpdate?.();
      }
    }
    
    // Player vs Ammo Pickups
    for (let i = this.ammoPickups.length - 1; i >= 0; i--) {
      const pickup = this.ammoPickups[i];
      if (pickup.position.distanceTo(this.player.position) < 30) {
        if (this.player.weapon && this.player.weapon.ammo < this.player.weapon.maxAmmo) {
          // Restore ammo to current weapon
          const ammoToAdd = Math.min(
            Math.floor(this.player.weapon.maxAmmo * 0.5), // 50% of max ammo
            this.player.weapon.maxAmmo - this.player.weapon.ammo
          );
          this.player.weapon.ammo += ammoToAdd;
          this.ammoPickups.splice(i, 1);
          
          // Ammo pickup particles
          for (let k = 0; k < 8; k++) {
            this.particles.push(new Particle(
              this.player.position.x,
              this.player.position.y,
              Math.random() * 360,
              100 + Math.random() * 120,
              '#ffaa00'
            ));
          }
          this.onHudUpdate?.();
        }
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
    // Clear canvas (lab floor tint for contrast)
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, this.width, this.height);

    // Prefer smooth scaling for sprites
    (ctx as any).imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    // Camera transform
    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // Render lab map
    this.map.render(ctx);

    // Render footstep particles (behind everything else)
    this.footsteps.forEach(footstep => footstep.render(ctx));

    // Render particles
    this.particles.forEach(particle => particle.render(ctx));

    // Render weapon pickups
    this.weaponPickups.forEach(pickup => pickup.render(ctx));

    // Render shield pickups
    this.shieldPickups.forEach(pickup => pickup.render(ctx));
    
    // Render health pickups
    this.healthPickups.forEach(pickup => pickup.render(ctx));
    
    // Render ammo pickups
    this.ammoPickups.forEach(pickup => pickup.render(ctx));
    
    // Render grenades
    this.grenades.forEach(grenade => grenade.render(ctx));

    // Render thrown weapons
    this.thrownWeapons.forEach(thrownWeapon => thrownWeapon.render(ctx));

    // Render bullets
    this.bullets.forEach(bullet => bullet.render(ctx));

    // Render enemies
    this.enemies.forEach(enemy => enemy.render(ctx, this.player.position));

    // Render player
    this.player.render(ctx, new Vector2(mouse.x + this.cameraX, mouse.y + this.cameraY));

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

    // Restore to screen space
    ctx.restore();

    // Time scale indicator
    if (this.timeScale < 1) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Grenade charge indicator
    if (this.grenadeCharging) {
      const chargeRatio = this.grenadeChargeTime / this.maxGrenadeCharge;
      const playerScreenX = this.player.position.x - this.cameraX;
      const playerScreenY = this.player.position.y - this.cameraY;
      
      // Draw charging arc around player
      ctx.save();
      ctx.strokeStyle = chargeRatio > 0.8 ? '#ff4444' : chargeRatio > 0.5 ? '#ffaa00' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      
      const radius = 25 + (chargeRatio * 15); // Grows from 25 to 40 pixels
      const arcLength = chargeRatio * Math.PI * 2; // Full circle at max charge
      
      ctx.beginPath();
      ctx.arc(playerScreenX, playerScreenY, radius, -Math.PI / 2, -Math.PI / 2 + arcLength, false);
      ctx.stroke();
      
      // Add pulsing effect at high charge
      if (chargeRatio > 0.7) {
        const pulseAlpha = Math.sin(Date.now() * 0.01) * 0.3 + 0.4;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(playerScreenX, playerScreenY, radius + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      
      // Draw trajectory preview line
      const worldMouseX = mouse.x + this.cameraX;
      const worldMouseY = mouse.y + this.cameraY;
      const direction = new Vector2(worldMouseX - this.player.position.x, worldMouseY - this.player.position.y).normalize();
      
      // Estimate trajectory length based on charge
      const trajectoryLength = 50 + (chargeRatio * 150); // 50-200 pixel preview
      const endX = playerScreenX + (direction.x * trajectoryLength);
      const endY = playerScreenY + (direction.y * trajectoryLength);
      
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(playerScreenX, playerScreenY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }

    // Minimap is drawn in the HUD panel via Game.renderMinimap
  }

  reset() {
    // Spawn player in a safe location (spawn tiles first, then room centers, then doors as fallback)
    let spawnTile = this.map.getRandomSpawnTile(); // Try spawn tiles first (room centers)
    
    if (!spawnTile) {
      // Fallback: try to spawn in center of a room
      const rooms = this.map.getRooms();
      if (rooms.length > 0) {
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        spawnTile = this.map.getRandomEmptyTileInRoom(rooms.indexOf(room));
      }
    }
    
    if (!spawnTile) {
      // Last resort: use a random empty tile (safer than doors)
      spawnTile = this.map.getRandomEmptyTile(false);
    }
    
    if (!spawnTile) {
      // Emergency fallback: door tile if nothing else works
      spawnTile = this.map.getRandomDoorTile();
    }
    
    if (!spawnTile) {
      throw new Error('CRITICAL: No safe spawn location found!');
    }
    
    const spawnPos = this.map.tileCenter(spawnTile.tx, spawnTile.ty);
    this.player = new Player(spawnPos.x, spawnPos.y);
    
    // Re-assign sprite if we have sprites loaded
    if (this.playableSprites.length > 0) {
      (this.player as any).sprite = this.playableSprites[0];
    }
    
    // Clear everything first
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.footsteps = [];
    this.weaponPickups = [];
    this.shieldPickups = [];
    this.healthPickups = [];
    this.ammoPickups = [];
    this.thrownWeapons = [];
    this.grenades = [];
    this.score = 0;
    this.waveNumber = 1;
    this.enemiesKilledThisWave = 0;
    this.enemiesPerWave = 4; // Start with 4 enemies for wave 1
    this.enemySpawnTimer = 0;
    this.enemySpawnRate = this.baseSpawnRate;
    this.weaponSpawnTimer = 0;
    
    console.log(`🎮 GAME RESET - Starting Wave 1 with ${this.enemiesPerWave} enemies`);
    
    // Reset grenade charging state
    this.grenadeCharging = false;
    this.grenadeChargeTime = 0;
    
    // Force spawn initial enemies for wave 1 immediately on reset  
    console.log(`🔄 GAME RESET - Spawning ${this.enemiesPerWave} initial enemies for Wave 1`);
    for (let i = 0; i < Math.min(3, this.enemiesPerWave); i++) {
      setTimeout(() => {
        this.spawnEnemy();
        console.log(`🚀 Reset enemy ${i + 1} spawned`);
      }, i * 500); // Spawn one every 500ms
    }
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

  // Find a door to a specific room
  private findDoorToRoom(targetRoom: any): Vector2 | null {
    if (!targetRoom || !targetRoom.doors || targetRoom.doors.length === 0) return null;
    
    // Find the closest door to the player
    let closestDoor = null;
    let closestDistance = Infinity;
    
    for (const door of targetRoom.doors) {
      const doorWorldX = door.x * (this.map as any).tileSize + (this.map as any).tileSize / 2;
      const doorWorldY = door.y * (this.map as any).tileSize + (this.map as any).tileSize / 2;
      const distance = this.player.position.distanceTo(new Vector2(doorWorldX, doorWorldY));
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestDoor = new Vector2(doorWorldX, doorWorldY);
      }
    }
    
    return closestDoor;
  }
  
  // Choose the closest door tile of a room from a given starting tile
  private findClosestDoorTile(targetRoom: any, fromTile: { tx: number; ty: number }): { tx: number; ty: number } | null {
    if (!targetRoom || !targetRoom.doors || !(targetRoom.doors as any[]).length) return null;
    let best: { tx: number; ty: number } | null = null;
    let bestDist = Infinity;
    for (const door of targetRoom.doors as Array<{ x: number; y: number }>) {
      const d = Math.abs(door.x - fromTile.tx) + Math.abs(door.y - fromTile.ty);
      if (d < bestDist) {
        bestDist = d;
        best = { tx: door.x, ty: door.y };
      }
    }
    return best;
  }
  
  // Find a nearby empty tile to move to
  private findNearbyEmptyTile(position: Vector2): Vector2 | null {
    const currentTile = this.map.worldToTile(position.x, position.y);
    
    // Check adjacent tiles
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    for (const [dx, dy] of directions) {
      const tx = currentTile.tx + dx;
      const ty = currentTile.ty + dy;
      const tile = (this.map as any).get(tx, ty);
      
      if (tile === 'empty' || tile === 'door') {
        const center = this.map.tileCenter(tx, ty);
        return new Vector2(center.x, center.y);
      }
    }
    
    return null;
  }

  // BFS pathfinding to find next step toward target
  private findNextStep(fromX: number, fromY: number, toX: number, toY: number): { tx: number; ty: number } | null {
    const cols = (this.map as any).cols;
    const rows = (this.map as any).rows;
    
    // Early exit if target is the same as start
    if (fromX === toX && fromY === toY) return null;
    
    // BFS setup
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number; parent: { x: number; y: number } | null }> = [];
    queue.push({ x: fromX, y: fromY, parent: null });
    visited.add(`${fromX},${fromY}`);
    
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // If we reached the target, backtrack to find first step
      if (current.x === toX && current.y === toY) {
        // Backtrack to find the first step from the start node
        let step = current;
        while (step.parent && !(step.parent.x === fromX && step.parent.y === fromY)) {
          step = step.parent as any;
        }
        return { tx: step.x, ty: step.y };
      }
      
      // Explore neighbors
      for (const [dx, dy] of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        
        // Skip if out of bounds, already visited, or blocked
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || visited.has(key)) {
          continue;
        }
        
        const tile = (this.map as any).get(nx, ny);
        if (tile !== 'empty' && tile !== 'door') continue;
        
        visited.add(key);
        queue.push({ x: nx, y: ny, parent: current });
      }
    }
    
    return null; // No path found
  }

  // Friendly room label for HUD
  public getPlayerRoomLabel(): string {
    const room = this.map.getRoomContaining(this.player.position.x, this.player.position.y);
    if (!room) return 'Hallway';
    const t = (room as any).type as string;
    switch (t) {
      case 'medbay': return 'Medbay';
      case 'animal_testing': return 'Animal Testing';
      case 'research': return 'Research';
      case 'storage': return 'Storage';
      case 'security': return 'Security';
      case 'command': return 'Command';
      default: return 'Room';
    }
  }

  // Render a simple minimap showing dots and walls
  public renderMinimap(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const tileSize = (this.map as any).tileSize;
    const cols = (this.map as any).cols;
    const rows = (this.map as any).rows;
    
    // Calculate scale to fit minimap
    const scaleX = width / (cols * tileSize);
    const scaleY = height / (rows * tileSize);
    const scale = Math.min(scaleX, scaleY);
    
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Render tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = (this.map as any).get(x, y);
        const px = x * tileSize * scale;
        const py = y * tileSize * scale;
        const size = tileSize * scale;
        
        if (tile === 'wall') {
          ctx.fillStyle = '#666666';
          ctx.fillRect(px, py, size, size);
        } else {
          // Don't distinguish doors - treat them as regular walkable space
          ctx.fillStyle = '#222222';
          ctx.fillRect(px, py, size, size);
        }
      }
    }
    
    // Render player as green dot
    const playerX = this.player.position.x * scale;
    const playerY = this.player.position.y * scale;
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Render enemies as red dots
    ctx.fillStyle = '#ff0000';
    for (const enemy of this.enemies) {
      const enemyX = enemy.position.x * scale;
      const enemyY = enemy.position.y * scale;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
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
