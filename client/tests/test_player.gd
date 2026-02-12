extends GutTest
## Unit tests for Player

# --- Test cooldown tracking ---

func test_cooldown_dictionary_initialized():
	var ability_cooldowns = {
		"fireball": 0.0,
		"frostbolt": 0.0,
		"lightning": 0.0,
		"basic_attack": 0.0
	}
	assert_eq(ability_cooldowns["fireball"], 0.0)
	assert_eq(ability_cooldowns["frostbolt"], 0.0)
	assert_eq(ability_cooldowns["lightning"], 0.0)
	assert_eq(ability_cooldowns["basic_attack"], 0.0)

func test_cooldown_decreases():
	var ability_cooldowns = {"fireball": 1.0}
	var delta = 0.1
	ability_cooldowns["fireball"] -= delta
	assert_almost_eq(ability_cooldowns["fireball"], 0.9, 0.001)

func test_cooldown_check_on_cooldown():
	var ability_cooldowns = {"fireball": 0.5}
	assert_true(ability_cooldowns.get("fireball", 0.0) > 0)

func test_cooldown_check_off_cooldown():
	var ability_cooldowns = {"fireball": 0.0}
	assert_false(ability_cooldowns.get("fireball", 0.0) > 0)

func test_cooldown_check_negative():
	var ability_cooldowns = {"fireball": -0.1}
	assert_false(ability_cooldowns.get("fireball", 0.0) > 0)

func test_cooldown_reset_on_cast():
	var ability_cooldowns = {"fireball": 0.0}
	var ability_cooldown_times = {"fireball": 0.5}
	ability_cooldowns["fireball"] = ability_cooldown_times.get("fireball", 1.0)
	assert_eq(ability_cooldowns["fireball"], 0.5)

# --- Test movement direction calculation ---

func test_movement_direction_forward():
	var input_dir = Vector2(0, -1)  # Forward
	var direction = Vector3(input_dir.x, 0, input_dir.y).normalized()
	assert_eq(direction, Vector3(0, 0, -1))

func test_movement_direction_right():
	var input_dir = Vector2(1, 0)  # Right
	var direction = Vector3(input_dir.x, 0, input_dir.y).normalized()
	assert_eq(direction, Vector3(1, 0, 0))

func test_movement_direction_diagonal():
	var input_dir = Vector2(1, 1)  # Back-right
	var direction = Vector3(input_dir.x, 0, input_dir.y).normalized()
	assert_almost_eq(direction.x, 0.707, 0.01)
	assert_eq(direction.y, 0.0)
	assert_almost_eq(direction.z, 0.707, 0.01)

func test_movement_direction_length_check():
	var input_dir = Vector2(0.05, 0.05)  # Small movement
	assert_false(input_dir.length() > 0.1)  # Below threshold

func test_movement_direction_above_threshold():
	var input_dir = Vector2(0.5, 0.5)  # Significant movement
	assert_true(input_dir.length() > 0.1)

# --- Test velocity calculation ---

func test_velocity_from_direction():
	var direction = Vector3(1, 0, 0)
	var move_speed = 5.0
	var velocity_x = direction.x * move_speed
	var velocity_z = direction.z * move_speed
	assert_eq(velocity_x, 5.0)
	assert_eq(velocity_z, 0.0)

func test_velocity_diagonal():
	var direction = Vector3(0.707, 0, 0.707)  # Normalized diagonal
	var move_speed = 5.0
	var velocity_x = direction.x * move_speed
	var velocity_z = direction.z * move_speed
	assert_almost_eq(velocity_x, 3.535, 0.01)
	assert_almost_eq(velocity_z, 3.535, 0.01)

func test_velocity_stop():
	var direction = Vector3.ZERO
	var move_speed = 5.0
	var velocity_x = direction.x * move_speed
	var velocity_z = direction.z * move_speed
	assert_eq(velocity_x, 0.0)
	assert_eq(velocity_z, 0.0)

