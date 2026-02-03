extends Node3D
## Level Manager - handles procedural level assembly from server data

signal level_loaded(level_data: Dictionary)
signal room_entered(room_id: String, room_type: String)

# Room prefab scenes - loaded dynamically to handle missing files gracefully
var room_prefabs: Dictionary = {}
var prefabs_loaded: bool = false

# Level data from server
var level_data: Dictionary = {}
var rooms: Dictionary = {}  # room_id -> Room node
var current_room_id: String = ""

# Navigation mesh
var nav_region: NavigationRegion3D = null

func _ready() -> void:
	name = "LevelManager"
	_load_room_prefabs()

func _load_room_prefabs() -> void:
	## Load room prefabs dynamically
	if prefabs_loaded:
		return

	print("[LEVEL] Loading room prefabs...")
	var room_types = ["start", "combat", "corridor", "treasure", "boss", "arena"]
	for room_type in room_types:
		var path = "res://scenes/rooms/room_%s.tscn" % room_type
		if ResourceLoader.exists(path):
			room_prefabs[room_type] = load(path)
			print("[LEVEL] Loaded room prefab: ", room_type)
		else:
			print("[LEVEL] WARNING: Room prefab not found: ", path)

	prefabs_loaded = true
	print("[LEVEL] Prefabs loaded: ", room_prefabs.keys())

func load_level(data: Dictionary) -> void:
	## Load level from server data and instantiate rooms
	print("[LEVEL] Loading level: ", data.get("id", "unknown"))
	print("[LEVEL] Data keys: ", data.keys())

	# Ensure prefabs are loaded
	if not prefabs_loaded:
		_load_room_prefabs()

	level_data = data

	# Clear existing rooms
	_clear_level()

	# Create navigation region
	_setup_navigation()

	# Instantiate rooms
	var rooms_data = data.get("rooms", [])
	print("[LEVEL] Rooms data count: ", rooms_data.size())
	for room_data in rooms_data:
		print("[LEVEL] Creating room: ", room_data.get("id", "unknown"), " type: ", room_data.get("type", "unknown"))
		_create_room(room_data)

	# Create corridor connections between rooms
	_create_corridors()

	# Bake navigation mesh
	_bake_navigation()

	level_loaded.emit(data)
	print("[LEVEL] Level loaded with %d rooms" % rooms.size())

func _clear_level() -> void:
	## Clear all existing rooms
	for room_id in rooms:
		if is_instance_valid(rooms[room_id]):
			rooms[room_id].queue_free()
	rooms.clear()

	# Clear old navigation region
	if nav_region:
		nav_region.queue_free()
		nav_region = null

func _setup_navigation() -> void:
	## Setup navigation region for pathfinding
	nav_region = NavigationRegion3D.new()
	nav_region.name = "LevelNavigation"
	add_child(nav_region)

	var nav_mesh = NavigationMesh.new()
	nav_mesh.agent_radius = 0.5
	nav_mesh.agent_height = 1.8
	nav_mesh.cell_size = 0.25
	nav_mesh.cell_height = 0.25
	nav_region.navigation_mesh = nav_mesh

