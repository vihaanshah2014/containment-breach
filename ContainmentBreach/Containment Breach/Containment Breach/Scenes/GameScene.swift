import SpriteKit
import SwiftUI

final class GameScene: SKScene {
    private var tileMap: TileMap!
    private let worldNode = SKNode()
    private let player = PlayerEntity(texture: nil)
    private var enemies: [EnemyEntity] = []
    private var bullets: [BulletEntity] = []
    private var pickups: [PickupEntity] = []
    private var stats = GameStats()

    private var moveJoystick: JoystickNode!
    private var aimJoystick: JoystickNode!
    private var shootButton: SKLabelNode!
    private var grenadeButton: SKLabelNode!

    private var lastUpdateTime: TimeInterval = 0
    private var enemySpawnTimer: CGFloat = 0
    private var difficultyTimer: CGFloat = 0
    private var weaponSpawnTimer: CGFloat = 10
    private var grenadeCooldown: CGFloat = 0
    private var waveNumber: Int = 1
    private var enemiesKilledThisWave = 0
    private var enemiesPerWave = 7
    private var score: Int = 0

    private var healthLabel = SKLabelNode()
    private var ammoLabel = SKLabelNode()
    private var waveLabel = SKLabelNode()
    private var scoreLabel = SKLabelNode()
    
    private var hudSetup = false

    override func sceneDidLoad() {
        print("Starting sceneDidLoad...")
        backgroundColor = .black
        addChild(worldNode)
        
        print("Creating joysticks...")
        moveJoystick = JoystickNode(radius: 80, color: .green)
        aimJoystick = JoystickNode(radius: 80, color: .red)
        print("Joysticks created: moveJoystick=\(moveJoystick != nil), aimJoystick=\(aimJoystick != nil)")
        
        print("Creating buttons...")
        shootButton = SKLabelNode(text: "FIRE")
        shootButton.fontName = "Menlo-Bold"
        shootButton.fontSize = 20
        shootButton.fontColor = .white
        shootButton.name = "shoot"

        grenadeButton = SKLabelNode(text: "GRENADE")
        grenadeButton.fontName = "Menlo-Bold"
        grenadeButton.fontSize = 16
        grenadeButton.fontColor = .cyan
        grenadeButton.name = "grenade"
        
        print("Buttons created: shootButton=\(shootButton != nil), grenadeButton=\(grenadeButton != nil)")

        print("Adding UI elements to scene...")
        addChild(moveJoystick)
        addChild(aimJoystick)
        addChild(shootButton)
        addChild(grenadeButton)
        print("UI elements added successfully")

        print("Creating tilemap...")
        tileMap = TileMap(width: size.width * 2.5, height: size.height * 2.5)
        layoutTileMap()

        print("Positioning player...")
        if let spawnTile = tileMap.randomSpawnTile() {
            player.position = tileMap.tileCenter(spawnTile)
            print("Player positioned at spawn: \(player.position)")
        } else {
            player.position = CGPoint(x: tileMap.tileSize * 4, y: tileMap.tileSize * 4)
            print("Player positioned at default: \(player.position)")
        }
        // Player is already added to worldNode in layoutTileMap()
        print("Player added to worldNode, player color: \(player.sprite.color)")
        
        // Scene size should be set by GameView
        print("Scene size in sceneDidLoad: \(size)")
        
        // Temporarily disable camera for debugging
        // Position world node at origin for now
        worldNode.position = CGPoint(x: 0, y: 0)
        print("WorldNode positioned at: \(worldNode.position)")
        
        setupHUD()
        
        // Add a simple test rectangle to see if ANYTHING renders
        print("Adding test rectangle...")
        print("Scene size when adding test elements: \(size)")
        
        // CENTER OF SCENE in SpriteKit
        let centerX = size.width / 2
        let centerY = size.height / 2
        print("Scene center: (\(centerX), \(centerY))")
        
        // Make rectangle fill most of the screen
        let testRect = SKShapeNode(rectOf: CGSize(width: size.width * 0.8, height: size.height * 0.6))
        testRect.fillColor = .red
        testRect.strokeColor = .white
        testRect.lineWidth = 10
        testRect.position = CGPoint(x: centerX, y: centerY) // ACTUAL center
        testRect.zPosition = 1000 // Put it on top of everything
        addChild(testRect) // Add directly to scene, not worldNode
        print("Test rectangle added at: \(testRect.position) with size: \(testRect.frame.size)")
        
        // Add multiple test labels to see positioning
        let testLabel = SKLabelNode(text: "CONTAINMENT")
        testLabel.fontSize = min(size.width, size.height) * 0.15 // Bigger font
        testLabel.fontColor = .yellow
        testLabel.position = CGPoint(x: centerX, y: centerY + 50)
        testLabel.zPosition = 1001
        addChild(testLabel) // Add directly to scene
        print("Test label 1 added at: \(testLabel.position)")
        
        let testLabel2 = SKLabelNode(text: "BREACH")
        testLabel2.fontSize = min(size.width, size.height) * 0.15
        testLabel2.fontColor = .cyan
        testLabel2.position = CGPoint(x: centerX, y: centerY - 50)
        testLabel2.zPosition = 1001
        addChild(testLabel2)
        print("Test label 2 added at: \(testLabel2.position)")
        
        // Spawn some initial enemies for visibility
        print("Spawning initial enemies...")
        for _ in 0..<3 {
            spawnEnemy()
        }
        print("Initial enemies spawned: \(enemies.count)")
    }

