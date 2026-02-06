package game

import (
	"fmt"
	"math/rand"
	"sort"
)

// RoomType defines the type of room
type RoomType string

const (
	RoomTypeStart    RoomType = "start"
	RoomTypeCombat   RoomType = "combat"
	RoomTypeTreasure RoomType = "treasure"
	RoomTypeCorridor RoomType = "corridor"
	RoomTypeBoss     RoomType = "boss"
	RoomTypeArena    RoomType = "arena"
)

// ConnectionDirection defines which side of a room has a connection
type ConnectionDirection string

const (
	DirNorth ConnectionDirection = "north"
	DirSouth ConnectionDirection = "south"
	DirEast  ConnectionDirection = "east"
	DirWest  ConnectionDirection = "west"
)

// Room represents a single room in the level
type Room struct {
	ID          string            `json:"id"`
	Type        RoomType          `json:"type"`
	Position    Vector3           `json:"position"`    // World position of room center
	Size        Vector3           `json:"size"`        // Room dimensions (width, height, depth)
	Rotation    float64           `json:"rotation"`    // Rotation in degrees (0, 90, 180, 270)
	Connections []RoomConnection  `json:"connections"` // Connected rooms
	EnemySpawns []EnemySpawnPoint `json:"enemySpawns"` // Where enemies spawn
	LootSpawns  []LootSpawnPoint  `json:"lootSpawns"`  // Where loot chests spawn
	Lighting    RoomLighting      `json:"lighting"`    // Lighting configuration
}

// RoomConnection defines a connection between two rooms
type RoomConnection struct {
	TargetRoomID string              `json:"targetRoomID"`
	Direction    ConnectionDirection `json:"direction"`
	DoorPosition Vector3             `json:"doorPosition"`
}

// EnemySpawnPoint defines where an enemy can spawn
type EnemySpawnPoint struct {
	Position   Vector3  `json:"position"`
	EnemyTypes []string `json:"enemyTypes"` // Possible enemy types to spawn
	Count      int      `json:"count"`      // How many enemies to spawn here
}

// LootSpawnPoint defines where a loot chest can spawn
type LootSpawnPoint struct {
	Position   Vector3 `json:"position"`
	MinItems   int     `json:"minItems"`
	MaxItems   int     `json:"maxItems"`
	MinQuality int     `json:"minQuality"` // 0-100, affects item rarity
}

// RoomLighting defines lighting for a room
type RoomLighting struct {
	AmbientColor     [3]float64 `json:"ambientColor"` // RGB 0-1
	AmbientIntensity float64    `json:"ambientIntensity"`
	FogEnabled       bool       `json:"fogEnabled"`
	FogColor         [3]float64 `json:"fogColor"`
	FogDensity       float64    `json:"fogDensity"`
}

// Level represents a complete procedurally generated level
type Level struct {
	ID          string           `json:"id"`
	Seed        int64            `json:"seed"`
	Rooms       map[string]*Room `json:"rooms"`
	StartRoomID string           `json:"startRoomID"`
	BossRoomID  string           `json:"bossRoomID"`
	SpawnPoint  Vector3          `json:"spawnPoint"`
	Bounds      LevelBounds      `json:"bounds"`
}

// LevelBounds defines the spatial bounds of the level
type LevelBounds struct {
	Min Vector3 `json:"min"`
	Max Vector3 `json:"max"`
}

// Internal types for grid-based generation (not serialized)
type cellType int

const (
	cellWall  cellType = 0
	cellFloor cellType = 1
)

type gridCell struct {
	Type   cellType
	RoomID string
}

type placedRoom struct {
	ID      string
	CenterX int
	CenterY int
	Width   int
	Height  int
}

// LevelGenerator generates procedural levels using random walk
type LevelGenerator struct {
	seed       int64
	rng        *rand.Rand
	cellSize   float64 // World units per grid cell
	nextRoomID int
}

// NewLevelGenerator creates a new level generator
func NewLevelGenerator(seed int64) *LevelGenerator {
	return &LevelGenerator{
		seed:       seed,
		rng:        rand.New(rand.NewSource(seed)),
		cellSize:   4.0, // Each cell is 4x4 world units
		nextRoomID: 0,
	}
}

