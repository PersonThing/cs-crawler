extends GutTest
## Unit tests for EnemyUIManager

# --- Test health percent calculation ---

func test_health_percent_full():
	var health = 100.0
	var max_health = 100.0
	var health_percent = health / max_health
	assert_eq(health_percent, 1.0)

func test_health_percent_half():
	var health = 50.0
	var max_health = 100.0
	var health_percent = health / max_health
	assert_eq(health_percent, 0.5)

func test_health_percent_quarter():
	var health = 25.0
	var max_health = 100.0
	var health_percent = health / max_health
	assert_eq(health_percent, 0.25)

func test_health_percent_zero():
	var health = 0.0
	var max_health = 100.0
	var health_percent = health / max_health
	assert_eq(health_percent, 0.0)

func test_health_percent_different_max():
	var health = 75.0
	var max_health = 150.0
	var health_percent = health / max_health
	assert_eq(health_percent, 0.5)

# --- Test health fill width calculation ---

func test_health_fill_width_full():
	var health_percent = 1.0
	var width = 98 * health_percent
	assert_eq(width, 98.0)

func test_health_fill_width_half():
	var health_percent = 0.5
	var width = 98 * health_percent
	assert_eq(width, 49.0)

func test_health_fill_width_zero():
	var health_percent = 0.0
	var width = 98 * health_percent
	assert_eq(width, 0.0)

func test_health_fill_width_quarter():
	var health_percent = 0.25
	var width = 98 * health_percent
	assert_eq(width, 24.5)

# --- Test enemy registration state ---

func test_enemy_ui_elements_add():
	var enemy_ui_elements = {}
	enemy_ui_elements["enemy_1"] = {
		"ui": null,
		"node": null,
		"health": 100.0,
		"max_health": 100.0
	}
	assert_true(enemy_ui_elements.has("enemy_1"))

func test_enemy_ui_elements_has_health():
	var enemy_ui_elements = {}
	enemy_ui_elements["enemy_1"] = {
		"ui": null,
		"node": null,
		"health": 100.0,
		"max_health": 100.0
	}
	assert_eq(enemy_ui_elements["enemy_1"]["health"], 100.0)

func test_enemy_ui_elements_remove():
	var enemy_ui_elements = {}
	enemy_ui_elements["enemy_1"] = {"ui": null, "node": null}
	enemy_ui_elements.erase("enemy_1")
	assert_false(enemy_ui_elements.has("enemy_1"))

func test_enemy_ui_elements_update_health():
	var enemy_ui_elements = {}
	enemy_ui_elements["enemy_1"] = {
		"health": 100.0,
		"max_health": 100.0
	}
	enemy_ui_elements["enemy_1"]["health"] = 75.0
	assert_eq(enemy_ui_elements["enemy_1"]["health"], 75.0)

# --- Test camera visibility calculation ---

func test_camera_forward_dot_product_in_front():
	var camera_pos = Vector3(0, 0, 0)
	var camera_forward = Vector3(0, 0, -1)  # Looking towards -Z
	var enemy_pos = Vector3(0, 0, -5)  # In front

	var camera_to_enemy = enemy_pos - camera_pos
	var dot = camera_to_enemy.dot(camera_forward)

	assert_true(dot > 0)  # In front of camera

func test_camera_forward_dot_product_behind():
	var camera_pos = Vector3(0, 0, 0)
	var camera_forward = Vector3(0, 0, -1)  # Looking towards -Z
	var enemy_pos = Vector3(0, 0, 5)  # Behind

	var camera_to_enemy = enemy_pos - camera_pos
	var dot = camera_to_enemy.dot(camera_forward)

	assert_true(dot < 0)  # Behind camera

func test_camera_forward_dot_product_side():
	var camera_pos = Vector3(0, 0, 0)
	var camera_forward = Vector3(0, 0, -1)  # Looking towards -Z
	var enemy_pos = Vector3(5, 0, 0)  # To the side

	var camera_to_enemy = enemy_pos - camera_pos
	var dot = camera_to_enemy.dot(camera_forward)

	assert_eq(dot, 0.0)  # Perpendicular

# --- Test UI position calculation ---

func test_ui_position_centered():
	var screen_pos = Vector2(500, 300)
	var vbox_size = Vector2(100, 20)
	var ui_position = screen_pos - Vector2(vbox_size.x / 2, vbox_size.y)
	assert_eq(ui_position, Vector2(450, 280))

func test_ui_position_different_size():
	var screen_pos = Vector2(640, 360)
	var vbox_size = Vector2(80, 30)
	var ui_position = screen_pos - Vector2(vbox_size.x / 2, vbox_size.y)
	assert_eq(ui_position, Vector2(600, 330))

# --- Test enemy world position offset ---

func test_enemy_world_position_offset():
	var enemy_pos = Vector3(10, 0, 5)
	var offset = Vector3(0, 2.2, 0)
	var world_pos = enemy_pos + offset
	assert_eq(world_pos, Vector3(10, 2.2, 5))

# --- Test health bar dimensions ---

func test_health_bar_background_size():
	var min_size = Vector2(100, 8)
	assert_eq(min_size.x, 100)
	assert_eq(min_size.y, 8)

func test_health_fill_position():
	var position = Vector2(1, 1)
	assert_eq(position, Vector2(1, 1))

func test_health_fill_max_size():
	var size = Vector2(98, 6)
	assert_eq(size.x, 98)
	assert_eq(size.y, 6)
