extends CharacterBody3D
## Enemy entity with visual representation, AI state indicators, and death animations

# Dynamic node references (created at runtime)
var mesh_instance: MeshInstance3D = null
var rigged_model: Node3D = null
var status_indicator: MeshInstance3D = null
var rage_particles: GPUParticles3D = null
var charge_trail: GPUParticles3D = null
var health_bar_3d: Node3D = null
var health_bar_fill: MeshInstance3D = null
var health_type_label: Label3D = null

var enemy_id: String = ""
var enemy_type: String = "basic"
var current_health: float = 100.0
var max_health: float = 100.0
var is_dead: bool = false

# AI State
var ai_state: String = "idle"
var target_id: String = ""
var target_position: Vector3 = Vector3.ZERO  # Position of current target
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

# Spawn state
var _first_position_set: bool = false
var _spawn_timer: float = 0.0
var _spawn_delay: float = 2.0  # Delay before enemy becomes active
var _is_active: bool = false

func _ready() -> void:
	# Visual setup will be called after enemy_type is set
	# See setup_visuals() which is called from game_world.gd
	pass

func setup_visuals() -> void:
	print("[ENEMY] setup_visuals called for type: ", enemy_type)
	var visual_config = _get_visual_config()
	print("[ENEMY] visual_config: ", visual_config)
	print("[ENEMY] useRiggedModel: ", visual_config.get("useRiggedModel", false))
	if visual_config.get("useRiggedModel", false):
		_setup_rigged_model()
	else:
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

func _get_visual_config() -> Dictionary:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if config_loader:
		var enemy_config = config_loader.get_enemy(enemy_type)
		return enemy_config.get("visual", {})
	return {}

func _setup_rigged_model() -> void:
	print("[ENEMY] _setup_rigged_model called for type: ", enemy_type)
	# Remove old mesh if present
	if mesh_instance:
		mesh_instance.queue_free()
		mesh_instance = null

	# Load visual config
	var visual_config = _get_visual_config()
	var rig_script = visual_config.get("rigScript", "rigged_" + enemy_type)
	var color_array = visual_config.get("color", [0.8, 0.2, 0.2])
	base_color = Color(color_array[0], color_array[1], color_array[2])

	# Load and instantiate rig script
	var rig_path = "res://scripts/enemy/rigs/%s.gd" % rig_script
	print("[ENEMY] Checking for rig at path: ", rig_path)
	if ResourceLoader.exists(rig_path):
		print("[ENEMY] Loading rig class...")
		var RigClass = load(rig_path)
		rigged_model = RigClass.new()
		rigged_model.name = "RiggedModel"
		rigged_model.setup(base_color, enemy_type)
		add_child(rigged_model)
		print("[ENEMY] Rigged model created successfully!")
	else:
		push_warning("Rig script not found: %s, falling back to mesh" % rig_path)
		_setup_appearance()

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
	# Create 3D health bar independent of enemy rotation (like player)
	health_bar_3d = Node3D.new()
	health_bar_3d.name = "HealthBar3D"
	health_bar_3d.top_level = true  # Don't inherit parent rotation
	add_child(health_bar_3d)

	# Enemy type label above bar
	health_type_label = Label3D.new()
	health_type_label.text = enemy_type.capitalize()
	health_type_label.font_size = 96  # Much larger font
	health_type_label.position = Vector3(0, 0.3, 0)
	health_type_label.pixel_size = 0.0025  # Even smaller pixel size for sharper, bigger text
	health_type_label.outline_size = 12  # Thicker outline for better readability
	health_type_label.modulate = Color(1.0, 1.0, 1.0)  # White text
	health_type_label.outline_modulate = Color(0, 0, 0, 0.9)  # Strong black outline
	health_type_label.no_depth_test = true
	health_type_label.render_priority = 10
	health_type_label.alpha_cut = Label3D.ALPHA_CUT_DISABLED  # Better anti-aliasing
	health_type_label.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	health_bar_3d.add_child(health_type_label)

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

	# Calculate health bar height based on rigged model or default
	var bar_height = 2.5  # Default height for simple meshes
	if rigged_model and rigged_model.has_node("Hips"):
		# For rigged models, position above the highest point
		var hips = rigged_model.get_node("Hips")
		bar_height = hips.position.y + 0.8  # Add offset above hips position

	# Position above enemy (top_level means we must set global_position manually)
	health_bar_3d.global_position = global_position + Vector3(0, bar_height, 0)

	var health_percent = current_health / max_health if max_health > 0 else 0.0
	health_bar_fill.scale.x = health_percent
	health_bar_fill.position.x = -0.55 * (1.0 - health_percent)

	# Update color based on health (red for enemies)
	var fill_mat = health_bar_fill.material_override as StandardMaterial3D
	if fill_mat:
		if health_percent > 0.5:
			fill_mat.albedo_color = Color(0.8, 0.1, 0.1)  # Red
		elif health_percent > 0.25:
			fill_mat.albedo_color = Color(0.9, 0.5, 0.1)  # Orange
		else:
			fill_mat.albedo_color = Color(0.9, 0.2, 0.2)  # Bright red

	# Billboard: face camera like player health bar
	var viewport = get_viewport()
	if viewport:
		var camera = viewport.get_camera_3d()
		if camera:
			# Align with camera's orientation so it looks flat/2D
			health_bar_3d.global_transform.basis = camera.global_transform.basis

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

	# Set position immediately on first update to avoid jump from origin
	if not _first_position_set:
		global_position = target_position
		_first_position_set = true
	else:
		# Smooth interpolation for subsequent updates
		global_position = global_position.lerp(target_position, 0.2)

	# Rotate enemy to face movement direction or target (only if active)
	if _is_active:
		var look_dir = Vector3.ZERO

		# Ranged/caster enemies face their target when attacking
		if (ai_state == "attack" or ai_state == "attacking") and target_id != "":
			# Look up target position (player or other entity)
			var target_node = _get_target_node()
			if target_node:
				target_position = target_node.global_position
				look_dir = Vector3(target_position.x - global_position.x, 0, target_position.z - global_position.z).normalized()
		# Otherwise face movement direction
		elif server_velocity.length_squared() > 0.1:
			look_dir = Vector3(server_velocity.x, 0, server_velocity.z).normalized()

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
	elif rigged_model:
		# Apply tint to rigged model based on state
		if is_raging:
			rigged_model.apply_color_tint(Color(1, 0.2, 0.2), 0.5)
		elif is_buffed:
			rigged_model.apply_color_tint(Color(0.3, 1.0, 0.3), 0.3)
		elif is_charging:
			rigged_model.apply_color_tint(Color(0.2, 0.5, 1.0), 0.5)
		else:
			rigged_model.reset_color()

