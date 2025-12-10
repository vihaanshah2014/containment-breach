import SpriteKit
import CoreGraphics

enum TileType {
    case empty
    case wall
    case glass
    case door
    case spawn
}

struct TileCoord: Hashable {
    let x: Int
    let y: Int
}

final class TileMap {
    let tileSize: CGFloat = 48
    private(set) var cols: Int
    private(set) var rows: Int
    private var tiles: [TileType]
    private var spawnTiles: [TileCoord] = []

    init(width: CGFloat, height: CGFloat) {
        cols = max(8, Int(width / tileSize))
        rows = max(6, Int(height / tileSize))
        tiles = Array(repeating: .wall, count: rows * cols)
        generateLab()
    }

    private func index(_ x: Int, _ y: Int) -> Int { y * cols + x }

    private func set(_ x: Int, _ y: Int, _ tile: TileType) {
        guard x >= 0, y >= 0, x < cols, y < rows else { return }
        tiles[index(x, y)] = tile
    }

    func tile(at x: Int, y: Int) -> TileType {
        guard x >= 0, y >= 0, x < cols, y < rows else { return .wall }
        return tiles[index(x, y)]
    }

    func worldToTile(_ point: CGPoint) -> TileCoord {
        TileCoord(x: max(0, min(cols - 1, Int(point.x / tileSize))),
                  y: max(0, min(rows - 1, Int(point.y / tileSize))))
    }

    func tileCenter(_ coord: TileCoord) -> CGPoint {
        CGPoint(x: CGFloat(coord.x) * tileSize + tileSize / 2,
                y: CGFloat(coord.y) * tileSize + tileSize / 2)
    }

    private func generateLab() {
        tiles = Array(repeating: .wall, count: rows * cols)
        spawnTiles.removeAll()

        // carve hallways
        let horizontalYs = [rows / 3, (rows * 2) / 3]
        for hallY in horizontalYs {
            for x in 2 ..< cols - 2 {
                for dy in -1 ... 1 {
                    set(x, hallY + dy, .empty)
                }
            }
        }

        let verticalCount = max(3, cols / 18)
        for i in 0 ..< verticalCount {
            let hallX = Int(2 + CGFloat(i + 1) * CGFloat(cols - 4) / CGFloat(verticalCount + 1))
            for y in 2 ..< rows - 2 {
                for dx in -1 ... 1 {
                    set(hallX + dx, y, .empty)
                }
            }
        }

        // rooms
        struct Room { var x: Int; var y: Int; var w: Int; var h: Int }
        var rooms: [Room] = []
        let attempts = 80
        let minRoom = 6
        let maxRoom = 10
        for _ in 0 ..< attempts {
            let w = Int.random(in: minRoom ... maxRoom)
            let h = Int.random(in: minRoom ... maxRoom)
            let x = Int.random(in: 4 ..< max(5, cols - w - 4))
            let y = Int.random(in: 4 ..< max(5, rows - h - 4))

            var overlaps = false
            for r in rooms {
                if x < r.x + r.w + 3 && x + w + 3 > r.x &&
                    y < r.y + r.h + 3 && y + h + 3 > r.y {
                    overlaps = true
                    break
                }
            }
            if overlaps { continue }

            let hallA = rows / 3
            let hallB = (rows * 2) / 3
            let centerY = y + h / 2
            if abs(centerY - hallA) <= 4 || abs(centerY - hallB) <= 4 {
                continue
            }

            rooms.append(Room(x: x, y: y, w: w, h: h))
            for ry in y ..< y + h {
                for rx in x ..< x + w {
                    set(rx, ry, .empty)
                }
            }
            if rooms.count >= 14 { break }
        }

        for room in rooms {
            var doorsAdded = 0
            let desired = 4
            let sides: [(x: Int, y: Int, dir: CGPoint, horizontal: Bool)] = [
                (room.x - 1, room.y + room.h / 2, CGPoint(x: -1, y: 0), true),
                (room.x + room.w, room.y + room.h / 2, CGPoint(x: 1, y: 0), true),
                (room.x + room.w / 2, room.y - 1, CGPoint(x: 0, y: -1), false),
                (room.x + room.w / 2, room.y + room.h, CGPoint(x: 0, y: 1), false)
            ]

            func addDoor(_ sx: Int, _ sy: Int, horizontal: Bool) {
                if horizontal {
                    for dy in -1 ... 1 { set(sx, sy + dy, .door) }
                } else {
                    for dx in -1 ... 1 { set(sx + dx, sy, .door) }
                }
            }

            for side in sides {
                if tile(at: side.x, y: side.y) == .empty {
                    addDoor(side.x, side.y, horizontal: side.horizontal)
                    doorsAdded += 1
                    if doorsAdded >= desired { break }
                }
            }
            if doorsAdded >= desired { continue }

            for side in sides where doorsAdded < desired {
                var cx = side.x
                var cy = side.y
                var found = false
                var target = (x: side.x, y: side.y)
                var steps = 0
                while cx >= 1 && cy >= 1 && cx < cols - 1 && cy < rows - 1 && steps < max(cols, rows) {
                    if tile(at: cx, y: cy) == .empty {
                        found = true
                        target = (cx, cy)
                        break
                    }
                    cx += Int(side.dir.x)
                    cy += Int(side.dir.y)
                    steps += 1
                }
                guard found else { continue }
                carveCorridor(from: (side.x, side.y), to: target)
                addDoor(side.x, side.y, horizontal: side.horizontal)
                doorsAdded += 1
            }
        }

        for room in rooms {
            let tx = room.x + room.w / 2
            let ty = room.y + room.h / 2
            if tile(at: tx, y: ty) == .empty {
                set(tx, ty, .spawn)
                spawnTiles.append(TileCoord(x: tx, y: ty))
            } else {
                let offsets = [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]
                for offset in offsets {
                    let sx = tx + offset.0
                    let sy = ty + offset.1
                    if tile(at: sx, y: sy) == .empty {
                        set(sx, sy, .spawn)
                        spawnTiles.append(TileCoord(x: sx, y: sy))
                        break
                    }
                }
            }
        }
    }

