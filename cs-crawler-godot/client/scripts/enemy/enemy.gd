extends CharacterBody3D
## Enemy entity with visual representation, AI state indicators, and death animations

# Dynamic node references (created at runtime)
var mesh_instance: MeshInstance3D = null
var status_indicator: MeshInstance3D = null
var rage_particles: GPUParticles3D = null
var charge_trail: GPUParticles3D = null
var health_bar_3d: Node3D = null
var health_bar_fill: MeshInstance3D = null

var enemy_id: String = ""
var enemy_type: String = "basic"
var current_health: float = 100.0
var max_health: float = 100.0
var is_dead: bool = false

# AI State
var ai_state: String = "idle"
var target_id: String = ""
var is_raging: bool = false
var is_charging: bool = false
var is_buffed: bool = false
var server_velocity: Vector3 = Vector3.ZERO

# Visual state
var base_color: Color = Color(0.8, 0.2, 0.2)
var current_color: Color = Color(0.8, 0.2, 0.2)

# Death animation
var death_timer: float = 0.0
var death_duration: float = 1.0

# Attack flash
var flash_timer: float = 0.0
var flash_duration: float = 0.1

func _ready() -> void:
	_setup_appearance()
	_setup_status_indicators()
	_setup_3d_health_bar()

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
	var mesh_type = visual_config.get("meshType", "capsule")
	var scale_array = visual_config.get("scale", [1.0, 1.0, 1.0])

	base_color = Color(color_array[0], color_array[1], color_array[2])
	current_color = base_color

	# Create mesh based on type
	if not has_node("MeshInstance3D"):
		mesh_instance = MeshInstance3D.new()
		mesh_instance.name = "MeshInstance3D"
		add_child(mesh_instance)

		var mesh: Mesh
		match mesh_type:
			"sphere":
				var sphere = SphereMesh.new()
				sphere.radius = radius
				sphere.height = radius * 2
				mesh = sphere
			"box":
				var box = BoxMesh.new()
				box.size = Vector3(radius * 2, height, radius * 2)
				mesh = box
			_:  # Default to capsule
				var capsule = CapsuleMesh.new()
				capsule.radius = radius
				capsule.height = height
				mesh = capsule

		mesh_instance.mesh = mesh

		# Apply scale from config
		mesh_instance.scale = Vector3(scale_array[0], scale_array[1], scale_array[2])

		# Create material with configured color
		var material = StandardMaterial3D.new()
		material.albedo_color = base_color
		mesh_instance.material_override = material

func _setup_status_indicators() -> void:
	# Create a small indicator above the enemy for buffs/rage
	status_indicator = MeshInstance3D.new()
	status_indicator.name = "StatusIndicator"
	var indicator_mesh = SphereMesh.new()
	indicator_mesh.radius = 0.15
	status_indicator.mesh = indicator_mesh
	status_indicator.position = Vector3(0, 2.2, 0)
	status_indicator.visible = false

	var indicator_material = StandardMaterial3D.new()
	indicator_material.emission_enabled = true
	indicator_material.emission = Color(1, 0.5, 0)
	indicator_material.emission_energy_multiplier = 2.0
	status_indicator.material_override = indicator_material
	add_child(status_indicator)

