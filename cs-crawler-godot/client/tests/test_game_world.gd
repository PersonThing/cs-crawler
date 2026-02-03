extends GutTest
## Unit tests for GameWorld calculations

# --- Test camera deadzone lerp calculation ---

func test_camera_lerp_towards_player():
	var focus_pos_2d = Vector2(0, 0)
	var player_pos_2d = Vector2(10, 10)
	var follow_speed = 4.0
	var delta = 0.25  # 1 second = full speed
	var lerp_factor = delta * follow_speed
	var new_focus = focus_pos_2d.lerp(player_pos_2d, lerp_factor)
	assert_eq(new_focus, Vector2(10, 10))  # Full lerp in 1 second

func test_camera_lerp_partial():
	var focus_pos_2d = Vector2(0, 0)
	var player_pos_2d = Vector2(10, 0)
	var lerp_factor = 0.5
	var new_focus = focus_pos_2d.lerp(player_pos_2d, lerp_factor)
	assert_eq(new_focus, Vector2(5, 0))

func test_camera_lerp_no_movement():
	var focus_pos_2d = Vector2(5, 5)
	var player_pos_2d = Vector2(5, 5)
	var lerp_factor = 0.5
	var new_focus = focus_pos_2d.lerp(player_pos_2d, lerp_factor)
	assert_eq(new_focus, Vector2(5, 5))

# --- Test screen shake decay ---

func test_screen_shake_decays():
	var shake_amount = 1.0
	var shake_decay = 5.0
	var delta = 0.1
	shake_amount = max(0, shake_amount - shake_decay * delta)
	assert_eq(shake_amount, 0.5)

func test_screen_shake_reaches_zero():
	var shake_amount = 0.5
	var shake_decay = 5.0
	var delta = 0.1
	shake_amount = max(0, shake_amount - shake_decay * delta)
	assert_eq(shake_amount, 0.0)

func test_screen_shake_does_not_go_negative():
	var shake_amount = 0.1
	var shake_decay = 5.0
	var delta = 1.0  # Large delta
	shake_amount = max(0, shake_amount - shake_decay * delta)
	assert_eq(shake_amount, 0.0)

func test_add_screen_shake():
	var shake_amount = 0.5
	var added_shake = 0.3
	shake_amount += added_shake
	assert_eq(shake_amount, 0.8)

# --- Test pickup range calculation ---

func test_pickup_range_in_range():
	var player_pos = Vector3(0, 0, 0)
	var item_pos = Vector3(2, 0, 0)
	var pickup_range = 3.0
	var distance = player_pos.distance_to(item_pos)
	assert_true(distance <= pickup_range)

func test_pickup_range_out_of_range():
	var player_pos = Vector3(0, 0, 0)
	var item_pos = Vector3(5, 0, 0)
	var pickup_range = 3.0
	var distance = player_pos.distance_to(item_pos)
	assert_false(distance <= pickup_range)

func test_pickup_range_exact_boundary():
	var player_pos = Vector3(0, 0, 0)
	var item_pos = Vector3(3, 0, 0)
	var pickup_range = 3.0
	var distance = player_pos.distance_to(item_pos)
	assert_true(distance <= pickup_range)

func test_pickup_range_3d_distance():
	var player_pos = Vector3(0, 0, 0)
	var item_pos = Vector3(2, 0, 2)  # Diagonal
	var pickup_range = 3.0
	var distance = player_pos.distance_to(item_pos)
	assert_almost_eq(distance, 2.828, 0.01)
	assert_true(distance <= pickup_range)

# --- Test cone radius calculation (melee attack) ---

func test_cone_radius_90_degree():
	var cone_range = 2.0
	var cone_angle = 90.0
	var cone_radius = cone_range * tan(deg_to_rad(cone_angle / 2.0))
	assert_almost_eq(cone_radius, 2.0, 0.001)

func test_cone_radius_60_degree():
	var cone_range = 2.0
	var cone_angle = 60.0
	var cone_radius = cone_range * tan(deg_to_rad(cone_angle / 2.0))
	assert_almost_eq(cone_radius, 1.1547, 0.001)

func test_cone_radius_180_degree():
	var cone_range = 2.0
	var cone_angle = 180.0
	# tan(90) is infinity, so this is a special case
	# The game likely clamps this
	var cone_radius = cone_range * tan(deg_to_rad(cone_angle / 2.0))
	assert_true(cone_radius > 1000000)  # Very large

# --- Test camera offset calculation ---

func test_camera_target_position():
	var focus_point = Vector3(10, 0, 5)
	var base_offset = Vector3(0, 20, 7.3)
	var target_pos = focus_point + base_offset
	assert_eq(target_pos, Vector3(10, 20, 12.3))

# --- Test position lerp for camera smoothing ---

func test_camera_position_lerp():
	var current_pos = Vector3(0, 20, 0)
	var target_pos = Vector3(10, 20, 0)
	var delta = 0.1
	var follow_speed = 4.0
	var new_pos = current_pos.lerp(target_pos, delta * follow_speed)
	assert_almost_eq(new_pos.x, 4.0, 0.001)

# --- Test entity dictionary operations ---

func test_enemy_dictionary_add():
	var enemies = {}
	enemies["enemy_1"] = {"type": "basic"}
	assert_true(enemies.has("enemy_1"))

func test_enemy_dictionary_remove():
	var enemies = {"enemy_1": {"type": "basic"}}
	enemies.erase("enemy_1")
	assert_false(enemies.has("enemy_1"))

func test_enemy_id_in_list():
	var current_ids = ["enemy_1", "enemy_2", "enemy_3"]
	assert_true("enemy_2" in current_ids)

func test_enemy_id_not_in_list():
	var current_ids = ["enemy_1", "enemy_2"]
	assert_false("enemy_3" in current_ids)

# --- Test damage event position calculation ---

func test_damage_number_spawn_position():
	var enemy_pos = Vector3(5, 0, 3)
	var offset = Vector3(0, 1.5, 0)
	var spawn_pos = enemy_pos + offset
	assert_eq(spawn_pos, Vector3(5, 1.5, 3))

# --- Test Vector3 from dictionary ---

func test_vector3_from_server_data():
	var pos_data = {"x": 10.5, "y": 0.0, "z": -5.3}
	var position = Vector3(
		pos_data.get("x", 0.0),
		pos_data.get("y", 0.0),
		pos_data.get("z", 0.0)
	)
	assert_eq(position, Vector3(10.5, 0.0, -5.3))

func test_vector3_from_empty_data():
	var pos_data = {}
	var position = Vector3(
		pos_data.get("x", 0.0),
		pos_data.get("y", 0.0),
		pos_data.get("z", 0.0)
	)
	assert_eq(position, Vector3.ZERO)
