import SpriteKit

enum WeaponType: String, CaseIterable {
    case pistol
    case rifle
    case shotgun
    case katana
    case shuriken
}

final class Weapon {
    let type: WeaponType
    var ammo: Int
    var maxAmmo: Int
    var clipSize: Int
    var fireRate: CGFloat
    var reloadTime: CGFloat
    var projectileSpeed: CGFloat
    var projectileDamage: CGFloat
    var spread: CGFloat
    var burstCount: Int
    var lastFireTime: TimeInterval = 0
    var isReloading: Bool = false
    var reloadTimer: TimeInterval = 0

    init(type: WeaponType) {
        self.type = type
        switch type {
        case .pistol:
            self.ammo = 36
            self.maxAmmo = 72
            self.clipSize = 12
            self.fireRate = 0.25
            self.reloadTime = 0.8
            self.projectileSpeed = 900
            self.projectileDamage = 25
            self.spread = 4
            self.burstCount = 1
        case .rifle:
            self.ammo = 120
            self.maxAmmo = 240
            self.clipSize = 30
            self.fireRate = 0.12
            self.reloadTime = 1.4
            self.projectileSpeed = 1200
            self.projectileDamage = 18
            self.spread = 2
            self.burstCount = 3
        case .shotgun:
            self.ammo = 24
            self.maxAmmo = 48
            self.clipSize = 6
            self.fireRate = 0.8
            self.reloadTime = 1.8
            self.projectileSpeed = 800
            self.projectileDamage = 12
            self.spread = 12
            self.burstCount = 6
        case .katana:
            self.ammo = 0
            self.maxAmmo = 0
            self.clipSize = 0
            self.fireRate = 0.5
            self.reloadTime = 0
            self.projectileSpeed = 0
            self.projectileDamage = 60
            self.spread = 0
            self.burstCount = 0
        case .shuriken:
            self.ammo = 10
            self.maxAmmo = 40
            self.clipSize = 10
            self.fireRate = 0.4
            self.reloadTime = 1.2
            self.projectileSpeed = 1000
            self.projectileDamage = 35
            self.spread = 6
            self.burstCount = 1
        }
    }

    func canFire(now: TimeInterval) -> Bool {
        guard !isReloading else { return false }
        if type == .katana { return now - lastFireTime >= fireRate }
        return ammo > 0 && now - lastFireTime >= fireRate
    }

    func consumeAmmo() {
        guard type != .katana else { return }
        ammo = max(0, ammo - 1)
    }

    func startReload() {
        guard type != .katana else { return }
        guard !isReloading else { return }
        isReloading = true
        reloadTimer = reloadTime
    }

    func update(delta: CGFloat) {
        guard isReloading else { return }
        reloadTimer -= delta
        if reloadTimer <= 0 {
            isReloading = false
            ammo = min(maxAmmo, max(ammo, clipSize))
        }
    }
}
