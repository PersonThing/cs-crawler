extends Node3D
class_name RoomBase
## Base class for all room types

@export var room_type: String = "combat"

# Room data from server
var room_data: Dictionary = {}
var room_size: Vector3 = Vector3(16, 4, 16)

# Components
var floor_mesh: MeshInstance3D = null
var walls: Array[MeshInstance3D] = []
var ceiling_mesh: MeshInstance3D = null
var room_light: OmniLight3D = null

func _ready() -> void:
	# Don't create geometry here - wait for setup() to be called by level manager
	# This prevents double geometry when level_manager instantiates prefabs
	pass

func setup(data: Dictionary) -> void:
	## Setup room from server data
	room_data = data
	set_meta("room_data", data)

	var size_data = data.get("size", {})
	room_size = Vector3(
		size_data.get("x", 16.0),
		size_data.get("y", 4.0),
		size_data.get("z", 16.0)
	)
	set_meta("room_size", room_size)

	_create_room_geometry()
	_apply_room_decorations()

func _create_room_geometry() -> void:
	## Create floor, walls, and ceiling
	_create_floor()
	_create_walls()
	_create_lighting()

func _create_floor() -> void:
	## Create floor mesh with collision
	floor_mesh = MeshInstance3D.new()
	floor_mesh.name = "Floor"

	var mesh = BoxMesh.new()
	mesh.size = Vector3(room_size.x, 0.2, room_size.z)
	floor_mesh.mesh = mesh

	# Floor material
	var mat = StandardMaterial3D.new()
	mat.albedo_color = _get_floor_color()
	mat.roughness = 0.8
	floor_mesh.material_override = mat

	# Position floor
	floor_mesh.position = Vector3(0, -0.1, 0)

	# Add collision for raycast
	var static_body = StaticBody3D.new()
	static_body.name = "FloorCollision"
	static_body.collision_layer = 8  # Layer 4: Environment

	var collision = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(room_size.x, 0.2, room_size.z)
	collision.shape = shape

	static_body.add_child(collision)
	floor_mesh.add_child(static_body)

	add_child(floor_mesh)

func _create_walls() -> void:
	## Create wall meshes around room perimeter
	var wall_height = room_size.y
	var wall_thickness = 0.3

	# Get connection directions to leave openings
	var connections = room_data.get("connections", [])
	var open_directions: Array[String] = []

	var room_id = room_data.get("id", "")
	var my_room_type = room_data.get("type", "")

	# Get directions from this room's outgoing connections
	for conn in connections:
		var dir = conn.get("direction", "")
		if dir != "" and not dir in open_directions:
			open_directions.append(dir)

	# Also check for incoming connections from the level manager
	var level_manager = get_parent()
	if level_manager and level_manager.has_method("get_incoming_connection_directions"):
		var incoming = level_manager.get_incoming_connection_directions(room_id)
		for dir in incoming:
			if dir != "" and not dir in open_directions:
				open_directions.append(dir)

	# Additionally, check for adjacent corridors by position
	if level_manager and level_manager.has_method("get_adjacent_corridor_directions"):
		var corridor_dirs = level_manager.get_adjacent_corridor_directions(room_id)
		for dir in corridor_dirs:
			if dir != "" and not dir in open_directions:
				open_directions.append(dir)

	print("[ROOM] %s (%s) open_directions: %s" % [room_id, my_room_type, open_directions])

	# Corridors should have openings on both ends by default
	if my_room_type == "corridor":
		if open_directions.is_empty():
			if room_size.x > room_size.z:
				open_directions.append("east")
				open_directions.append("west")
			else:
				open_directions.append("north")
				open_directions.append("south")

	# North wall
	if not "north" in open_directions:
		_create_wall(
			Vector3(0, wall_height/2, room_size.z/2),
			Vector3(room_size.x, wall_height, wall_thickness)
		)

	# South wall
	if not "south" in open_directions:
		_create_wall(
			Vector3(0, wall_height/2, -room_size.z/2),
			Vector3(room_size.x, wall_height, wall_thickness)
		)

	# East wall
	if not "east" in open_directions:
		_create_wall(
			Vector3(room_size.x/2, wall_height/2, 0),
			Vector3(wall_thickness, wall_height, room_size.z)
		)

	# West wall
	if not "west" in open_directions:
		_create_wall(
			Vector3(-room_size.x/2, wall_height/2, 0),
			Vector3(wall_thickness, wall_height, room_size.z)
		)

func _create_wall(pos: Vector3, size: Vector3) -> void:
	## Create a single wall segment
	var wall = MeshInstance3D.new()
	wall.name = "Wall"

	var mesh = BoxMesh.new()
	mesh.size = size
	wall.mesh = mesh

	# Wall material
	var mat = StandardMaterial3D.new()
	mat.albedo_color = _get_wall_color()
	mat.roughness = 0.9
	wall.material_override = mat

	wall.position = pos

	# Add collision
	var static_body = StaticBody3D.new()
	static_body.collision_layer = 8  # Layer 4: Environment

	var collision = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = size
	collision.shape = shape

	static_body.add_child(collision)
	wall.add_child(static_body)

	add_child(wall)
	walls.append(wall)

func _create_lighting() -> void:
	## Create room lighting
	room_light = OmniLight3D.new()
	room_light.name = "RoomLight"
	room_light.position = Vector3(0, room_size.y - 0.5, 0)
	room_light.light_energy = _get_light_energy()
	room_light.light_color = _get_light_color()
	room_light.omni_range = max(room_size.x, room_size.z) * 0.8
	room_light.shadow_enabled = true
	add_child(room_light)

func _apply_room_decorations() -> void:
	## Override in subclasses to add room-specific decorations
	pass

# Virtual methods for room type customization
func _get_floor_color() -> Color:
	return Color(0.3, 0.28, 0.25)

func _get_wall_color() -> Color:
	return Color(0.35, 0.32, 0.3)

func _get_light_color() -> Color:
	return Color(1.0, 0.95, 0.9)

func _get_light_energy() -> float:
	return 1.0