    private func setupHUD() {
        // Prevent multiple HUD setup calls
        guard !hudSetup else { 
            print("HUD already set up, skipping...")
            return 
        }
        
        // Ensure scene has valid size
        guard size.width > 0 && size.height > 0 else { return }
        
        // UI elements should be initialized by now
        print("Setting up HUD with scene size: \(size)")
        print("Checking UI elements: moveJoystick=\(moveJoystick != nil), aimJoystick=\(aimJoystick != nil)")
        
        // Safety check for joysticks
        guard moveJoystick != nil, aimJoystick != nil, shootButton != nil, grenadeButton != nil else {
            print("ERROR: UI elements are nil!")
            return
        }
        
        let hudY = -size.height / 2 + 80
        print("Setting joystick positions...")
        moveJoystick.position = CGPoint(x: -size.width / 2 + 120, y: hudY)
        aimJoystick.position = CGPoint(x: size.width / 2 - 120, y: hudY)
        shootButton.position = CGPoint(x: size.width / 2 - 120, y: hudY + 140)
        grenadeButton.position = CGPoint(x: size.width / 2 - 120, y: hudY + 90)

        print("Configuring labels...")
        // Configure labels with safe font
        [healthLabel, ammoLabel, waveLabel, scoreLabel].forEach { label in
            label.fontName = "Menlo"
            label.fontSize = 16
            label.fontColor = .white
        }
        
        print("Setting label positions...")
        healthLabel.position = CGPoint(x: -size.width / 2 + 140, y: size.height / 2 - 50)
        ammoLabel.position = CGPoint(x: healthLabel.position.x, y: healthLabel.position.y - 24)
        waveLabel.position = CGPoint(x: healthLabel.position.x, y: healthLabel.position.y - 48)
        scoreLabel.position = CGPoint(x: healthLabel.position.x, y: healthLabel.position.y - 72)

        print("Adding labels to scene...")
        // Only add labels if they don't already have a parent
        if healthLabel.parent == nil { addChild(healthLabel) }
        if ammoLabel.parent == nil { addChild(ammoLabel) }
        if waveLabel.parent == nil { addChild(waveLabel) }
        if scoreLabel.parent == nil { addChild(scoreLabel) }
        
        print("Calling updateHUD...")
        updateHUD()
        
        // Mark HUD as set up
        hudSetup = true
        print("HUD setup completed!")
    }

    private func layoutTileMap() {
        worldNode.removeAllChildren()
        worldNode.addChild(player)
        let tileNode = SKNode()
        for y in 0 ..< tileMap.rows {
            for x in 0 ..< tileMap.cols {
                let tile = tileMap.tile(at: x, y: y)
                let rect = CGRect(x: CGFloat(x) * tileMap.tileSize,
                                  y: CGFloat(y) * tileMap.tileSize,
                                  width: tileMap.tileSize,
                                  height: tileMap.tileSize)
                let color: SKColor
                switch tile {
                case .empty: color = SKColor(white: 0.1, alpha: 1)
                case .wall: color = SKColor(white: 0.3, alpha: 1)
                case .glass: color = SKColor(white: 0.6, alpha: 0.8)
                case .door: color = SKColor(red: 0.5, green: 0.3, blue: 0.1, alpha: 1)
                case .spawn: color = SKColor(red: 0.2, green: 0.5, blue: 0.2, alpha: 1)
                }
                let node = SKShapeNode(rect: rect)
                node.fillColor = color
                node.strokeColor = .clear
                tileNode.addChild(node)
            }
        }
        worldNode.addChild(tileNode)
        worldNode.zPosition = -10
    }