func _create_room(room_data: Dictionary) -> void:
	## Create a room instance from data
	var room_id = room_data.get("id", "")
	var room_type = room_data.get("type", "combat")

	print("[LEVEL] _create_room called for: ", room_id, " type: ", room_type)
	print("[LEVEL] Available prefabs: ", room_prefabs.keys())

	# Get prefab for room type
	var prefab = room_prefabs.get(room_type)
	if prefab == null:
		print("[LEVEL] Prefab not found for type: ", room_type, ", trying combat fallback")
		prefab = room_prefabs.get("combat")  # Fallback

	if prefab == null:
		print("[LEVEL] ERROR: No prefab available, creating simple floor")
		_create_simple_room(room_data)
		return

	# Instantiate room
	var room = prefab.instantiate()
	room.name = room_id

	# Set position
	var pos_data = room_data.get("position", {})
	room.position = Vector3(
		pos_data.get("x", 0.0),
		pos_data.get("y", 0.0),
		pos_data.get("z", 0.0)
	)

	# Set size (scale room floor)
	var size_data = room_data.get("size", {})
	var room_size = Vector3(
		size_data.get("x", 16.0),
		size_data.get("y", 4.0),
		size_data.get("z", 16.0)
	)

	# Add to scene FIRST so get_parent() works during setup
	add_child(room)
	rooms[room_id] = room

	# Store room data for later use (AFTER adding to tree so parent is accessible)
	if room.has_method("setup"):
		room.setup(room_data)
	else:
		room.set_meta("room_data", room_data)
		room.set_meta("room_size", room_size)

	# Apply lighting
	var lighting = room_data.get("lighting", {})
	_apply_room_lighting(room, lighting)

	print("[LEVEL] Created room: %s (%s) at %s" % [room_id, room_type, room.position])

func _apply_room_lighting(room: Node3D, lighting: Dictionary) -> void:
	## Apply lighting settings to a room
	# Find or create room light
	var light = room.get_node_or_null("RoomLight")
	if not light:
		light = DirectionalLight3D.new()
		light.name = "RoomLight"
		room.add_child(light)

	# Apply ambient color
	var ambient_color = lighting.get("ambientColor", [0.6, 0.6, 0.6])
	if ambient_color is Array and ambient_color.size() >= 3:
		light.light_color = Color(ambient_color[0], ambient_color[1], ambient_color[2])

	# Apply intensity
	var intensity = lighting.get("ambientIntensity", 0.5)
	light.light_energy = intensity * 2.0

	# Apply fog if enabled
	var fog_enabled = lighting.get("fogEnabled", false)
	if fog_enabled:
		# Fog will be handled by the world environment
		room.set_meta("fog_enabled", true)
		var fog_color = lighting.get("fogColor", [0.1, 0.1, 0.1])
		var fog_density = lighting.get("fogDensity", 0.01)
		room.set_meta("fog_color", fog_color)
		room.set_meta("fog_density", fog_density)

func _create_simple_room(room_data: Dictionary) -> void:
	## Create a simple fallback room when prefabs aren't available
	var room_id = room_data.get("id", "")
	var room_type = room_data.get("type", "combat")

	var room = Node3D.new()
	room.name = room_id

	# Set position
	var pos_data = room_data.get("position", {})
	room.position = Vector3(
		pos_data.get("x", 0.0),
		pos_data.get("y", 0.0),
		pos_data.get("z", 0.0)
	)

	# Get size
	var size_data = room_data.get("size", {})
	var room_size = Vector3(
		size_data.get("x", 16.0),
		size_data.get("y", 4.0),
		size_data.get("z", 16.0)
	)

	# Create floor
	var floor_mesh = MeshInstance3D.new()
	floor_mesh.name = "Floor"
	var mesh = BoxMesh.new()
	mesh.size = Vector3(room_size.x, 0.2, room_size.z)
	floor_mesh.mesh = mesh

	var mat = StandardMaterial3D.new()
	# Color by room type
	match room_type:
		"start":
			mat.albedo_color = Color(0.4, 0.45, 0.5)
		"boss":
			mat.albedo_color = Color(0.4, 0.2, 0.2)
		"treasure":
			mat.albedo_color = Color(0.5, 0.45, 0.3)
		"corridor":
			mat.albedo_color = Color(0.25, 0.25, 0.25)
		_:
			mat.albedo_color = Color(0.35, 0.32, 0.28)

	floor_mesh.material_override = mat
	floor_mesh.position = Vector3(0, -0.1, 0)

	# Add collision
	var static_body = StaticBody3D.new()
	static_body.collision_layer = 8  # Layer 4: Environment
	var collision = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(room_size.x, 0.2, room_size.z)
	collision.shape = shape
	static_body.add_child(collision)
	floor_mesh.add_child(static_body)

	room.add_child(floor_mesh)

	# Add a light
	var light = OmniLight3D.new()
	light.name = "RoomLight"
	light.position = Vector3(0, room_size.y - 0.5, 0)
	light.light_energy = 1.0
	light.omni_range = max(room_size.x, room_size.z) * 0.8
	room.add_child(light)

	# Store metadata
	room.set_meta("room_data", room_data)
	room.set_meta("room_size", room_size)

	add_child(room)
	rooms[room_id] = room
	print("[LEVEL] Created simple room: %s (%s) at %s" % [room_id, room_type, room.position])

