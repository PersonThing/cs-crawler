package game

import (
	"log"
	"math/rand"
)

// Board represents the hex grid layout for a game world.
// It holds the metadata for all tiles and manages generation.
type Board struct {
	Seed  int64
	Rings int // number of rings around town (determines board size)
	rng   *rand.Rand

	Tiles map[HexCoord]*Tile // all tiles (generated or not)
}

// NewBoard creates a new board with the given seed and ring count.
// It places the town at center and assigns biomes and tile types.
func NewBoard(seed int64, rings int) *Board {
	rng := rand.New(rand.NewSource(seed))

	b := &Board{
		Seed:  seed,
		Rings: rings,
		rng:   rng,
		Tiles: make(map[HexCoord]*Tile),
	}

	b.generateLayout()
	return b
}

// generateLayout creates the board structure without generating tile content.
func (b *Board) generateLayout() {
	center := HexCoord{Q: 0, R: 0, Layer: 0}

	// Place town at center
	town := NewTile(center, "town", TileTypeTown, 0)
	b.Tiles[center] = town

	// Fill rings
	for ring := 1; ring <= b.Rings; ring++ {
		coords := HexRing(center, ring)
		for _, coord := range coords {
			biome := b.assignBiome(coord, ring)
			tileType := TileTypeOverworld

			// Place at least one dungeon entrance per ring
			// Use deterministic selection based on position in ring
			b.Tiles[coord] = NewTile(coord, biome, tileType, ring)
		}

		// Pick one random tile in this ring to be a dungeon entrance
		entranceIdx := b.rng.Intn(len(coords))
		entranceCoord := coords[entranceIdx]
		b.Tiles[entranceCoord].TileType = TileTypeDungeonEntrance
	}

	log.Printf("[BOARD] Generated layout: %d tiles, %d rings, seed %d", len(b.Tiles), b.Rings, b.Seed)
}

// assignBiome picks a biome for a tile based on its position.
// Uses simple noise-like distribution for now; WFC comes in Phase 6.
func (b *Board) assignBiome(coord HexCoord, ring int) string {
	// Simple deterministic biome assignment based on angle from center
	// This creates wedge-shaped biome regions
	biomes := []string{"grassland", "forest", "hills"}

	// Use q and r to create a simple hash
	hash := coord.Q*7 + coord.R*13 + int(b.Seed%97)
	if hash < 0 {
		hash = -hash
	}

	return biomes[hash%len(biomes)]
}

// GetTile returns the tile at the given coordinate, or nil.
func (b *Board) GetTile(coord HexCoord) *Tile {
	return b.Tiles[coord]
}

// EnsureTileGenerated generates tile content if not already generated.
// Returns the tile.
func (b *Board) EnsureTileGenerated(coord HexCoord) *Tile {
	tile := b.Tiles[coord]
	if tile == nil {
		return nil
	}

	if !tile.Generated {
		// Collect neighbor edge info
		neighborEdges := make(map[int]bool)
		for dir := 0; dir < 6; dir++ {
			neighbor := HexNeighbor(coord, dir)
			if nTile := b.Tiles[neighbor]; nTile != nil && nTile.Generated {
				// The neighbor's opposite edge
				oppositeDir := (dir + 3) % 6
				neighborEdges[dir] = nTile.EdgePaths[oppositeDir]
			}
		}

		GenerateTile(tile, b.rng, neighborEdges)
		log.Printf("[BOARD] Generated tile at (%d, %d, %d) biome=%s type=%s",
			coord.Q, coord.R, coord.Layer, tile.Biome, tile.TileType)
	}

	return tile
}

// GetActiveTilesForPlayer returns the set of tile coordinates that should
// be active for a player at the given position. This includes their current
// tile and all immediate neighbors.
func (b *Board) GetActiveTilesForPlayer(pos Vector3, layer int) []HexCoord {
	current := WorldToHex(pos, layer)
	result := []HexCoord{current}
	for _, n := range HexNeighbors(current) {
		if b.Tiles[n] != nil {
			result = append(result, n)
		}
	}
	return result
}

// GetTileDataForPlayer returns the set of tile coordinates that a player
// should receive full tile_data for. This is the current tile + neighbors.
func (b *Board) GetTileDataForPlayer(pos Vector3, layer int) []*Tile {
	coords := b.GetActiveTilesForPlayer(pos, layer)
	tiles := make([]*Tile, 0, len(coords))
	for _, coord := range coords {
		tile := b.EnsureTileGenerated(coord)
		if tile != nil {
			tiles = append(tiles, tile)
		}
	}
	return tiles
}

// SerializeBoardSummary returns a lightweight overview of all tiles
// for the client's minimap and board view.
func (b *Board) SerializeBoardSummary() map[string]interface{} {
	tiles := make([]map[string]interface{}, 0, len(b.Tiles))
	for _, tile := range b.Tiles {
		tiles = append(tiles, tile.SerializeSummary())
	}

	return map[string]interface{}{
		"seed":  b.Seed,
		"rings": b.Rings,
		"tiles": tiles,
	}
}

// GetSpawnPoint returns the world position where players should spawn (center of town).
func (b *Board) GetSpawnPoint() Vector3 {
	return HexToWorld(HexCoord{Q: 0, R: 0, Layer: 0})
}
