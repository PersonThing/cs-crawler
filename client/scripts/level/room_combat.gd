extends RoomBase
## Combat room - standard enemy encounters

func _ready() -> void:
	room_type = "combat"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.32, 0.28, 0.24)  # Dusty stone

func _get_wall_color() -> Color:
	return Color(0.38, 0.34, 0.30)

func _get_light_color() -> Color:
	return Color(1.0, 0.9, 0.8)  # Warm torchlight

func _get_light_energy() -> float:
	return 0.9

func _apply_room_decorations() -> void:
	## Add combat room decorations - pillars and debris
	# Add corner pillars
	var pillar_offset = min(room_size.x, room_size.z) * 0.35
	var pillar_positions = [
		Vector3(-pillar_offset, 0, -pillar_offset),
		Vector3(pillar_offset, 0, -pillar_offset),
		Vector3(-pillar_offset, 0, pillar_offset),
		Vector3(pillar_offset, 0, pillar_offset),
	]

	for pos in pillar_positions:
		var pillar = _create_pillar()
		pillar.position = pos
		add_child(pillar)

	# Add random debris
	var rng = RandomNumberGenerator.new()
	rng.seed = hash(room_data.get("id", ""))

	for i in range(3):
		var debris = _create_debris()
		debris.position = Vector3(
			rng.randf_range(-room_size.x * 0.3, room_size.x * 0.3),
			0.2,
			rng.randf_range(-room_size.z * 0.3, room_size.z * 0.3)
		)
		debris.rotation_degrees.y = rng.randf() * 360
		add_child(debris)

func _create_pillar() -> MeshInstance3D:
	var pillar = MeshInstance3D.new()
	pillar.name = "Pillar"

	var mesh = CylinderMesh.new()
	mesh.top_radius = 0.4
	mesh.bottom_radius = 0.5
	mesh.height = room_size.y
	pillar.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.45, 0.4, 0.35)
	mat.roughness = 0.9
	pillar.material_override = mat

	pillar.position.y = room_size.y / 2

	# Add collision
	var static_body = StaticBody3D.new()
	static_body.collision_layer = 8

	var collision = CollisionShape3D.new()
	var shape = CylinderShape3D.new()
	shape.radius = 0.5
	shape.height = room_size.y
	collision.shape = shape

	static_body.add_child(collision)
	pillar.add_child(static_body)

	return pillar

func _create_debris() -> MeshInstance3D:
	var debris = MeshInstance3D.new()
	debris.name = "Debris"

	var mesh = BoxMesh.new()
	mesh.size = Vector3(0.5, 0.4, 0.6)
	debris.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.32, 0.28)
	mat.roughness = 1.0
	debris.material_override = mat

	return debris