// GenerateLevel generates a complete level using random walk algorithm
func (lg *LevelGenerator) GenerateLevel(width, height float64, targetRoomCount int) *Level {
	level := &Level{
		ID:    fmt.Sprintf("level-%d", lg.seed),
		Seed:  lg.seed,
		Rooms: make(map[string]*Room),
		Bounds: LevelBounds{
			Min: Vector3{X: 0, Y: 0, Z: 0},
			Max: Vector3{X: width, Y: 0, Z: height},
		},
	}

	// Create grid
	gridWidth := int(width / lg.cellSize)
	gridHeight := int(height / lg.cellSize)
	grid := lg.createGrid(gridWidth, gridHeight)

	// Phase 1: Random walk to carve tunnels
	steps := targetRoomCount * 80 // More steps = more floor space
	lg.randomWalk(grid, steps)

	// Phase 2 & 3: Find room candidates and place rooms
	placed := lg.placeRooms(grid, targetRoomCount)

	// Phase 4: Label remaining floor cells as corridors
	lg.labelCorridors(grid)

	// Phase 5: Convert grid to Room objects
	lg.convertToRooms(grid, placed, level)

	// Phase 6: Create connections between adjacent rooms
	lg.createConnections(grid, level)

	// Phase 7: Assign room types (start, boss, etc.)
	lg.assignRoomTypes(level)

	// Generate spawn points and lighting
	lg.generateSpawnPoints(level)
	lg.generateLighting(level)

	// Set spawn point in start room
	if startRoom, ok := level.Rooms[level.StartRoomID]; ok {
		level.SpawnPoint = Vector3{
			X: startRoom.Position.X,
			Y: 0,
			Z: startRoom.Position.Z,
		}
	}

	return level
}

// createGrid initializes an empty grid filled with walls
func (lg *LevelGenerator) createGrid(width, height int) [][]gridCell {
	grid := make([][]gridCell, width)
	for x := range grid {
		grid[x] = make([]gridCell, height)
		for y := range grid[x] {
			grid[x][y] = gridCell{Type: cellWall, RoomID: ""}
		}
	}
	return grid
}

// randomWalk carves floor cells through the grid using a drunkard's walk
func (lg *LevelGenerator) randomWalk(grid [][]gridCell, steps int) {
	width := len(grid)
	height := len(grid[0])

	// Start near center
	x, y := width/2, height/2
	grid[x][y].Type = cellFloor

	// Direction vectors: up, down, right, left
	directions := [][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}}

	for i := 0; i < steps; i++ {
		// Pick random direction
		dir := directions[lg.rng.Intn(4)]

		// Move (stay 2 cells from edge to leave room for walls)
		newX := x + dir[0]
		newY := y + dir[1]

		if newX >= 2 && newX < width-2 && newY >= 2 && newY < height-2 {
			x, y = newX, newY
			grid[x][y].Type = cellFloor
		}
	}
}

// placeRooms finds good spots for rooms and places them
func (lg *LevelGenerator) placeRooms(grid [][]gridCell, targetCount int) []*placedRoom {
	width := len(grid)
	height := len(grid[0])
	placed := []*placedRoom{}

	// Minimum and maximum room size in cells
	minSize := 3
	maxSize := 5

	// Scan for room candidates - areas with enough floor space
	type candidate struct {
		x, y          int
		maxW, maxH    int
		floorDensity  float64
	}
	candidates := []candidate{}

	for x := minSize; x < width-minSize; x++ {
		for y := minSize; y < height-minSize; y++ {
			if grid[x][y].Type != cellFloor {
				continue
			}

			// Check how much floor space is around this point
			maxW, maxH := lg.measureFloorArea(grid, x, y, maxSize)
			if maxW >= minSize && maxH >= minSize {
				// Calculate floor density in the area
				density := lg.calculateFloorDensity(grid, x, y, maxW, maxH)
				candidates = append(candidates, candidate{x, y, maxW, maxH, density})
			}
		}
	}

	// Sort by floor density (prefer areas with more floor)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].floorDensity > candidates[j].floorDensity
	})

	// Place rooms, avoiding overlaps
	for _, c := range candidates {
		if len(placed) >= targetCount {
			break
		}

		// Determine room size (random within constraints)
		roomW := minSize + lg.rng.Intn(c.maxW-minSize+1)
		roomH := minSize + lg.rng.Intn(c.maxH-minSize+1)

		// Check if this room would overlap with existing rooms
		if lg.wouldOverlap(placed, c.x, c.y, roomW, roomH) {
			continue
		}

		// Place the room
		roomID := fmt.Sprintf("room-%d", lg.nextRoomID)
		lg.nextRoomID++

		room := &placedRoom{
			ID:      roomID,
			CenterX: c.x,
			CenterY: c.y,
			Width:   roomW,
			Height:  roomH,
		}
		placed = append(placed, room)

		// Mark cells as belonging to this room
		for dx := -roomW / 2; dx <= roomW/2; dx++ {
			for dy := -roomH / 2; dy <= roomH/2; dy++ {
				gx, gy := c.x+dx, c.y+dy
				if gx >= 0 && gx < width && gy >= 0 && gy < height {
					grid[gx][gy].Type = cellFloor
					grid[gx][gy].RoomID = roomID
				}
			}
		}
	}

	return placed
}