    override func didChangeSize(_ oldSize: CGSize) {
        super.didChangeSize(oldSize)
        setupHUD()
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        if let node = nodes(at: location).first(where: { $0.name == "shoot" }) {
            fireCurrentWeapon()
            shootButton.run(SKAction.sequence([SKAction.scale(to: 1.2, duration: 0.05), SKAction.scale(to: 1.0, duration: 0.05)]))
        } else if let node = nodes(at: location).first(where: { $0.name == "grenade" }) {
            throwGrenade()
            grenadeButton.run(SKAction.sequence([SKAction.scale(to: 1.2, duration: 0.05), SKAction.scale(to: 1.0, duration: 0.05)]))
        }
    }

    override func update(_ currentTime: TimeInterval) {
        if lastUpdateTime == 0 { lastUpdateTime = currentTime }
        let delta = min(1 / 30, currentTime - lastUpdateTime)
        lastUpdateTime = currentTime

        updatePlayer(delta: delta)
        updateEnemies(delta: delta)
        updateBullets(delta: delta)
        updatePickups(delta: delta)
        updateSpawning(delta: delta)
        updateHUD()

        if player.isDead {
            presentGameOver()
        }
    }

    private func updatePlayer(delta: TimeInterval) {
        let move = moveJoystick.value
        let desired = Vector2(move.x, move.y)
        var velocity = desired * player.moveSpeed
        if desired.length > 1 { velocity = desired.normalized * player.moveSpeed }

        let newPosition = CGPoint(x: player.position.x + velocity.x * delta,
                                  y: player.position.y + velocity.y * delta)
        let clamped = tileMap.collideCircle(from: player.position, to: newPosition, radius: player.radius)
        player.position = clamped

        if aimJoystick.value.length > 0.1 {
            player.aimDirection = aimJoystick.value
        }

        if player.weapon.isReloading {
            player.weapon.update(delta: delta)
        }

        camera?.position = player.position
        worldNode.position = CGPoint(x: -player.position.x, y: -player.position.y)
        moveJoystick.position = CGPoint(x: -size.width / 2 + 120, y: -size.height / 2 + 80)
        aimJoystick.position = CGPoint(x: size.width / 2 - 120, y: -size.height / 2 + 80)
        shootButton.position = CGPoint(x: size.width / 2 - 120, y: -size.height / 2 + 220)
        grenadeButton.position = CGPoint(x: size.width / 2 - 120, y: -size.height / 2 + 170)

        if grenadeCooldown > 0 { grenadeCooldown -= delta }

        if aimJoystick.isTracking && player.weapon.canFire(now: lastUpdateTime) {
            fireCurrentWeapon()
        }
    }

    private func fireCurrentWeapon() {
        let now = lastUpdateTime
        guard player.weapon.canFire(now: now) else {
            if !player.weapon.isReloading { player.weapon.startReload() }
            return
        }

        player.weapon.lastFireTime = now
        stats.bulletsFired += 1

        if player.weapon.type == .katana {
            performKatanaSwing()
            return
        }

        let baseDirection = player.aimDirection.normalized
        for _ in 0 ..< max(1, player.weapon.burstCount) {
            let spread = CGFloat.random(in: -player.weapon.spread ... player.weapon.spread)
            let radians = spread * .pi / 180
            let dir = Vector2(
                baseDirection.x * cos(radians) - baseDirection.y * sin(radians),
                baseDirection.x * sin(radians) + baseDirection.y * cos(radians)
            ).normalized

            let bullet = BulletEntity(radius: 4)
            bullet.position = CGPoint(x: player.position.x + dir.x * (player.radius + 10),
                                      y: player.position.y + dir.y * (player.radius + 10))
            bullet.velocity = dir * player.weapon.projectileSpeed
            bullet.damage = player.weapon.projectileDamage
            bullet.ownerIsPlayer = true
            bullet.lifetime = 1.6
            worldNode.addChild(bullet)
            bullets.append(bullet)
        }
        player.weapon.consumeAmmo()
        if player.weapon.ammo == 0 { player.weapon.startReload() }
    }