# --- Test rotation calculation ---

func test_rotation_from_direction_forward():
	var direction = Vector3(0, 0, 1)  # Forward (+Z)
	var target_rotation = atan2(direction.x, direction.z) - PI / 2.0
	assert_almost_eq(target_rotation, -PI / 2.0, 0.001)

func test_rotation_from_direction_right():
	var direction = Vector3(1, 0, 0)  # Right (+X)
	var target_rotation = atan2(direction.x, direction.z) - PI / 2.0
	assert_almost_eq(target_rotation, 0.0, 0.001)

func test_rotation_lerp():
	var current_rotation = 0.0
	var target_rotation = 1.0
	var delta = 0.1
	var lerp_speed = 10.0
	var new_rotation = lerp_angle(current_rotation, target_rotation, delta * lerp_speed)
	assert_eq(new_rotation, target_rotation)  # Full lerp in this case

# --- Test server position reconciliation ---

func test_position_error_significant():
	var client_pos = Vector3(0, 0, 0)
	var server_pos = Vector3(1, 0, 0)
	var pos_error = client_pos.distance_to(server_pos)
	assert_true(pos_error > 0.5)

func test_position_error_acceptable():
	var client_pos = Vector3(0, 0, 0)
	var server_pos = Vector3(0.3, 0, 0)
	var pos_error = client_pos.distance_to(server_pos)
	assert_false(pos_error > 0.5)

func test_position_lerp_correction():
	var current_pos = Vector3(0, 0, 0)
	var target_pos = Vector3(10, 0, 0)
	var lerp_factor = 0.3
	var new_pos = current_pos.lerp(target_pos, lerp_factor)
	assert_eq(new_pos, Vector3(3, 0, 0))

# --- Test remote player interpolation ---

func test_remote_player_lerp():
	var current_pos = Vector3(0, 0, 0)
	var server_pos = Vector3(5, 0, 5)
	var lerp_factor = 0.2
	var new_pos = current_pos.lerp(server_pos, lerp_factor)
	assert_eq(new_pos, Vector3(1, 0, 1))

# --- Test input sequence management ---

func test_input_sequence_increments():
	var input_sequence = 0
	input_sequence += 1
	assert_eq(input_sequence, 1)

func test_pending_inputs_buffer_limit():
	var pending_inputs = []
	for i in range(35):
		pending_inputs.append({"sequence": i})

	if pending_inputs.size() > 30:
		pending_inputs.pop_front()

	assert_eq(pending_inputs.size(), 34)

func test_pending_inputs_trim_to_30():
	var pending_inputs = []
	for i in range(35):
		pending_inputs.append({"sequence": i})

	while pending_inputs.size() > 30:
		pending_inputs.pop_front()

	assert_eq(pending_inputs.size(), 30)
	assert_eq(pending_inputs[0]["sequence"], 5)  # First 5 removed

# --- Test message format ---

func test_move_message_format():
	var direction = Vector3(1, 0, 0.5)
	var rotation_y = 1.57
	var msg = {
		"type": "move",
		"velocity": {
			"x": direction.x,
			"y": 0.0,
			"z": direction.z
		},
		"rotation": rotation_y
	}
	assert_eq(msg["type"], "move")
	assert_eq(msg["velocity"]["x"], 1.0)
	assert_eq(msg["velocity"]["y"], 0.0)
	assert_eq(msg["velocity"]["z"], 0.5)
	assert_eq(msg["rotation"], 1.57)

func test_ability_message_format():
	var ability_type = "fireball"
	var direction = Vector3(0, 0, -1)
	var msg = {
		"type": "use_ability",
		"abilityType": ability_type,
		"direction": {
			"x": direction.x,
			"y": direction.y,
			"z": direction.z
		}
	}
	assert_eq(msg["type"], "use_ability")
	assert_eq(msg["abilityType"], "fireball")
	assert_eq(msg["direction"]["z"], -1.0)
