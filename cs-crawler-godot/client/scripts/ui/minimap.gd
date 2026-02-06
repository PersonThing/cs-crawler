extends Control
## Minimap UI - shows 2D overhead view of the world with player positions

const MAP_SIZE: float = 500.0  # Size of the minimap in pixels
const WORLD_SCALE: float = 0.2  # World units per pixel (higher = zoomed out more)
const DOT_SIZE: float = 12.0  # Size of player dots
const ROOM_ALPHA: float = 0.9  # Transparency of room shapes

var game_world: Node3D = null
var local_player: Node3D = null
var remote_players: Dictionary = {}
var level_manager: Node3D = null

# UI elements
var map_container: Control = null
var map_background: ColorRect = null
var rooms_container: Control = null
var local_player_dot: ColorRect = null
var remote_dots: Dictionary = {}  # player_id -> ColorRect

func _ready() -> void:
	_setup_ui()

func _setup_ui() -> void:
	# Main container - positioned at top right
	set_anchors_preset(PRESET_TOP_RIGHT)
	anchor_left = 1.0
	anchor_right = 1.0
	anchor_top = 0.0
	anchor_bottom = 0.0
	offset_left = -MAP_SIZE - 10
	offset_right = -10
	offset_top = 40  # Below FPS label
	offset_bottom = MAP_SIZE + 40
	mouse_filter = MOUSE_FILTER_IGNORE

	# Map container with border
	map_container = Control.new()
	map_container.name = "MapContainer"
	map_container.custom_minimum_size = Vector2(MAP_SIZE, MAP_SIZE)
	map_container.size = Vector2(MAP_SIZE, MAP_SIZE)
	map_container.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(map_container)

	# Background with border
	map_background = ColorRect.new()
	map_background.name = "Background"
	map_background.color = Color(0.05, 0.05, 0.1, 0.8)
	map_background.set_anchors_preset(PRESET_FULL_RECT)
	map_background.mouse_filter = MOUSE_FILTER_IGNORE
	map_container.add_child(map_background)

	# Border
	var border = Panel.new()
	border.name = "Border"
	border.set_anchors_preset(PRESET_FULL_RECT)
	border.mouse_filter = MOUSE_FILTER_IGNORE
	var border_style = StyleBoxFlat.new()
	border_style.bg_color = Color(0, 0, 0, 0)
	border_style.border_width_left = 2
	border_style.border_width_right = 2
	border_style.border_width_top = 2
	border_style.border_width_bottom = 2
	border_style.border_color = Color(0.4, 0.4, 0.5, 0.8)
	border.add_theme_stylebox_override("panel", border_style)
	map_container.add_child(border)

	# Rooms container (for drawing room shapes)
	rooms_container = Control.new()
	rooms_container.name = "RoomsContainer"
	rooms_container.set_anchors_preset(PRESET_FULL_RECT)
	rooms_container.mouse_filter = MOUSE_FILTER_IGNORE
	rooms_container.clip_contents = true
	map_container.add_child(rooms_container)

	# Local player dot (blue)
	local_player_dot = ColorRect.new()
	local_player_dot.name = "LocalPlayerDot"
	local_player_dot.color = Color(0.2, 0.6, 1.0)  # Blue for local player
	local_player_dot.size = Vector2(DOT_SIZE, DOT_SIZE)
	local_player_dot.mouse_filter = MOUSE_FILTER_IGNORE
	local_player_dot.visible = false
	map_container.add_child(local_player_dot)

func set_game_world(world: Node3D) -> void:
	game_world = world

func set_local_player(player: Node3D) -> void:
	local_player = player
	if local_player:
		local_player_dot.visible = true

func set_level_manager(manager: Node3D) -> void:
	level_manager = manager
	_draw_rooms()