// measureFloorArea measures how much floor space exists around a point
func (lg *LevelGenerator) measureFloorArea(grid [][]gridCell, cx, cy, maxSize int) (int, int) {
	width := len(grid)
	height := len(grid[0])

	// Expand outward to find max width/height that has floor
	maxW, maxH := 1, 1

	for w := 1; w <= maxSize; w++ {
		hasFloor := true
		for dy := -maxH / 2; dy <= maxH/2; dy++ {
			x1, x2 := cx-w/2, cx+w/2
			y := cy + dy
			if x1 < 0 || x2 >= width || y < 0 || y >= height {
				hasFloor = false
				break
			}
			if grid[x1][y].Type != cellFloor || grid[x2][y].Type != cellFloor {
				hasFloor = false
				break
			}
		}
		if hasFloor {
			maxW = w
		} else {
			break
		}
	}

	for h := 1; h <= maxSize; h++ {
		hasFloor := true
		for dx := -maxW / 2; dx <= maxW/2; dx++ {
			x := cx + dx
			y1, y2 := cy-h/2, cy+h/2
			if y1 < 0 || y2 >= height || x < 0 || x >= width {
				hasFloor = false
				break
			}
			if grid[x][y1].Type != cellFloor || grid[x][y2].Type != cellFloor {
				hasFloor = false
				break
			}
		}
		if hasFloor {
			maxH = h
		} else {
			break
		}
	}

	return maxW, maxH
}

// calculateFloorDensity calculates what percentage of an area is floor
func (lg *LevelGenerator) calculateFloorDensity(grid [][]gridCell, cx, cy, w, h int) float64 {
	width := len(grid)
	height := len(grid[0])
	total := 0
	floor := 0

	for dx := -w / 2; dx <= w/2; dx++ {
		for dy := -h / 2; dy <= h/2; dy++ {
			x, y := cx+dx, cy+dy
			if x >= 0 && x < width && y >= 0 && y < height {
				total++
				if grid[x][y].Type == cellFloor {
					floor++
				}
			}
		}
	}

	if total == 0 {
		return 0
	}
	return float64(floor) / float64(total)
}

// wouldOverlap checks if a room would overlap with existing placed rooms
func (lg *LevelGenerator) wouldOverlap(placed []*placedRoom, cx, cy, w, h int) bool {
	// Add padding between rooms
	padding := 2

	for _, room := range placed {
		// Check bounding box overlap with padding
		r1Left := cx - w/2 - padding
		r1Right := cx + w/2 + padding
		r1Top := cy - h/2 - padding
		r1Bottom := cy + h/2 + padding

		r2Left := room.CenterX - room.Width/2
		r2Right := room.CenterX + room.Width/2
		r2Top := room.CenterY - room.Height/2
		r2Bottom := room.CenterY + room.Height/2

		if r1Left < r2Right && r1Right > r2Left && r1Top < r2Bottom && r1Bottom > r2Top {
			return true
		}
	}
	return false
}

