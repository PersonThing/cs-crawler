# Contributing to CS Crawler

Thank you for your interest in contributing! This document provides guidelines for development.

## Getting Started

1. **Read the documentation**
   - [README.md](README.md) - Project overview
   - [docs/implementation-plan.md](docs/implementation-plan.md) - Development phases
   - [docs/protocol.md](docs/protocol.md) - Network protocol

2. **Set up development environment**
   - Install Godot 4.3+, Go 1.22+, Docker
   - Follow Quick Start in README.md

3. **Pick a task**
   - Check current phase in implementation plan
   - Find a task that interests you
   - Comment on issue (or create one) to claim it

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/phase-1-player-movement
```

Branch naming:
- `feature/phase-N-description` - New features
- `bugfix/description` - Bug fixes
- `test/description` - Test additions
- `docs/description` - Documentation

### 2. Write Tests FIRST (TDD)

**Backend (Go):**
```go
// server/internal/game/player_test.go
func TestPlayerMovement(t *testing.T) {
    player := NewPlayer("test-1", "TestUser")
    player.SetVelocity(Vector3{X: 1, Y: 0, Z: 0})
    player.Update(1.0)

    assert.Equal(t, 1.0, player.Position.X)
}
```

**Client (Godot):**
```gdscript
# client/tests/test_player.gd
extends GutTest

func test_player_movement():
    var player = preload("res://scenes/player/player.tscn").instantiate()
    player.velocity = Vector3(1, 0, 0)
    player._process(1.0)

    assert_eq(player.position.x, 1.0)
```

### 3. Implement Feature

Follow these principles:
- **Simple over clever** - Readable code beats clever code
- **Test coverage** - Aim for 80%+ on backend
- **Documentation** - Add comments for public APIs
- **Performance** - Profile before optimizing

### 4. Run Tests

**Backend:**
```bash
cd server
make test
make test-coverage
```

**Client:**
- Open Godot editor
- Bottom panel → Gut → Run All

### 5. Commit

```bash
git add .
git commit -m "Phase 1: Add player movement with client prediction

- Implement player controller with WASD input
- Add client prediction and server reconciliation
- Add tests for movement logic
- Update implementation plan checklist"
```

Commit message format:
```
Phase N: Brief description (50 chars max)

- Bullet point of changes
- Another change
- Reference issues if applicable (#123)
```

### 6. Push & Create PR

```bash
git push origin feature/phase-1-player-movement
```

Create pull request on GitHub with:
- Clear title referencing phase
- Description of changes
- Checklist of tested functionality
- Screenshots/video if UI changes

## Code Style

### Go (Backend)

Follow [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments):

```go
// Good
func (p *Player) Update(delta float64) {
    p.Position.X += p.Velocity.X * delta
}

// Bad
func (p *Player) update(Delta float64) {  // unexported, wrong casing
    p.position.x += p.velocity.x*Delta     // inconsistent spacing
}
```

- Use `gofmt` (automatic)
- Use `golint` for style checks
- Document all exported functions
- Keep functions small (<50 lines)
- Prefer explicit over implicit

### GDScript (Client)

Follow [GDScript style guide](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html):

```gdscript
# Good
func _process(delta: float) -> void:
    position += velocity * delta

# Bad
func _process(Delta):  # Missing type hints
    position+=velocity*Delta  # No spacing
```

- Use static typing (`var x: int = 5`)
- Use snake_case for variables/functions
- Use PascalCase for classes
- 4-space indentation (not tabs)
- Document complex functions

## Testing Guidelines

### What to Test

**✅ Do test:**
- Game logic (damage calculation, movement, abilities)
- State transitions (game states, AI states)
- Data transformations (serialization, stat calculations)
- Edge cases (empty inventory, max values, cooldowns)
- Integration points (client-server messages)

**❌ Don't test:**
- Visual appearance (use manual testing)
- Third-party libraries
- Godot engine internals
- Auto-generated code

### Test Structure

```go
func TestFeature(t *testing.T) {
    // Arrange - Set up test data
    player := NewPlayer("test-1", "User")

    // Act - Perform action
    player.TakeDamage(50)

    // Assert - Verify result
    assert.Equal(t, 50.0, player.Health)
}
```

### Integration Tests

```go
func TestClientServerSync(t *testing.T) {
    // Start test server
    server := startTestServer(t)
    defer server.Stop()

    // Connect client
    client := connectTestClient(t, server.Addr)
    defer client.Close()

    // Send message
    client.SendMove(Vector3{X: 1, Y: 0, Z: 0})

    // Verify server received it
    time.Sleep(100 * time.Millisecond)
    state := server.GetWorldState()
    assert.Equal(t, 1.0, state.Players[0].Velocity.X)
}
```

## Performance Guidelines

### Backend

- **Profile before optimizing**: Use `go test -cpuprofile=cpu.prof`
- **Avoid premature optimization**: Correctness first
- **Use spatial partitioning**: For collision detection with many entities
- **Reuse allocations**: Pool frequently allocated objects
- **Benchmark critical paths**: Use `go test -bench=.`

Example:
```go
// Good - Reuse buffer
var worldStateBuffer bytes.Buffer
func SerializeWorldState() []byte {
    worldStateBuffer.Reset()
    json.NewEncoder(&worldStateBuffer).Encode(state)
    return worldStateBuffer.Bytes()
}

// Bad - New allocation every call
func SerializeWorldState() []byte {
    return json.Marshal(state)  // Allocates new buffer each time
}
```

### Client

- **Use object pooling**: For projectiles, damage numbers
- **LOD for distant entities**: Reduce polygon count
- **Limit particles**: Cap active particle systems
- **Batch draw calls**: Use MultiMesh for many instances

Example:
```gdscript
# Good - Object pool
var projectile_pool = []
func spawn_projectile():
    var proj = projectile_pool.pop_back() if projectile_pool.size() > 0 else create_projectile()
    add_child(proj)

# Bad - Instantiate every time
func spawn_projectile():
    var proj = projectile_scene.instantiate()  # Expensive!
    add_child(proj)
```

## Documentation

### Code Comments

```go
// CalculateDamage computes final damage after resistances.
// Returns 0 if target is immune to damage type.
func CalculateDamage(base float64, damageType DamageType, target *Entity) float64 {
    // ... implementation
}
```

### README Updates

When adding new features, update:
- Project README (if user-facing)
- Implementation plan (check off completed tasks)
- Protocol documentation (if changing messages)

## Pull Request Checklist

Before submitting PR:

- [ ] Tests written and passing
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No merge conflicts with main
- [ ] Tested locally (backend + client together)
- [ ] Performance is acceptable
- [ ] No console errors or warnings

## Questions?

- **Discord**: [Link to Discord server]
- **GitHub Issues**: Ask questions in issues
- **Email**: [maintainer email]

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

**Thank you for contributing!** 🎮