func _start_death_animation() -> void:
	death_timer = 0.0
	# Special death effect for exploders
	if enemy_type == "exploder":
		_spawn_explosion_effect()

func _spawn_explosion_effect() -> void:
	# Create explosion particle effect
	if not is_inside_tree():
		return

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
	var tree = get_tree()
	if tree:
		var timer = tree.create_timer(1.0)
		timer.timeout.connect(func():
			if is_instance_valid(particles):
				particles.queue_free()
		)

func _process(delta: float) -> void:
	# Handle spawn delay timer
	if not _is_active:
		_spawn_timer += delta
		if _spawn_timer >= _spawn_delay:
			_is_active = true

		# Fade in during spawn (from 0.3 to 1.0 over spawn delay)
		var spawn_alpha = 0.3 + (_spawn_timer / _spawn_delay) * 0.7
		if mesh_instance and mesh_instance.material_override:
			var mat = mesh_instance.material_override as StandardMaterial3D
			mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			mat.albedo_color.a = spawn_alpha
		elif rigged_model:
			rigged_model.apply_color_tint(base_color, spawn_alpha)

		# Hide health bar during spawn
		if health_bar_3d:
			health_bar_3d.visible = false
	else:
		# Show health bar when active
		if health_bar_3d:
			health_bar_3d.visible = true

	# Update rigged model animation (only if active)
	if rigged_model and _is_active:
		var is_moving = server_velocity.length() > 0.1
		rigged_model.update_animation(is_moving, delta, ai_state)

	# Handle attack flash
	if flash_timer > 0:
		flash_timer -= delta
		if mesh_instance and mesh_instance.material_override:
			var mat = mesh_instance.material_override as StandardMaterial3D
			mat.albedo_color = Color(1, 1, 1)  # White flash
		elif rigged_model:
			rigged_model.apply_color_tint(Color(1, 1, 1), 1.0)  # White flash for rigged
	elif not is_dead and _is_active:  # Only reset color when active (not spawning)
		if mesh_instance and mesh_instance.material_override:
			var mat = mesh_instance.material_override as StandardMaterial3D
			mat.albedo_color = current_color
		elif rigged_model:
			rigged_model.reset_color()

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
		elif rigged_model:
			# Fade rigged model by applying semi-transparent tint
			var fade_color = base_color
			fade_color.a = 1.0 - fade_progress
			rigged_model.apply_color_tint(fade_color, 1.0 - fade_progress)

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
func _get_target_node() -> Node3D:
	## Helper to get the target node (player or another entity) by target_id
	if target_id == "":
		return null

	# Check if target is the player
	var game_world = get_parent().get_parent()  # enemies_container -> game_world
	if game_world and game_world.has_node("Player"):
		var player = game_world.get_node("Player")
		if player and player.has_method("get") and player.get("player_id") == target_id:
			return player

	# Check if target is another enemy or minion
	if game_world:
		# Check enemies
		if game_world.has_node("Enemies"):
			for enemy in game_world.get_node("Enemies").get_children():
				if enemy.has_method("get") and enemy.get("enemy_id") == target_id:
					return enemy

		# Check minions
		if game_world.has_node("Minions"):
			for minion in game_world.get_node("Minions").get_children():
				if minion.has_method("get") and minion.get("minion_id") == target_id:
					return minion

	return null

func get_debug_info() -> String:
	return "ID: %s\nType: %s\nState: %s\nHP: %.0f/%.0f\nRaging: %s\nBuffed: %s" % [
		enemy_id, enemy_type, ai_state, current_health, max_health, is_raging, is_buffed
	]