// labelCorridors flood-fills remaining floor cells as corridor regions
func (lg *LevelGenerator) labelCorridors(grid [][]gridCell) {
	width := len(grid)
	height := len(grid[0])
	corridorID := 0

	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			if grid[x][y].Type == cellFloor && grid[x][y].RoomID == "" {
				// Flood fill this corridor region
				id := fmt.Sprintf("corridor-%d", corridorID)
				corridorID++
				lg.floodFillCorridor(grid, x, y, id)
			}
		}
	}
}

// floodFillCorridor marks all connected floor cells with the same corridor ID
func (lg *LevelGenerator) floodFillCorridor(grid [][]gridCell, startX, startY int, corridorID string) {
	width := len(grid)
	height := len(grid[0])

	stack := [][2]int{{startX, startY}}

	for len(stack) > 0 {
		// Pop
		pos := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		x, y := pos[0], pos[1]

		if x < 0 || x >= width || y < 0 || y >= height {
			continue
		}
		if grid[x][y].Type != cellFloor || grid[x][y].RoomID != "" {
			continue
		}

		grid[x][y].RoomID = corridorID

		// Push neighbors
		stack = append(stack, [2]int{x + 1, y})
		stack = append(stack, [2]int{x - 1, y})
		stack = append(stack, [2]int{x, y + 1})
		stack = append(stack, [2]int{x, y - 1})
	}
}

// convertToRooms converts the grid representation to Room objects
func (lg *LevelGenerator) convertToRooms(grid [][]gridCell, placed []*placedRoom, level *Level) {
	// Convert placed rooms
	for _, pr := range placed {
		room := &Room{
			ID:   pr.ID,
			Type: RoomTypeCombat, // Will be assigned later
			Position: Vector3{
				X: float64(pr.CenterX) * lg.cellSize,
				Y: 0,
				Z: float64(pr.CenterY) * lg.cellSize,
			},
			Size: Vector3{
				X: float64(pr.Width) * lg.cellSize,
				Y: 4.0,
				Z: float64(pr.Height) * lg.cellSize,
			},
			Rotation:    0,
			Connections: []RoomConnection{},
			EnemySpawns: []EnemySpawnPoint{},
			LootSpawns:  []LootSpawnPoint{},
		}
		level.Rooms[room.ID] = room
	}

	// Convert corridor regions
	corridorBounds := lg.calculateCorridorBounds(grid)
	for corridorID, bounds := range corridorBounds {
		room := &Room{
			ID:   corridorID,
			Type: RoomTypeCorridor,
			Position: Vector3{
				X: bounds.centerX * lg.cellSize,
				Y: 0,
				Z: bounds.centerY * lg.cellSize,
			},
			Size: Vector3{
				X: bounds.width * lg.cellSize,
				Y: 4.0,
				Z: bounds.height * lg.cellSize,
			},
			Rotation:    0,
			Connections: []RoomConnection{},
			EnemySpawns: []EnemySpawnPoint{},
			LootSpawns:  []LootSpawnPoint{},
		}
		level.Rooms[room.ID] = room
	}
}

type corridorBounds struct {
	centerX, centerY float64
	width, height    float64
}

// calculateCorridorBounds calculates the bounding box for each corridor region
func (lg *LevelGenerator) calculateCorridorBounds(grid [][]gridCell) map[string]*corridorBounds {
	width := len(grid)
	height := len(grid[0])

	// Track min/max for each corridor
	corridorCells := make(map[string][][2]int)

	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			cell := grid[x][y]
			if cell.Type == cellFloor && cell.RoomID != "" {
				// Check if it's a corridor (starts with "corridor-")
				if len(cell.RoomID) > 9 && cell.RoomID[:9] == "corridor-" {
					corridorCells[cell.RoomID] = append(corridorCells[cell.RoomID], [2]int{x, y})
				}
			}
		}
	}

	result := make(map[string]*corridorBounds)
	for id, cells := range corridorCells {
		if len(cells) == 0 {
			continue
		}

		minX, maxX := cells[0][0], cells[0][0]
		minY, maxY := cells[0][1], cells[0][1]

		for _, c := range cells {
			if c[0] < minX {
				minX = c[0]
			}
			if c[0] > maxX {
				maxX = c[0]
			}
			if c[1] < minY {
				minY = c[1]
			}
			if c[1] > maxY {
				maxY = c[1]
			}
		}

		result[id] = &corridorBounds{
			centerX: float64(minX+maxX) / 2.0,
			centerY: float64(minY+maxY) / 2.0,
			width:   float64(maxX - minX + 1),
			height:  float64(maxY - minY + 1),
		}
	}

	return result
}

