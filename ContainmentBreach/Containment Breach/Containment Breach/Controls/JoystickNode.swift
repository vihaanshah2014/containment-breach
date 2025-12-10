import SpriteKit

final class JoystickNode: SKNode {
    private let base: SKShapeNode
    private let knob: SKShapeNode
    private let radius: CGFloat
    private(set) var value = Vector2.zero
    var isTracking = false

    init(radius: CGFloat, color: SKColor) {
        self.radius = radius
        base = SKShapeNode(circleOfRadius: radius)
        base.fillColor = color.withAlphaComponent(0.25)
        base.strokeColor = .clear

        knob = SKShapeNode(circleOfRadius: radius * 0.4)
        knob.fillColor = color
        knob.strokeColor = .clear

        super.init()
        addChild(base)
        addChild(knob)
        isUserInteractionEnabled = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else { return }
        let location = touch.location(in: self)
        if base.contains(location) {
            updateKnob(at: location)
            isTracking = true
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard isTracking, let touch = touches.first else { return }
        updateKnob(at: touch.location(in: self))
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        reset()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        reset()
    }

    func reset() {
        value = .zero
        knob.position = .zero
        isTracking = false
    }

    private func updateKnob(at location: CGPoint) {
        var delta = Vector2(CGFloat(location.x), CGFloat(location.y))
        let length = delta.length
        if length > radius {
            delta = delta / length * radius
        }
        knob.position = CGPoint(x: delta.x, y: delta.y)
        if radius > 0 {
            value = Vector2(delta.x / radius, delta.y / radius)
        }
    }
}