    private func performKatanaSwing() {
        let radius = player.radius + 60
        for enemy in enemies {
            let distance = hypot(enemy.position.x - player.position.x, enemy.position.y - player.position.y)
            if distance <= radius {
                enemy.health -= player.weapon.projectileDamage
                stats.weaponKills[.katana, default: 0] += enemy.health <= 0 ? 1 : 0
                if enemy.health <= 0 {
                    score += 100
                    enemy.removeFromParent()
                }
            }
        }
        enemies.removeAll { $0.health <= 0 }
    }

    private func updateEnemies(delta: TimeInterval) {
        for enemy in enemies {
            let direction = Vector2(player.position.x - enemy.position.x, player.position.y - enemy.position.y)
            let desired = direction.normalized
            let movement = desired * enemy.moveSpeed
            let next = CGPoint(x: enemy.position.x + movement.x * delta,
                               y: enemy.position.y + movement.y * delta)
            enemy.position = tileMap.collideCircle(from: enemy.position, to: next, radius: enemy.radius)

            let distance = hypot(player.position.x - enemy.position.x, player.position.y - enemy.position.y)
            enemy.attackTimer -= delta
            if distance < player.radius + enemy.radius + 8 && enemy.attackTimer <= 0 {
                player.applyDamage(enemy.damage)
                enemy.attackTimer = enemy.attackCooldown
            }
        }
        enemies.removeAll { enemy in
            if enemy.health <= 0 {
                stats.weaponKills[player.weapon.type, default: 0] += 1
                score += 100
                enemy.removeFromParent()
                enemiesKilledThisWave += 1
                return true
            }
            return false
        }
    }

    private func updateBullets(delta: TimeInterval) {
        for bullet in bullets {
            let next = CGPoint(x: bullet.position.x + bullet.velocity.x * delta,
                               y: bullet.position.y + bullet.velocity.y * delta)
            bullet.position = next
            bullet.lifetime -= delta

            if bullet.ownerIsPlayer {
                for enemy in enemies {
                    if enemy.frame.insetBy(dx: -bullet.frame.width, dy: -bullet.frame.height).contains(bullet.position) {
                        enemy.health -= bullet.damage
                        stats.bulletsHit += 1
                        bullet.lifetime = 0
                        break
                    }
                }
            } else {
                if hypot(player.position.x - bullet.position.x, player.position.y - bullet.position.y) < player.radius + 8 {
                    player.applyDamage(bullet.damage)
                    bullet.lifetime = 0
                }
            }
        }
        bullets.removeAll { bullet in
            let tile = tileMap.worldToTile(bullet.position)
            if tileMap.tile(at: tile.x, y: tile.y) == .wall { bullet.removeFromParent(); return true }
            if bullet.lifetime <= 0 { bullet.removeFromParent(); return true }
            return false
        }
    }

    private func updatePickups(delta: TimeInterval) {
        for pickup in pickups {
            if pickup.frame.contains(player.position) {
                consume(pickup: pickup)
            }
        }
        pickups.removeAll { pickup in
            if pickup.parent == nil { return true }
            return false
        }
    }

    private func consume(pickup: PickupEntity) {
        switch pickup.type {
        case let .health(amount):
            player.health = min(player.maxHealth, player.health + amount)
        case let .shield(amount):
            player.shield = min(player.maxShield, player.shield + amount)
        case let .ammo(weapon, amount):
            if player.weapon.type == weapon {
                player.weapon.ammo = min(player.weapon.maxAmmo, player.weapon.ammo + amount)
            }
        case let .weapon(type):
            player.weapon = Weapon(type: type)
        case .grenade:
            player.grenades += 1
        }
        pickup.removeFromParent()
    }

    private func updateSpawning(delta: TimeInterval) {
        enemySpawnTimer -= delta
        difficultyTimer += delta
        weaponSpawnTimer -= delta

        if enemySpawnTimer <= 0 {
            spawnEnemy()
            enemySpawnTimer = max(0.8, 1.6 - CGFloat(waveNumber) * 0.1)
        }

        if weaponSpawnTimer <= 0 {
            spawnPickup()
            weaponSpawnTimer = CGFloat.random(in: 14 ... 22)
        }

        if enemiesKilledThisWave >= enemiesPerWave {
            waveNumber += 1
            enemiesPerWave = Int(Double(enemiesPerWave) * 1.4)
            enemiesKilledThisWave = 0
        }
    }

