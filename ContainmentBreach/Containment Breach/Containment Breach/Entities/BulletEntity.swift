import SpriteKit

final class BulletEntity: SKShapeNode {
    var velocity = Vector2.zero
    var damage: CGFloat = 0
    var ownerIsPlayer: Bool = true
    var lifetime: CGFloat = 0

    convenience init(radius: CGFloat) {
        self.init(circleOfRadius: radius)
        fillColor = .yellow
        strokeColor = .clear
    }
}
