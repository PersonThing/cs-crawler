extends Node3D
## Hex Tile Manager - manages hex-based world tiles streamed from server

signal tile_loaded(coord: Vector3i, tile_data: Dictionary)
signal player_tile_changed(coord: Vector3i)

# Hex geometry constants (must match server: HexSize = 12.0, flat-top)
const HEX_SIZE: float = 12.0  # Outer radius
const HEX_INNER: float = HEX_SIZE * 0.866025  # sqrt(3)/2 * size
const HEX_LAYER_Y: float = -20.0  # Y offset per layer

# Loaded tiles: "q,r,layer" -> { node: Node3D, data: Dictionary }
var tiles: Dictionary = {}

# Board summary from server (minimap data)
var board_data: Dictionary = {}
var board_tiles_summary: Array = []

# Current player tile
var current_player_tile: Vector3i = Vector3i.ZERO

func _ready() -> void:
	name = "LevelManager"

# ---- Hex math (must match server) ----

func hex_to_world(q: int, r: int, layer: int = 0) -> Vector3:
	## Convert axial hex (q,r,layer) to world position (flat-top orientation)
	var x: float = HEX_SIZE * (3.0 / 2.0 * q)
	var z: float = HEX_SIZE * (sqrt(3.0) / 2.0 * q + sqrt(3.0) * r)
	var y: float = layer * HEX_LAYER_Y
	return Vector3(x, y, z)

func world_to_hex(pos: Vector3, layer: int = 0) -> Vector3i:
	## Convert world position to axial hex coordinate
	var q_frac: float = (2.0 / 3.0 * pos.x) / HEX_SIZE
	var r_frac: float = (-1.0 / 3.0 * pos.x + sqrt(3.0) / 3.0 * pos.z) / HEX_SIZE
	# Cube round
	var s_frac: float = -q_frac - r_frac
	var qi: int = roundi(q_frac)
	var ri: int = roundi(r_frac)
	var si: int = roundi(s_frac)
	var q_diff: float = abs(qi - q_frac)
	var r_diff: float = abs(ri - r_frac)
	var s_diff: float = abs(si - s_frac)
	if q_diff > r_diff and q_diff > s_diff:
		qi = -ri - si
	elif r_diff > s_diff:
		ri = -qi - si
	return Vector3i(qi, ri, layer)

func coord_key(q: int, r: int, layer: int) -> String:
	return "%d,%d,%d" % [q, r, layer]

func coord_key_v(coord: Vector3i) -> String:
	return "%d,%d,%d" % [coord.x, coord.y, coord.z]

# ---- Board data (minimap summary) ----

func load_board(data: Dictionary) -> void:
	## Receive board summary from server
	board_data = data
	board_tiles_summary = data.get("tiles", [])
	print("[TILES] Board loaded: %d tile summaries" % board_tiles_summary.size())

# ---- Tile streaming ----

func load_tile(tile_data: Dictionary) -> void:
	## Load a single tile from server data
	var coord_data = tile_data.get("coord", {})
	var q: int = int(coord_data.get("q", 0))
	var r: int = int(coord_data.get("r", 0))
	var layer: int = int(coord_data.get("layer", 0))
	var key: String = coord_key(q, r, layer)

	if tiles.has(key):
		return  # Already loaded

	# Create tile node
	var tile_node: Node3D = _create_tile_node(tile_data, q, r, layer)
	add_child(tile_node)

	tiles[key] = { "node": tile_node, "data": tile_data }
	tile_loaded.emit(Vector3i(q, r, layer), tile_data)
	print("[TILES] Loaded tile (%d,%d) biome=%s type=%s" % [q, r, tile_data.get("biome", "?"), tile_data.get("tileType", "?")])

# ---- Tile node creation ----

func _create_tile_node(tile_data: Dictionary, q: int, r: int, layer: int) -> Node3D:
	var node = Node3D.new()
	node.name = "Tile_%d_%d_%d" % [q, r, layer]

	var center: Vector3 = hex_to_world(q, r, layer)
	node.position = center

	# Create hex floor
	_create_hex_floor(node, tile_data)

	# Place terrain features
	var features = tile_data.get("features", [])
	for feature in features:
		_create_feature(node, feature, center)

	# Apply lighting
	var lighting = tile_data.get("lighting", {})
	_apply_tile_lighting(node, lighting)

	# Create floor collision for raycasting / navigation
	_create_hex_collision(node)

	return node

