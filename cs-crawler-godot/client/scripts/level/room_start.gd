extends RoomBase
## Start room - safe spawn area with no enemies

func _ready() -> void:
	room_type = "start"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.4, 0.45, 0.5)  # Blue-gray stone

func _get_wall_color() -> Color:
	return Color(0.35, 0.4, 0.45)

func _get_light_color() -> Color:
	return Color(0.9, 0.95, 1.0)  # Cool white light

func _get_light_energy() -> float:
	return 1.5  # Brighter for safety

func _apply_room_decorations() -> void:
	## Add spawn room decorations - safe haven feel
	# Create spawn portal/platform
	var platform = MeshInstance3D.new()
	platform.name = "SpawnPlatform"

	var mesh = CylinderMesh.new()
	mesh.top_radius = 2.0
	mesh.bottom_radius = 2.5
	mesh.height = 0.3
	platform.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.6, 0.8)
	mat.emission_enabled = true
	mat.emission = Color(0.3, 0.4, 0.6)
	mat.emission_energy_multiplier = 2.0
	platform.material_override = mat

	platform.position = Vector3(0, 0.15, 0)
	add_child(platform)

	# Add glowing runes around platform
	for i in range(4):
		var angle = i * TAU / 4
		var rune = _create_rune()
		rune.position = Vector3(cos(angle) * 3, 0.01, sin(angle) * 3)
		rune.rotation_degrees.y = rad_to_deg(-angle)
		add_child(rune)

func _create_rune() -> MeshInstance3D:
	var rune = MeshInstance3D.new()

	var mesh = QuadMesh.new()
	mesh.size = Vector2(0.8, 0.8)
	rune.mesh = mesh
	rune.rotation_degrees.x = -90

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.4, 0.6, 1.0, 0.8)
	mat.emission_enabled = true
	mat.emission = Color(0.4, 0.6, 1.0)
	mat.emission_energy_multiplier = 3.0
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	rune.material_override = mat

	return rune
