import SpriteKit

enum PickupType {
    case health(amount: CGFloat)
    case shield(amount: CGFloat)
    case ammo(weapon: WeaponType, amount: Int)
    case weapon(type: WeaponType)
    case grenade
}

final class PickupEntity: SKSpriteNode {
    let type: PickupType
    init(type: PickupType) {
        self.type = type
        let size = CGSize(width: 32, height: 32)
        super.init(texture: nil, color: .cyan, size: size)
        switch type {
        case .health:
            color = .green
        case .shield:
            color = .blue
        case let .ammo(_, amount):
            color = amount > 0 ? .orange : .brown
        case .weapon:
            color = .purple
        case .grenade:
            color = .gray
        }
        self.name = "pickup"
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