func _create_corridors() -> void:
	## Create visual corridor connections between rooms
	for room_id in rooms:
		var room = rooms[room_id]
		var room_data = room.get_meta("room_data") if room.has_meta("room_data") else {}
		var connections = room_data.get("connections", [])

		for conn in connections:
			var target_id = conn.get("targetRoomID", "")
			if not rooms.has(target_id):
				continue

			# Only create corridor from lower ID to higher ID to avoid duplicates
			if room_id > target_id:
				continue

			var door_pos = conn.get("doorPosition", {})
			var door_world_pos = Vector3(
				door_pos.get("x", 0.0),
				door_pos.get("y", 0.0),
				door_pos.get("z", 0.0)
			)

			# Create door frame visual
			_create_door_frame(door_world_pos, conn.get("direction", "north"))

func _create_door_frame(pos: Vector3, direction: String) -> void:
	## Create a simple door frame mesh at the connection point
	var door = MeshInstance3D.new()
	door.name = "DoorFrame"

	# Create a simple doorway frame using a box mesh
	var mesh = BoxMesh.new()
	mesh.size = Vector3(3.0, 3.5, 0.5)
	door.mesh = mesh

	# Material
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.3, 0.25, 0.2)
	door.material_override = mat

	# Position and rotate based on direction
	door.position = pos
	door.position.y = 1.75

	match direction:
		"north", "south":
			door.rotation_degrees.y = 0
		"east", "west":
			door.rotation_degrees.y = 90

	add_child(door)

func _bake_navigation() -> void:
	## Build navigation mesh from room floors
	if not nav_region:
		return

	var nav_mesh = NavigationMesh.new()
	nav_mesh.agent_radius = 0.5
	nav_mesh.agent_height = 1.8
	nav_mesh.cell_size = 0.25
	nav_mesh.cell_height = 0.25

	# Collect floor polygons from all rooms
	var vertices = PackedVector3Array()
	var polygons: Array[PackedInt32Array] = []

	for room_id in rooms:
		var room = rooms[room_id]
		var room_size = room.get_meta("room_size") if room.has_meta("room_size") else Vector3(16, 4, 16)
		var room_pos = room.position

		# Create floor polygon for this room
		var base_idx = vertices.size()
		var half_x = room_size.x / 2
		var half_z = room_size.z / 2

		vertices.append(Vector3(room_pos.x - half_x, 0, room_pos.z - half_z))
		vertices.append(Vector3(room_pos.x + half_x, 0, room_pos.z - half_z))
		vertices.append(Vector3(room_pos.x + half_x, 0, room_pos.z + half_z))
		vertices.append(Vector3(room_pos.x - half_x, 0, room_pos.z + half_z))

		polygons.append(PackedInt32Array([base_idx, base_idx + 1, base_idx + 2, base_idx + 3]))

	# Set vertices and polygons
	nav_mesh.set_vertices(vertices)
	for poly in polygons:
		nav_mesh.add_polygon(poly)

	nav_region.navigation_mesh = nav_mesh
	print("[LEVEL] Navigation mesh created with %d polygons" % polygons.size())

func get_spawn_point() -> Vector3:
	## Get the player spawn point from level data
	var spawn_data = level_data.get("spawnPoint", {})
	return Vector3(
		spawn_data.get("x", 0.0),
		spawn_data.get("y", 0.0),
		spawn_data.get("z", 0.0)
	)

