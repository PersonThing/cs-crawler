extends RoomBase
## Arena room - challenging combat encounters with more enemies

func _ready() -> void:
	room_type = "arena"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.35, 0.3, 0.25)  # Sandy arena floor

func _get_wall_color() -> Color:
	return Color(0.4, 0.35, 0.3)

func _get_light_color() -> Color:
	return Color(1.0, 0.95, 0.85)  # Bright arena lighting

func _get_light_energy() -> float:
	return 1.3

func _apply_room_decorations() -> void:
	## Add arena decorations - spectator stands, barriers, columns
	# Barrier ring around center
	_create_barrier_ring()

	# Corner columns with torches
	var corner_offset = min(room_size.x, room_size.z) * 0.4
	var corners = [
		Vector3(-corner_offset, 0, -corner_offset),
		Vector3(corner_offset, 0, -corner_offset),
		Vector3(-corner_offset, 0, corner_offset),
		Vector3(corner_offset, 0, corner_offset),
	]

	for pos in corners:
		var column = _create_arena_column()
		column.position = pos
		add_child(column)

	# Spectator stands (raised platforms at edges)
	_create_spectator_stands()

	# Weapon racks decoration
	var rack_positions = [
		Vector3(-room_size.x * 0.35, 0, 0),
		Vector3(room_size.x * 0.35, 0, 0),
	]

	for pos in rack_positions:
		var rack = _create_weapon_rack()
		rack.position = pos
		rack.rotation_degrees.y = 90 if pos.x > 0 else -90
		add_child(rack)

func _create_barrier_ring() -> void:
	var barrier_radius = min(room_size.x, room_size.z) * 0.25
	var segment_count = 8

	for i in range(segment_count):
		var angle = i * TAU / segment_count
		var next_angle = (i + 1) * TAU / segment_count

		# Skip some segments for openings
		if i % 4 == 0:
			continue

		var barrier = MeshInstance3D.new()
		barrier.name = "Barrier_%d" % i

		var mesh = BoxMesh.new()
		var segment_length = barrier_radius * 2 * sin(PI / segment_count)
		mesh.size = Vector3(segment_length, 0.8, 0.3)
		barrier.mesh = mesh

		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(0.4, 0.35, 0.3)
		mat.roughness = 0.8
		barrier.material_override = mat

		var mid_angle = (angle + next_angle) / 2
		barrier.position = Vector3(
			cos(mid_angle) * barrier_radius,
			0.4,
			sin(mid_angle) * barrier_radius
		)
		barrier.rotation_degrees.y = rad_to_deg(-mid_angle)

		add_child(barrier)

func _create_arena_column() -> Node3D:
	var column = Node3D.new()
	column.name = "ArenaColumn"

	# Main column
	var pillar = MeshInstance3D.new()
	var mesh = CylinderMesh.new()
	mesh.top_radius = 0.45
	mesh.bottom_radius = 0.5
	mesh.height = room_size.y
	pillar.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.45, 0.4)
	pillar.material_override = mat
	pillar.position.y = room_size.y / 2

	column.add_child(pillar)

	# Torch at top
	var torch_light = OmniLight3D.new()
	torch_light.light_color = Color(1.0, 0.8, 0.5)
	torch_light.light_energy = 1.5
	torch_light.omni_range = 5.0
	torch_light.position.y = room_size.y - 0.5
	column.add_child(torch_light)

	var flame = MeshInstance3D.new()
	var flame_mesh = SphereMesh.new()
	flame_mesh.radius = 0.15
	flame_mesh.height = 0.3
	flame.mesh = flame_mesh

	var flame_mat = StandardMaterial3D.new()
	flame_mat.albedo_color = Color(1.0, 0.7, 0.3)
	flame_mat.emission_enabled = true
	flame_mat.emission = Color(1.0, 0.6, 0.2)
	flame_mat.emission_energy_multiplier = 4.0
	flame.material_override = flame_mat
	flame.position.y = room_size.y - 0.3

	column.add_child(flame)

	return column

func _create_spectator_stands() -> void:
	var stand_depth = 2.0
	var stand_height = 0.5

	# North stand
	var stand_n = _create_stand_section()
	stand_n.position = Vector3(0, stand_height/2, room_size.z/2 - stand_depth/2)
	stand_n.scale = Vector3(room_size.x * 0.6, stand_height, stand_depth)
	add_child(stand_n)

	# South stand
	var stand_s = _create_stand_section()
	stand_s.position = Vector3(0, stand_height/2, -room_size.z/2 + stand_depth/2)
	stand_s.scale = Vector3(room_size.x * 0.6, stand_height, stand_depth)
	add_child(stand_s)

func _create_stand_section() -> MeshInstance3D:
	var stand = MeshInstance3D.new()
	stand.name = "SpectatorStand"

	var mesh = BoxMesh.new()
	mesh.size = Vector3(1, 1, 1)  # Will be scaled
	stand.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.45, 0.4, 0.35)
	stand.material_override = mat

	return stand

func _create_weapon_rack() -> Node3D:
	var rack = Node3D.new()
	rack.name = "WeaponRack"

	# Rack frame
	var frame = MeshInstance3D.new()
	var frame_mesh = BoxMesh.new()
	frame_mesh.size = Vector3(0.1, 2.0, 1.5)
	frame.mesh = frame_mesh

	var wood_mat = StandardMaterial3D.new()
	wood_mat.albedo_color = Color(0.4, 0.3, 0.2)
	frame.material_override = wood_mat
	frame.position.y = 1.0

	rack.add_child(frame)

	# Weapon placeholders (swords)
	for i in range(3):
		var sword = MeshInstance3D.new()
		var sword_mesh = BoxMesh.new()
		sword_mesh.size = Vector3(0.05, 1.0, 0.1)
		sword.mesh = sword_mesh

		var metal_mat = StandardMaterial3D.new()
		metal_mat.albedo_color = Color(0.6, 0.6, 0.65)
		metal_mat.metallic = 0.8
		sword.material_override = metal_mat

		sword.position = Vector3(0.1, 0.8 + i * 0.4, (i - 1) * 0.4)
		sword.rotation_degrees.z = -15

		rack.add_child(sword)

	return rack