func _create_hex_floor(parent: Node3D, tile_data: Dictionary) -> void:
	## Create a hexagonal floor mesh
	var mesh_instance = MeshInstance3D.new()
	mesh_instance.name = "HexFloor"

	# Build hex polygon mesh (flat-top, 6 vertices + center)
	var surface_tool = SurfaceTool.new()
	surface_tool.begin(Mesh.PRIMITIVE_TRIANGLES)

	var vertices: Array[Vector3] = []
	vertices.append(Vector3.ZERO)  # Center
	for i in range(6):
		var angle_deg: float = 60.0 * i
		var angle_rad: float = deg_to_rad(angle_deg)
		vertices.append(Vector3(HEX_SIZE * cos(angle_rad), 0, HEX_SIZE * sin(angle_rad)))

	# Normal is UP for all vertices
	surface_tool.set_normal(Vector3.UP)

	# Fan triangles from center
	for i in range(6):
		var next_i: int = (i + 1) % 6
		surface_tool.add_vertex(vertices[0])
		surface_tool.add_vertex(vertices[i + 1])
		surface_tool.add_vertex(vertices[next_i + 1])

	var mesh: ArrayMesh = surface_tool.commit()
	mesh_instance.mesh = mesh

	# Material from biome ground color
	var mat = StandardMaterial3D.new()
	var biome: String = tile_data.get("biome", "grassland")
	var tile_type: String = tile_data.get("tileType", "overworld")

	match biome:
		"grassland":
			mat.albedo_color = Color(0.4, 0.6, 0.3)
		"forest":
			mat.albedo_color = Color(0.25, 0.35, 0.2)
		"hills":
			mat.albedo_color = Color(0.5, 0.45, 0.35)
		"town":
			mat.albedo_color = Color(0.55, 0.5, 0.4)
		_:
			mat.albedo_color = Color(0.4, 0.4, 0.4)

	# Darken dungeon tiles
	if tile_type == "dungeon":
		mat.albedo_color = mat.albedo_color.darkened(0.5)

	mat.roughness = 0.9
	mesh_instance.material_override = mat

	parent.add_child(mesh_instance)

func _create_hex_collision(parent: Node3D) -> void:
	## Create a collision shape for raycasting (layer 4: Environment)
	var static_body = StaticBody3D.new()
	static_body.collision_layer = 8  # Layer 4
	static_body.collision_mask = 0

	# Use a cylinder approximation for the hex
	var collision = CollisionShape3D.new()
	var shape = CylinderShape3D.new()
	shape.radius = HEX_SIZE
	shape.height = 0.2
	collision.shape = shape
	collision.position = Vector3(0, -0.1, 0)

	static_body.add_child(collision)
	parent.add_child(static_body)

func _create_feature(parent: Node3D, feature: Dictionary, tile_center: Vector3) -> void:
	## Create a terrain feature (tree, rock, etc.)
	var feature_type: String = feature.get("type", "")
	var pos_data: Dictionary = feature.get("position", {})
	var local_pos = Vector3(
		pos_data.get("x", 0.0) - tile_center.x,
		pos_data.get("y", 0.0) - tile_center.y,
		pos_data.get("z", 0.0) - tile_center.z
	)
	var rotation_deg: float = feature.get("rotation", 0.0)
	var scale_val: float = feature.get("scale", 1.0)

	var feature_node = Node3D.new()
	feature_node.position = local_pos
	feature_node.rotation_degrees.y = rotation_deg

	match feature_type:
		"tree_oak":
			_build_tree_oak(feature_node, scale_val)
		"rock_small":
			_build_rock(feature_node, scale_val, 0.4, 0.5)
		"rock_large":
			_build_rock(feature_node, scale_val, 0.8, 1.0)
		"bush":
			_build_bush(feature_node, scale_val)
		"flower_patch":
			_build_flower_patch(feature_node, scale_val)
		"ruin_pillar":
			_build_ruin_pillar(feature_node, scale_val)
		"campfire":
			_build_campfire(feature_node, scale_val)
		"market_stall":
			_build_market_stall(feature_node, scale_val)

	parent.add_child(feature_node)

func _build_tree_oak(node: Node3D, s: float) -> void:
	var trunk = MeshInstance3D.new()
	var trunk_mesh = CylinderMesh.new()
	trunk_mesh.top_radius = 0.15 * s
	trunk_mesh.bottom_radius = 0.25 * s
	trunk_mesh.height = 2.0 * s
	trunk.mesh = trunk_mesh
	trunk.position.y = 1.0 * s
	var trunk_mat = StandardMaterial3D.new()
	trunk_mat.albedo_color = Color(0.4, 0.25, 0.1)
	trunk.material_override = trunk_mat
	node.add_child(trunk)

	var canopy = MeshInstance3D.new()
	var canopy_mesh = SphereMesh.new()
	canopy_mesh.radius = 1.2 * s
	canopy_mesh.height = 2.0 * s
	canopy.mesh = canopy_mesh
	canopy.position.y = 2.5 * s
	var canopy_mat = StandardMaterial3D.new()
	canopy_mat.albedo_color = Color(0.2, 0.5, 0.15)
	canopy.material_override = canopy_mat
	node.add_child(canopy)