func get_room_at_position(pos: Vector3) -> Node3D:
	## Find which room contains the given position
	for room_id in rooms:
		var room = rooms[room_id]
		var room_size = room.get_meta("room_size") if room.has_meta("room_size") else Vector3(16, 4, 16)
		var room_pos = room.position

		var half_x = room_size.x / 2
		var half_z = room_size.z / 2

		if pos.x >= room_pos.x - half_x and pos.x <= room_pos.x + half_x:
			if pos.z >= room_pos.z - half_z and pos.z <= room_pos.z + half_z:
				return room

	return null

func check_room_transitions(player_pos: Vector3) -> void:
	## Check if player has entered a new room
	var room = get_room_at_position(player_pos)
	if room and room.name != current_room_id:
		current_room_id = room.name
		var room_data = room.get_meta("room_data") if room.has_meta("room_data") else {}
		room_entered.emit(current_room_id, room_data.get("type", "unknown"))

func get_incoming_connection_directions(target_room_id: String) -> Array[String]:
	## Find all connections from other rooms that point to this room
	## Returns the OPPOSITE direction (e.g., if another room connects "east" to us, we need "west" open)
	var incoming: Array[String] = []
	var rooms_data = level_data.get("rooms", [])

	for room_data in rooms_data:
		var source_room_id = room_data.get("id", "")
		if source_room_id == target_room_id:
			continue

		var connections = room_data.get("connections", [])
		for conn in connections:
			if conn.get("targetRoomID", "") == target_room_id:
				var dir = conn.get("direction", "")
				var opposite_dir = _get_opposite_direction(dir)
				if opposite_dir != "" and not opposite_dir in incoming:
					incoming.append(opposite_dir)

	return incoming

func _get_opposite_direction(dir: String) -> String:
	## Get the opposite direction
	match dir:
		"north": return "south"
		"south": return "north"
		"east": return "west"
		"west": return "east"
		_: return ""

func get_adjacent_corridor_directions(target_room_id: String) -> Array[String]:
	## Find corridors that are spatially adjacent to this room and return directions
	var directions: Array[String] = []
	var rooms_data = level_data.get("rooms", [])

	# Find target room data
	var target_data: Dictionary = {}
	for room_data in rooms_data:
		if room_data.get("id", "") == target_room_id:
			target_data = room_data
			break

	if target_data.is_empty():
		return directions

	# Skip if target is itself a corridor
	if target_data.get("type", "") == "corridor":
		return directions

	var target_pos = target_data.get("position", {})
	var target_size = target_data.get("size", {})
	var tx = target_pos.get("x", 0.0)
	var tz = target_pos.get("z", 0.0)
	var tw = target_size.get("x", 16.0)
	var td = target_size.get("z", 16.0)

	# Check each corridor
	for room_data in rooms_data:
		if room_data.get("type", "") != "corridor":
			continue

		var corr_pos = room_data.get("position", {})
		var corr_size = room_data.get("size", {})
		var cx = corr_pos.get("x", 0.0)
		var cz = corr_pos.get("z", 0.0)
		var cw = corr_size.get("x", 4.0)
		var cd = corr_size.get("z", 4.0)

		# Check if corridor is adjacent (within touching distance)
		var dx = cx - tx
		var dz = cz - tz
		var threshold = 2.0  # Allow some tolerance

		# Check east
		if abs(dx - (tw/2 + cw/2)) < threshold and abs(dz) < (td/2 + cd/2):
			if not "east" in directions:
				directions.append("east")
		# Check west
		if abs(dx + (tw/2 + cw/2)) < threshold and abs(dz) < (td/2 + cd/2):
			if not "west" in directions:
				directions.append("west")
		# Check north
		if abs(dz - (td/2 + cd/2)) < threshold and abs(dx) < (tw/2 + cw/2):
			if not "north" in directions:
				directions.append("north")
		# Check south
		if abs(dz + (td/2 + cd/2)) < threshold and abs(dx) < (tw/2 + cw/2):
			if not "south" in directions:
				directions.append("south")

	return directions
