package game

import (
	"math"
	"math/rand"
)

// TileType defines the category of a hex tile
type TileType string

const (
	TileTypeTown            TileType = "town"
	TileTypeOverworld       TileType = "overworld"
	TileTypeDungeonEntrance TileType = "dungeon_entrance"
	TileTypeDungeon         TileType = "dungeon"
)

// TerrainFeatureType identifies a placed terrain feature
type TerrainFeatureType string

const (
	FeatureTreeOak     TerrainFeatureType = "tree_oak"
	FeatureRockSmall   TerrainFeatureType = "rock_small"
	FeatureRockLarge   TerrainFeatureType = "rock_large"
	FeatureBush        TerrainFeatureType = "bush"
	FeatureFlowerPatch TerrainFeatureType = "flower_patch"
	FeatureRuinPillar  TerrainFeatureType = "ruin_pillar"
	FeatureCampfire    TerrainFeatureType = "campfire"
	FeatureMarketStall TerrainFeatureType = "market_stall"
	FeatureBrazier     TerrainFeatureType = "brazier"
	FeatureStaircase   TerrainFeatureType = "staircase"
)

// EnemySpawnPoint defines where enemies can spawn within a tile
type EnemySpawnPoint struct {
	Position   Vector3  `json:"position"`
	EnemyTypes []string `json:"enemyTypes"` // Possible enemy types to spawn
	Count      int      `json:"count"`      // How many enemies to spawn here
}

// TerrainFeature is a placed object within a tile
type TerrainFeature struct {
	Type     TerrainFeatureType `json:"type"`
	Position Vector3            `json:"position"` // world-space position
	Rotation float64            `json:"rotation"` // Y-axis rotation in degrees
	Scale    float64            `json:"scale"`
}

// TileLighting defines the atmospheric properties of a tile
type TileLighting struct {
	AmbientColor     [3]float64 `json:"ambientColor"`
	AmbientIntensity float64    `json:"ambientIntensity"`
	FogEnabled       bool       `json:"fogEnabled"`
	FogColor         [3]float64 `json:"fogColor"`
	FogDensity       float64    `json:"fogDensity"`
}

// Tile represents a single hex tile in the world
type Tile struct {
	Coord      HexCoord         `json:"coord"`
	Biome      string           `json:"biome"`
	TileType   TileType         `json:"tileType"`
	Difficulty int              `json:"difficulty"`
	Generated  bool             `json:"generated"`
	Explored   bool             `json:"explored"`   // whether any player has visited
	EdgePaths  [6]bool          `json:"edgePaths"`  // which hex edges have paths to neighbors
	Features   []TerrainFeature `json:"features"`
	Spawns     []EnemySpawnPoint `json:"spawns"`
	Lighting   TileLighting     `json:"lighting"`

	// Dungeon entrance (only for TileTypeDungeonEntrance)
	DungeonEntryPos   *Vector3  `json:"dungeonEntryPos,omitempty"`
	DungeonTargetTile *HexCoord `json:"dungeonTargetTile,omitempty"`

	// Dungeon exit (only for first dungeon tile)
	DungeonExitPos    *Vector3  `json:"dungeonExitPos,omitempty"`
	DungeonExitTarget *HexCoord `json:"dungeonExitTarget,omitempty"`

	// Runtime state (not serialized to clients)
	Entities map[string]bool `json:"-"` // entity IDs currently in this tile
	Active   bool            `json:"-"` // whether this tile is being simulated
}

// NewTile creates a new ungenerated tile at the given coordinate
func NewTile(coord HexCoord, biome string, tileType TileType, difficulty int) *Tile {
	return &Tile{
		Coord:      coord,
		Biome:      biome,
		TileType:   tileType,
		Difficulty: difficulty,
		Generated:  false,
		Explored:   false,
		Features:   make([]TerrainFeature, 0),
		Spawns:     make([]EnemySpawnPoint, 0),
		Entities:   make(map[string]bool),
	}
}

// GenerateTile populates a tile with terrain features, spawn points, and lighting.
// neighborEdges maps direction index (0-5) to whether the neighbor has a path on the opposite edge.
// Pass nil if neighbor is ungenerated.
func GenerateTile(tile *Tile, rng *rand.Rand, neighborEdges map[int]bool) {
	if tile.Generated {
		return
	}

	center := HexToWorld(tile.Coord)

	switch tile.TileType {
	case TileTypeTown:
		generateTownTile(tile, center, rng)
	case TileTypeOverworld, TileTypeDungeonEntrance:
		generateOverworldTile(tile, center, rng, neighborEdges)
	case TileTypeDungeon:
		generateDungeonTile(tile, center, rng)
	}

	tile.Generated = true
}

