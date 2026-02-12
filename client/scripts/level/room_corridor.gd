extends RoomBase
## Corridor room - connects other rooms

func _ready() -> void:
	room_type = "corridor"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.28, 0.26, 0.24)  # Dark stone

func _get_wall_color() -> Color:
	return Color(0.32, 0.3, 0.28)

func _get_light_color() -> Color:
	return Color(0.9, 0.8, 0.7)  # Dim torchlight

func _get_light_energy() -> float:
	return 0.5  # Dimmer than regular rooms

func _create_walls() -> void:
	## Corridors have walls on all sides EXCEPT where connections are
	print("[CORRIDOR] _create_walls() called for: ", room_data.get("id", "?"))
	var wall_height = room_size.y
	var wall_thickness = 0.3

	# Get open directions from connections
	var open_directions: Array[String] = []
	var connections = room_data.get("connections", [])
	print("[CORRIDOR] connections: ", connections)
	for conn in connections:
		var dir = conn.get("direction", "")
		if dir != "":
			open_directions.append(dir)

	# Fallback: if no connections, use orientation-based openings
	if open_directions.is_empty():
		var is_horizontal = room_size.x > room_size.z
		if is_horizontal:
			open_directions.append("east")
			open_directions.append("west")
		else:
			open_directions.append("north")
			open_directions.append("south")

	print("[CORRIDOR] %s open_directions: %s (size: %s)" % [room_data.get("id", "?"), open_directions, room_size])

	# Create walls only where there are no openings
	if not "north" in open_directions:
		_create_wall(
			Vector3(0, wall_height/2, room_size.z/2),
			Vector3(room_size.x, wall_height, wall_thickness)
		)
	if not "south" in open_directions:
		_create_wall(
			Vector3(0, wall_height/2, -room_size.z/2),
			Vector3(room_size.x, wall_height, wall_thickness)
		)
	if not "east" in open_directions:
		_create_wall(
			Vector3(room_size.x/2, wall_height/2, 0),
			Vector3(wall_thickness, wall_height, room_size.z)
		)
	if not "west" in open_directions:
		_create_wall(
			Vector3(-room_size.x/2, wall_height/2, 0),
			Vector3(wall_thickness, wall_height, room_size.z)
		)

func _apply_room_decorations() -> void:
	## Add corridor decorations - wall torches
	var torch_spacing = 6.0
	var corridor_length = max(room_size.x, room_size.z)
	var num_torches = int(corridor_length / torch_spacing)

	# Determine corridor orientation
	var is_horizontal = room_size.x > room_size.z

	for i in range(num_torches):
		var offset = (i + 0.5) * torch_spacing - corridor_length / 2

		if is_horizontal:
			# Torches on north and south walls
			var torch_n = _create_wall_torch()
			torch_n.position = Vector3(offset, room_size.y * 0.6, room_size.z / 2 - 0.3)
			torch_n.rotation_degrees.y = 180
			add_child(torch_n)

			var torch_s = _create_wall_torch()
			torch_s.position = Vector3(offset, room_size.y * 0.6, -room_size.z / 2 + 0.3)
			add_child(torch_s)
		else:
			# Torches on east and west walls
			var torch_e = _create_wall_torch()
			torch_e.position = Vector3(room_size.x / 2 - 0.3, room_size.y * 0.6, offset)
			torch_e.rotation_degrees.y = -90
			add_child(torch_e)

			var torch_w = _create_wall_torch()
			torch_w.position = Vector3(-room_size.x / 2 + 0.3, room_size.y * 0.6, offset)
			torch_w.rotation_degrees.y = 90
			add_child(torch_w)

func _create_wall_torch() -> Node3D:
	var torch = Node3D.new()
	torch.name = "WallTorch"

	# Torch bracket
	var bracket = MeshInstance3D.new()
	var bracket_mesh = BoxMesh.new()
	bracket_mesh.size = Vector3(0.1, 0.3, 0.2)
	bracket.mesh = bracket_mesh

	var bracket_mat = StandardMaterial3D.new()
	bracket_mat.albedo_color = Color(0.2, 0.15, 0.1)
	bracket.material_override = bracket_mat

	torch.add_child(bracket)

	# Torch flame (point light)
	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 0.7, 0.4)
	light.light_energy = 0.8
	light.omni_range = 4.0
	light.position = Vector3(0, 0.2, 0.15)
	torch.add_child(light)

	# Flame glow mesh
	var flame = MeshInstance3D.new()
	var flame_mesh = SphereMesh.new()
	flame_mesh.radius = 0.1
	flame_mesh.height = 0.2
	flame.mesh = flame_mesh

	var flame_mat = StandardMaterial3D.new()
	flame_mat.albedo_color = Color(1.0, 0.6, 0.2)
	flame_mat.emission_enabled = true
	flame_mat.emission = Color(1.0, 0.5, 0.1)
	flame_mat.emission_energy_multiplier = 4.0
	flame.material_override = flame_mat
	flame.position = Vector3(0, 0.2, 0.15)

	torch.add_child(flame)

	return torch