func _build_rock(node: Node3D, s: float, base_radius: float, base_height: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var rock_mesh = SphereMesh.new()
	rock_mesh.radius = base_radius * s
	rock_mesh.height = base_height * s
	mesh_instance.mesh = rock_mesh
	mesh_instance.position.y = (base_height * s) / 2.0
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.48, 0.45)
	mat.roughness = 1.0
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

func _build_bush(node: Node3D, s: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var bush_mesh = SphereMesh.new()
	bush_mesh.radius = 0.5 * s
	bush_mesh.height = 0.6 * s
	mesh_instance.mesh = bush_mesh
	mesh_instance.position.y = 0.25 * s
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.25, 0.45, 0.15)
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

func _build_flower_patch(node: Node3D, s: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var flower_mesh = BoxMesh.new()
	flower_mesh.size = Vector3(0.6 * s, 0.1 * s, 0.6 * s)
	mesh_instance.mesh = flower_mesh
	mesh_instance.position.y = 0.05
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.8, 0.6, 0.2)
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

func _build_ruin_pillar(node: Node3D, s: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var pillar_mesh = CylinderMesh.new()
	pillar_mesh.top_radius = 0.3 * s
	pillar_mesh.bottom_radius = 0.35 * s
	pillar_mesh.height = 3.0 * s
	mesh_instance.mesh = pillar_mesh
	mesh_instance.position.y = 1.5 * s
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.55, 0.5, 0.45)
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

func _build_campfire(node: Node3D, s: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var base_mesh = TorusMesh.new()
	base_mesh.inner_radius = 0.3 * s
	base_mesh.outer_radius = 0.5 * s
	mesh_instance.mesh = base_mesh
	mesh_instance.position.y = 0.1
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.3, 0.25)
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

	var fire_light = OmniLight3D.new()
	fire_light.light_color = Color(1.0, 0.7, 0.3)
	fire_light.light_energy = 2.0
	fire_light.omni_range = 6.0
	fire_light.position.y = 0.5
	node.add_child(fire_light)

func _build_market_stall(node: Node3D, s: float) -> void:
	var mesh_instance = MeshInstance3D.new()
	var stall_mesh = BoxMesh.new()
	stall_mesh.size = Vector3(2.0 * s, 2.0 * s, 1.5 * s)
	mesh_instance.mesh = stall_mesh
	mesh_instance.position.y = 1.0 * s
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.55, 0.4, 0.2)
	mesh_instance.material_override = mat
	node.add_child(mesh_instance)

	var awning = MeshInstance3D.new()
	var awning_mesh = BoxMesh.new()
	awning_mesh.size = Vector3(2.4 * s, 0.1, 2.0 * s)
	awning.mesh = awning_mesh
	awning.position.y = 2.2 * s
	var awning_mat = StandardMaterial3D.new()
	awning_mat.albedo_color = Color(0.7, 0.2, 0.15)
	awning.material_override = awning_mat
	node.add_child(awning)

func _apply_tile_lighting(node: Node3D, lighting: Dictionary) -> void:
	## Apply per-tile ambient lighting
	var ambient_color = lighting.get("ambientColor", [0.8, 0.8, 0.8])
	var intensity: float = lighting.get("ambientIntensity", 0.7)

	var light = DirectionalLight3D.new()
	light.name = "TileLight"
	if ambient_color is Array and ambient_color.size() >= 3:
		light.light_color = Color(ambient_color[0], ambient_color[1], ambient_color[2])
	light.light_energy = intensity * 1.5
	light.shadow_enabled = false
	light.position = Vector3(0, 5, 0)
	node.add_child(light)

	# Fog metadata (for world environment to read)
	var fog_enabled: bool = lighting.get("fogEnabled", false)
	if fog_enabled:
		node.set_meta("fog_enabled", true)
		node.set_meta("fog_color", lighting.get("fogColor", [0.1, 0.1, 0.1]))
		node.set_meta("fog_density", lighting.get("fogDensity", 0.01))

# ---- Player tile tracking ----

func update_player_tile(player_pos: Vector3) -> void:
	## Called each frame to check if the player has changed tiles
	var new_tile: Vector3i = world_to_hex(player_pos)
	if new_tile != current_player_tile:
		current_player_tile = new_tile
		player_tile_changed.emit(new_tile)

func get_spawn_point() -> Vector3:
	## Return the town center (0,0,0) world position
	return hex_to_world(0, 0, 0)

func get_tile_at(coord: Vector3i) -> Dictionary:
	var key: String = coord_key_v(coord)
	if tiles.has(key):
		return tiles[key].get("data", {})
	return {}

func is_tile_loaded(q: int, r: int, layer: int = 0) -> bool:
	return tiles.has(coord_key(q, r, layer))
