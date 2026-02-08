extends Control
## Minimap UI - shows hex grid overview with player positions

const MAP_SIZE: float = 200.0  # Minimap size in pixels
const HEX_DRAW_SIZE: float = 16.0  # Pixel size per hex tile on minimap
const DOT_SIZE: float = 8.0  # Player dot size
const HEX_INNER: float = HEX_DRAW_SIZE * 0.866025  # sqrt(3)/2

var game_world: Node3D = null
var local_player: Node3D = null
var remote_players: Dictionary = {}
var level_manager: Node3D = null

# UI elements
var map_container: Control = null
var map_background: ColorRect = null
var hex_container: Control = null
var local_player_dot: ColorRect = null
var remote_dots: Dictionary = {}

# Cached hex draw data
var _hex_tiles_drawn: Dictionary = {}  # "q,r,layer" -> Panel

func _ready() -> void:
	_setup_ui()

func _setup_ui() -> void:
	set_anchors_preset(PRESET_TOP_RIGHT)
	anchor_left = 1.0
	anchor_right = 1.0
	anchor_top = 0.0
	anchor_bottom = 0.0
	offset_left = -MAP_SIZE - 10
	offset_right = -10
	offset_top = 40
	offset_bottom = MAP_SIZE + 40
	mouse_filter = MOUSE_FILTER_IGNORE

	map_container = Control.new()
	map_container.name = "MapContainer"
	map_container.custom_minimum_size = Vector2(MAP_SIZE, MAP_SIZE)
	map_container.size = Vector2(MAP_SIZE, MAP_SIZE)
	map_container.mouse_filter = MOUSE_FILTER_IGNORE
	map_container.clip_contents = true
	add_child(map_container)

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

	hex_container = Control.new()
	hex_container.name = "HexContainer"
	hex_container.set_anchors_preset(PRESET_FULL_RECT)
	hex_container.mouse_filter = MOUSE_FILTER_IGNORE
	hex_container.clip_contents = true
	map_container.add_child(hex_container)

	# Local player dot
	local_player_dot = ColorRect.new()
	local_player_dot.name = "LocalPlayerDot"
	local_player_dot.color = Color(0.2, 0.6, 1.0)
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
	_refresh_hex_tiles()

func update_remote_players(players: Dictionary) -> void:
	remote_players = players

	# Remove dots for departed players
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
			dot.color = Color(0.2, 0.9, 0.3)
			dot.size = Vector2(DOT_SIZE, DOT_SIZE)
			dot.mouse_filter = MOUSE_FILTER_IGNORE
			map_container.add_child(dot)
			remote_dots[pid] = dot

func _refresh_hex_tiles() -> void:
	## Redraw all hex tiles on the minimap from board summary
	for child in hex_container.get_children():
		child.queue_free()
	_hex_tiles_drawn.clear()

	if not level_manager:
		return

	var summaries: Array = level_manager.board_tiles_summary
	for tile_summary in summaries:
		_draw_hex_tile(tile_summary)

