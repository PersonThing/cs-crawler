extends RoomBase
## Boss room - large arena for boss fights

func _ready() -> void:
	room_type = "boss"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.25, 0.18, 0.18)  # Dark crimson stone

func _get_wall_color() -> Color:
	return Color(0.3, 0.2, 0.2)

func _get_light_color() -> Color:
	return Color(1.0, 0.6, 0.5)  # Ominous red light

func _get_light_energy() -> float:
	return 1.0

func _apply_room_decorations() -> void:
	## Add boss room decorations - throne, pillars, ominous atmosphere
	# Central ritual circle
	var circle = _create_ritual_circle()
	add_child(circle)

	# Boss throne at the back
	var throne = _create_throne()
	throne.position = Vector3(0, 0, room_size.z * 0.35)
	add_child(throne)

	# Large pillars along walls
	var pillar_count = 3
	for i in range(pillar_count):
		var offset = (i + 0.5) / pillar_count * room_size.z - room_size.z / 2

		# West pillars
		var pillar_w = _create_boss_pillar()
		pillar_w.position = Vector3(-room_size.x * 0.4, 0, offset)
		add_child(pillar_w)

		# East pillars
		var pillar_e = _create_boss_pillar()
		pillar_e.position = Vector3(room_size.x * 0.4, 0, offset)
		add_child(pillar_e)

	# Braziers with fire
	var brazier_positions = [
		Vector3(-room_size.x * 0.25, 0, room_size.z * 0.3),
		Vector3(room_size.x * 0.25, 0, room_size.z * 0.3),
	]

	for pos in brazier_positions:
		var brazier = _create_brazier()
		brazier.position = pos
		add_child(brazier)

	# Add fog particles
	_add_fog_particles()

func _create_ritual_circle() -> Node3D:
	var circle = Node3D.new()
	circle.name = "RitualCircle"

	# Outer ring
	var outer_ring = MeshInstance3D.new()
	var outer_mesh = TorusMesh.new()
	outer_mesh.inner_radius = 4.5
	outer_mesh.outer_radius = 5.0
	outer_mesh.rings = 32
	outer_ring.mesh = outer_mesh

	var red_mat = StandardMaterial3D.new()
	red_mat.albedo_color = Color(0.8, 0.2, 0.1)
	red_mat.emission_enabled = true
	red_mat.emission = Color(0.8, 0.1, 0.05)
	red_mat.emission_energy_multiplier = 2.0
	outer_ring.material_override = red_mat
	outer_ring.position.y = 0.02

	circle.add_child(outer_ring)

	# Inner runes (simplified as quads)
	for i in range(6):
		var angle = i * TAU / 6
		var rune = MeshInstance3D.new()
		var rune_mesh = QuadMesh.new()
		rune_mesh.size = Vector2(1.0, 1.5)
		rune.mesh = rune_mesh
		rune.rotation_degrees.x = -90
		rune.rotation_degrees.z = rad_to_deg(-angle)
		rune.position = Vector3(cos(angle) * 3, 0.01, sin(angle) * 3)
		rune.material_override = red_mat
		circle.add_child(rune)

	return circle

func _create_throne() -> Node3D:
	var throne = Node3D.new()
	throne.name = "Throne"

	# Platform
	var platform = MeshInstance3D.new()
	var plat_mesh = BoxMesh.new()
	plat_mesh.size = Vector3(4.0, 0.5, 3.0)
	platform.mesh = plat_mesh

	var stone_mat = StandardMaterial3D.new()
	stone_mat.albedo_color = Color(0.25, 0.2, 0.2)
	platform.material_override = stone_mat
	platform.position.y = 0.25

	throne.add_child(platform)

	# Throne chair
	var chair = MeshInstance3D.new()
	var chair_mesh = BoxMesh.new()
	chair_mesh.size = Vector3(2.0, 3.0, 1.0)
	chair.mesh = chair_mesh

	var dark_mat = StandardMaterial3D.new()
	dark_mat.albedo_color = Color(0.15, 0.1, 0.1)
	chair.material_override = dark_mat
	chair.position = Vector3(0, 2.0, 0.5)

	throne.add_child(chair)

	# Skull decorations
	for offset in [-0.8, 0.8]:
		var skull = MeshInstance3D.new()
		var skull_mesh = SphereMesh.new()
		skull_mesh.radius = 0.25
		skull_mesh.height = 0.3
		skull.mesh = skull_mesh

		var bone_mat = StandardMaterial3D.new()
		bone_mat.albedo_color = Color(0.9, 0.85, 0.8)
		skull.material_override = bone_mat
		skull.position = Vector3(offset, 3.3, 0.5)

		throne.add_child(skull)

	return throne