// createConnections finds adjacent rooms and creates connection entries
func (lg *LevelGenerator) createConnections(grid [][]gridCell, level *Level) {
	width := len(grid)
	height := len(grid[0])

	// Track connections we've already made to avoid duplicates
	connected := make(map[string]bool)

	for x := 1; x < width-1; x++ {
		for y := 1; y < height-1; y++ {
			cellA := grid[x][y]
			if cellA.Type != cellFloor || cellA.RoomID == "" {
				continue
			}

			// Check 4 neighbors
			neighbors := [][3]interface{}{
				{x, y + 1, DirNorth},
				{x, y - 1, DirSouth},
				{x + 1, y, DirEast},
				{x - 1, y, DirWest},
			}

			for _, n := range neighbors {
				nx, ny := n[0].(int), n[1].(int)
				dir := n[2].(ConnectionDirection)

				cellB := grid[nx][ny]
				if cellB.Type != cellFloor || cellB.RoomID == "" {
					continue
				}

				if cellA.RoomID == cellB.RoomID {
					continue // Same room
				}

				// Create unique connection key
				key := cellA.RoomID + "->" + cellB.RoomID
				reverseKey := cellB.RoomID + "->" + cellA.RoomID

				if connected[key] || connected[reverseKey] {
					continue // Already connected
				}

				// Add bidirectional connections
				roomA := level.Rooms[cellA.RoomID]
				roomB := level.Rooms[cellB.RoomID]

				if roomA == nil || roomB == nil {
					continue
				}

				// Door position at the boundary
				doorPos := Vector3{
					X: float64(x) * lg.cellSize,
					Y: 0,
					Z: float64(y) * lg.cellSize,
				}

				roomA.Connections = append(roomA.Connections, RoomConnection{
					TargetRoomID: cellB.RoomID,
					Direction:    dir,
					DoorPosition: doorPos,
				})

				roomB.Connections = append(roomB.Connections, RoomConnection{
					TargetRoomID: cellA.RoomID,
					Direction:    oppositeDirection(dir),
					DoorPosition: doorPos,
				})

				connected[key] = true
			}
		}
	}
}

func oppositeDirection(dir ConnectionDirection) ConnectionDirection {
	switch dir {
	case DirNorth:
		return DirSouth
	case DirSouth:
		return DirNorth
	case DirEast:
		return DirWest
	case DirWest:
		return DirEast
	}
	return dir
}

// assignRoomTypes assigns types to rooms (start, boss, treasure, etc.)
func (lg *LevelGenerator) assignRoomTypes(level *Level) {
	// Get non-corridor rooms
	rooms := []*Room{}
	for _, room := range level.Rooms {
		if room.Type != RoomTypeCorridor {
			rooms = append(rooms, room)
		}
	}

	if len(rooms) == 0 {
		return
	}

	// Sort for determinism
	sort.Slice(rooms, func(i, j int) bool {
		return rooms[i].ID < rooms[j].ID
	})

	// Find the two rooms furthest apart
	var startRoom, bossRoom *Room
	maxDist := 0.0

	for i := 0; i < len(rooms); i++ {
		for j := i + 1; j < len(rooms); j++ {
			dist := Distance2D(rooms[i].Position, rooms[j].Position)
			if dist > maxDist {
				maxDist = dist
				startRoom = rooms[i]
				bossRoom = rooms[j]
			}
		}
	}

	if startRoom != nil {
		startRoom.Type = RoomTypeStart
		level.StartRoomID = startRoom.ID
	}
	if bossRoom != nil {
		bossRoom.Type = RoomTypeBoss
		level.BossRoomID = bossRoom.ID
	}

	// Assign types to remaining rooms
	for _, room := range rooms {
		if room.Type == RoomTypeStart || room.Type == RoomTypeBoss {
			continue
		}

		roll := lg.rng.Float64()
		if roll < 0.15 {
			room.Type = RoomTypeTreasure
		} else if roll < 0.30 {
			room.Type = RoomTypeArena
		} else {
			room.Type = RoomTypeCombat
		}
	}
}

