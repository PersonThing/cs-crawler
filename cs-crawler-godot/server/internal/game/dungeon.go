package game

import (
	"log"
	"math"
	"math/rand"
)

// DungeonConfig holds generation parameters for a dungeon
type DungeonConfig struct {
	MinTiles   int
	MaxTiles   int
	Biome      string
	Difficulty int
}

// GenerateDungeon creates a set of connected dungeon tiles on layer -1
// beneath the given entrance coordinate. Returns the generated tiles.
// The first tile connects back to the entrance; the last tile is the boss room.
func GenerateDungeon(entranceCoord HexCoord, biome string, difficulty int, rng *rand.Rand) []*Tile {
	cfg := DungeonConfig{
		MinTiles:   3,
		MaxTiles:   3 + difficulty, // harder dungeons are bigger
		Biome:      biome,
		Difficulty: difficulty,
	}

	if cfg.MaxTiles > 7 {
		cfg.MaxTiles = 7
	}

	numTiles := cfg.MinTiles + rng.Intn(cfg.MaxTiles-cfg.MinTiles+1)

	// The first dungeon tile is directly below the entrance
	startCoord := HexCoord{Q: entranceCoord.Q, R: entranceCoord.R, Layer: -1}

	// Random walk to pick dungeon tile positions
	coords := generateDungeonLayout(startCoord, numTiles, rng)

	tiles := make([]*Tile, 0, len(coords))

	for i, coord := range coords {
		tile := NewTile(coord, biome, TileTypeDungeon, difficulty)

		// First tile: entrance room
		if i == 0 {
			tile.DungeonExitPos = &Vector3{}
			exitTarget := entranceCoord
			tile.DungeonExitTarget = &exitTarget
		}

		// Last tile: boss room
		isBoss := i == len(coords)-1

		generateDungeonTileContent(tile, coords, i, isBoss, rng)
		tile.Generated = true

		tiles = append(tiles, tile)
	}

	log.Printf("[DUNGEON] Generated %d-tile dungeon below (%d,%d) biome=%s difficulty=%d",
		len(tiles), entranceCoord.Q, entranceCoord.R, biome, difficulty)

	return tiles
}

// generateDungeonLayout does a random walk on layer -1 to pick connected hex positions.
func generateDungeonLayout(start HexCoord, count int, rng *rand.Rand) []HexCoord {
	coords := []HexCoord{start}
	used := map[HexCoord]bool{start: true}

	for len(coords) < count {
		// Pick a random existing tile to branch from
		branchFrom := coords[rng.Intn(len(coords))]

		// Try random directions
		dirs := rng.Perm(6)
		added := false
		for _, dir := range dirs {
			neighbor := HexNeighbor(branchFrom, dir)
			neighbor.Layer = start.Layer // keep on same layer
			if !used[neighbor] {
				coords = append(coords, neighbor)
				used[neighbor] = true
				added = true
				break
			}
		}

		// If all neighbors are taken, just continue (will try another branch point)
		if !added {
			// Safety: if truly stuck, break
			if len(used) >= 19 { // max possible in 2-ring area
				break
			}
		}
	}

	return coords
}

