package game

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewLevelGenerator(t *testing.T) {
	gen := NewLevelGenerator(12345)

	assert.Equal(t, int64(12345), gen.seed)
	assert.NotNil(t, gen.rng)
	assert.Equal(t, 4.0, gen.cellSize) // Grid cell size in world units
}

func TestGenerateLevel(t *testing.T) {
	gen := NewLevelGenerator(12345)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	require.NotNil(t, level)
	assert.NotEmpty(t, level.ID)
	assert.Equal(t, int64(12345), level.Seed)
	assert.NotEmpty(t, level.Rooms)
	assert.NotEmpty(t, level.StartRoomID)
	assert.NotEmpty(t, level.BossRoomID)
}

func TestGenerateLevelHasStartAndBossRooms(t *testing.T) {
	gen := NewLevelGenerator(54321)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	// Find start room
	startRoom, hasStart := level.Rooms[level.StartRoomID]
	require.True(t, hasStart, "Level should have a start room")
	assert.Equal(t, RoomTypeStart, startRoom.Type)

	// Find boss room
	bossRoom, hasBoss := level.Rooms[level.BossRoomID]
	require.True(t, hasBoss, "Level should have a boss room")
	assert.Equal(t, RoomTypeBoss, bossRoom.Type)
}

func TestGenerateLevelRoomsHaveConnections(t *testing.T) {
	gen := NewLevelGenerator(11111)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	// Count rooms with connections (excluding corridors which are created during connection)
	connectedRooms := 0
	for _, room := range level.Rooms {
		if len(room.Connections) > 0 {
			connectedRooms++
		}
	}

	// At least some rooms should have connections
	assert.Greater(t, connectedRooms, 0, "Some rooms should have connections")
}

func TestGenerateLevelEnemySpawns(t *testing.T) {
	gen := NewLevelGenerator(22222)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	// Count rooms with enemy spawns
	roomsWithEnemies := 0
	totalSpawns := 0
	for _, room := range level.Rooms {
		if len(room.EnemySpawns) > 0 {
			roomsWithEnemies++
			for _, spawn := range room.EnemySpawns {
				totalSpawns += spawn.Count
			}
		}
	}

	// Combat, arena, and boss rooms should have enemies
	assert.Greater(t, roomsWithEnemies, 0, "Some rooms should have enemy spawns")
	assert.Greater(t, totalSpawns, 0, "Level should have some enemies to spawn")
}

func TestGenerateLevelStartRoomNoEnemies(t *testing.T) {
	gen := NewLevelGenerator(33333)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	startRoom, hasStart := level.Rooms[level.StartRoomID]
	require.True(t, hasStart)

	assert.Empty(t, startRoom.EnemySpawns, "Start room should have no enemy spawns")
}

func TestGenerateLevelBossRoomHasEnemies(t *testing.T) {
	gen := NewLevelGenerator(44444)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	bossRoom, hasBoss := level.Rooms[level.BossRoomID]
	require.True(t, hasBoss)

	assert.NotEmpty(t, bossRoom.EnemySpawns, "Boss room should have enemy spawns")
}

func TestGenerateLevelSpawnPoint(t *testing.T) {
	gen := NewLevelGenerator(55555)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	// Spawn point should be within level bounds
	assert.GreaterOrEqual(t, level.SpawnPoint.X, level.Bounds.Min.X)
	assert.LessOrEqual(t, level.SpawnPoint.X, level.Bounds.Max.X)
	assert.GreaterOrEqual(t, level.SpawnPoint.Z, level.Bounds.Min.Z)
	assert.LessOrEqual(t, level.SpawnPoint.Z, level.Bounds.Max.Z)
}

func TestGenerateLevelDeterministic(t *testing.T) {
	// Same seed should produce same level
	gen1 := NewLevelGenerator(99999)
	level1 := gen1.GenerateLevel(100.0, 100.0, 4)

	gen2 := NewLevelGenerator(99999)
	level2 := gen2.GenerateLevel(100.0, 100.0, 4)

	assert.Equal(t, len(level1.Rooms), len(level2.Rooms))
	assert.Equal(t, level1.StartRoomID, level2.StartRoomID)
	assert.Equal(t, level1.BossRoomID, level2.BossRoomID)
	assert.Equal(t, level1.SpawnPoint, level2.SpawnPoint)
}

