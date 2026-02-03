package game

import (
	"fmt"
	"math"
	"math/rand"
)

// RoomType defines the type of room
type RoomType string

const (
	RoomTypeStart     RoomType = "start"
	RoomTypeCombat    RoomType = "combat"
	RoomTypeTreasure  RoomType = "treasure"
	RoomTypeCorridor  RoomType = "corridor"
	RoomTypeBoss      RoomType = "boss"
	RoomTypeArena     RoomType = "arena"
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
	ID          string               `json:"id"`
	Type        RoomType             `json:"type"`
	Position    Vector3              `json:"position"`    // World position of room center
	Size        Vector3              `json:"size"`        // Room dimensions (width, height, depth)
	Rotation    float64              `json:"rotation"`    // Rotation in degrees (0, 90, 180, 270)
	Connections []RoomConnection     `json:"connections"` // Connected rooms
	EnemySpawns []EnemySpawnPoint    `json:"enemySpawns"` // Where enemies spawn
	LootSpawns  []LootSpawnPoint     `json:"lootSpawns"`  // Where loot chests spawn
	Lighting    RoomLighting         `json:"lighting"`    // Lighting configuration
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
	AmbientColor    [3]float64 `json:"ambientColor"`    // RGB 0-1
	AmbientIntensity float64   `json:"ambientIntensity"`
	FogEnabled      bool       `json:"fogEnabled"`
	FogColor        [3]float64 `json:"fogColor"`
	FogDensity      float64    `json:"fogDensity"`
}

// Level represents a complete procedurally generated level
type Level struct {
	ID          string          `json:"id"`
	Seed        int64           `json:"seed"`
	Rooms       map[string]*Room `json:"rooms"`
	StartRoomID string          `json:"startRoomID"`
	BossRoomID  string          `json:"bossRoomID"`
	SpawnPoint  Vector3         `json:"spawnPoint"`
	Bounds      LevelBounds     `json:"bounds"`
}

// LevelBounds defines the spatial bounds of the level
type LevelBounds struct {
	Min Vector3 `json:"min"`
	Max Vector3 `json:"max"`
}

// BSPNode represents a node in the Binary Space Partition tree
type BSPNode struct {
	Bounds   Rect
	Left     *BSPNode
	Right    *BSPNode
	Room     *Room
	IsLeaf   bool
}

// Rect represents a 2D rectangle for BSP partitioning
type Rect struct {
	X      float64
	Y      float64
	Width  float64
	Height float64
}

// LevelGenerator generates procedural levels
type LevelGenerator struct {
	seed        int64
	rng         *rand.Rand
	minRoomSize float64
	maxRoomSize float64
	roomPadding float64
	nextRoomID  int
}

// NewLevelGenerator creates a new level generator
func NewLevelGenerator(seed int64) *LevelGenerator {
	return &LevelGenerator{
		seed:        seed,
		rng:         rand.New(rand.NewSource(seed)),
		minRoomSize: 12.0,
		maxRoomSize: 24.0,
		roomPadding: 4.0,
		nextRoomID:  0,
	}
}