    private func spawnEnemy() {
        guard let tile = tileMap.randomSpawnTile() else { return }
        let position = tileMap.tileCenter(tile)
        let type: EnemyType
        let roll = CGFloat.random(in: 0 ... 1)
        if roll < 0.6 {
            type = .grunt
        } else if roll < 0.85 {
            type = .runner
        } else {
            type = .brute
        }
        let enemy = EnemyEntity(type: type)
        enemy.position = position
        worldNode.addChild(enemy)
        enemies.append(enemy)
    }

    private func spawnPickup() {
        let roll = CGFloat.random(in: 0 ... 1)
        let pickup: PickupEntity
        if roll < 0.3 {
            pickup = PickupEntity(type: .health(amount: 30))
        } else if roll < 0.55 {
            pickup = PickupEntity(type: .shield(amount: 40))
        } else if roll < 0.75 {
            pickup = PickupEntity(type: .ammo(weapon: player.weapon.type, amount: 10))
        } else if roll < 0.9 {
            pickup = PickupEntity(type: .weapon(type: WeaponType.allCases.randomElement() ?? .pistol))
        } else {
            pickup = PickupEntity(type: .grenade)
        }
        if let tile = tileMap.randomSpawnTile() {
            pickup.position = tileMap.tileCenter(tile)
            worldNode.addChild(pickup)
            pickups.append(pickup)
        }
    }

    private func throwGrenade() {
        guard grenadeCooldown <= 0, player.grenades > 0 else { return }
        let direction = player.aimDirection.normalized
        let grenade = BulletEntity(radius: 8)
        grenade.fillColor = .cyan
        grenade.position = player.position
        grenade.velocity = direction * 500
        grenade.damage = 0
        grenade.ownerIsPlayer = true
        grenade.lifetime = 1.2
        worldNode.addChild(grenade)
        bullets.append(grenade)
        grenadeCooldown = 2.5
        player.grenades -= 1

        let explosion = SKAction.run { [weak self, weak grenade] in
            guard let self = self, let grenade = grenade else { return }
            self.explode(at: grenade.position)
            grenade.removeFromParent()
        }
        let wait = SKAction.wait(forDuration: 1.2)
        run(SKAction.sequence([wait, explosion]))
    }

    private func explode(at position: CGPoint) {
        let blastRadius: CGFloat = 160
        for enemy in enemies {
            let distance = hypot(enemy.position.x - position.x, enemy.position.y - position.y)
            if distance <= blastRadius {
                enemy.health -= 120 * (1 - distance / blastRadius)
                if enemy.health <= 0 {
                    stats.thrownKills += 1
                    score += 150
                    enemy.removeFromParent()
                }
            }
        }
        enemies.removeAll { $0.health <= 0 }
    }

    private func updateHUD() {
        healthLabel.text = "HP: \(Int(player.health))/\(Int(player.maxHealth)) Shield: \(Int(player.shield))"
        ammoLabel.text = "Weapon: \(player.weapon.type.rawValue.capitalized) Ammo: \(player.weapon.ammo)"
        waveLabel.text = "Wave: \(waveNumber) Enemies: \(enemies.count)"
        scoreLabel.text = "Score: \(score)"
    }

    private func presentGameOver() {
        isPaused = true
        let overlay = SKShapeNode(rectOf: CGSize(width: size.width * 0.8, height: size.height * 0.6), cornerRadius: 20)
        overlay.fillColor = SKColor(white: 0, alpha: 0.7)
        overlay.strokeColor = .white
        overlay.zPosition = 100
        overlay.name = "gameover"

        let title = SKLabelNode(text: "Containment Breach")
        title.fontName = "Menlo-Bold"
        title.fontSize = 32
        title.position = CGPoint(x: 0, y: 80)

        let summary = SKLabelNode(text: "Wave \(waveNumber) Score \(score)")
        summary.fontName = "Menlo"
        summary.fontSize = 20
        summary.position = CGPoint(x: 0, y: 30)

        let statsLabel = SKLabelNode(text: "Kills: \(stats.enemiesKilled) Accuracy: \(accuracy)%")
        statsLabel.fontName = "Menlo"
        statsLabel.fontSize = 20
        statsLabel.position = CGPoint(x: 0, y: -10)

        overlay.addChild(title)
        overlay.addChild(summary)
        overlay.addChild(statsLabel)
        addChild(overlay)
    }

    private var accuracy: Int {
        guard stats.bulletsFired > 0 else { return 0 }
        return Int((Double(stats.bulletsHit) / Double(stats.bulletsFired)) * 100)
    }
}