func TestGenerateLevelDifferentSeeds(t *testing.T) {
	// Different seeds should produce different levels
	gen1 := NewLevelGenerator(11111)
	level1 := gen1.GenerateLevel(100.0, 100.0, 4)

	gen2 := NewLevelGenerator(22222)
	level2 := gen2.GenerateLevel(100.0, 100.0, 4)

	// Levels should differ in some way
	different := level1.StartRoomID != level2.StartRoomID ||
		level1.BossRoomID != level2.BossRoomID ||
		level1.SpawnPoint != level2.SpawnPoint ||
		len(level1.Rooms) != len(level2.Rooms)

	assert.True(t, different, "Different seeds should produce different levels")
}

func TestRoomSerialize(t *testing.T) {
	room := &Room{
		ID:   "room-1",
		Type: RoomTypeCombat,
		Position: Vector3{X: 10, Y: 0, Z: 20},
		Size:     Vector3{X: 16, Y: 4, Z: 16},
		Rotation: 0,
		Connections: []RoomConnection{
			{
				TargetRoomID: "room-2",
				Direction:    DirEast,
				DoorPosition: Vector3{X: 18, Y: 0, Z: 20},
			},
		},
		EnemySpawns: []EnemySpawnPoint{
			{
				Position:   Vector3{X: 10, Y: 0, Z: 20},
				EnemyTypes: []string{"zombie", "skeleton"},
				Count:      3,
			},
		},
		Lighting: RoomLighting{
			AmbientColor:     [3]float64{0.6, 0.5, 0.4},
			AmbientIntensity: 0.4,
			FogEnabled:       true,
			FogColor:         [3]float64{0.1, 0.1, 0.1},
			FogDensity:       0.01,
		},
	}

	data := room.Serialize()

	assert.Equal(t, "room-1", data["id"])
	assert.Equal(t, "combat", data["type"])

	pos := data["position"].(map[string]interface{})
	assert.Equal(t, 10.0, pos["x"])
	assert.Equal(t, 0.0, pos["y"])
	assert.Equal(t, 20.0, pos["z"])

	connections := data["connections"].([]map[string]interface{})
	assert.Len(t, connections, 1)
	assert.Equal(t, "room-2", connections[0]["targetRoomID"])
	assert.Equal(t, "east", connections[0]["direction"])

	spawns := data["enemySpawns"].([]map[string]interface{})
	assert.Len(t, spawns, 1)
	assert.Equal(t, 3, spawns[0]["count"])

	lighting := data["lighting"].(map[string]interface{})
	assert.Equal(t, true, lighting["fogEnabled"])
}

func TestLevelSerialize(t *testing.T) {
	gen := NewLevelGenerator(12345)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	data := level.Serialize()

	assert.NotEmpty(t, data["id"])
	assert.Equal(t, int64(12345), data["seed"])
	assert.NotEmpty(t, data["rooms"])
	assert.NotEmpty(t, data["startRoomID"])
	assert.NotEmpty(t, data["bossRoomID"])

	spawnPoint := data["spawnPoint"].(map[string]interface{})
	assert.Contains(t, spawnPoint, "x")
	assert.Contains(t, spawnPoint, "y")
	assert.Contains(t, spawnPoint, "z")

	bounds := data["bounds"].(map[string]interface{})
	assert.Contains(t, bounds, "min")
	assert.Contains(t, bounds, "max")
}

func TestRoomTypesAssigned(t *testing.T) {
	gen := NewLevelGenerator(77777)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	roomTypes := make(map[RoomType]int)
	for _, room := range level.Rooms {
		roomTypes[room.Type]++
	}

	// Should have exactly one start and one boss room
	assert.Equal(t, 1, roomTypes[RoomTypeStart], "Should have exactly 1 start room")
	assert.Equal(t, 1, roomTypes[RoomTypeBoss], "Should have exactly 1 boss room")

	// Should have some corridor rooms (created during room connection)
	assert.Greater(t, roomTypes[RoomTypeCorridor], 0, "Should have corridor rooms")
}

func TestRoomLightingGenerated(t *testing.T) {
	gen := NewLevelGenerator(88888)
	level := gen.GenerateLevel(100.0, 100.0, 4)

	for _, room := range level.Rooms {
		// All rooms should have lighting configured
		assert.NotEqual(t, RoomLighting{}, room.Lighting, "Room %s should have lighting", room.ID)
		assert.Greater(t, room.Lighting.AmbientIntensity, 0.0, "Room %s should have ambient intensity", room.ID)
	}
}

func TestLevelBoundsCorrect(t *testing.T) {
	gen := NewLevelGenerator(66666)
	width := 150.0
	height := 120.0
	level := gen.GenerateLevel(width, height, 4)

	assert.Equal(t, 0.0, level.Bounds.Min.X)
	assert.Equal(t, 0.0, level.Bounds.Min.Z)
	assert.Equal(t, width, level.Bounds.Max.X)
	assert.Equal(t, height, level.Bounds.Max.Z)
}
