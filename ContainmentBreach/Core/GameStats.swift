import Foundation

struct KillBreakdown: Codable {
    var byWeapon: [WeaponType: Int] = [:]
}

struct GameStats: Codable {
    var bulletsFired: Int = 0
    var bulletsHit: Int = 0
    var friendlyFireKills: Int = 0
    var thrownKills: Int = 0
    var weaponKills: [WeaponType: Int] = [:]
    var enemiesKilled: Int { weaponKills.values.reduce(0, +) + friendlyFireKills + thrownKills }
}