func _draw_hex_tile(tile_summary: Dictionary) -> void:
	var coord = tile_summary.get("coord", {})
	var q: int = int(coord.get("q", 0))
	var r: int = int(coord.get("r", 0))
	var layer: int = int(coord.get("layer", 0))
	var biome: String = tile_summary.get("biome", "grassland")
	var tile_type: String = tile_summary.get("tileType", "overworld")
	var explored: bool = tile_summary.get("explored", false)

	var key: String = "%d,%d,%d" % [q, r, layer]
	if _hex_tiles_drawn.has(key):
		return

	# Convert hex coord to minimap pixel offset (flat-top)
	# These are relative to the board center - we'll position them in _process
	var hex_panel = Panel.new()
	hex_panel.mouse_filter = MOUSE_FILTER_IGNORE
	hex_panel.size = Vector2(HEX_DRAW_SIZE * 1.5, HEX_DRAW_SIZE * 1.5)

	var style = StyleBoxFlat.new()
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.border_color = Color(0.3, 0.3, 0.4, 0.6)

	# Color by biome/type
	match tile_type:
		"town":
			style.bg_color = Color(0.7, 0.6, 0.4, 0.9)
		"dungeon_entrance":
			style.bg_color = Color(0.6, 0.3, 0.3, 0.9)
		"dungeon":
			style.bg_color = Color(0.2, 0.2, 0.3, 0.9)
		_:
			match biome:
				"grassland":
					style.bg_color = Color(0.3, 0.5, 0.25, 0.9)
				"forest":
					style.bg_color = Color(0.15, 0.3, 0.12, 0.9)
				"hills":
					style.bg_color = Color(0.45, 0.4, 0.3, 0.9)
				_:
					style.bg_color = Color(0.35, 0.35, 0.35, 0.9)

	# Dim unexplored tiles
	if not explored:
		style.bg_color = style.bg_color.darkened(0.4)
		style.bg_color.a = 0.5

	hex_panel.add_theme_stylebox_override("panel", style)
	hex_panel.set_meta("hex_q", q)
	hex_panel.set_meta("hex_r", r)
	hex_panel.set_meta("hex_layer", layer)

	hex_container.add_child(hex_panel)
	_hex_tiles_drawn[key] = hex_panel

func _hex_to_minimap(q: int, r: int, center_q: int, center_r: int) -> Vector2:
	## Convert hex coord to minimap pixel position, centered on (center_q, center_r)
	var dq: float = q - center_q
	var dr: float = r - center_r
	# Flat-top hex pixel offset
	var px: float = HEX_DRAW_SIZE * (3.0 / 2.0 * dq)
	var py: float = HEX_DRAW_SIZE * (sqrt(3.0) / 2.0 * dq + sqrt(3.0) * dr)
	return Vector2(MAP_SIZE / 2.0 + px, MAP_SIZE / 2.0 + py)

func _process(_delta: float) -> void:
	if not is_instance_valid(local_player):
		return

	# Get player's current hex tile (use level_manager if available)
	var center_q: int = 0
	var center_r: int = 0
	if level_manager:
		center_q = level_manager.current_player_tile.x
		center_r = level_manager.current_player_tile.y

	# Update local player dot (always centered)
	local_player_dot.position = Vector2(
		(MAP_SIZE - DOT_SIZE) / 2.0,
		(MAP_SIZE - DOT_SIZE) / 2.0
	)

	# Update remote player dots
	for pid in remote_players.keys():
		if remote_dots.has(pid) and is_instance_valid(remote_players[pid]):
			var remote_pos = remote_players[pid].global_position
			# Convert remote player world pos to hex, then to minimap
			if level_manager:
				var remote_hex = level_manager.world_to_hex(remote_pos)
				var minimap_pos = _hex_to_minimap(remote_hex.x, remote_hex.y, center_q, center_r)
				remote_dots[pid].position = minimap_pos - Vector2(DOT_SIZE / 2.0, DOT_SIZE / 2.0)
				var in_bounds = minimap_pos.x >= 0 and minimap_pos.x <= MAP_SIZE and minimap_pos.y >= 0 and minimap_pos.y <= MAP_SIZE
				remote_dots[pid].visible = in_bounds

	# Update hex tile positions (relative to player center)
	for key in _hex_tiles_drawn.keys():
		var panel: Panel = _hex_tiles_drawn[key]
		if not is_instance_valid(panel):
			continue
		var hq: int = panel.get_meta("hex_q")
		var hr: int = panel.get_meta("hex_r")
		var minimap_pos = _hex_to_minimap(hq, hr, center_q, center_r)
		panel.position = minimap_pos - panel.size / 2.0

		# Hide tiles too far from view
		var in_bounds = minimap_pos.x >= -HEX_DRAW_SIZE and minimap_pos.x <= MAP_SIZE + HEX_DRAW_SIZE
		in_bounds = in_bounds and minimap_pos.y >= -HEX_DRAW_SIZE and minimap_pos.y <= MAP_SIZE + HEX_DRAW_SIZE
		panel.visible = in_bounds