// GenerateLevel generates a complete level using BSP
func (lg *LevelGenerator) GenerateLevel(width, height float64, roomCount int) *Level {
	level := &Level{
		ID:     fmt.Sprintf("level-%d", lg.seed),
		Seed:   lg.seed,
		Rooms:  make(map[string]*Room),
		Bounds: LevelBounds{
			Min: Vector3{X: 0, Y: 0, Z: 0},
			Max: Vector3{X: width, Y: 0, Z: height},
		},
	}

	// Create BSP tree
	rootBounds := Rect{X: 0, Y: 0, Width: width, Height: height}
	root := lg.createBSPTree(rootBounds, roomCount)

	// Extract rooms from BSP tree
	lg.extractRooms(root, level)

	// Connect rooms
	lg.connectRooms(root, level)

	// Assign room types
	lg.assignRoomTypes(level)

	// Generate spawn points for enemies and loot
	lg.generateSpawnPoints(level)

	// Set lighting for each room
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

// createBSPTree recursively creates a BSP tree
func (lg *LevelGenerator) createBSPTree(bounds Rect, depth int) *BSPNode {
	node := &BSPNode{
		Bounds: bounds,
		IsLeaf: false,
	}

	// Stop splitting if we've reached desired depth or area is too small
	if depth <= 0 || bounds.Width < lg.minRoomSize*2 || bounds.Height < lg.minRoomSize*2 {
		node.IsLeaf = true
		return node
	}

	// Decide split direction based on aspect ratio
	splitHorizontal := lg.rng.Float64() < 0.5
	if bounds.Width > bounds.Height*1.25 {
		splitHorizontal = false
	} else if bounds.Height > bounds.Width*1.25 {
		splitHorizontal = true
	}

	// Calculate split position (between 40% and 60%)
	splitRatio := 0.4 + lg.rng.Float64()*0.2

	if splitHorizontal {
		splitY := bounds.Y + bounds.Height*splitRatio
		node.Left = lg.createBSPTree(Rect{
			X:      bounds.X,
			Y:      bounds.Y,
			Width:  bounds.Width,
			Height: splitY - bounds.Y,
		}, depth-1)
		node.Right = lg.createBSPTree(Rect{
			X:      bounds.X,
			Y:      splitY,
			Width:  bounds.Width,
			Height: bounds.Y + bounds.Height - splitY,
		}, depth-1)
	} else {
		splitX := bounds.X + bounds.Width*splitRatio
		node.Left = lg.createBSPTree(Rect{
			X:      bounds.X,
			Y:      bounds.Y,
			Width:  splitX - bounds.X,
			Height: bounds.Height,
		}, depth-1)
		node.Right = lg.createBSPTree(Rect{
			X:      splitX,
			Y:      bounds.Y,
			Width:  bounds.X + bounds.Width - splitX,
			Height: bounds.Height,
		}, depth-1)
	}

	return node
}

// extractRooms extracts rooms from BSP leaf nodes
func (lg *LevelGenerator) extractRooms(node *BSPNode, level *Level) {
	if node == nil {
		return
	}

	if node.IsLeaf {
		// Create room within the partition bounds
		padding := lg.roomPadding
		roomWidth := node.Bounds.Width - padding*2
		roomHeight := node.Bounds.Height - padding*2

		if roomWidth < lg.minRoomSize {
			roomWidth = lg.minRoomSize
		}
		if roomHeight < lg.minRoomSize {
			roomHeight = lg.minRoomSize
		}

		// Random size within bounds
		actualWidth := lg.minRoomSize + lg.rng.Float64()*(roomWidth-lg.minRoomSize)
		actualHeight := lg.minRoomSize + lg.rng.Float64()*(roomHeight-lg.minRoomSize)

		// Center the room in the partition
		roomX := node.Bounds.X + (node.Bounds.Width-actualWidth)/2
		roomY := node.Bounds.Y + (node.Bounds.Height-actualHeight)/2

		room := &Room{
			ID:   fmt.Sprintf("room-%d", lg.nextRoomID),
			Type: RoomTypeCombat, // Will be assigned later
			Position: Vector3{
				X: roomX + actualWidth/2,
				Y: 0,
				Z: roomY + actualHeight/2,
			},
			Size: Vector3{
				X: actualWidth,
				Y: 4.0, // Standard room height
				Z: actualHeight,
			},
			Rotation:    0,
			Connections: []RoomConnection{},
			EnemySpawns: []EnemySpawnPoint{},
			LootSpawns:  []LootSpawnPoint{},
		}

		lg.nextRoomID++
		node.Room = room
		level.Rooms[room.ID] = room
	} else {
		lg.extractRooms(node.Left, level)
		lg.extractRooms(node.Right, level)
	}
}

// connectRooms connects rooms through corridors
func (lg *LevelGenerator) connectRooms(node *BSPNode, level *Level) {
	if node == nil || node.IsLeaf {
		return
	}

	// Recursively connect children first
	lg.connectRooms(node.Left, level)
	lg.connectRooms(node.Right, level)

	// Connect left and right subtrees
	leftRoom := lg.findClosestRoom(node.Left)
	rightRoom := lg.findClosestRoom(node.Right)

	if leftRoom != nil && rightRoom != nil {
		lg.createConnection(leftRoom, rightRoom, level)
	}
}

// findClosestRoom finds a room in the BSP subtree
func (lg *LevelGenerator) findClosestRoom(node *BSPNode) *Room {
	if node == nil {
		return nil
	}
	if node.IsLeaf {
		return node.Room
	}

	// Try to find a room in either subtree
	leftRoom := lg.findClosestRoom(node.Left)
	if leftRoom != nil {
		return leftRoom
	}
	return lg.findClosestRoom(node.Right)
}

// createConnection creates a connection between two rooms
func (lg *LevelGenerator) createConnection(room1, room2 *Room, level *Level) {
	// Determine connection direction based on relative positions
	dx := room2.Position.X - room1.Position.X
	dz := room2.Position.Z - room1.Position.Z

	var dir1, dir2 ConnectionDirection
	var doorPos1, doorPos2 Vector3

	if math.Abs(dx) > math.Abs(dz) {
		// Horizontal connection
		if dx > 0 {
			dir1 = DirEast
			dir2 = DirWest
		} else {
			dir1 = DirWest
			dir2 = DirEast
		}
		// Door at room edge
		midZ := (room1.Position.Z + room2.Position.Z) / 2
		doorPos1 = Vector3{X: room1.Position.X + room1.Size.X/2*sign(dx), Y: 0, Z: midZ}
		doorPos2 = Vector3{X: room2.Position.X - room2.Size.X/2*sign(dx), Y: 0, Z: midZ}
	} else {
		// Vertical connection
		if dz > 0 {
			dir1 = DirNorth
			dir2 = DirSouth
		} else {
			dir1 = DirSouth
			dir2 = DirNorth
		}
		midX := (room1.Position.X + room2.Position.X) / 2
		doorPos1 = Vector3{X: midX, Y: 0, Z: room1.Position.Z + room1.Size.Z/2*sign(dz)}
		doorPos2 = Vector3{X: midX, Y: 0, Z: room2.Position.Z - room2.Size.Z/2*sign(dz)}
	}

	// Add connections to both rooms
	room1.Connections = append(room1.Connections, RoomConnection{
		TargetRoomID: room2.ID,
		Direction:    dir1,
		DoorPosition: doorPos1,
	})
	room2.Connections = append(room2.Connections, RoomConnection{
		TargetRoomID: room1.ID,
		Direction:    dir2,
		DoorPosition: doorPos2,
	})

	// Create corridor room between them
	corridorRoom := &Room{
		ID:   fmt.Sprintf("corridor-%d", lg.nextRoomID),
		Type: RoomTypeCorridor,
		Position: Vector3{
			X: (room1.Position.X + room2.Position.X) / 2,
			Y: 0,
			Z: (room1.Position.Z + room2.Position.Z) / 2,
		},
		Size: Vector3{
			X: math.Max(4.0, math.Abs(dx)-room1.Size.X/2-room2.Size.X/2),
			Y: 4.0,
			Z: math.Max(4.0, math.Abs(dz)-room1.Size.Z/2-room2.Size.Z/2),
		},
		Connections: []RoomConnection{
			{TargetRoomID: room1.ID, Direction: dir2, DoorPosition: doorPos1},
			{TargetRoomID: room2.ID, Direction: dir1, DoorPosition: doorPos2},
		},
	}
	lg.nextRoomID++
	level.Rooms[corridorRoom.ID] = corridorRoom
}

func sign(x float64) float64 {
	if x > 0 {
		return 1
	} else if x < 0 {
		return -1
	}
	return 0
}

// assignRoomTypes assigns types to rooms
func (lg *LevelGenerator) assignRoomTypes(level *Level) {
	// Find the rooms furthest apart for start and boss rooms
	var startRoom, bossRoom *Room
	maxDist := 0.0

	rooms := make([]*Room, 0, len(level.Rooms))
	for _, room := range level.Rooms {
		if room.Type != RoomTypeCorridor {
			rooms = append(rooms, room)
		}
	}

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
	for _, room := range level.Rooms {
		if room.Type == RoomTypeCorridor || room.ID == level.StartRoomID || room.ID == level.BossRoomID {
			continue
		}

		// Random room type assignment
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
