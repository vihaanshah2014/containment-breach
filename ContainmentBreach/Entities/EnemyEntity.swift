import SpriteKit

enum EnemyType: CaseIterable {
    case grunt
    case brute
    case runner
}

final class EnemyEntity: SKNode {
    let sprite: SKSpriteNode
    let type: EnemyType
    var radius: CGFloat
    var speed: CGFloat
    var health: CGFloat
    var damage: CGFloat
    var attackCooldown: CGFloat
    var attackTimer: CGFloat = 0

    init(type: EnemyType) {
        self.type = type
        switch type {
        case .grunt:
            radius = 20
            speed = 160
            health = 80
            damage = 12
            attackCooldown = 0.9
        case .brute:
            radius = 28
            speed = 90
            health = 220
            damage = 24
            attackCooldown = 1.4
        case .runner:
            radius = 16
            speed = 240
            health = 50
            damage = 10
            attackCooldown = 0.6
        }
        sprite = SKSpriteNode(color: .red, size: CGSize(width: radius * 2, height: radius * 2))
        super.init()
        addChild(sprite)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