// generateSpawnPoints generates enemy and loot spawn points
func (lg *LevelGenerator) generateSpawnPoints(level *Level) {
	enemyTypes := []string{"zombie", "skeleton", "archer", "mage"}

	for _, room := range level.Rooms {
		switch room.Type {
		case RoomTypeStart:
			// No enemies in start room
			continue

		case RoomTypeCorridor:
			// Few enemies in corridors
			if lg.rng.Float64() < 0.3 {
				room.EnemySpawns = append(room.EnemySpawns, EnemySpawnPoint{
					Position:   room.Position,
					EnemyTypes: []string{"zombie"},
					Count:      1,
				})
			}

		case RoomTypeCombat:
			// Standard combat room
			count := 2 + lg.rng.Intn(4)
			room.EnemySpawns = lg.generateRoomSpawns(room, enemyTypes, count)

		case RoomTypeArena:
			// More enemies
			count := 4 + lg.rng.Intn(6)
			room.EnemySpawns = lg.generateRoomSpawns(room, enemyTypes, count)

		case RoomTypeTreasure:
			// Guarded treasure
			room.EnemySpawns = lg.generateRoomSpawns(room, enemyTypes, 2)
			room.LootSpawns = append(room.LootSpawns, LootSpawnPoint{
				Position:   room.Position,
				MinItems:   2,
				MaxItems:   4,
				MinQuality: 50,
			})

		case RoomTypeBoss:
			// Boss room with elite enemies
			room.EnemySpawns = append(room.EnemySpawns, EnemySpawnPoint{
				Position:   room.Position,
				EnemyTypes: []string{"necromancer"},
				Count:      1,
			})
			room.EnemySpawns = append(room.EnemySpawns, EnemySpawnPoint{
				Position: Vector3{
					X: room.Position.X - room.Size.X/4,
					Y: 0,
					Z: room.Position.Z,
				},
				EnemyTypes: []string{"skeleton", "mage"},
				Count:      3,
			})
			room.EnemySpawns = append(room.EnemySpawns, EnemySpawnPoint{
				Position: Vector3{
					X: room.Position.X + room.Size.X/4,
					Y: 0,
					Z: room.Position.Z,
				},
				EnemyTypes: []string{"skeleton", "mage"},
				Count:      3,
			})
		}
	}
}

// generateRoomSpawns creates spawn points distributed around the room
func (lg *LevelGenerator) generateRoomSpawns(room *Room, enemyTypes []string, totalCount int) []EnemySpawnPoint {
	spawns := []EnemySpawnPoint{}

	// Create 2-4 spawn clusters
	clusters := 2 + lg.rng.Intn(3)
	perCluster := totalCount / clusters

	for i := 0; i < clusters; i++ {
		// Random position within room bounds
		offsetX := (lg.rng.Float64() - 0.5) * room.Size.X * 0.7
		offsetZ := (lg.rng.Float64() - 0.5) * room.Size.Z * 0.7

		spawnPos := Vector3{
			X: room.Position.X + offsetX,
			Y: 0,
			Z: room.Position.Z + offsetZ,
		}

		count := perCluster
		if i == clusters-1 {
			count = totalCount - perCluster*(clusters-1)
		}

		spawns = append(spawns, EnemySpawnPoint{
			Position:   spawnPos,
			EnemyTypes: enemyTypes,
			Count:      count,
		})
	}

	return spawns
}

// generateLighting generates lighting for each room
func (lg *LevelGenerator) generateLighting(level *Level) {
	for _, room := range level.Rooms {
		switch room.Type {
		case RoomTypeStart:
			room.Lighting = RoomLighting{
				AmbientColor:     [3]float64{0.8, 0.9, 1.0},
				AmbientIntensity: 0.6,
				FogEnabled:       false,
			}

		case RoomTypeCorridor:
			room.Lighting = RoomLighting{
				AmbientColor:     [3]float64{0.4, 0.4, 0.5},
				AmbientIntensity: 0.3,
				FogEnabled:       true,
				FogColor:         [3]float64{0.1, 0.1, 0.15},
				FogDensity:       0.02,
			}

		case RoomTypeCombat, RoomTypeArena:
			room.Lighting = RoomLighting{
				AmbientColor:     [3]float64{0.6, 0.5, 0.4},
				AmbientIntensity: 0.4,
				FogEnabled:       true,
				FogColor:         [3]float64{0.15, 0.1, 0.1},
				FogDensity:       0.01,
			}

		case RoomTypeTreasure:
			room.Lighting = RoomLighting{
				AmbientColor:     [3]float64{1.0, 0.9, 0.6},
				AmbientIntensity: 0.5,
				FogEnabled:       false,
			}

		case RoomTypeBoss:
			room.Lighting = RoomLighting{
				AmbientColor:     [3]float64{0.8, 0.3, 0.3},
				AmbientIntensity: 0.5,
				FogEnabled:       true,
				FogColor:         [3]float64{0.2, 0.05, 0.05},
				FogDensity:       0.015,
			}
		}
	}
}

