import { Vector2 } from './Vector2';

export type TileType = 'empty' | 'wall' | 'glass' | 'door' | 'spawn';

type RoomType = 'generic' | 'medbay' | 'animal_testing' | 'research' | 'storage' | 'security' | 'command';
type Room = { 
  x: number; 
  y: number; 
  w: number; 
  h: number; 
  type: RoomType;
  doors: Array<{ x: number; y: number; dir: 'horizontal' | 'vertical' }>;
};

export type BreakableObject = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'computer' | 'medical_bed' | 'cage' | 'table' | 'equipment' | 'monitor' | 'storage_box' | 'console';
  health: number;
  maxHealth: number;
};

export class TileMap {
  public tileSize = 40;
  private cols: number;
  private rows: number;
  private tiles: TileType[][];
  private rooms: Room[] = [];
  private breakableObjects: BreakableObject[] = [];
  private nextObjectId = 1;

  constructor(width: number, height: number) {
    this.cols = Math.max(8, Math.floor(width / this.tileSize));
    this.rows = Math.max(6, Math.floor(height / this.tileSize));
    this.tiles = Array.from({ length: this.rows }, () => Array<TileType>(this.cols).fill('empty'));
    this.generateLabRooms();
  }

  getPixelWidth(): number { return this.cols * this.tileSize; }
  getPixelHeight(): number { return this.rows * this.tileSize; }

  resize(width: number, height: number) {
    const newCols = Math.max(8, Math.floor(width / this.tileSize));
    const newRows = Math.max(6, Math.floor(height / this.tileSize));
    if (newCols === this.cols && newRows === this.rows) return;
    this.cols = newCols;
    this.rows = newRows;
    this.tiles = Array.from({ length: this.rows }, () => Array<TileType>(this.cols).fill('empty'));
    this.generateLabRooms(); // This will also recreate all equipment
  }

