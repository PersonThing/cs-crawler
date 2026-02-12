extends Node3D
## Projectile entity with visual effects

# Dynamic node references (created at runtime)
var mesh_instance: MeshInstance3D = null
var trail_particles: GPUParticles3D = null
var glow: OmniLight3D = null

var projectile_id: String = ""
var ability_type: String = "fireball"
var velocity: Vector3 = Vector3.ZERO
var lifetime: float = 5.0
var age: float = 0.0
var is_enemy_projectile: bool = false

# Position tracking
var _first_position_set: bool = false

func _ready() -> void:
	_setup_appearance()
	_setup_particles()

func _setup_appearance() -> void:
	# Create sphere mesh for projectile
	if not has_node("MeshInstance3D"):
		mesh_instance = MeshInstance3D.new()
		mesh_instance.name = "MeshInstance3D"
		add_child(mesh_instance)

		var sphere = SphereMesh.new()
		sphere.radius = 0.2
		sphere.height = 0.4
		mesh_instance.mesh = sphere

	# Set material based on ability type
	var material = StandardMaterial3D.new()

	# Enemy projectiles have a distinct red/purple color
	if is_enemy_projectile:
		material.albedo_color = Color(0.8, 0.2, 0.4)  # Red/purple
		material.emission_enabled = true
		material.emission = Color(1.0, 0.2, 0.3)
		material.emission_energy_multiplier = 3.0
	else:
		match ability_type:
			"fireball":
				material.albedo_color = Color(1.0, 0.4, 0.0)  # Orange
				material.emission_enabled = true
				material.emission = Color(1.0, 0.5, 0.0)
				material.emission_energy_multiplier = 2.0
			"frostbolt":
				material.albedo_color = Color(0.3, 0.7, 1.0)  # Light blue
				material.emission_enabled = true
				material.emission = Color(0.5, 0.8, 1.0)
				material.emission_energy_multiplier = 2.0
			_:
				material.albedo_color = Color(1.0, 1.0, 1.0)

	mesh_instance.material_override = material

	# Add glow light
	if not has_node("GlowLight"):
		glow = OmniLight3D.new()
		glow.name = "GlowLight"
		glow.light_energy = 1.5
		glow.omni_range = 3.0

		if is_enemy_projectile:
			glow.light_color = Color(1.0, 0.2, 0.3)
			glow.light_energy = 2.0
		else:
			match ability_type:
				"fireball":
					glow.light_color = Color(1.0, 0.5, 0.0)
				"frostbolt":
					glow.light_color = Color(0.5, 0.8, 1.0)
				_:
					glow.light_color = Color(1.0, 1.0, 1.0)

		add_child(glow)

func _setup_particles() -> void:
	# Create trail particles
	if not has_node("TrailParticles"):
		trail_particles = GPUParticles3D.new()
		trail_particles.name = "TrailParticles"
		trail_particles.emitting = true
		trail_particles.amount = 20
		trail_particles.lifetime = 0.5
		trail_particles.explosiveness = 0.0
		add_child(trail_particles)

		# Create particle material
		var particle_mat = ParticleProcessMaterial.new()
		particle_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
		particle_mat.emission_sphere_radius = 0.1
		particle_mat.direction = Vector3(0, 0, 0)
		particle_mat.spread = 45.0
		particle_mat.initial_velocity_min = 0.5
		particle_mat.initial_velocity_max = 1.0
		particle_mat.gravity = Vector3(0, 0, 0)
		particle_mat.scale_min = 0.1
		particle_mat.scale_max = 0.2

		if is_enemy_projectile:
			particle_mat.color = Color(1.0, 0.2, 0.3, 0.8)
		else:
			match ability_type:
				"fireball":
					particle_mat.color = Color(1.0, 0.5, 0.0, 0.8)
				"frostbolt":
					particle_mat.color = Color(0.5, 0.8, 1.0, 0.8)
				_:
					particle_mat.color = Color(1.0, 1.0, 1.0, 0.8)

		trail_particles.process_material = particle_mat

		# Create draw pass mesh
		var particle_mesh = QuadMesh.new()
		particle_mesh.size = Vector2(0.2, 0.2)
		trail_particles.draw_pass_1 = particle_mesh

func _process(delta: float) -> void:
	age += delta

	# Move projectile
	global_position += velocity * delta

	# Rotate for visual effect
	rotation.y += delta * 5.0

	# Remove after lifetime expires
	if age >= lifetime:
		_create_impact_effect()
		queue_free()

func apply_server_state(state: Dictionary) -> void:
	# Update position from server
	var server_pos = state.get("position", {})
	var target_position = Vector3(
		server_pos.get("x", 0.0),
		server_pos.get("y", 0.0),
		server_pos.get("z", 0.0)
	)

	# Set position immediately on first update to avoid jump from origin
	if not _first_position_set:
		global_position = target_position
		_first_position_set = true
	else:
		# Smooth interpolation for subsequent updates
		global_position = global_position.lerp(target_position, 0.5)

	# Update velocity if provided
	if state.has("velocity"):
		var vel = state.get("velocity", {})
		velocity = Vector3(
			vel.get("x", 0.0),
			vel.get("y", 0.0),
			vel.get("z", 0.0)
		)

func on_hit() -> void:
	_create_impact_effect()
	queue_free()

func _create_impact_effect() -> void:
	# TODO: Create explosion particle effect
	# TODO: Screen shake
	pass