    private func carveCorridor(from: (Int, Int), to: (Int, Int)) {
        let width = 2
        let x1 = min(from.0, to.0)
        let x2 = max(from.0, to.0)
        let y1 = min(from.1, to.1)
        let y2 = max(from.1, to.1)

        for x in x1 ... x2 {
            for k in -width ... width {
                set(x, from.1 + k, .empty)
            }
        }
        for y in y1 ... y2 {
            for k in -width ... width {
                set(to.0 + k, y, .empty)
            }
        }
    }

    func randomSpawnTile() -> TileCoord? {
        spawnTiles.randomElement()
    }

    func collideCircle(from: CGPoint, to: CGPoint, radius: CGFloat) -> CGPoint {
        var nx = to.x
        var ny = to.y

        let signX = to.x - from.x
        if signX != 0 {
            let checkX = nx + (signX > 0 ? radius : -radius)
            let tile = worldToTile(CGPoint(x: checkX, y: from.y))
            let t = self.tile(at: tile.x, y: tile.y)
            if t == .wall || t == .glass {
                nx = CGFloat(tile.x) * tileSize + (signX > 0 ? -radius : tileSize + radius)
            }
        }

        let signY = to.y - from.y
        if signY != 0 {
            let checkY = ny + (signY > 0 ? radius : -radius)
            let tile = worldToTile(CGPoint(x: nx, y: checkY))
            let t = self.tile(at: tile.x, y: tile.y)
            if t == .wall || t == .glass {
                ny = CGFloat(tile.y) * tileSize + (signY > 0 ? -radius : tileSize + radius)
            }
        }

        return CGPoint(x: nx, y: ny)
    }
}