func _setup_3d_health_bar() -> void:
	# Create 3D health bar attached to enemy
	health_bar_3d = Node3D.new()
	health_bar_3d.name = "HealthBar3D"
	health_bar_3d.position = Vector3(0, 2.5, 0)
	add_child(health_bar_3d)

	# Background bar
	var bg_mesh = MeshInstance3D.new()
	var bg_box = BoxMesh.new()
	bg_box.size = Vector3(1.2, 0.15, 0.05)
	bg_mesh.mesh = bg_box
	var bg_mat = StandardMaterial3D.new()
	bg_mat.albedo_color = Color(0.2, 0.2, 0.2, 0.9)
	bg_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	bg_mat.no_depth_test = true  # Render on top of everything
	bg_mat.render_priority = 10
	bg_mesh.material_override = bg_mat
	health_bar_3d.add_child(bg_mesh)

	# Health fill bar
	health_bar_fill = MeshInstance3D.new()
	health_bar_fill.name = "HealthFill"
	var fill_box = BoxMesh.new()
	fill_box.size = Vector3(1.1, 0.1, 0.06)
	health_bar_fill.mesh = fill_box
	health_bar_fill.position = Vector3(0, 0, 0.01)
	var fill_mat = StandardMaterial3D.new()
	fill_mat.albedo_color = Color(0.8, 0.1, 0.1)
	fill_mat.no_depth_test = true  # Render on top of everything
	fill_mat.render_priority = 11
	health_bar_fill.material_override = fill_mat
	health_bar_3d.add_child(health_bar_fill)

func _update_3d_health_bar() -> void:
	if not health_bar_fill or not health_bar_3d:
		return

	var health_percent = current_health / max_health if max_health > 0 else 0.0
	health_bar_fill.scale.x = health_percent
	health_bar_fill.position.x = -0.55 * (1.0 - health_percent)

	# Update color based on health
	var fill_mat = health_bar_fill.material_override as StandardMaterial3D
	if fill_mat:
		if health_percent > 0.5:
			fill_mat.albedo_color = Color(0.8, 0.1, 0.1)
		elif health_percent > 0.25:
			fill_mat.albedo_color = Color(0.9, 0.5, 0.1)
		else:
			fill_mat.albedo_color = Color(0.9, 0.2, 0.2)

	# Billboard: only rotate around Y axis to face camera (keeps position fixed)
	var camera = get_viewport().get_camera_3d()
	if camera and health_bar_3d:
		var cam_pos = camera.global_position
		var bar_pos = health_bar_3d.global_position
		var direction = Vector2(cam_pos.x - bar_pos.x, cam_pos.z - bar_pos.z)
		health_bar_3d.rotation.y = atan2(direction.x, direction.y)

func apply_server_state(state: Dictionary) -> void:
	# Update position
	var server_pos = state.get("position", {})
	var target_position = Vector3(
		server_pos.get("x", 0.0),
		server_pos.get("y", 0.0),
		server_pos.get("z", 0.0)
	)

	# Get velocity for rotation
	var vel = state.get("velocity", {})
	server_velocity = Vector3(
		vel.get("x", 0.0),
		vel.get("y", 0.0),
		vel.get("z", 0.0)
	)

	# Smooth interpolation
	global_position = global_position.lerp(target_position, 0.2)

	# Rotate enemy to face movement direction
	if server_velocity.length_squared() > 0.1:
		var look_dir = Vector3(server_velocity.x, 0, server_velocity.z).normalized()
		if look_dir.length() > 0.01:
			var target_rotation = atan2(look_dir.x, look_dir.z)
			rotation.y = lerp_angle(rotation.y, target_rotation, 0.1)

	# Update health
	if state.has("health"):
		current_health = state.get("health", 100.0)
		_update_3d_health_bar()

	if state.has("maxHealth"):
		max_health = state.get("maxHealth", 100.0)
		_update_3d_health_bar()

	# Update AI state
	if state.has("aiState"):
		var new_state = state.get("aiState", "idle")
		if new_state != ai_state:
			ai_state = new_state
			_on_ai_state_changed()

	if state.has("targetID"):
		target_id = state.get("targetID", "")

	# Update special states
	var was_raging = is_raging
	var was_charging = is_charging
	var was_buffed = is_buffed

	if state.has("isRaging"):
		is_raging = state.get("isRaging", false)
	if state.has("isCharging"):
		is_charging = state.get("isCharging", false)
	if state.has("isBuffed"):
		is_buffed = state.get("isBuffed", false)

	# Update visual indicators
	if is_raging != was_raging or is_buffed != was_buffed or is_charging != was_charging:
		_update_status_indicators()

	if state.has("dead"):
		var was_dead = is_dead
		is_dead = state.get("dead", false)

		# Start death animation if just died
		if is_dead and not was_dead:
			_start_death_animation()

