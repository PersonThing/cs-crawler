extends CanvasLayer
## AI Debug Overlay - Shows enemy AI states and paths
## Toggle with F3 key

var is_visible: bool = false
var debug_panel: PanelContainer = null
var enemy_info_label: RichTextLabel = null
var game_world: Node = null

# Settings
var show_aggro_ranges: bool = true
var show_paths: bool = true
var max_enemies_shown: int = 10

func _ready() -> void:
	_setup_ui()
	visible = false

func _setup_ui() -> void:
	# Create main panel
	debug_panel = PanelContainer.new()
	debug_panel.name = "DebugPanel"
	debug_panel.position = Vector2(10, 100)
	debug_panel.custom_minimum_size = Vector2(350, 400)
	add_child(debug_panel)

	# Create style
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.1, 0.85)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	debug_panel.add_theme_stylebox_override("panel", style)

	# Create VBox for content
	var vbox = VBoxContainer.new()
	vbox.name = "VBox"
	debug_panel.add_child(vbox)

	# Title
	var title = Label.new()
	title.text = "AI Debug Overlay (F3 to toggle)"
	title.add_theme_color_override("font_color", Color(1, 0.8, 0.3))
	vbox.add_child(title)

	# Separator
	var sep = HSeparator.new()
	vbox.add_child(sep)

	# Enemy info label (rich text for formatting)
	enemy_info_label = RichTextLabel.new()
	enemy_info_label.bbcode_enabled = true
	enemy_info_label.custom_minimum_size = Vector2(330, 350)
	enemy_info_label.fit_content = true
	vbox.add_child(enemy_info_label)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F3:
			is_visible = not is_visible
			visible = is_visible

func _process(_delta: float) -> void:
	if not is_visible:
		return

	# Find game world if not set
	if not game_world:
		game_world = get_tree().get_first_node_in_group("game_world")
		if not game_world:
			game_world = get_node_or_null("/root/GameWorld")

	if not game_world:
		enemy_info_label.text = "[color=red]Game world not found[/color]"
		return

	_update_enemy_info()

func _update_enemy_info() -> void:
	var text = ""

	# Get enemies from game world
	var enemies_dict = {}
	if game_world.has_method("get_enemies"):
		enemies_dict = game_world.get_enemies()
	elif "enemies" in game_world:
		enemies_dict = game_world.enemies

	if enemies_dict.is_empty():
		enemy_info_label.text = "[color=gray]No enemies in world[/color]"
		return

	# Get player position for distance calculation
	var player_pos = Vector3.ZERO
	if "local_player" in game_world and game_world.local_player:
		player_pos = game_world.local_player.global_position

	# Sort enemies by distance
	var enemy_list = []
	for enemy_id in enemies_dict:
		var enemy = enemies_dict[enemy_id]
		if not is_instance_valid(enemy):
			continue
		var dist = player_pos.distance_to(enemy.global_position)
		enemy_list.append({"enemy": enemy, "dist": dist})

	enemy_list.sort_custom(func(a, b): return a.dist < b.dist)

	# Display info for closest enemies
	var count = 0
	for entry in enemy_list:
		if count >= max_enemies_shown:
			break

		var enemy = entry.enemy
		var dist = entry.dist

		# Get state color
		var state_color = "white"
		var ai_state = enemy.ai_state if "ai_state" in enemy else "unknown"
		match ai_state:
			"idle":
				state_color = "gray"
			"chase":
				state_color = "yellow"
			"attack":
				state_color = "red"
			"flee":
				state_color = "cyan"
			"support":
				state_color = "green"

		# Build info string
		text += "[b][color=orange]%s[/color][/b] (%s)\n" % [enemy.enemy_type if "enemy_type" in enemy else "unknown", enemy.enemy_id if "enemy_id" in enemy else "?"]
		text += "  State: [color=%s]%s[/color]\n" % [state_color, ai_state]
		text += "  HP: %.0f/%.0f\n" % [enemy.current_health if "current_health" in enemy else 0, enemy.max_health if "max_health" in enemy else 0]
		text += "  Distance: %.1fm\n" % dist

		# Target info
		if "target_id" in enemy and enemy.target_id != "":
			var target_label = enemy.target_id
			if game_world and "local_player" in game_world and game_world.local_player:
				if enemy.target_id == game_world.local_player.player_id:
					target_label = "[color=red]YOU![/color]"
			text += "  Target: %s\n" % target_label

		# Special states
		var special_states = []
		if "is_raging" in enemy and enemy.is_raging:
			special_states.append("[color=red]RAGE[/color]")
		if "is_buffed" in enemy and enemy.is_buffed:
			special_states.append("[color=green]BUFFED[/color]")
		if "is_charging" in enemy and enemy.is_charging:
			special_states.append("[color=blue]CHARGING[/color]")

		if not special_states.is_empty():
			text += "  Status: %s\n" % " ".join(special_states)

		text += "\n"
		count += 1

	if count < enemy_list.size():
		text += "[color=gray]... and %d more enemies[/color]" % (enemy_list.size() - count)

	enemy_info_label.text = text

# Called to draw debug visuals in 3D (called from game_world if needed)
func draw_debug_3d(camera: Camera3D) -> void:
	if not is_visible or not game_world:
		return

	# This would be used to draw aggro ranges, paths, etc. in 3D
	# For now, the 2D overlay is sufficient
	pass
