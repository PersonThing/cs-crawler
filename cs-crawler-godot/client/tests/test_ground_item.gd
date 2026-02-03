extends GutTest
## Unit tests for GroundItem

# Test the RARITY_CONFIG constant directly
const GroundItemScript = preload("res://scripts/ground_item.gd")

# --- Test RARITY_CONFIG values ---

func test_rarity_config_has_normal():
	assert_true(GroundItemScript.RARITY_CONFIG.has("normal"))

func test_rarity_config_has_rare():
	assert_true(GroundItemScript.RARITY_CONFIG.has("rare"))

func test_rarity_config_has_unique():
	assert_true(GroundItemScript.RARITY_CONFIG.has("unique"))

func test_normal_rarity_color():
	var cfg = GroundItemScript.RARITY_CONFIG["normal"]
	assert_eq(cfg["color"], Color(0.7, 0.7, 0.7, 0.9))

func test_rare_rarity_color():
	var cfg = GroundItemScript.RARITY_CONFIG["rare"]
	assert_eq(cfg["color"], Color(0.3, 0.5, 1.0, 0.9))

func test_unique_rarity_color():
	var cfg = GroundItemScript.RARITY_CONFIG["unique"]
	assert_eq(cfg["color"], Color(1.0, 0.5, 0.0, 0.9))

func test_normal_rarity_emission_energy():
	var cfg = GroundItemScript.RARITY_CONFIG["normal"]
	assert_eq(cfg["emission_energy"], 0.5)

func test_rare_rarity_emission_energy():
	var cfg = GroundItemScript.RARITY_CONFIG["rare"]
	assert_eq(cfg["emission_energy"], 1.5)

func test_unique_rarity_emission_energy():
	var cfg = GroundItemScript.RARITY_CONFIG["unique"]
	assert_eq(cfg["emission_energy"], 2.0)

func test_normal_rarity_bob_height():
	var cfg = GroundItemScript.RARITY_CONFIG["normal"]
	assert_eq(cfg["bob_height"], 0.0)

func test_rare_rarity_bob_height():
	var cfg = GroundItemScript.RARITY_CONFIG["rare"]
	assert_eq(cfg["bob_height"], 0.0)

func test_unique_rarity_bob_height():
	var cfg = GroundItemScript.RARITY_CONFIG["unique"]
	assert_eq(cfg["bob_height"], 0.25)

func test_normal_rarity_no_particles():
	var cfg = GroundItemScript.RARITY_CONFIG["normal"]
	assert_false(cfg["particles"])

func test_rare_rarity_has_particles():
	var cfg = GroundItemScript.RARITY_CONFIG["rare"]
	assert_true(cfg["particles"])

func test_unique_rarity_has_particles():
	var cfg = GroundItemScript.RARITY_CONFIG["unique"]
	assert_true(cfg["particles"])

# --- Test bob animation calculations ---

func test_bob_calculation_at_time_zero():
	var bob_height = 0.3
	var bob_speed = 2.0
	var time_elapsed = 0.0
	var bob_offset = sin(time_elapsed * bob_speed) * bob_height
	assert_almost_eq(bob_offset, 0.0, 0.001)

func test_bob_calculation_at_quarter_period():
	var bob_height = 0.3
	var bob_speed = 2.0
	var time_elapsed = PI / (2 * bob_speed)  # Quarter period
	var bob_offset = sin(time_elapsed * bob_speed) * bob_height
	assert_almost_eq(bob_offset, bob_height, 0.001)

func test_bob_calculation_at_half_period():
	var bob_height = 0.3
	var bob_speed = 2.0
	var time_elapsed = PI / bob_speed  # Half period
	var bob_offset = sin(time_elapsed * bob_speed) * bob_height
	assert_almost_eq(bob_offset, 0.0, 0.001)

func test_bob_calculation_with_zero_height():
	var bob_height = 0.0
	var bob_speed = 2.0
	var time_elapsed = 1.0
	var bob_offset = sin(time_elapsed * bob_speed) * bob_height
	assert_eq(bob_offset, 0.0)

# --- Test rotation calculation ---

func test_rotation_calculation():
	var rotation_speed = 90.0
	var delta = 1.0
	var rotation_amount = deg_to_rad(rotation_speed * delta)
	assert_almost_eq(rotation_amount, deg_to_rad(90.0), 0.001)

func test_rotation_calculation_half_second():
	var rotation_speed = 90.0
	var delta = 0.5
	var rotation_amount = deg_to_rad(rotation_speed * delta)
	assert_almost_eq(rotation_amount, deg_to_rad(45.0), 0.001)

# --- Test hover emission lerp calculation ---

func test_hover_emission_lerp_towards_hover():
	var current_emission = 1.0
	var hover_emission = 4.0
	var delta = 0.125  # 1/8 second
	var lerp_speed = 8.0
	var result = lerp(current_emission, hover_emission, delta * lerp_speed)
	assert_eq(result, hover_emission)  # Full lerp in this case

func test_hover_emission_lerp_partial():
	var current_emission = 1.0
	var target_emission = 4.0
	var lerp_factor = 0.5
	var result = lerp(current_emission, target_emission, lerp_factor)
	assert_eq(result, 2.5)

# --- Test scale lerp on hover ---

func test_scale_lerp_towards_hover():
	var current_scale = Vector3(1.0, 1.0, 1.0)
	var target_scale = Vector3(1.2, 1.2, 1.2)
	var lerp_factor = 0.5
	var result = current_scale.lerp(target_scale, lerp_factor)
	assert_eq(result, Vector3(1.1, 1.1, 1.1))

func test_scale_lerp_towards_normal():
	var current_scale = Vector3(1.2, 1.2, 1.2)
	var target_scale = Vector3(1.0, 1.0, 1.0)
	var lerp_factor = 0.5
	var result = current_scale.lerp(target_scale, lerp_factor)
	assert_eq(result, Vector3(1.1, 1.1, 1.1))
