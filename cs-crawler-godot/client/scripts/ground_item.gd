extends Node3D
## Ground item - represents an item dropped on the ground
## Click to path to it and pick up

var item_id: String = ""
var item_data: Dictionary = {}
var mesh_instance: MeshInstance3D = null
var material: StandardMaterial3D = null
var light: OmniLight3D = null
var label_3d: Label3D = null
var collision_area: Area3D = null

# Animation
var rotation_speed: float = 90.0
var bob_height: float = 0.3
var bob_speed: float = 2.0
var time_elapsed: float = 0.0
var base_y: float = 0.0

# Hover state
var is_hovered: bool = false
var base_emission_energy: float = 1.0
var hover_emission_energy: float = 4.0

# Rarity config
const RARITY_CONFIG = {
	"normal": {
		"color": Color(0.7, 0.7, 0.7, 0.9),
		"emission": Color(0.5, 0.5, 0.5),
		"emission_energy": 0.5,
		"label_color": Color(0.85, 0.85, 0.85),
		"particles": false,
	},
	"rare": {
		"color": Color(0.3, 0.5, 1.0, 0.9),
		"emission": Color(0.5, 0.7, 1.0),
		"emission_energy": 1.5,
		"label_color": Color(0.5, 0.7, 1.0),
		"particles": true,
	},
	"unique": {
		"color": Color(1.0, 0.5, 0.0, 0.9),
		"emission": Color(1.0, 0.6, 0.0),
		"emission_energy": 2.0,
		"label_color": Color(1.0, 0.6, 0.0),
		"particles": true,
	},
}

func _ready() -> void:
	base_y = global_position.y
	_setup_appearance()
	_setup_collision()

func _setup_appearance() -> void:
	var rarity = item_data.get("rarity", "normal")
	var cfg = RARITY_CONFIG.get(rarity, RARITY_CONFIG["normal"])
	base_emission_energy = cfg["emission_energy"]

	# Create mesh
	mesh_instance = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 0.3
	sphere.height = 0.6
	mesh_instance.mesh = sphere
	add_child(mesh_instance)

	# Create material
	material = StandardMaterial3D.new()
	material.albedo_color = cfg["color"]
	material.emission = cfg["emission"]
	material.emission_enabled = true
	material.emission_energy_multiplier = base_emission_energy
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh_instance.material_override = material

	# Create glow light
	light = OmniLight3D.new()
	light.light_color = cfg["emission"]
	light.light_energy = base_emission_energy
	light.omni_range = 2.0
	add_child(light)

	# Create label with item name - hidden by default, shown when holding Alt
	label_3d = Label3D.new()
	label_3d.text = item_data.get("name", "Item")
	label_3d.font_size = 48
	label_3d.outline_size = 8
	label_3d.pixel_size = 0.01
	label_3d.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label_3d.position.y = 1.2
	label_3d.modulate = cfg["label_color"]
	label_3d.no_depth_test = true  # Always visible through objects
	label_3d.visible = false  # Only shown when Alt is held
	add_child(label_3d)

	# Add particles for rare+ items
	if cfg["particles"]:
		_add_particle_effect(cfg["emission"])

func _setup_collision() -> void:
	# Create Area3D for hover detection and click handling
	collision_area = Area3D.new()
	collision_area.collision_layer = 1 << 4  # Layer 5: Items
	collision_area.collision_mask = 0
	collision_area.input_ray_pickable = true
	add_child(collision_area)

	var collision_shape = CollisionShape3D.new()
	var sphere_shape = SphereShape3D.new()
	sphere_shape.radius = 1.0  # Generous click target
	collision_shape.shape = sphere_shape
	collision_area.add_child(collision_shape)

	# Connect signals
	collision_area.mouse_entered.connect(_on_mouse_entered)
	collision_area.mouse_exited.connect(_on_mouse_exited)
	collision_area.input_event.connect(_on_input_event)

func _add_particle_effect(color: Color) -> void:
	var particles = GPUParticles3D.new()
	particles.emitting = true
	particles.amount = 20
	particles.lifetime = 2.0
	particles.explosiveness = 0.0

	var particle_mat = ParticleProcessMaterial.new()
	particle_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	particle_mat.emission_sphere_radius = 0.5
	particle_mat.direction = Vector3(0, 1, 0)
	particle_mat.spread = 45.0
	particle_mat.initial_velocity_min = 0.5
	particle_mat.initial_velocity_max = 1.0
	particle_mat.gravity = Vector3(0, 0, 0)
	particle_mat.damping_min = 1.0
	particle_mat.damping_max = 2.0
	particle_mat.color = color
	particle_mat.scale_min = 0.05
	particle_mat.scale_max = 0.1
	particles.process_material = particle_mat

	var particle_mesh = QuadMesh.new()
	particle_mesh.size = Vector2(0.1, 0.1)
	particles.draw_pass_1 = particle_mesh

	add_child(particles)

func _on_mouse_entered() -> void:
	is_hovered = true

func _on_mouse_exited() -> void:
	is_hovered = false

func _on_input_event(_camera: Camera3D, event: InputEvent, _event_position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton:
		var mouse_event = event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			_request_pickup()
			# Consume the event so _unhandled_input doesn't also fire a ground-click move
			get_viewport().set_input_as_handled()

func _request_pickup() -> void:
	# Ask the game world to path to this item and pick it up
	var game_world = get_node_or_null("/root/GameWorld")
	if not game_world:
		# Try parent hierarchy
		var parent = get_parent()
		while parent:
			if parent.has_method("request_pickup"):
				parent.request_pickup(item_id, global_position)
				return
			parent = parent.get_parent()
		return

	game_world.request_pickup(item_id, global_position)

func _process(delta: float) -> void:
	time_elapsed += delta

	# Rotate
	rotate_y(deg_to_rad(rotation_speed * delta))

	# Bob up and down
	var bob_offset = sin(time_elapsed * bob_speed) * bob_height
	global_position.y = base_y + bob_offset + 0.5

	# Show label only when Alt is held or when hovered
	if label_3d:
		label_3d.visible = is_hovered or Input.is_key_pressed(KEY_ALT)

	# Hover glow effect
	if material:
		var target_energy = hover_emission_energy if is_hovered else base_emission_energy
		material.emission_energy_multiplier = lerp(material.emission_energy_multiplier, target_energy, delta * 8.0)

	if light:
		var target_light = (hover_emission_energy * 1.5) if is_hovered else base_emission_energy
		light.light_energy = lerp(light.light_energy, target_light, delta * 8.0)

	# Scale up slightly on hover
	var target_scale = Vector3(1.2, 1.2, 1.2) if is_hovered else Vector3(1.0, 1.0, 1.0)
	scale = scale.lerp(target_scale, delta * 10.0)
