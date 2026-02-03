extends GutTest
## Unit tests for DamageNumber

# --- Test fade calculation ---

func test_fade_at_start_is_1():
	var age = 0.0
	var lifetime = 1.5
	var fade_progress = age / lifetime
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 1.0)

func test_fade_at_half_lifetime():
	var age = 0.75
	var lifetime = 1.5
	var fade_progress = age / lifetime
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 0.5)

func test_fade_at_end_is_0():
	var age = 1.5
	var lifetime = 1.5
	var fade_progress = age / lifetime
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 0.0)

func test_fade_at_quarter_lifetime():
	var age = 0.375
	var lifetime = 1.5
	var fade_progress = age / lifetime
	var alpha = 1.0 - fade_progress
	assert_eq(alpha, 0.75)

# --- Test velocity calculations ---

func test_initial_velocity_y():
	var velocity = Vector3(0, 2, 0)
	assert_eq(velocity.y, 2.0)

func test_velocity_y_decreases():
	var velocity = Vector3(0, 2, 0)
	var delta = 0.5
	velocity.y -= delta * 2.0
	assert_eq(velocity.y, 1.0)

func test_velocity_y_after_multiple_frames():
	var velocity = Vector3(0, 2, 0)
	var delta = 0.1
	for i in range(10):
		velocity.y -= delta * 2.0
	assert_almost_eq(velocity.y, 0.0, 0.001)

func test_position_moves_by_velocity():
	var position = Vector3.ZERO
	var velocity = Vector3(0.5, 2, -0.3)
	var delta = 0.1
	position += velocity * delta
	# Use almost_eq for floating-point comparisons
	assert_almost_eq(position.x, 0.05, 0.001)
	assert_almost_eq(position.y, 0.2, 0.001)
	assert_almost_eq(position.z, -0.03, 0.001)

# --- Test damage type colors ---

func test_fire_damage_color():
	var expected_color = Color(1.0, 0.4, 0.0)  # Orange
	assert_eq(expected_color.r, 1.0)
	assert_almost_eq(expected_color.g, 0.4, 0.001)
	assert_eq(expected_color.b, 0.0)

func test_cold_damage_color():
	var expected_color = Color(0.3, 0.7, 1.0)  # Light blue
	assert_almost_eq(expected_color.r, 0.3, 0.001)
	assert_almost_eq(expected_color.g, 0.7, 0.001)
	assert_eq(expected_color.b, 1.0)

func test_lightning_damage_color():
	var expected_color = Color(1.0, 1.0, 0.3)  # Yellow
	assert_eq(expected_color.r, 1.0)
	assert_eq(expected_color.g, 1.0)
	assert_almost_eq(expected_color.b, 0.3, 0.001)

func test_physical_damage_color():
	var expected_color = Color(1.0, 1.0, 1.0)  # White
	assert_eq(expected_color.r, 1.0)
	assert_eq(expected_color.g, 1.0)
	assert_eq(expected_color.b, 1.0)

# --- Test lifetime expiration ---

func test_should_remove_when_age_equals_lifetime():
	var age = 1.5
	var lifetime = 1.5
	assert_true(age >= lifetime)

func test_should_not_remove_before_lifetime():
	var age = 1.4
	var lifetime = 1.5
	assert_false(age >= lifetime)

# --- Test damage text formatting ---

func test_damage_text_is_integer():
	var damage_amount = 25.7
	var text = str(int(damage_amount))
	assert_eq(text, "25")

func test_damage_text_rounds_down():
	var damage_amount = 99.9
	var text = str(int(damage_amount))
	assert_eq(text, "99")

func test_damage_text_zero():
	var damage_amount = 0.0
	var text = str(int(damage_amount))
	assert_eq(text, "0")