// generateDungeonTileContent fills a dungeon tile with features, spawns, lighting, and edge paths.
func generateDungeonTileContent(tile *Tile, allCoords []HexCoord, index int, isBoss bool, rng *rand.Rand) {
	center := HexToWorld(tile.Coord)

	// Build set of all dungeon coords for neighbor checking
	coordSet := make(map[HexCoord]bool)
	for _, c := range allCoords {
		coordSet[c] = true
	}

	// Edge paths: open edges only toward adjacent dungeon tiles
	for dir := 0; dir < 6; dir++ {
		neighbor := HexNeighbor(tile.Coord, dir)
		neighbor.Layer = tile.Coord.Layer
		tile.EdgePaths[dir] = coordSet[neighbor]
	}

	// Dark dungeon lighting
	tile.Lighting = TileLighting{
		AmbientColor:     [3]float64{0.15, 0.12, 0.2},
		AmbientIntensity: 0.08,
		FogEnabled:       true,
		FogColor:         [3]float64{0.03, 0.03, 0.05},
		FogDensity:       0.04,
	}

	// Boss room gets slightly different lighting
	if isBoss {
		tile.Lighting.AmbientColor = [3]float64{0.3, 0.1, 0.1}
		tile.Lighting.AmbientIntensity = 0.12
		tile.Lighting.FogColor = [3]float64{0.08, 0.02, 0.02}
	}

	// Features: place environmental lights (braziers) along open edges
	for dir := 0; dir < 6; dir++ {
		if !tile.EdgePaths[dir] {
			continue
		}
		// Place a brazier near the open edge
		angle := math.Pi / 180.0 * float64(60*dir)
		dist := HexSize * 0.75
		tile.Features = append(tile.Features, TerrainFeature{
			Type: FeatureBrazier,
			Position: Vector3{
				X: center.X + dist*math.Cos(angle),
				Y: center.Y,
				Z: center.Z + dist*math.Sin(angle),
			},
			Scale: 1.0,
		})
	}

	// Scatter some rocks and pillars
	numFeatures := 2 + rng.Intn(4)
	dungeonFeatures := []TerrainFeatureType{FeatureRockSmall, FeatureRockLarge, FeatureRuinPillar}
	for i := 0; i < numFeatures; i++ {
		angle := rng.Float64() * 2.0 * math.Pi
		dist := rng.Float64() * HexSize * 0.5
		tile.Features = append(tile.Features, TerrainFeature{
			Type: dungeonFeatures[rng.Intn(len(dungeonFeatures))],
			Position: Vector3{
				X: center.X + dist*math.Cos(angle),
				Y: center.Y,
				Z: center.Z + dist*math.Sin(angle),
			},
			Rotation: rng.Float64() * 360.0,
			Scale:    0.7 + rng.Float64()*0.6,
		})
	}

	// Entrance tile: add exit marker
	if index == 0 {
		tile.DungeonExitPos = &Vector3{X: center.X, Y: center.Y, Z: center.Z}
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureStaircase,
			Position: Vector3{X: center.X, Y: center.Y, Z: center.Z},
			Scale:    1.5,
		})
	}

	// Boss room: special features
	if isBoss {
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X - 3, Y: center.Y, Z: center.Z - 3},
			Scale:    2.0,
		})
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X + 3, Y: center.Y, Z: center.Z - 3},
			Scale:    2.0,
		})
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X - 3, Y: center.Y, Z: center.Z + 3},
			Scale:    2.0,
		})
		tile.Features = append(tile.Features, TerrainFeature{
			Type:     FeatureRuinPillar,
			Position: Vector3{X: center.X + 3, Y: center.Y, Z: center.Z + 3},
			Scale:    2.0,
		})
	}

	// Enemy spawns
	enemyTypes := []string{"skeleton", "zombie", "mage"}
	if tile.Difficulty >= 3 {
		enemyTypes = append(enemyTypes, "shaman", "charger")
	}

	if isBoss {
		// Boss room: one big cluster + boss enemy type
		bossTypes := append([]string{"tank"}, enemyTypes...)
		tile.Spawns = append(tile.Spawns, EnemySpawnPoint{
			Position:   Vector3{X: center.X, Y: center.Y, Z: center.Z - 3},
			EnemyTypes: bossTypes,
			Count:      2 + tile.Difficulty,
		})
	} else if index > 0 {
		// Regular dungeon rooms: 1-2 spawn clusters
		clusters := 1 + rng.Intn(2)
		totalEnemies := 2 + tile.Difficulty + rng.Intn(2)
		perCluster := totalEnemies / clusters

		for c := 0; c < clusters; c++ {
			angle := rng.Float64() * 2.0 * math.Pi
			dist := 2.0 + rng.Float64()*HexSize*0.3
			count := perCluster
			if c == clusters-1 {
				count = totalEnemies - perCluster*(clusters-1)
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
	// Entrance room (index 0) has no spawns - safe landing zone
}