func _on_ai_state_changed() -> void:
	# Visual feedback for AI state changes
	match ai_state:
		"attack":
			_flash_attack()
		"chase":
			pass
		"flee":
			pass

func _flash_attack() -> void:
	flash_timer = flash_duration

func _update_status_indicators() -> void:
	# Update color based on state
	var target_color = base_color

	if is_raging:
		# Red tint for rage
		target_color = base_color.lerp(Color(1, 0.2, 0.2), 0.5)
		if status_indicator:
			status_indicator.visible = true
			var mat = status_indicator.material_override as StandardMaterial3D
			if mat:
				mat.emission = Color(1, 0.3, 0.1)
	elif is_buffed:
		# Green tint for buff
		target_color = base_color.lerp(Color(0.3, 1.0, 0.3), 0.3)
		if status_indicator:
			status_indicator.visible = true
			var mat = status_indicator.material_override as StandardMaterial3D
			if mat:
				mat.emission = Color(0.3, 1.0, 0.3)
	elif is_charging:
		# Blue tint for charging
		target_color = base_color.lerp(Color(0.2, 0.5, 1.0), 0.5)
		if status_indicator:
			status_indicator.visible = true
			var mat = status_indicator.material_override as StandardMaterial3D
			if mat:
				mat.emission = Color(0.2, 0.5, 1.0)
	else:
		if status_indicator:
			status_indicator.visible = false

	current_color = target_color

	if mesh_instance and mesh_instance.material_override:
		var mat = mesh_instance.material_override as StandardMaterial3D
		mat.albedo_color = current_color

func _start_death_animation() -> void:
	death_timer = 0.0
	# Special death effect for exploders
	if enemy_type == "exploder":
		_spawn_explosion_effect()

func _spawn_explosion_effect() -> void:
	# Create explosion particle effect
	var particles = GPUParticles3D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.amount = 32
	particles.lifetime = 0.5

	var material = ParticleProcessMaterial.new()
	material.direction = Vector3(0, 1, 0)
	material.spread = 180.0
	material.initial_velocity_min = 5.0
	material.initial_velocity_max = 10.0
	material.gravity = Vector3(0, -10, 0)
	material.color = Color(1, 0.5, 0.1)
	particles.process_material = material

	var mesh = SphereMesh.new()
	mesh.radius = 0.1
	particles.draw_pass_1 = mesh

	particles.global_position = global_position
	get_tree().root.add_child(particles)

	# Auto-cleanup
	var timer = get_tree().create_timer(1.0)
	timer.timeout.connect(func(): particles.queue_free())

func _process(delta: float) -> void:
	# Handle attack flash
	if flash_timer > 0:
		flash_timer -= delta
		if mesh_instance and mesh_instance.material_override:
			var mat = mesh_instance.material_override as StandardMaterial3D
			mat.albedo_color = Color(1, 1, 1)  # White flash
	elif not is_dead and mesh_instance and mesh_instance.material_override:
		var mat = mesh_instance.material_override as StandardMaterial3D
		mat.albedo_color = current_color

	# Status indicator animation
	if status_indicator and status_indicator.visible:
		status_indicator.position.y = 2.2 + sin(Time.get_ticks_msec() * 0.005) * 0.1

	# Update health bar billboard (face camera)
	_update_3d_health_bar()

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
	_flash_attack()  # Flash when taking damage too

	if current_health <= 0:
		current_health = 0
		is_dead = true
		_start_death_animation()

# Debug helper to show AI state
func get_debug_info() -> String:
	return "ID: %s\nType: %s\nState: %s\nHP: %.0f/%.0f\nRaging: %s\nBuffed: %s" % [
		enemy_id, enemy_type, ai_state, current_health, max_health, is_raging, is_buffed
	]