// Serialize converts the level to a map for JSON serialization
func (l *Level) Serialize() map[string]interface{} {
	rooms := make([]map[string]interface{}, 0, len(l.Rooms))
	for _, room := range l.Rooms {
		rooms = append(rooms, room.Serialize())
	}

	return map[string]interface{}{
		"id":          l.ID,
		"seed":        l.Seed,
		"rooms":       rooms,
		"startRoomID": l.StartRoomID,
		"bossRoomID":  l.BossRoomID,
		"spawnPoint": map[string]interface{}{
			"x": l.SpawnPoint.X,
			"y": l.SpawnPoint.Y,
			"z": l.SpawnPoint.Z,
		},
		"bounds": map[string]interface{}{
			"min": map[string]interface{}{
				"x": l.Bounds.Min.X,
				"y": l.Bounds.Min.Y,
				"z": l.Bounds.Min.Z,
			},
			"max": map[string]interface{}{
				"x": l.Bounds.Max.X,
				"y": l.Bounds.Max.Y,
				"z": l.Bounds.Max.Z,
			},
		},
	}
}

// Serialize converts a room to a map for JSON serialization
func (r *Room) Serialize() map[string]interface{} {
	connections := make([]map[string]interface{}, 0, len(r.Connections))
	for _, conn := range r.Connections {
		connections = append(connections, map[string]interface{}{
			"targetRoomID": conn.TargetRoomID,
			"direction":    string(conn.Direction),
			"doorPosition": map[string]interface{}{
				"x": conn.DoorPosition.X,
				"y": conn.DoorPosition.Y,
				"z": conn.DoorPosition.Z,
			},
		})
	}

	enemySpawns := make([]map[string]interface{}, 0, len(r.EnemySpawns))
	for _, spawn := range r.EnemySpawns {
		enemySpawns = append(enemySpawns, map[string]interface{}{
			"position": map[string]interface{}{
				"x": spawn.Position.X,
				"y": spawn.Position.Y,
				"z": spawn.Position.Z,
			},
			"enemyTypes": spawn.EnemyTypes,
			"count":      spawn.Count,
		})
	}

	lootSpawns := make([]map[string]interface{}, 0, len(r.LootSpawns))
	for _, spawn := range r.LootSpawns {
		lootSpawns = append(lootSpawns, map[string]interface{}{
			"position": map[string]interface{}{
				"x": spawn.Position.X,
				"y": spawn.Position.Y,
				"z": spawn.Position.Z,
			},
			"minItems":   spawn.MinItems,
			"maxItems":   spawn.MaxItems,
			"minQuality": spawn.MinQuality,
		})
	}

	return map[string]interface{}{
		"id":   r.ID,
		"type": string(r.Type),
		"position": map[string]interface{}{
			"x": r.Position.X,
			"y": r.Position.Y,
			"z": r.Position.Z,
		},
		"size": map[string]interface{}{
			"x": r.Size.X,
			"y": r.Size.Y,
			"z": r.Size.Z,
		},
		"rotation":    r.Rotation,
		"connections": connections,
		"enemySpawns": enemySpawns,
		"lootSpawns":  lootSpawns,
		"lighting": map[string]interface{}{
			"ambientColor":     r.Lighting.AmbientColor,
			"ambientIntensity": r.Lighting.AmbientIntensity,
			"fogEnabled":       r.Lighting.FogEnabled,
			"fogColor":         r.Lighting.FogColor,
			"fogDensity":       r.Lighting.FogDensity,
		},
	}
}
