import CoreGraphics

struct Vector2: Equatable {
    var x: CGFloat
    var y: CGFloat

    static let zero = Vector2(0, 0)

    init(_ x: CGFloat = 0, _ y: CGFloat = 0) {
        self.x = x
        self.y = y
    }

    var length: CGFloat {
        sqrt(x * x + y * y)
    }

    var normalized: Vector2 {
        let len = length
        guard len > 0.0001 else { return .zero }
        return Vector2(x / len, y / len)
    }

    mutating func normalize() {
        self = normalized
    }

    static func +(lhs: Vector2, rhs: Vector2) -> Vector2 {
        Vector2(lhs.x + rhs.x, lhs.y + rhs.y)
    }

    static func -(lhs: Vector2, rhs: Vector2) -> Vector2 {
        Vector2(lhs.x - rhs.x, lhs.y - rhs.y)
    }

    static func *(lhs: Vector2, rhs: CGFloat) -> Vector2 {
        Vector2(lhs.x * rhs, lhs.y * rhs)
    }

    static func /(lhs: Vector2, rhs: CGFloat) -> Vector2 {
        Vector2(lhs.x / rhs, lhs.y / rhs)
    }

    mutating func add(_ other: Vector2) {
        x += other.x
        y += other.y
    }

    mutating func subtract(_ other: Vector2) {
        x -= other.x
        y -= other.y
    }

    mutating func scale(_ scalar: CGFloat) {
        x *= scalar
        y *= scalar
    }

    func dot(_ other: Vector2) -> CGFloat {
        x * other.x + y * other.y
    }

    func distance(to other: Vector2) -> CGFloat {
        (self - other).length
    }
}
