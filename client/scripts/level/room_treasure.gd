extends RoomBase
## Treasure room - contains loot chests

func _ready() -> void:
	room_type = "treasure"
	super._ready()

func _get_floor_color() -> Color:
	return Color(0.4, 0.35, 0.25)  # Golden stone

func _get_wall_color() -> Color:
	return Color(0.45, 0.4, 0.3)

func _get_light_color() -> Color:
	return Color(1.0, 0.95, 0.7)  # Golden light

func _get_light_energy() -> float:
	return 1.2

func _apply_room_decorations() -> void:
	## Add treasure room decorations - chests and gold piles
	# Central treasure chest
	var chest = _create_treasure_chest()
	chest.position = Vector3(0, 0, 0)
	add_child(chest)

	# Gold piles around the room
	var rng = RandomNumberGenerator.new()
	rng.seed = hash(room_data.get("id", ""))

	for i in range(5):
		var gold = _create_gold_pile()
		var angle = rng.randf() * TAU
		var dist = rng.randf_range(2.0, min(room_size.x, room_size.z) * 0.35)
		gold.position = Vector3(cos(angle) * dist, 0, sin(angle) * dist)
		add_child(gold)

	# Decorative pillars with gold caps
	var pillar_offset = min(room_size.x, room_size.z) * 0.35
	var pillar_positions = [
		Vector3(-pillar_offset, 0, -pillar_offset),
		Vector3(pillar_offset, 0, -pillar_offset),
		Vector3(-pillar_offset, 0, pillar_offset),
		Vector3(pillar_offset, 0, pillar_offset),
	]

	for pos in pillar_positions:
		var pillar = _create_golden_pillar()
		pillar.position = pos
		add_child(pillar)

func _create_treasure_chest() -> Node3D:
	var chest = Node3D.new()
	chest.name = "TreasureChest"

	# Chest body
	var body = MeshInstance3D.new()
	var mesh = BoxMesh.new()
	mesh.size = Vector3(1.2, 0.8, 0.8)
	body.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.35, 0.2)
	mat.metallic = 0.2
	body.material_override = mat
	body.position.y = 0.4

	chest.add_child(body)

	# Chest lid (arched top)
	var lid = MeshInstance3D.new()
	var lid_mesh = CylinderMesh.new()
	lid_mesh.top_radius = 0.4
	lid_mesh.bottom_radius = 0.4
	lid_mesh.height = 1.2
	lid.mesh = lid_mesh
	lid.rotation_degrees.z = 90
	lid.position.y = 0.8

	lid.material_override = mat
	chest.add_child(lid)

	# Gold trim
	var trim = MeshInstance3D.new()
	var trim_mesh = BoxMesh.new()
	trim_mesh.size = Vector3(1.3, 0.1, 0.85)
	trim.mesh = trim_mesh

	var gold_mat = StandardMaterial3D.new()
	gold_mat.albedo_color = Color(1.0, 0.85, 0.3)
	gold_mat.metallic = 0.9
	gold_mat.roughness = 0.3
	trim.material_override = gold_mat
	trim.position.y = 0.8

	chest.add_child(trim)

	# Glowing effect
	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 0.9, 0.5)
	light.light_energy = 1.5
	light.omni_range = 3.0
	light.position.y = 0.5
	chest.add_child(light)

	return chest

func _create_gold_pile() -> MeshInstance3D:
	var gold = MeshInstance3D.new()
	gold.name = "GoldPile"

	var mesh = CylinderMesh.new()
	mesh.top_radius = 0.2
	mesh.bottom_radius = 0.5
	mesh.height = 0.3
	gold.mesh = mesh

	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.85, 0.3)
	mat.metallic = 0.9
	mat.roughness = 0.3
	mat.emission_enabled = true
	mat.emission = Color(0.8, 0.6, 0.1)
	mat.emission_energy_multiplier = 0.5
	gold.material_override = mat

	gold.position.y = 0.15

	return gold

func _create_golden_pillar() -> Node3D:
	var pillar = Node3D.new()
	pillar.name = "GoldenPillar"

	# Stone column
	var column = MeshInstance3D.new()
	var mesh = CylinderMesh.new()
	mesh.top_radius = 0.35
	mesh.bottom_radius = 0.4
	mesh.height = room_size.y
	column.mesh = mesh

	var stone_mat = StandardMaterial3D.new()
	stone_mat.albedo_color = Color(0.5, 0.45, 0.35)
	column.material_override = stone_mat
	column.position.y = room_size.y / 2

	pillar.add_child(column)

	# Gold cap
	var cap = MeshInstance3D.new()
	var cap_mesh = CylinderMesh.new()
	cap_mesh.top_radius = 0.3
	cap_mesh.bottom_radius = 0.45
	cap_mesh.height = 0.3
	cap.mesh = cap_mesh

	var gold_mat = StandardMaterial3D.new()
	gold_mat.albedo_color = Color(1.0, 0.85, 0.3)
	gold_mat.metallic = 0.9
	gold_mat.roughness = 0.3
	cap.material_override = gold_mat
	cap.position.y = room_size.y + 0.15

	pillar.add_child(cap)

	return pillar
