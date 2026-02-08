package game

import "math"

// HexCoord represents a position in the hex grid using axial coordinates
// with a vertical layer for dungeon depth.
type HexCoord struct {
	Q     int `json:"q"`
	R     int `json:"r"`
	Layer int `json:"layer"` // 0 = surface, -1 = depth 1, etc.
}

// Hex direction vectors in axial coordinates (flat-top hexagon)
var HexDirections = [6]HexCoord{
	{Q: 1, R: 0},  // East
	{Q: 1, R: -1}, // NE
	{Q: 0, R: -1}, // NW
	{Q: -1, R: 0}, // West
	{Q: -1, R: 1}, // SW
	{Q: 0, R: 1},  // SE
}

// HexSize is the outer radius of each hex in world units (center to vertex).
// For a flat-top hex, the width is 2*HexSize and the height is sqrt(3)*HexSize.
// At HexSize=12, width=24 which gives roughly one screen of content.
const HexSize = 12.0

// HexNeighbor returns the neighbor of coord in the given direction (0-5).
func HexNeighbor(coord HexCoord, direction int) HexCoord {
	d := HexDirections[direction%6]
	return HexCoord{
		Q:     coord.Q + d.Q,
		R:     coord.R + d.R,
		Layer: coord.Layer,
	}
}

// HexNeighbors returns all 6 neighbors of a hex coordinate.
func HexNeighbors(coord HexCoord) [6]HexCoord {
	var neighbors [6]HexCoord
	for i := 0; i < 6; i++ {
		neighbors[i] = HexNeighbor(coord, i)
	}
	return neighbors
}

// HexDistance returns the grid distance between two hex coordinates on the same layer.
// Uses the cube coordinate distance formula.
func HexDistance(a, b HexCoord) int {
	// Convert axial to cube: s = -q - r
	aq, ar := a.Q, a.R
	as := -aq - ar
	bq, br := b.Q, b.R
	bs := -bq - br

	dq := aq - bq
	dr := ar - br
	ds := as - bs
	if dq < 0 {
		dq = -dq
	}
	if dr < 0 {
		dr = -dr
	}
	if ds < 0 {
		ds = -ds
	}

	return max(dq, max(dr, ds))
}

// HexRing returns all hex coordinates at exactly the given radius from center.
func HexRing(center HexCoord, radius int) []HexCoord {
	if radius == 0 {
		return []HexCoord{center}
	}

	results := make([]HexCoord, 0, 6*radius)

	// Start at the hex 'radius' steps in direction 4 (SW) from center
	current := center
	for i := 0; i < radius; i++ {
		current = HexNeighbor(current, 4) // SW
	}

	// Walk around the ring
	for dir := 0; dir < 6; dir++ {
		for step := 0; step < radius; step++ {
			results = append(results, current)
			current = HexNeighbor(current, dir)
		}
	}

	return results
}

// HexSpiral returns all hex coordinates from center outward up to (and including) the given radius.
func HexSpiral(center HexCoord, radius int) []HexCoord {
	results := []HexCoord{center}
	for r := 1; r <= radius; r++ {
		results = append(results, HexRing(center, r)...)
	}
	return results
}

// HexToWorld converts hex axial coordinates to world space position.
// Returns the center of the hex in world XZ coordinates.
// Uses flat-top hex orientation. Y is determined by the layer.
func HexToWorld(coord HexCoord) Vector3 {
	// Flat-top hex:
	// x = size * (3/2 * q)
	// z = size * (sqrt(3)/2 * q + sqrt(3) * r)
	x := HexSize * (1.5 * float64(coord.Q))
	z := HexSize * (math.Sqrt(3)/2*float64(coord.Q) + math.Sqrt(3)*float64(coord.R))
	y := float64(coord.Layer) * -20.0 // Each layer is 20 units below the previous

	return Vector3{X: x, Y: y, Z: z}
}

// WorldToHex converts a world space position to the nearest hex coordinate.
// Layer must be provided separately since Y position alone is ambiguous.
func WorldToHex(pos Vector3, layer int) HexCoord {
	// Inverse of HexToWorld for flat-top hex
	q := pos.X / (HexSize * 1.5)
	r := (pos.Z/HexSize - math.Sqrt(3)/2*q) / math.Sqrt(3)

	return hexRound(q, r, layer)
}

// hexRound rounds fractional hex coordinates to the nearest hex.
func hexRound(fq, fr float64, layer int) HexCoord {
	fs := -fq - fr

	rq := math.Round(fq)
	rr := math.Round(fr)
	rs := math.Round(fs)

	dq := math.Abs(rq - fq)
	dr := math.Abs(rr - fr)
	ds := math.Abs(rs - fs)

	if dq > dr && dq > ds {
		rq = -rr - rs
	} else if dr > ds {
		rr = -rq - rs
	}
	// else rs = -rq - rr (we don't need rs for axial)

	return HexCoord{Q: int(rq), R: int(rr), Layer: layer}
}

// HexVertices returns the 6 world-space vertex positions of a hex (flat-top, on XZ plane).
func HexVertices(coord HexCoord) [6]Vector3 {
	center := HexToWorld(coord)
	var vertices [6]Vector3
	for i := 0; i < 6; i++ {
		angle := math.Pi / 180.0 * float64(60*i) // flat-top: starts at 0 degrees
		vertices[i] = Vector3{
			X: center.X + HexSize*math.Cos(angle),
			Y: center.Y,
			Z: center.Z + HexSize*math.Sin(angle),
		}
	}
	return vertices
}

// HexContainsWorld checks if a world position is inside the given hex.
func HexContainsWorld(coord HexCoord, pos Vector3) bool {
	nearest := WorldToHex(pos, coord.Layer)
	return nearest.Q == coord.Q && nearest.R == coord.R
}
