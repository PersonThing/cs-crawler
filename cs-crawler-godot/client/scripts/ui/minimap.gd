extends Control
## Minimap UI - shows 2D overhead view of the world with player positions

const MAP_SIZE: float = 150.0  # Size of the minimap in pixels
const WORLD_SCALE: float = 1.0  # World units per pixel (higher = zoomed out more)
const DOT_SIZE: float = 8.0  # Size of player dots
const ROOM_ALPHA: float = 0.4  # Transparency of room shapes

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
		return

	# Draw each room
	var rooms = level_manager.rooms
	for room_id in rooms:
		var room = rooms[room_id]
		if room.has_meta("room_data"):
			_draw_room(room.get_meta("room_data"))

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
	var room_rect = ColorRect.new()
	room_rect.mouse_filter = MOUSE_FILTER_IGNORE

	# Color based on room type
	match room_type:
		"start":
			room_rect.color = Color(0.3, 0.5, 0.7, ROOM_ALPHA)
		"boss":
			room_rect.color = Color(0.7, 0.2, 0.2, ROOM_ALPHA)
		"treasure":
			room_rect.color = Color(0.7, 0.6, 0.2, ROOM_ALPHA)
		"corridor":
			room_rect.color = Color(0.3, 0.3, 0.35, ROOM_ALPHA)
		_:
			room_rect.color = Color(0.4, 0.4, 0.45, ROOM_ALPHA)

	# Convert world coords to minimap coords (will be updated in _process)
	room_rect.size = Vector2(room_size.x / WORLD_SCALE, room_size.z / WORLD_SCALE)
	room_rect.set_meta("world_pos", world_pos)
	room_rect.set_meta("world_size", room_size)

	rooms_container.add_child(room_rect)

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
		if room_rect.has_meta("world_pos"):
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