func generateTownTile(tile *Tile, center Vector3, rng *rand.Rand) {
	// Town has warm, bright lighting
	tile.Lighting = TileLighting{
		AmbientColor:     [3]float64{1.0, 0.95, 0.85},
		AmbientIntensity: 0.9,
		FogEnabled:       false,
	}

	// All edges have paths (town is always accessible)
	for i := range tile.EdgePaths {
		tile.EdgePaths[i] = true
	}

	// Place town features
	tile.Features = append(tile.Features, TerrainFeature{
		Type:     FeatureCampfire,
		Position: Vector3{X: center.X, Y: center.Y, Z: center.Z},
		Scale:    1.5,
	})

	// Market stalls around the center
	for i := 0; i < 3; i++ {
		angle := float64(i) * (2.0 * 3.14159 / 3.0)
		dist := 4.0 + rng.Float64()*2.0
		tile.Features = append(tile.Features, TerrainFeature{
			Type: FeatureMarketStall,
			Position: Vector3{
				X: center.X + dist*math.Cos(angle),
				Y: center.Y,
				Z: center.Z + dist*math.Sin(angle),
			},
			Rotation: angle * (180.0 / 3.14159),
			Scale:    1.0,
		})
	}

	// No enemy spawns in town
}

// biomeZoneProfile returns lighting and feature config for a biome.
func biomeZoneProfile(biome string) TileLighting {
	switch biome {
	case "forest":
		return TileLighting{
			AmbientColor:     [3]float64{0.6, 0.75, 0.5},
			AmbientIntensity: 0.7,
			FogEnabled:       true,
			FogColor:         [3]float64{0.3, 0.4, 0.3},
			FogDensity:       0.008,
		}
	case "hills":
		return TileLighting{
			AmbientColor:     [3]float64{0.85, 0.8, 0.65},
			AmbientIntensity: 0.9,
			FogEnabled:       true,
			FogColor:         [3]float64{0.7, 0.7, 0.65},
			FogDensity:       0.004,
		}
	default: // grassland
		return TileLighting{
			AmbientColor:     [3]float64{0.95, 0.9, 0.7},
			AmbientIntensity: 0.85,
			FogEnabled:       false,
		}
	}
}

func generateOverworldTile(tile *Tile, center Vector3, rng *rand.Rand, neighborEdges map[int]bool) {
	tile.Lighting = biomeZoneProfile(tile.Biome)

	// Generate edge paths: at least 2 edges open, up to 4
	numPaths := 2 + rng.Intn(3) // 2-4 paths
	pathDirs := rng.Perm(6)
	for i := 0; i < numPaths && i < 6; i++ {
		tile.EdgePaths[pathDirs[i]] = true
	}

	// Match neighbor edges if they're already generated
	for dir, hasPath := range neighborEdges {
		oppositeDir := (dir + 3) % 6
		if hasPath {
			tile.EdgePaths[oppositeDir] = true
		}
	}

	// Scatter terrain features based on biome
	var featureTypes []TerrainFeatureType
	var numFeatures int
	switch tile.Biome {
	case "forest":
		featureTypes = []TerrainFeatureType{FeatureTreeOak, FeatureTreeOak, FeatureBush, FeatureRockSmall}
		numFeatures = 8 + rng.Intn(6) // 8-13 dense features
	case "hills":
		featureTypes = []TerrainFeatureType{FeatureRockSmall, FeatureRockLarge, FeatureBush, FeatureFlowerPatch}
		numFeatures = 4 + rng.Intn(5) // 4-8 sparse features
	default: // grassland
		featureTypes = []TerrainFeatureType{FeatureTreeOak, FeatureRockSmall, FeatureBush, FeatureFlowerPatch}
		numFeatures = 5 + rng.Intn(8) // 5-12 features
	}
	for i := 0; i < numFeatures; i++ {
		// Random position within hex bounds (use 70% of hex radius to keep away from edges)
		angle := rng.Float64() * 2.0 * 3.14159
		dist := rng.Float64() * HexSize * 0.7
		tile.Features = append(tile.Features, TerrainFeature{
			Type: featureTypes[rng.Intn(len(featureTypes))],
			Position: Vector3{
				X: center.X + dist*math.Cos(angle),
				Y: center.Y,
				Z: center.Z + dist*math.Sin(angle),
			},
			Rotation: rng.Float64() * 360.0,
			Scale:    0.8 + rng.Float64()*0.4,
		})
	}

	// Enemy spawns based on difficulty
	enemyCount := tile.Difficulty + rng.Intn(tile.Difficulty+1)
	if enemyCount > 0 {
		enemyTypes := []string{"zombie", "skeleton"}
		if tile.Difficulty >= 2 {
			enemyTypes = append(enemyTypes, "archer", "mage")
		}
		if tile.Difficulty >= 3 {
			enemyTypes = append(enemyTypes, "charger", "shaman")
		}

		// Create 1-3 spawn clusters
		clusters := 1 + rng.Intn(min(3, enemyCount))
		perCluster := enemyCount / clusters

		for c := 0; c < clusters; c++ {
			angle := rng.Float64() * 2.0 * 3.14159
			dist := 3.0 + rng.Float64()*HexSize*0.4
			count := perCluster
			if c == clusters-1 {
				count = enemyCount - perCluster*(clusters-1)
			}
			tile.Spawns = append(tile.Spawns, EnemySpawnPoint{
				Position: Vector3{
					X: center.X + dist*math.Cos(angle),
					Y: center.Y,
					Z: center.Z + dist*math.Sin(angle),
				},
				EnemyTypes: enemyTypes,
				Count:      count,
			})
		}
	}

	// If this is a dungeon entrance, place the entry point and darken the tile
	if tile.TileType == TileTypeDungeonEntrance {
		tile.DungeonEntryPos = &Vector3{
			X: center.X,
			Y: center.Y,
			Z: center.Z,
		}
		// Darken the entrance tile slightly to hint at the dungeon below
		tile.Lighting.AmbientIntensity *= 0.6
		tile.Lighting.FogEnabled = true
		tile.Lighting.FogColor = [3]float64{0.15, 0.12, 0.18}
		tile.Lighting.FogDensity = 0.015

		// Add visual markers (ruin pillars flanking entrance)
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X - 2, Y: center.Y, Z: center.Z},
			Scale:    1.5,
		})
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X + 2, Y: center.Y, Z: center.Z},
			Scale:    1.5,
		})
		// Braziers at the entrance
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureBrazier,
			Position: Vector3{X: center.X - 3, Y: center.Y, Z: center.Z + 1},
			Scale:    1.0,
		})
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureBrazier,
			Position: Vector3{X: center.X + 3, Y: center.Y, Z: center.Z + 1},
			Scale:    1.0,
		})
	}
}