func _create_boss_pillar() -> Node3D:
	var pillar = Node3D.new()
	pillar.name = "BossPillar"

	# Main column
	var column = MeshInstance3D.new()
	var mesh = CylinderMesh.new()
	mesh.top_radius = 0.6
	mesh.bottom_radius = 0.7
	mesh.height = room_size.y
	column.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.2, 0.15, 0.15)
	mat.roughness = 0.9
	column.material_override = mat
	column.position.y = room_size.y / 2

	pillar.add_child(column)

	# Skull decoration on pillar
	var skull = MeshInstance3D.new()
	var skull_mesh = SphereMesh.new()
	skull_mesh.radius = 0.35
	skull_mesh.height = 0.4
	skull.mesh = skull_mesh

	var bone_mat = StandardMaterial3D.new()
	bone_mat.albedo_color = Color(0.85, 0.8, 0.75)
	skull.material_override = bone_mat
	skull.position.y = room_size.y * 0.6

	pillar.add_child(skull)

	# Eye glow
	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 0.2, 0.1)
	light.light_energy = 0.5
	light.omni_range = 2.0
	light.position.y = room_size.y * 0.6
	pillar.add_child(light)

	return pillar

func _create_brazier() -> Node3D:
	var brazier = Node3D.new()
	brazier.name = "Brazier"

	# Base
	var base = MeshInstance3D.new()
	var base_mesh = CylinderMesh.new()
	base_mesh.top_radius = 0.5
	base_mesh.bottom_radius = 0.6
	base_mesh.height = 1.0
	base.mesh = base_mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.2, 0.15, 0.1)
	mat.metallic = 0.5
	base.material_override = mat
	base.position.y = 0.5

	brazier.add_child(base)

	# Fire light
	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 0.5, 0.2)
	light.light_energy = 2.0
	light.omni_range = 6.0
	light.position.y = 1.5
	brazier.add_child(light)

	# Fire glow
	var fire = MeshInstance3D.new()
	var fire_mesh = SphereMesh.new()
	fire_mesh.radius = 0.4
	fire_mesh.height = 0.8
	fire.mesh = fire_mesh

	var fire_mat = StandardMaterial3D.new()
	fire_mat.albedo_color = Color(1.0, 0.5, 0.1)
	fire_mat.emission_enabled = true
	fire_mat.emission = Color(1.0, 0.4, 0.05)
	fire_mat.emission_energy_multiplier = 5.0
	fire.material_override = fire_mat
	fire.position.y = 1.3

	brazier.add_child(fire)

	return brazier

func _add_fog_particles() -> void:
	var fog = GPUParticles3D.new()
	fog.name = "FogParticles"
	fog.amount = 50
	fog.lifetime = 8.0
	fog.emitting = true

	var mat = ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	mat.emission_box_extents = Vector3(room_size.x * 0.4, 0.5, room_size.z * 0.4)
	mat.direction = Vector3(0, 0.2, 0)
	mat.spread = 15.0
	mat.initial_velocity_min = 0.1
	mat.initial_velocity_max = 0.3
	mat.gravity = Vector3(0, 0, 0)
	mat.color = Color(0.5, 0.2, 0.15, 0.3)
	mat.scale_min = 2.0
	mat.scale_max = 4.0

	fog.process_material = mat

	var quad = QuadMesh.new()
	quad.size = Vector2(1, 1)
	fog.draw_pass_1 = quad

	fog.position.y = 0.5
	add_child(fog)
