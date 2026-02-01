extends CharacterBody3D
## Enemy entity with visual representation and death animations

# Dynamic node references (created at runtime)
var mesh_instance: MeshInstance3D = null

var enemy_id: String = ""
var enemy_type: String = "basic"
var current_health: float = 100.0
var max_health: float = 100.0
var is_dead: bool = false

# Death animation
var death_timer: float = 0.0
var death_duration: float = 1.0

func _ready() -> void:
	_setup_appearance()

func _setup_appearance() -> void:
	# Load enemy config for visuals
	var config_loader = get_node_or_null("/root/ConfigLoader")
	var visual_config = {}

	if config_loader:
		var enemy_config = config_loader.get_enemy(enemy_type)
		visual_config = enemy_config.get("visual", {})

	# Defaults
	var color_array = visual_config.get("color", [0.8, 0.2, 0.2])
	var height = visual_config.get("height", 1.8)
	var radius = visual_config.get("radius", 0.4)

	# Create a simple capsule mesh for the enemy
	if not has_node("MeshInstance3D"):
		mesh_instance = MeshInstance3D.new()
		mesh_instance.name = "MeshInstance3D"
		add_child(mesh_instance)

		var capsule = CapsuleMesh.new()
		capsule.radius = radius
		capsule.height = height
		mesh_instance.mesh = capsule

		# Create material with configured color
		var material = StandardMaterial3D.new()
		material.albedo_color = Color(color_array[0], color_array[1], color_array[2])
		mesh_instance.material_override = material

func apply_server_state(state: Dictionary) -> void:
	# Update position
	var server_pos = state.get("position", {})
	var target_position = Vector3(
		server_pos.get("x", 0.0),
		server_pos.get("y", 0.0),
		server_pos.get("z", 0.0)
	)

	# Smooth interpolation
	global_position = global_position.lerp(target_position, 0.2)

	# Update health
	if state.has("health"):
		current_health = state.get("health", 100.0)

	if state.has("maxHealth"):
		max_health = state.get("maxHealth", 100.0)

	if state.has("dead"):
		var was_dead = is_dead
		is_dead = state.get("dead", false)

		# Start death animation if just died
		if is_dead and not was_dead:
			_start_death_animation()

func _start_death_animation() -> void:
	death_timer = 0.0

func _process(delta: float) -> void:
	if is_dead:
		death_timer += delta

		# Fade out
		var fade_progress = death_timer / death_duration
		if mesh_instance and mesh_instance.material_override:
			var mat = mesh_instance.material_override as StandardMaterial3D
			mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			mat.albedo_color.a = 1.0 - fade_progress

		# Scale down
		scale = Vector3.ONE * (1.0 - fade_progress * 0.5)

		# Remove after animation complete
		if death_timer >= death_duration:
			queue_free()

func take_damage(amount: float, _damage_type: String) -> void:
	if is_dead:
		return

	current_health -= amount
	if current_health <= 0:
		current_health = 0
		is_dead = true
		_start_death_animation()