  private generateLabRooms() {
    // Start with full walls
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) this.tiles[y][x] = 'wall';
    }
    this.rooms = [];
    
    // Create a main hallway system first
    this.createMainHallways();
    
    // Then create rooms connected to hallways
    this.createRoomsWithHallways();
    
    // Connect rooms to hallways with doors
    this.connectRoomsToHallways();
    
    // Mark subtle spawn tiles that visually blend in
    this.createSpawnTiles();

    // Create all breakable equipment
    this.createAllRoomEquipment();
  }
  
  private createMainHallways() {
    const hallwayWidth = 3;
    
    // Create two main horizontal hallways for a more readable layout
    const horizontalYs = [
      Math.floor(this.rows / 3),
      Math.floor((this.rows * 2) / 3)
    ];
    for (const hallY of horizontalYs) {
      for (let x = 2; x < this.cols - 2; x++) {
        for (let dy = -1; dy <= 1; dy++) {
          this.setSafe(x, hallY + dy, 'empty');
        }
      }
    }
    
    // Create vertical hallways and let them intersect all horizontal ones
    const numVerticalHallways = Math.max(3, Math.floor(this.cols / 18));
    for (let i = 0; i < numVerticalHallways; i++) {
      const hallX = Math.floor(2 + (i + 1) * (this.cols - 4) / (numVerticalHallways + 1));
      for (let y = 2; y < this.rows - 2; y++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.setSafe(hallX + dx, y, 'empty');
        }
      }
    }
  }
  
  private createRoomsWithHallways() {
    const roomTypes: RoomType[] = ['medbay', 'animal_testing', 'research', 'storage', 'security', 'command'];
    let roomTypeIndex = 0;
    
    // Create more, smaller, varied rooms
    const minRoomSize = 6;
    const maxRoomSize = 10;
    const margin = 4; // Space between rooms for walls
    
    // Try to place rooms in a more organic way
    const attempts = 80;
    const placedRooms: Room[] = [];
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      // Random room size (but smaller than before)
      const w = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
      const h = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
      
      // Random position (avoiding edges and ensuring space for walls)
      const x = Math.floor(Math.random() * (this.cols - w - margin * 2)) + margin;
      const y = Math.floor(Math.random() * (this.rows - h - margin * 2)) + margin;
      
      // Check if this overlaps with existing rooms (with buffer)
      let overlaps = false;
      for (const existing of placedRooms) {
        if (x < existing.x + existing.w + 3 && x + w + 3 > existing.x &&
            y < existing.y + existing.h + 3 && y + h + 3 > existing.y) {
          overlaps = true;
          break;
        }
      }
      
      // Also avoid placing rooms too close to hallways
      // Avoid placing rooms too close to any horizontal hallway band
      const hallA = Math.floor(this.rows / 3);
      const hallB = Math.floor((this.rows * 2) / 3);
      const centerY = y + h / 2;
      if (!overlaps && Math.abs(centerY - hallA) > 4 && Math.abs(centerY - hallB) > 4) {
        const room: Room = {
          x, y, w, h,
          type: roomTypes[roomTypeIndex % roomTypes.length],
          doors: []
        };
        
        // Carve room interior
        for (let ry = room.y; ry < room.y + room.h; ry++) {
          for (let rx = room.x; rx < room.x + room.w; rx++) {
            this.set(rx, ry, 'empty');
          }
        }
        
        placedRooms.push(room);
        roomTypeIndex++;
        
        // Stop when we have enough rooms
        if (placedRooms.length >= 14) break;
      }
    }
    
    this.rooms = placedRooms;
  }
  
  private connectRoomsToHallways() {
    for (const room of this.rooms) {
      // Find the closest hallway and create a door
      this.createDoorToHallway(room);
    }
  }
  
  private createDoorToHallway(room: Room) {
    // Each side candidate just outside room boundary
    const sides = [
      { x: room.x - 1, y: Math.floor(room.y + room.h / 2), dir: 'horizontal' as const, step: { x: -1, y: 0 } },
      { x: room.x + room.w, y: Math.floor(room.y + room.h / 2), dir: 'horizontal' as const, step: { x: 1, y: 0 } },
      { x: Math.floor(room.x + room.w / 2), y: room.y - 1, dir: 'vertical' as const, step: { x: 0, y: -1 } },
      { x: Math.floor(room.x + room.w / 2), y: room.y + room.h, dir: 'vertical' as const, step: { x: 0, y: 1 } }
    ];

    let doorsAdded = 0;
    const desiredDoors = 4; // MORE doors to guarantee white spawn spots!

    const addWideDoor = (sx: number, sy: number, dir: 'horizontal' | 'vertical') => {
      if (dir === 'horizontal') {
        // Make a 3-tile-tall opening
        this.setSafe(sx, sy - 1, 'door');
        this.setSafe(sx, sy, 'door');
        this.setSafe(sx, sy + 1, 'door');
      } else {
        // Make a 3-tile-wide opening
        this.setSafe(sx - 1, sy, 'door');
        this.setSafe(sx, sy, 'door');
        this.setSafe(sx + 1, sy, 'door');
      }
    };

    // First pass: place doors on sides already next to hallway
    for (const side of sides) {
      if (this.get(side.x, side.y) === 'empty') {
        addWideDoor(side.x, side.y, side.dir);
        room.doors.push({ x: side.x, y: side.y, dir: side.dir });
        doorsAdded++;
        if (doorsAdded >= desiredDoors) return;
      }
    }

    // Second pass: carve corridors to nearest hallway then place doors
    for (const side of sides) {
      if (doorsAdded >= desiredDoors) break;
      let cx = side.x;
      let cy = side.y;
      let d = 0;
      let found: { hx: number; hy: number } | null = null;
      while (cx >= 1 && cy >= 1 && cx < this.cols - 1 && cy < this.rows - 1 && d < Math.max(this.cols, this.rows)) {
        if (this.get(cx, cy) === 'empty') { found = { hx: cx, hy: cy }; break; }
        cx += side.step.x;
        cy += side.step.y;
        d++;
      }
      if (found) {
        this.carveCorridor(side.x, side.y, found.hx, found.hy);
        addWideDoor(side.x, side.y, side.dir);
        room.doors.push({ x: side.x, y: side.y, dir: side.dir });
        doorsAdded++;
      }
    }
  }

  // Choose subtle spawn tiles in rooms (blend in visually)
  private createSpawnTiles() {
    for (const room of this.rooms) {
      // Prefer room center; ensure inside bounds and on empty
      const tx = Math.floor(room.x + room.w / 2);
      const ty = Math.floor(room.y + room.h / 2);
      if (this.get(tx, ty) === 'empty') {
        this.set(tx, ty, 'spawn');
        continue;
      }
      // Fallback: search a few nearby tiles for an empty
      const offsets = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      for (const [dx, dy] of offsets) {
        const sx = tx + dx;
        const sy = ty + dy;
        if (this.get(sx, sy) === 'empty') { this.set(sx, sy, 'spawn'); break; }
      }
    }
  }

  private createDoors(gridCols: number, gridRows: number, cellW: number, cellH: number) {
    // Create doors between horizontally adjacent rooms
    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols - 1; gx++) {
        const leftRoom = this.rooms[gy * gridCols + gx];
        const rightRoom = this.rooms[gy * gridCols + gx + 1];
        
        // Find wall between rooms
        const doorX = leftRoom.x + leftRoom.w;
        const doorY = leftRoom.y + Math.floor(leftRoom.h / 2);
        
        // Create door
        this.set(doorX, doorY, 'door');
        this.set(doorX, doorY + 1, 'door'); // Make doors 2 tiles high
        
        leftRoom.doors.push({ x: doorX, y: doorY, dir: 'vertical' });
        rightRoom.doors.push({ x: doorX, y: doorY, dir: 'vertical' });
      }
    }
    
    // Create doors between vertically adjacent rooms
    for (let gx = 0; gx < gridCols; gx++) {
      for (let gy = 0; gy < gridRows - 1; gy++) {
        const topRoom = this.rooms[gy * gridCols + gx];
        const bottomRoom = this.rooms[(gy + 1) * gridCols + gx];
        
        // Find wall between rooms
        const doorX = topRoom.x + Math.floor(topRoom.w / 2);
        const doorY = topRoom.y + topRoom.h;
        
        // Create door
        this.set(doorX, doorY, 'door');
        this.set(doorX + 1, doorY, 'door'); // Make doors 2 tiles wide
        
        topRoom.doors.push({ x: doorX, y: doorY, dir: 'horizontal' });
        bottomRoom.doors.push({ x: doorX, y: doorY, dir: 'horizontal' });
      }
    }
  }

  private connectRooms(gridCols: number, gridRows: number) {
    // Create corridors connecting doors
    for (const room of this.rooms) {
      for (const door of room.doors) {
        // Create a small corridor extending from each door
        if (door.dir === 'vertical') {
          // Horizontal corridor from door
          for (let i = -1; i <= 1; i++) {
            this.setSafe(door.x + i, door.y, 'empty');
            this.setSafe(door.x + i, door.y + 1, 'empty');
          }
        } else {
          // Vertical corridor from door
          for (let i = -1; i <= 1; i++) {
            this.setSafe(door.x, door.y + i, 'empty');
            this.setSafe(door.x + 1, door.y + i, 'empty');
          }
        }
      }
    }
  }

  private carveCorridor(x1: number, y1: number, x2: number, y2: number) {
    // Carve an L-shaped corridor (width 2)
    const w = 2;
    const midX = x2;
    // Horizontal
    const xStart = Math.min(x1, midX);
    const xEnd = Math.max(x1, midX);
    for (let x = xStart; x <= xEnd; x++) for (let k = -w; k <= w; k++) this.setSafe(x, y1 + k, 'empty');
    // Vertical
    const yStart = Math.min(y1, y2);
    const yEnd = Math.max(y1, y2);
    for (let y = yStart; y <= yEnd; y++) for (let k = -w; k <= w; k++) this.setSafe(x2 + k, y, 'empty');
  }

  get(x: number, y: number): TileType | undefined {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 'wall';
    return this.tiles[y][x];
  }

  set(x: number, y: number, t: TileType) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.tiles[y][x] = t;
  }

  private setSafe(x: number, y: number, t: TileType) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.tiles[y][x] = t;
  }

  worldToTile(px: number, py: number) {
    return { tx: Math.floor(px / this.tileSize), ty: Math.floor(py / this.tileSize) };
  }

  // Simple circle collision vs grid with axis separation (slide along walls)
  collideCircle(from: Vector2, to: Vector2, radius: number): Vector2 {
    let nx = to.x;
    let ny = to.y;

    // Check collision with breakable objects first
    for (const obj of this.breakableObjects) {
      const objCenterX = obj.x + obj.width / 2;
      const objCenterY = obj.y + obj.height / 2;
      
      // Simple AABB collision check
      const closestX = Math.max(obj.x, Math.min(nx, obj.x + obj.width));
      const closestY = Math.max(obj.y, Math.min(ny, obj.y + obj.height));
      
      const distance = Math.hypot(nx - closestX, ny - closestY);
      if (distance < radius) {
        // Push player away from object
        const pushX = nx - closestX;
        const pushY = ny - closestY;
        const pushLen = Math.hypot(pushX, pushY);
        if (pushLen > 0) {
          nx = closestX + (pushX / pushLen) * radius;
          ny = closestY + (pushY / pushLen) * radius;
        }
      }
    }

    // Resolve X against tiles
    const signX = Math.sign(nx - from.x);
    if (signX !== 0) {
      const checkX = nx + signX * radius;
      const { tx, ty } = this.worldToTile(checkX, from.y);
      const t = this.get(tx, ty);
      if (t === 'wall' || t === 'glass') {
        // Clamp near the tile edge (doors are passable)
        nx = tx * this.tileSize - signX * radius - (signX > 0 ? 0 : -this.tileSize);
      }
    }

    // Resolve Y against tiles
    const signY = Math.sign(ny - from.y);
    if (signY !== 0) {
      const checkY = ny + signY * radius;
      const { tx, ty } = this.worldToTile(nx, checkY);
      const t = this.get(tx, ty);
      if (t === 'wall' || t === 'glass') {
        ny = ty * this.tileSize - signY * radius - (signY > 0 ? 0 : -this.tileSize);
      }
    }

    return new Vector2(nx, ny);
  }

  // Find a random empty tile; when nearEdges is true, prefer perimeter-adjacent tiles
  getRandomEmptyTile(nearEdges: boolean = false): { tx: number; ty: number } | null {
    const attempts = 200;
    for (let i = 0; i < attempts; i++) {
      let tx: number, ty: number;
      if (nearEdges) {
        // Choose an edge band just inside border walls
        const band = 1;
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // top band
          ty = band;
          tx = 1 + Math.floor(Math.random() * (this.cols - 2));
        } else if (side === 1) { // right band
          tx = this.cols - 2 - band;
          ty = 1 + Math.floor(Math.random() * (this.rows - 2));
        } else if (side === 2) { // bottom band
          ty = this.rows - 2 - band;
          tx = 1 + Math.floor(Math.random() * (this.cols - 2));
        } else { // left band
          tx = 1 + band;
          ty = 1 + Math.floor(Math.random() * (this.rows - 2));
        }
      } else {
        tx = 1 + Math.floor(Math.random() * (this.cols - 2));
        ty = 1 + Math.floor(Math.random() * (this.rows - 2));
      }
      if (this.get(tx, ty) === 'empty') {
        return { tx, ty };
      }
    }
    return null;
  }

  // Pick a random spawn tile anywhere
  getRandomSpawnTile(): { tx: number; ty: number } | null {
    const candidates: Array<{ tx: number; ty: number }> = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.get(x, y) === 'spawn') candidates.push({ tx: x, ty: y });
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Pick a random door tile anywhere (for player spawning)
  // MUST ALWAYS be white door tiles - no fallbacks!
  getRandomDoorTile(): { tx: number; ty: number } | null {
    const candidates: Array<{ tx: number; ty: number }> = [];
    
    // ONLY door tiles - white spots only!
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.get(x, y) === 'door') candidates.push({ tx: x, ty: y });
      }
    }
    
    if (candidates.length === 0) {
      console.error('ERROR: No door tiles found! Map generation failed!');
      // Force create multiple door tiles to guarantee spawn areas
      const emergencyPositions = [
        { x: Math.floor(this.cols / 4), y: Math.floor(this.rows / 4) },
        { x: Math.floor(this.cols * 3 / 4), y: Math.floor(this.rows / 4) },
        { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) },
        { x: Math.floor(this.cols / 4), y: Math.floor(this.rows * 3 / 4) },
        { x: Math.floor(this.cols * 3 / 4), y: Math.floor(this.rows * 3 / 4) }
      ];
      
      for (const pos of emergencyPositions) {
        this.set(pos.x, pos.y, 'door');
        candidates.push({ tx: pos.x, ty: pos.y });
      }
    }
    
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Convert tile coordinate to world center
  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * this.tileSize + this.tileSize / 2, y: ty * this.tileSize + this.tileSize / 2 };
  }

  bulletHit(px: number, py: number): { hit: boolean; material?: 'wall' | 'glass'; tx?: number; ty?: number } {
    const { tx, ty } = this.worldToTile(px, py);
    const t = this.get(tx, ty);
    if (t === 'wall') return { hit: true, material: 'wall', tx, ty };
    if (t === 'glass') return { hit: true, material: 'glass', tx, ty };
    // Doors are passable for bullets
    return { hit: false };
  }

  breakGlass(tx: number, ty: number) {
    if (this.get(tx, ty) === 'glass') this.set(tx, ty, 'empty');
  }

  getRooms(): ReadonlyArray<Room> { return this.rooms; }

  getBreakableObjects(): ReadonlyArray<BreakableObject> { return this.breakableObjects; }

  // Get a random table for item spawning
  getRandomTable(): BreakableObject | null {
    const tables = this.breakableObjects.filter(obj => obj.type === 'table');
    if (tables.length === 0) return null;
    return tables[Math.floor(Math.random() * tables.length)];
  }

  // Check if a bullet hits any breakable objects
  checkObjectHit(px: number, py: number): { hit: boolean; object?: BreakableObject; damage?: number } {
    for (const obj of this.breakableObjects) {
      if (px >= obj.x && px <= obj.x + obj.width && py >= obj.y && py <= obj.y + obj.height) {
        return { hit: true, object: obj, damage: 1 };
      }
    }
    return { hit: false };
  }

  // Damage or destroy an object
  damageObject(objectId: string, damage: number = 1): { destroyed: boolean; object?: BreakableObject } {
    const obj = this.breakableObjects.find(o => o.id === objectId);
    if (!obj) return { destroyed: false };

    obj.health -= damage;
    if (obj.health <= 0) {
      this.breakableObjects = this.breakableObjects.filter(o => o.id !== objectId);
      return { destroyed: true, object: obj };
    }
    return { destroyed: false, object: obj };
  }

  // Create a breakable object
  private createBreakableObject(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    type: BreakableObject['type'], 
    health: number = 2
  ): BreakableObject {
    const obj: BreakableObject = {
      id: `obj_${this.nextObjectId++}`,
      x, y, width, height, type, health, maxHealth: health
    };
    this.breakableObjects.push(obj);
    return obj;
  }

  getRandomRoomIndex(): number | null {
    if (!this.rooms.length) return null;
    return Math.floor(Math.random() * this.rooms.length);
  }

  getRandomEmptyTileInRoom(roomIndex: number): { tx: number; ty: number } | null {
    const r = this.rooms[roomIndex];
    if (!r) return null;
    for (let i = 0; i < 100; i++) {
      const tx = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
      const ty = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
      const t = this.get(tx, ty);
      if (t === 'empty') {
        // Also check no objects are at this location
        const px = tx * this.tileSize + this.tileSize / 2;
        const py = ty * this.tileSize + this.tileSize / 2;
        let hasObject = false;
        for (const obj of this.breakableObjects) {
          if (px >= obj.x && px <= obj.x + obj.width && 
              py >= obj.y && py <= obj.y + obj.height) {
            hasObject = true;
            break;
          }
        }
        if (!hasObject) return { tx, ty };
      }
    }
    return null;
  }

  // Pick a random spawn tile inside a specific room
  getRandomSpawnTileInRoom(roomIndex: number): { tx: number; ty: number } | null {
    const r = this.rooms[roomIndex];
    if (!r) return null;
    const candidates: Array<{ tx: number; ty: number }> = [];
    for (let ty = r.y + 1; ty < r.y + r.h - 1; ty++) {
      for (let tx = r.x + 1; tx < r.x + r.w - 1; tx++) {
        if (this.get(tx, ty) === 'spawn') candidates.push({ tx, ty });
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  
  // Find which room contains a world position
  getRoomContaining(worldX: number, worldY: number): Room | null {
    const tx = Math.floor(worldX / this.tileSize);
    const ty = Math.floor(worldY / this.tileSize);
    
    for (const room of this.rooms) {
      if (tx >= room.x && tx < room.x + room.w && 
          ty >= room.y && ty < room.y + room.h) {
        return room;
      }
    }
    return null;
  }
  
  // Get center of a room in world coordinates
  getRoomCenter(room: Room): { x: number; y: number } {
    return {
      x: (room.x + room.w / 2) * this.tileSize,
      y: (room.y + room.h / 2) * this.tileSize
    };
  }

  render(ctx: CanvasRenderingContext2D) {
    // First pass: render base tiles
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const t = this.tiles[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        
        if (t === 'wall') {
          // Black lab walls with metallic edges
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          
          // Add metallic border detail
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
          
          // Add some panel details on larger walls
          if (this.tileSize >= 40) {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(px + 4, py + 4, this.tileSize - 8, this.tileSize - 8);
            
            // Add small tech details randomly
            if ((x + y * this.cols) % 7 === 0) {
              ctx.fillStyle = '#0f4c75'; // blue accent
              ctx.fillRect(px + 6, py + 6, 4, 4);
            }
            if ((x + y * this.cols) % 11 === 0) {
              ctx.fillStyle = '#ff4444'; // red warning light
              ctx.fillRect(px + this.tileSize - 10, py + 6, 4, 4);
            }
          }
        } else if (t === 'glass') {
          // Light floor background for glass areas
          ctx.fillStyle = '#e8f4f8';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          
          // Glass panel overlay
          ctx.fillStyle = 'rgba(0, 204, 255, 0.25)';
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          ctx.strokeStyle = 'rgba(0, 204, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
        } else if (t === 'door') {
          // Door appearance - completely white to blend in
          ctx.fillStyle = '#ffffff'; // pure white background
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          
          // Very subtle grid pattern to match floor (almost invisible)
          ctx.strokeStyle = 'rgba(240, 246, 250, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        } else {
          // Light lab floor with subtle patterns
          ctx.fillStyle = '#f0f6fa'; // light blue-gray floor
          ctx.fillRect(px, py, this.tileSize, this.tileSize);
          
          // Add floor grid pattern
          ctx.strokeStyle = 'rgba(180, 190, 200, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        }
      }
    }
    
    // Second pass: render room-specific equipment
    for (const room of this.rooms) {
      this.renderRoomEquipment(ctx, room);
    }
  }
  
  private renderRoomEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    switch (room.type) {
      case 'medbay':
        this.renderMedbayEquipment(ctx, room);
        break;
      case 'animal_testing':
        this.renderAnimalTestingEquipment(ctx, room);
        break;
      case 'research':
        this.renderResearchEquipment(ctx, room);
        break;
      case 'storage':
        this.renderStorageEquipment(ctx, room);
        break;
      case 'security':
        this.renderSecurityEquipment(ctx, room);
        break;
      case 'command':
        this.renderCommandEquipment(ctx, room);
        break;
    }
  }
  
  // Call this after room generation to create all equipment
  private createAllRoomEquipment() {
    this.breakableObjects = []; // Reset objects
    this.nextObjectId = 1;
    
    for (const room of this.rooms) {
      switch (room.type) {
        case 'medbay':
          this.createMedbayEquipment(room);
          break;
        case 'animal_testing':
          this.createAnimalTestingEquipment(room);
          break;
        case 'research':
          this.createResearchEquipment(room);
          break;
        case 'storage':
          this.createStorageEquipment(room);
          break;
        case 'security':
          this.createSecurityEquipment(room);
          break;
        case 'command':
          this.createCommandEquipment(room);
          break;
      }
    }
  }
  
  private createMedbayEquipment(room: Room) {
    // Only place equipment if room is big enough
    if (room.w < 5 || room.h < 4) return;
    
    // Medical beds (scale with room size)
    const numBeds = Math.min(2, Math.floor((room.w - 2) / 3));
    for (let i = 0; i < numBeds; i++) {
      const x = (room.x + 1 + i * 3) * this.tileSize;
      const y = (room.y + 1) * this.tileSize;
      this.createBreakableObject(x, y, this.tileSize * 2, this.tileSize, 'medical_bed', 2);
    }
    
    // Medical equipment in corner if space allows
    if (room.w >= 6 && room.h >= 5) {
      const equipX = (room.x + room.w - 2) * this.tileSize;
      const equipY = (room.y + 1) * this.tileSize;
      this.createBreakableObject(equipX, equipY, this.tileSize, this.tileSize * 2, 'equipment', 3);
    }
  }
  
  private renderMedbayEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    // Render existing medical beds
    const medicalBeds = this.breakableObjects.filter(obj => 
      obj.type === 'medical_bed' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const bed of medicalBeds) {
      const damage = (bed.maxHealth - bed.health) / bed.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#a0a0a0' : '#e0e0e0';
      ctx.fillRect(bed.x, bed.y, bed.width, bed.height);
      if (damage < 0.8) {
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(bed.x + 4, bed.y + 4, 8, 8);
      }
    }
    
    // Render medical equipment
    const equipment = this.breakableObjects.filter(obj => 
      obj.type === 'equipment' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const equip of equipment) {
      const damage = (equip.maxHealth - equip.health) / equip.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#808080' : '#c0c0c0';
      ctx.fillRect(equip.x, equip.y, equip.width, equip.height);
      if (damage < 0.6) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(equip.x + 4, equip.y + 8, equip.width - 8, 4);
      }
    }
  }
  
  private createAnimalTestingEquipment(room: Room) {
    if (room.w < 4 || room.h < 3) return;
    
    // Animal cages (scale with room size)
    const numCages = Math.min(3, Math.floor((room.w - 2) / 2));
    for (let i = 0; i < numCages; i++) {
      const x = (room.x + 1 + i * 2) * this.tileSize;
      const y = (room.y + 1) * this.tileSize;
      this.createBreakableObject(x, y, this.tileSize, this.tileSize, 'cage', 2);
    }
    
    // Lab table in center if room is big enough
    if (room.w >= 6 && room.h >= 4) {
      const tableX = (room.x + Math.floor(room.w / 2)) * this.tileSize;
      const tableY = (room.y + Math.floor(room.h / 2)) * this.tileSize;
      this.createBreakableObject(tableX - this.tileSize/2, tableY, this.tileSize * 2, this.tileSize, 'table', 2);
    }
  }
  
  private renderAnimalTestingEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    // Render cages
    const cages = this.breakableObjects.filter(obj => 
      obj.type === 'cage' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const cage of cages) {
      const damage = (cage.maxHealth - cage.health) / cage.maxHealth;
      ctx.strokeStyle = damage > 0.5 ? '#333333' : '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(cage.x + 2, cage.y + 2, cage.width - 4, cage.height - 4);
      
      if (damage < 0.5) {
        // Warning sign
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(cage.x + 6, cage.y + 6, 8, 8);
        ctx.fillStyle = '#ff0000';
        ctx.fillText('!', cage.x + 8, cage.y + 12);
      }
    }
    
    // Render lab tables
    const tables = this.breakableObjects.filter(obj => 
      obj.type === 'table' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const table of tables) {
      const damage = (table.maxHealth - table.health) / table.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#a0a0a0' : '#d4d4d4';
      ctx.fillRect(table.x, table.y, table.width, table.height);
    }
  }
  
  private createResearchEquipment(room: Room) {
    if (room.w < 4 || room.h < 3) return;
    
    // Computer workstations (scale with room size)
    const numComputers = Math.min(2, Math.floor((room.w - 2) / 3));
    for (let i = 0; i < numComputers; i++) {
      const x = (room.x + 1 + i * 3) * this.tileSize;
      const y = (room.y + room.h - 2) * this.tileSize;
      this.createBreakableObject(x, y, this.tileSize * 2, this.tileSize, 'computer', 2);
    }
    
    // Research equipment if room is big enough
    if (room.w >= 5 && room.h >= 5) {
      const centerX = (room.x + Math.floor(room.w / 2)) * this.tileSize;
      const centerY = (room.y + 1) * this.tileSize;
      this.createBreakableObject(centerX, centerY, this.tileSize, this.tileSize * 2, 'equipment', 3);
    }
  }
  
  private renderResearchEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    // Render computers
    const computers = this.breakableObjects.filter(obj => 
      obj.type === 'computer' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const comp of computers) {
      const damage = (comp.maxHealth - comp.health) / comp.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#1a1a1a' : '#2a2a2a';
      ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
      if (damage < 0.7) {
        ctx.fillStyle = '#00ffaa';
        ctx.fillRect(comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8);
      }
    }
    
    // Render research equipment
    const equipment = this.breakableObjects.filter(obj => 
      obj.type === 'equipment' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize &&
      obj.height > this.tileSize // distinguish from medical equipment
    );
    
    for (const equip of equipment) {
      const damage = (equip.maxHealth - equip.health) / equip.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#4040a0' : '#8080ff';
      ctx.fillRect(equip.x, equip.y, equip.width, equip.height);
      if (damage < 0.6) {
        ctx.fillStyle = '#ffff80';
        ctx.fillRect(equip.x + 4, equip.y + 8, equip.width - 8, 8);
      }
    }
  }
  
  private createStorageEquipment(room: Room) {
    if (room.w < 4 || room.h < 3) return;
    
    // Storage boxes (but not too densely packed)
    const boxSize = this.tileSize - 4;
    const maxBoxes = Math.min(6, Math.floor((room.w - 2) * (room.h - 2) / 4));
    let boxCount = 0;
    
    for (let x = room.x + 1; x < room.x + room.w - 1 && boxCount < maxBoxes; x += 2) {
      for (let y = room.y + 1; y < room.y + room.h - 1 && boxCount < maxBoxes; y += 2) {
        const px = x * this.tileSize + 2;
        const py = y * this.tileSize + 2;
        this.createBreakableObject(px, py, boxSize, boxSize, 'storage_box', 1);
        boxCount++;
      }
    }
  }
  
  private renderStorageEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    const boxes = this.breakableObjects.filter(obj => 
      obj.type === 'storage_box' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const box of boxes) {
      const damage = (box.maxHealth - box.health) / box.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#5d2e08' : '#8B4513';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      if (damage < 0.8) {
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    }
  }
  
  private createSecurityEquipment(room: Room) {
    // Security monitors
    const monitorX = (room.x + 1) * this.tileSize;
    const monitorY = (room.y + 1) * this.tileSize;
    this.createBreakableObject(monitorX, monitorY, this.tileSize * 3, this.tileSize * 2, 'monitor', 3);
    
    // Security desk
    const deskX = (room.x + room.w - 3) * this.tileSize;
    const deskY = (room.y + Math.floor(room.h / 2)) * this.tileSize;
    this.createBreakableObject(deskX, deskY, this.tileSize * 2, this.tileSize, 'table', 2);
  }
  
  private renderSecurityEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    // Render monitors
    const monitors = this.breakableObjects.filter(obj => 
      obj.type === 'monitor' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const monitor of monitors) {
      const damage = (monitor.maxHealth - monitor.health) / monitor.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#0d0d0d' : '#1a1a1a';
      ctx.fillRect(monitor.x, monitor.y, monitor.width, monitor.height);
      
      if (damage < 0.6) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#004400';
          ctx.fillRect(monitor.x + 4 + i * 12, monitor.y + 4, 10, 8);
        }
      }
    }
    
    // Render security desks
    const desks = this.breakableObjects.filter(obj => 
      obj.type === 'table' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize &&
      obj.width === this.tileSize * 2 // distinguish from other tables
    );
    
    for (const desk of desks) {
      const damage = (desk.maxHealth - desk.health) / desk.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#333333' : '#555555';
      ctx.fillRect(desk.x, desk.y, desk.width, desk.height);
      
      if (damage < 0.7) {
        // Warning lights
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(desk.x + 4, desk.y + 4, 6, 6);
        ctx.fillRect(desk.x + this.tileSize + 4, desk.y + 4, 6, 6);
      }
    }
  }
  
  private createCommandEquipment(room: Room) {
    // Central command console
    const consoleX = (room.x + Math.floor(room.w / 2) - 1) * this.tileSize;
    const consoleY = (room.y + Math.floor(room.h / 2) - 1) * this.tileSize;
    this.createBreakableObject(consoleX, consoleY, this.tileSize * 3, this.tileSize * 2, 'console', 4);
  }
  
  private renderCommandEquipment(ctx: CanvasRenderingContext2D, room: Room) {
    const consoles = this.breakableObjects.filter(obj => 
      obj.type === 'console' && 
      obj.x >= room.x * this.tileSize && 
      obj.x < (room.x + room.w) * this.tileSize
    );
    
    for (const console of consoles) {
      const damage = (console.maxHealth - console.health) / console.maxHealth;
      ctx.fillStyle = damage > 0.5 ? '#1a1a1a' : '#2a2a2a';
      ctx.fillRect(console.x, console.y, console.width, console.height);
      
      if (damage < 0.6) {
        // Multiple screens
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(console.x + 4, console.y + 4, this.tileSize - 8, 10);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(console.x + this.tileSize + 4, console.y + 4, this.tileSize - 8, 10);
        ctx.fillStyle = '#88ff00';
        ctx.fillRect(console.x + this.tileSize * 2 + 4, console.y + 4, this.tileSize - 8, 10);
      }
      
      if (damage < 0.8) {
        // Control panels
        ctx.fillStyle = '#666666';
        ctx.fillRect(console.x, console.y + this.tileSize, console.width, this.tileSize);
        
        // Status lights
        const colors = ['#ff0000', '#ffff00', '#00ff00'];
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = colors[i];
          ctx.fillRect(console.x + 8 + i * 16, console.y + this.tileSize + 8, 6, 6);
        }
      }
    }
  }
}