func generateDungeonTile(tile *Tile, center Vector3, rng *rand.Rand) {
	// Dungeon tiles are generated by dungeon.go's GenerateDungeon/generateDungeonTileContent.
	// This fallback only applies if a dungeon tile somehow goes through the normal path.
	tile.Lighting = TileLighting{
		AmbientColor:     [3]float64{0.15, 0.12, 0.2},
		AmbientIntensity: 0.08,
		FogEnabled:       true,
		FogColor:         [3]float64{0.03, 0.03, 0.05},
		FogDensity:       0.04,
	}
}

// Serialize converts a tile to a map for JSON transmission to clients
func (t *Tile) Serialize() map[string]interface{} {
	features := make([]map[string]interface{}, 0, len(t.Features))
	for _, f := range t.Features {
		features = append(features, map[string]interface{}{
			"type":     string(f.Type),
			"position": map[string]interface{}{"x": f.Position.X, "y": f.Position.Y, "z": f.Position.Z},
			"rotation": f.Rotation,
			"scale":    f.Scale,
		})
	}

	spawns := make([]map[string]interface{}, 0, len(t.Spawns))
	for _, s := range t.Spawns {
		spawns = append(spawns, map[string]interface{}{
			"position":   map[string]interface{}{"x": s.Position.X, "y": s.Position.Y, "z": s.Position.Z},
			"enemyTypes": s.EnemyTypes,
			"count":      s.Count,
		})
	}

	result := map[string]interface{}{
		"coord":    map[string]interface{}{"q": t.Coord.Q, "r": t.Coord.R, "layer": t.Coord.Layer},
		"biome":    t.Biome,
		"tileType": string(t.TileType),
		"difficulty": t.Difficulty,
		"edgePaths": t.EdgePaths,
		"features":  features,
		"spawns":    spawns,
		"lighting": map[string]interface{}{
			"ambientColor":     t.Lighting.AmbientColor,
			"ambientIntensity": t.Lighting.AmbientIntensity,
			"fogEnabled":       t.Lighting.FogEnabled,
			"fogColor":         t.Lighting.FogColor,
			"fogDensity":       t.Lighting.FogDensity,
		},
	}

	if t.DungeonEntryPos != nil {
		result["dungeonEntryPos"] = map[string]interface{}{
			"x": t.DungeonEntryPos.X, "y": t.DungeonEntryPos.Y, "z": t.DungeonEntryPos.Z,
		}
	}

	if t.DungeonTargetTile != nil {
		result["dungeonTargetTile"] = map[string]interface{}{
			"q": t.DungeonTargetTile.Q, "r": t.DungeonTargetTile.R, "layer": t.DungeonTargetTile.Layer,
		}
	}

	if t.DungeonExitPos != nil {
		result["dungeonExitPos"] = map[string]interface{}{
			"x": t.DungeonExitPos.X, "y": t.DungeonExitPos.Y, "z": t.DungeonExitPos.Z,
		}
	}

	if t.DungeonExitTarget != nil {
		result["dungeonExitTarget"] = map[string]interface{}{
			"q": t.DungeonExitTarget.Q, "r": t.DungeonExitTarget.R, "layer": t.DungeonExitTarget.Layer,
		}
	}

	return result
}

// SerializeSummary returns a lightweight summary for the board overview
func (t *Tile) SerializeSummary() map[string]interface{} {
	return map[string]interface{}{
		"coord":    map[string]interface{}{"q": t.Coord.Q, "r": t.Coord.R, "layer": t.Coord.Layer},
		"biome":    t.Biome,
		"tileType": string(t.TileType),
		"difficulty": t.Difficulty,
		"explored":   t.Explored,
	}
}