func update_remote_players(players: Dictionary) -> void:
	remote_players = players

	# Remove dots for players that no longer exist
	var to_remove = []
	for pid in remote_dots.keys():
		if not players.has(pid):
			remote_dots[pid].queue_free()
			to_remove.append(pid)
	for pid in to_remove:
		remote_dots.erase(pid)

	# Add dots for new players
	for pid in players.keys():
		if not remote_dots.has(pid):
			var dot = ColorRect.new()
			dot.name = "RemoteDot_" + pid
			dot.color = Color(0.2, 0.9, 0.3)  # Green for other players
			dot.size = Vector2(DOT_SIZE, DOT_SIZE)
			dot.mouse_filter = MOUSE_FILTER_IGNORE
			map_container.add_child(dot)
			remote_dots[pid] = dot

func _draw_rooms() -> void:
	# Clear existing room shapes
	for child in rooms_container.get_children():
		child.queue_free()

	if not level_manager or not level_manager.has_meta("rooms"):
		# Try to get rooms from the level_data
		if level_manager and "level_data" in level_manager:
			var rooms_data = level_manager.level_data.get("rooms", [])
			for room_data in rooms_data:
				_draw_room(room_data)
			# Draw connections
			_draw_connections(rooms_data)
		return

	# Draw each room
	var rooms = level_manager.rooms
	var rooms_data = []
	for room_id in rooms:
		var room = rooms[room_id]
		if room.has_meta("room_data"):
			var room_data = room.get_meta("room_data")
			_draw_room(room_data)
			rooms_data.append(room_data)

	# Draw connections
	_draw_connections(rooms_data)

func _draw_room(room_data: Dictionary) -> void:
	var pos_data = room_data.get("position", {})
	var size_data = room_data.get("size", {})
	var room_type = room_data.get("type", "combat")

	var world_pos = Vector3(
		pos_data.get("x", 0.0),
		0,
		pos_data.get("z", 0.0)
	)
	var room_size = Vector3(
		size_data.get("x", 16.0),
		0,
		size_data.get("z", 16.0)
	)

	# Create room rectangle
	var room_rect = Panel.new()
	room_rect.mouse_filter = MOUSE_FILTER_IGNORE

	# Add border for better visibility
	var room_style = StyleBoxFlat.new()
	room_style.border_width_left = 2
	room_style.border_width_right = 2
	room_style.border_width_top = 2
	room_style.border_width_bottom = 2
	room_style.border_color = Color(0, 0, 0, 1)  # Black border

	# Color based on room type - DISTINCT COLORS for debugging
	match room_type:
		"start":
			room_style.bg_color = Color(0.0, 1.0, 0.0, ROOM_ALPHA)  # BRIGHT GREEN
		"boss":
			room_style.bg_color = Color(1.0, 0.0, 0.0, ROOM_ALPHA)  # BRIGHT RED
		"treasure":
			room_style.bg_color = Color(1.0, 1.0, 0.0, ROOM_ALPHA)  # BRIGHT YELLOW
		"corridor":
			room_style.bg_color = Color(0.5, 0.5, 0.5, ROOM_ALPHA)  # GRAY
		"arena":
			room_style.bg_color = Color(1.0, 0.0, 1.0, ROOM_ALPHA)  # MAGENTA
		"combat":
			room_style.bg_color = Color(0.0, 0.5, 1.0, ROOM_ALPHA)  # BRIGHT BLUE
		_:
			room_style.bg_color = Color(1.0, 0.5, 0.0, ROOM_ALPHA)  # ORANGE (unknown)

	room_rect.add_theme_stylebox_override("panel", room_style)

	# Convert world coords to minimap coords (will be updated in _process)
	room_rect.size = Vector2(room_size.x / WORLD_SCALE, room_size.z / WORLD_SCALE)
	room_rect.set_meta("world_pos", world_pos)
	room_rect.set_meta("world_size", room_size)

	# Add label showing room ID and type
	var label = Label.new()
	label.text = room_data.get("id", "?") + "\n" + room_type[0].to_upper()
	label.add_theme_font_size_override("font_size", 10)
	label.add_theme_color_override("font_color", Color(1, 1, 1, 1))
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 1))
	label.add_theme_constant_override("outline_size", 2)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_preset(PRESET_FULL_RECT)
	label.mouse_filter = MOUSE_FILTER_IGNORE
	room_rect.add_child(label)

	rooms_container.add_child(room_rect)

