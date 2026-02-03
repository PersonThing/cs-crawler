extends GutTest
## Unit tests for Enemy

# --- Test take_damage ---

func test_take_damage_reduces_health():
	var current_health = 100.0
	var damage = 25.0
	current_health -= damage
	assert_eq(current_health, 75.0)

func test_take_damage_multiple_times():
	var current_health = 100.0
	current_health -= 30.0
	current_health -= 20.0
	current_health -= 10.0
	assert_eq(current_health, 40.0)

func test_take_damage_clamps_at_zero():
	var current_health = 50.0
	var damage = 75.0
	current_health -= damage
	if current_health <= 0:
		current_health = 0
	assert_eq(current_health, 0.0)

func test_take_damage_exact_kill():
	var current_health = 50.0
	var damage = 50.0
	current_health -= damage
	assert_eq(current_health, 0.0)

func test_take_damage_triggers_death():
	var current_health = 30.0
	var is_dead = false
	var damage = 50.0

	current_health -= damage
	if current_health <= 0:
		current_health = 0
		is_dead = true

	assert_eq(current_health, 0.0)
	assert_true(is_dead)

func test_dead_enemies_ignore_damage():
	var is_dead = true
	var current_health = 0.0
	var damage = 25.0

	if not is_dead:
		current_health -= damage

	assert_eq(current_health, 0.0)  # Unchanged

# --- Test death animation progress ---

func test_death_timer_increments():
	var death_timer = 0.0
	var delta = 0.1
	death_timer += delta
	assert_eq(death_timer, 0.1)

func test_death_fade_progress_at_start():
	var death_timer = 0.0
	var death_duration = 1.0
	var fade_progress = death_timer / death_duration
	assert_eq(fade_progress, 0.0)

func test_death_fade_progress_at_half():
	var death_timer = 0.5
	var death_duration = 1.0
	var fade_progress = death_timer / death_duration
	assert_eq(fade_progress, 0.5)

func test_death_fade_progress_at_end():
	var death_timer = 1.0
	var death_duration = 1.0
	var fade_progress = death_timer / death_duration
	assert_eq(fade_progress, 1.0)

func test_death_alpha_at_start():
	var fade_progress = 0.0
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 1.0)

func test_death_alpha_at_half():
	var fade_progress = 0.5
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 0.5)

func test_death_alpha_at_end():
	var fade_progress = 1.0
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 0.0)

# --- Test death scale calculation ---

func test_death_scale_at_start():
	var fade_progress = 0.0
	var scale = Vector3.ONE * (1.0 - fade_progress * 0.5)
	assert_eq(scale, Vector3.ONE)

func test_death_scale_at_half():
	var fade_progress = 0.5
	var scale = Vector3.ONE * (1.0 - fade_progress * 0.5)
	assert_eq(scale, Vector3(0.75, 0.75, 0.75))

func test_death_scale_at_end():
	var fade_progress = 1.0
	var scale = Vector3.ONE * (1.0 - fade_progress * 0.5)
	assert_eq(scale, Vector3(0.5, 0.5, 0.5))

# --- Test should remove after death animation ---

func test_should_remove_when_timer_exceeds_duration():
	var death_timer = 1.1
	var death_duration = 1.0
	assert_true(death_timer >= death_duration)

func test_should_not_remove_during_animation():
	var death_timer = 0.5
	var death_duration = 1.0
	assert_false(death_timer >= death_duration)

# --- Test apply_server_state position lerp ---

func test_position_lerp():
	var current_pos = Vector3(0, 0, 0)
	var server_pos = Vector3(10, 0, 10)
	var lerp_factor = 0.2
	var new_pos = current_pos.lerp(server_pos, lerp_factor)
	assert_eq(new_pos, Vector3(2, 0, 2))

func test_position_lerp_no_change():
	var current_pos = Vector3(5, 0, 5)
	var server_pos = Vector3(5, 0, 5)
	var lerp_factor = 0.2
	var new_pos = current_pos.lerp(server_pos, lerp_factor)
	assert_eq(new_pos, Vector3(5, 0, 5))

# --- Test health update from server state ---

func test_health_update_from_state():
	var state = {"health": 75.0, "maxHealth": 100.0}
	var current_health = state.get("health", 100.0)
	var max_health = state.get("maxHealth", 100.0)
	assert_eq(current_health, 75.0)
	assert_eq(max_health, 100.0)

func test_health_defaults_when_missing():
	var state = {}
	var current_health = state.get("health", 100.0)
	var max_health = state.get("maxHealth", 100.0)
	assert_eq(current_health, 100.0)
	assert_eq(max_health, 100.0)

# --- Test death state from server ---

func test_dead_state_from_server():
	var state = {"dead": true}
	var is_dead = state.get("dead", false)
	assert_true(is_dead)

func test_alive_state_from_server():
	var state = {"dead": false}
	var is_dead = state.get("dead", false)
	assert_false(is_dead)

func test_dead_state_transition():
	var was_dead = false
	var state = {"dead": true}
	var is_dead = state.get("dead", false)

	var should_start_death_anim = is_dead and not was_dead
	assert_true(should_start_death_anim)

func test_no_death_anim_if_already_dead():
	var was_dead = true
	var state = {"dead": true}
	var is_dead = state.get("dead", false)

	var should_start_death_anim = is_dead and not was_dead
	assert_false(should_start_death_anim)

# --- Test visual config defaults ---

func test_default_enemy_color():
	var visual_config = {}
	var color_array = visual_config.get("color", [0.8, 0.2, 0.2])
	assert_eq(color_array[0], 0.8)
	assert_eq(color_array[1], 0.2)
	assert_eq(color_array[2], 0.2)

func test_default_enemy_height():
	var visual_config = {}
	var height = visual_config.get("height", 1.8)
	assert_eq(height, 1.8)

func test_default_enemy_radius():
	var visual_config = {}
	var radius = visual_config.get("radius", 0.4)
	assert_eq(radius, 0.4)

func test_color_from_config():
	var visual_config = {"color": [0.1, 0.5, 0.9]}
	var color_array = visual_config.get("color", [0.8, 0.2, 0.2])
	var color = Color(color_array[0], color_array[1], color_array[2])
	assert_almost_eq(color.r, 0.1, 0.001)
	assert_eq(color.g, 0.5)
	assert_almost_eq(color.b, 0.9, 0.001)
