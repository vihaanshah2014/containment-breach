import SpriteKit

final class PlayerEntity: SKNode {
    let sprite: SKSpriteNode
    var velocity = Vector2.zero
    var moveSpeed: CGFloat = 240
    var radius: CGFloat = 24
    var health: CGFloat = 100
    var maxHealth: CGFloat = 100
    var shield: CGFloat = 0
    var maxShield: CGFloat = 100
    var weapon: Weapon
    var grenades: Int = 3
    var aimDirection = Vector2(1, 0)
    var footstepsTimer: CGFloat = 0

    init(texture: SKTexture?) {
        sprite = SKSpriteNode(texture: texture, color: .white, size: CGSize(width: 48, height: 48))
        weapon = Weapon(type: .pistol)
        super.init()
        addChild(sprite)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func applyDamage(_ amount: CGFloat) {
        var remaining = amount
        if shield > 0 {
            let absorbed = min(shield, remaining)
            shield -= absorbed
            remaining -= absorbed
        }
        if remaining > 0 {
            health = max(0, health - remaining)
        }
    }

    var isDead: Bool { health <= 0 }
}