func _draw_connections(rooms_data: Array) -> void:
	## Draw connection lines between rooms
	# Create a lookup for room positions
	var room_positions = {}
	for room_data in rooms_data:
		var room_id = room_data.get("id", "")
		var pos_data = room_data.get("position", {})
		room_positions[room_id] = Vector3(
			pos_data.get("x", 0.0),
			0,
			pos_data.get("z", 0.0)
		)

	# Draw connection lines
	for room_data in rooms_data:
		var room_id = room_data.get("id", "")
		var connections = room_data.get("connections", [])
		var room_pos = room_positions.get(room_id, Vector3.ZERO)

		for conn in connections:
			var target_id = conn.get("targetRoomID", "")
			if not room_positions.has(target_id):
				continue

			# Only draw each connection once (from lower ID to higher ID)
			if room_id > target_id:
				continue

			var target_pos = room_positions[target_id]

			# Create a line visual using a ColorRect
			var line = ColorRect.new()
			line.color = Color(1.0, 1.0, 1.0, 0.7)  # White connection lines
			line.mouse_filter = MOUSE_FILTER_IGNORE
			line.set_meta("world_start", room_pos)
			line.set_meta("world_end", target_pos)
			line.set_meta("is_connection_line", true)

			rooms_container.add_child(line)

func _world_to_minimap(world_pos: Vector3, center_pos: Vector3) -> Vector2:
	## Convert world position to minimap position, centered on center_pos
	var relative = world_pos - center_pos
	var minimap_x = (relative.x / WORLD_SCALE) + (MAP_SIZE / 2.0)
	var minimap_y = (relative.z / WORLD_SCALE) + (MAP_SIZE / 2.0)
	return Vector2(minimap_x, minimap_y)

func _process(_delta: float) -> void:
	if not is_instance_valid(local_player):
		return

	var center_pos = local_player.global_position

	# Update local player dot (always centered)
	local_player_dot.position = Vector2(
		(MAP_SIZE - DOT_SIZE) / 2.0,
		(MAP_SIZE - DOT_SIZE) / 2.0
	)

	# Update remote player dots
	for pid in remote_players.keys():
		if remote_dots.has(pid) and is_instance_valid(remote_players[pid]):
			var remote_pos = remote_players[pid].global_position
			var minimap_pos = _world_to_minimap(remote_pos, center_pos)
			remote_dots[pid].position = minimap_pos - Vector2(DOT_SIZE / 2.0, DOT_SIZE / 2.0)

			# Hide if off the map
			var in_bounds = minimap_pos.x >= 0 and minimap_pos.x <= MAP_SIZE and minimap_pos.y >= 0 and minimap_pos.y <= MAP_SIZE
			remote_dots[pid].visible = in_bounds

	# Update room positions (relative to player center)
	for room_rect in rooms_container.get_children():
		if room_rect.has_meta("is_connection_line"):
			# Update connection line
			var world_start: Vector3 = room_rect.get_meta("world_start")
			var world_end: Vector3 = room_rect.get_meta("world_end")

			var start_pos = _world_to_minimap(world_start, center_pos)
			var end_pos = _world_to_minimap(world_end, center_pos)

			# Calculate line position, rotation, and length
			var diff = end_pos - start_pos
			var length = diff.length()
			var angle = diff.angle()

			room_rect.position = start_pos
			room_rect.size = Vector2(length, 3.0)  # 3px thick line
			room_rect.rotation = angle
			room_rect.pivot_offset = Vector2(0, 1.5)

		elif room_rect.has_meta("world_pos"):
			var world_pos: Vector3 = room_rect.get_meta("world_pos")
			var world_size: Vector3 = room_rect.get_meta("world_size")

			# Top-left corner in world space
			var top_left = Vector3(
				world_pos.x - world_size.x / 2.0,
				0,
				world_pos.z - world_size.z / 2.0
			)

			var minimap_pos = _world_to_minimap(top_left, center_pos)
			room_rect.position = minimap_pos
