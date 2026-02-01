extends Control
## Manages 2D UI elements for all enemies (health bars, nameplates)

# Container for all enemy UI elements
var enemy_ui_container: Control = null

# Dictionary mapping enemy_id -> UI element
var enemy_ui_elements: Dictionary = {}

# Reference to camera for 3D->2D conversion
var world_camera: Camera3D = null

func _ready() -> void:
	# Create container
	enemy_ui_container = Control.new()
	enemy_ui_container.name = "EnemyUIContainer"
	enemy_ui_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	enemy_ui_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(enemy_ui_container)

func set_camera(camera: Camera3D) -> void:
	world_camera = camera

func register_enemy(enemy_id: String, enemy_node: Node3D) -> void:
	if enemy_ui_elements.has(enemy_id):
		return

	# Create UI element for this enemy
	var enemy_ui = _create_enemy_ui(enemy_id)
	enemy_ui_elements[enemy_id] = {
		"ui": enemy_ui,
		"node": enemy_node,
		"health": 100.0,
		"max_health": 100.0
	}
	enemy_ui_container.add_child(enemy_ui)

func unregister_enemy(enemy_id: String) -> void:
	if enemy_ui_elements.has(enemy_id):
		var ui_element = enemy_ui_elements[enemy_id]["ui"]
		ui_element.queue_free()
		enemy_ui_elements.erase(enemy_id)

func update_enemy_health(enemy_id: String, health: float, max_health: float) -> void:
	if enemy_ui_elements.has(enemy_id):
		enemy_ui_elements[enemy_id]["health"] = health
		enemy_ui_elements[enemy_id]["max_health"] = max_health
		_update_health_bar(enemy_id)

func _create_enemy_ui(enemy_id: String) -> Control:
	# Create container for this enemy's UI
	var container = Control.new()
	container.name = "EnemyUI_" + enemy_id
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Create VBoxContainer to stack nameplate and health bar
	var vbox = VBoxContainer.new()
	vbox.name = "VBox"
	vbox.add_theme_constant_override("separation", 2)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	container.add_child(vbox)

	# Create nameplate
	var nameplate = Label.new()
	nameplate.name = "Nameplate"
	nameplate.text = "Enemy"
	nameplate.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	nameplate.add_theme_font_size_override("font_size", 12)
	nameplate.add_theme_color_override("font_color", Color(1, 1, 1))
	nameplate.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	nameplate.add_theme_constant_override("outline_size", 2)
	vbox.add_child(nameplate)

	# Create health bar background
	var health_bg = Panel.new()
	health_bg.name = "HealthBg"
	health_bg.custom_minimum_size = Vector2(100, 8)

	var bg_style = StyleBoxFlat.new()
	bg_style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
	bg_style.border_width_left = 1
	bg_style.border_width_right = 1
	bg_style.border_width_top = 1
	bg_style.border_width_bottom = 1
	bg_style.border_color = Color(0, 0, 0)
	health_bg.add_theme_stylebox_override("panel", bg_style)
	vbox.add_child(health_bg)

	# Create health bar fill
	var health_fill = Panel.new()
	health_fill.name = "HealthFill"
	health_fill.position = Vector2(1, 1)
	health_fill.size = Vector2(98, 6)

	var fill_style = StyleBoxFlat.new()
	fill_style.bg_color = Color(0.8, 0.1, 0.1)
	health_fill.add_theme_stylebox_override("panel", fill_style)
	health_bg.add_child(health_fill)

	return container

func _update_health_bar(enemy_id: String) -> void:
	if not enemy_ui_elements.has(enemy_id):
		return

	var data = enemy_ui_elements[enemy_id]
	var ui = data["ui"]
	var health_percent = data["health"] / data["max_health"]

	var health_fill = ui.get_node("VBox/HealthBg/HealthFill")
	if health_fill:
		health_fill.size.x = 98 * health_percent

func _process(_delta: float) -> void:
	if not world_camera:
		return

	# Update all enemy UI positions
	for enemy_id in enemy_ui_elements.keys():
		var data = enemy_ui_elements[enemy_id]
		var enemy_node = data["node"]
		var ui = data["ui"]

		if not is_instance_valid(enemy_node):
			unregister_enemy(enemy_id)
			continue

		# Get enemy 3D position (slightly above the model)
		var world_pos = enemy_node.global_position + Vector3(0, 2.2, 0)

		# Convert to 2D screen position
		var screen_pos = world_camera.unproject_position(world_pos)

		# Check if behind camera
		var camera_to_enemy = world_pos - world_camera.global_position
		var camera_forward = -world_camera.global_transform.basis.z
		var is_in_front = camera_to_enemy.dot(camera_forward) > 0

		if is_in_front:
			# Position UI element (centered above enemy)
			var vbox = ui.get_node("VBox")
			ui.position = screen_pos - Vector2(vbox.size.x / 2, vbox.size.y)
			ui.visible = true
		else:
			ui.visible = false
