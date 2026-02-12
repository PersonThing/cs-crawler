package game

import (
	"math"
	"testing"
)

func TestHexNeighbors(t *testing.T) {
	center := HexCoord{Q: 0, R: 0, Layer: 0}
	neighbors := HexNeighbors(center)

	if len(neighbors) != 6 {
		t.Fatalf("expected 6 neighbors, got %d", len(neighbors))
	}

	// Each neighbor should be distance 1 from center
	for i, n := range neighbors {
		dist := HexDistance(center, n)
		if dist != 1 {
			t.Errorf("neighbor %d: expected distance 1, got %d (coord: %+v)", i, dist, n)
		}
	}

	// Neighbors should preserve layer
	layered := HexCoord{Q: 0, R: 0, Layer: -1}
	layeredNeighbors := HexNeighbors(layered)
	for _, n := range layeredNeighbors {
		if n.Layer != -1 {
			t.Errorf("expected layer -1, got %d", n.Layer)
		}
	}
}

func TestHexDistance(t *testing.T) {
	tests := []struct {
		a, b HexCoord
		want int
	}{
		{HexCoord{0, 0, 0}, HexCoord{0, 0, 0}, 0},
		{HexCoord{0, 0, 0}, HexCoord{1, 0, 0}, 1},
		{HexCoord{0, 0, 0}, HexCoord{0, 1, 0}, 1},
		{HexCoord{0, 0, 0}, HexCoord{2, -1, 0}, 2},
		{HexCoord{0, 0, 0}, HexCoord{3, 0, 0}, 3},
		{HexCoord{1, 1, 0}, HexCoord{-1, -1, 0}, 4},
	}

	for _, tt := range tests {
		got := HexDistance(tt.a, tt.b)
		if got != tt.want {
			t.Errorf("HexDistance(%+v, %+v) = %d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestHexRing(t *testing.T) {
	center := HexCoord{Q: 0, R: 0, Layer: 0}

	// Ring 0 should be just the center
	ring0 := HexRing(center, 0)
	if len(ring0) != 1 {
		t.Fatalf("ring 0: expected 1 hex, got %d", len(ring0))
	}
	if ring0[0] != center {
		t.Errorf("ring 0: expected center, got %+v", ring0[0])
	}

	// Ring 1 should have 6 hexes
	ring1 := HexRing(center, 1)
	if len(ring1) != 6 {
		t.Fatalf("ring 1: expected 6 hexes, got %d", len(ring1))
	}
	for _, h := range ring1 {
		dist := HexDistance(center, h)
		if dist != 1 {
			t.Errorf("ring 1: hex %+v has distance %d, expected 1", h, dist)
		}
	}

	// Ring 2 should have 12 hexes
	ring2 := HexRing(center, 2)
	if len(ring2) != 12 {
		t.Fatalf("ring 2: expected 12 hexes, got %d", len(ring2))
	}
	for _, h := range ring2 {
		dist := HexDistance(center, h)
		if dist != 2 {
			t.Errorf("ring 2: hex %+v has distance %d, expected 2", h, dist)
		}
	}

	// Ring 3 should have 18 hexes
	ring3 := HexRing(center, 3)
	if len(ring3) != 18 {
		t.Fatalf("ring 3: expected 18 hexes, got %d", len(ring3))
	}
}

func TestHexSpiral(t *testing.T) {
	center := HexCoord{Q: 0, R: 0, Layer: 0}

	// Spiral with radius 0 = just center
	spiral0 := HexSpiral(center, 0)
	if len(spiral0) != 1 {
		t.Fatalf("spiral 0: expected 1, got %d", len(spiral0))
	}

	// Spiral with radius 1 = 1 + 6 = 7
	spiral1 := HexSpiral(center, 1)
	if len(spiral1) != 7 {
		t.Fatalf("spiral 1: expected 7, got %d", len(spiral1))
	}

	// Spiral with radius 2 = 1 + 6 + 12 = 19
	spiral2 := HexSpiral(center, 2)
	if len(spiral2) != 19 {
		t.Fatalf("spiral 2: expected 19, got %d", len(spiral2))
	}

	// Spiral with radius 3 = 1 + 6 + 12 + 18 = 37
	spiral3 := HexSpiral(center, 3)
	if len(spiral3) != 37 {
		t.Fatalf("spiral 3: expected 37, got %d", len(spiral3))
	}
}

func TestHexToWorldAndBack(t *testing.T) {
	// Test origin
	origin := HexCoord{Q: 0, R: 0, Layer: 0}
	worldPos := HexToWorld(origin)
	if worldPos.X != 0 || worldPos.Z != 0 || worldPos.Y != 0 {
		t.Errorf("origin should map to world (0,0,0), got %+v", worldPos)
	}

	// Test roundtrip for several coordinates
	testCoords := []HexCoord{
		{0, 0, 0},
		{1, 0, 0},
		{0, 1, 0},
		{-1, 1, 0},
		{2, -1, 0},
		{3, 3, 0},
		{-2, -2, 0},
	}

	for _, coord := range testCoords {
		world := HexToWorld(coord)
		back := WorldToHex(world, coord.Layer)
		if back.Q != coord.Q || back.R != coord.R {
			t.Errorf("roundtrip failed: %+v -> %+v -> %+v", coord, world, back)
		}
	}
}

func TestHexToWorldLayer(t *testing.T) {
	surface := HexToWorld(HexCoord{Q: 0, R: 0, Layer: 0})
	depth1 := HexToWorld(HexCoord{Q: 0, R: 0, Layer: -1})
	depth2 := HexToWorld(HexCoord{Q: 0, R: 0, Layer: -2})

	if surface.Y != 0 {
		t.Errorf("surface Y should be 0, got %f", surface.Y)
	}
	if depth1.Y != -20.0 {
		t.Errorf("depth 1 Y should be -20, got %f", depth1.Y)
	}
	if depth2.Y != -40.0 {
		t.Errorf("depth 2 Y should be -40, got %f", depth2.Y)
	}
}

func TestHexVertices(t *testing.T) {
	origin := HexCoord{Q: 0, R: 0, Layer: 0}
	verts := HexVertices(origin)

	if len(verts) != 6 {
		t.Fatalf("expected 6 vertices, got %d", len(verts))
	}

	// All vertices should be HexSize distance from center
	center := HexToWorld(origin)
	for i, v := range verts {
		dx := v.X - center.X
		dz := v.Z - center.Z
		dist := math.Sqrt(dx*dx + dz*dz)
		if math.Abs(dist-HexSize) > 0.001 {
			t.Errorf("vertex %d: distance from center = %f, expected %f", i, dist, HexSize)
		}
	}
}

func TestHexContainsWorld(t *testing.T) {
	origin := HexCoord{Q: 0, R: 0, Layer: 0}
	center := HexToWorld(origin)

	// Center of hex should be contained
	if !HexContainsWorld(origin, center) {
		t.Error("center of hex should be contained")
	}

	// Point slightly off center should still be contained
	nearCenter := Vector3{X: center.X + 1.0, Y: 0, Z: center.Z + 1.0}
	if !HexContainsWorld(origin, nearCenter) {
		t.Error("point near center should be contained")
	}

	// Point far away should not be contained
	farAway := Vector3{X: 100, Y: 0, Z: 100}
	if HexContainsWorld(origin, farAway) {
		t.Error("far away point should not be contained")
	}
}
