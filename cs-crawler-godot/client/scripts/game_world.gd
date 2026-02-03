extends Node3D
## Main game world - manages entities and game state

@onready var camera: Camera3D = $Camera3D
@onready var players_container: Node3D = $Players
@onready var enemies_container: Node3D = $Enemies
@onready var projectiles_container: Node3D = $Projectiles
@onready var minions_container: Node3D = null  # Created dynamically if doesn't exist
@onready var ground_items_container: Node3D = null  # Created dynamically if doesn't exist

# VR / XR
var xr_interface: XRInterface = null
var xr_origin: XROrigin3D = null
var xr_camera: XRCamera3D = null
var is_xr_active: bool = false

# Screen shake
var screen_shake_amount: float = 0.0
var screen_shake_decay: float = 5.0

# Camera settings (loaded from config)
var camera_base_offset: Vector3 = Vector3(0, 20, 7.3)
var camera_deadzone: float = 3.0
var camera_follow_speed: float = 4.0
var camera_focus_point: Vector3 = Vector3.ZERO

var player_scene = preload("res://scenes/player/player.tscn")
var click_indicator_scene = preload("res://scenes/ui/click_indicator.tscn")
var enemy_script = preload("res://scripts/enemy/enemy.gd")
var projectile_script = preload("res://scripts/projectile/projectile.gd")
var damage_number_script = preload("res://scripts/ui/damage_number.gd")
var ability_bar_script = preload("res://scripts/ui/ability_bar.gd")
var enemy_ui_manager_script = preload("res://scripts/ui/enemy_ui_manager.gd")
var modifier_panel_script = preload("res://scripts/ui/modifier_panel.gd")
var inventory_panel_script = preload("res://scripts/ui/inventory_panel.gd")
var ground_item_script = preload("res://scripts/ground_item.gd")

var local_player: Node3D = null
var remote_players: Dictionary = {}
var enemies: Dictionary = {}
var projectiles: Dictionary = {}
var minions: Dictionary = {}
var ground_items: Dictionary = {}
var enemy_ui_manager: Control = null
var inventory_panel: Control = null
var cursor_indicator: MeshInstance3D = null

# Pending pickup target (ground item ID to pick up when in range)
var pending_pickup_target: String = ""
var pending_pickup_position: Vector3 = Vector3.ZERO
const PICKUP_RANGE: float = 3.0

func _ready() -> void:
	_load_camera_config()
	_setup_xr()
	NetworkManager.message_received.connect(_on_message_received)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)
	_setup_navigation_mesh()
	_setup_enemy_ui_manager()
	_setup_ability_bar()
	_setup_modifier_panel()
	_setup_minions_container()
	_setup_ground_items_container()
	_setup_inventory_panel()
	_setup_cursor_indicator()

	# Check if we're already joined (main menu handled the join)
	if GameManager.local_player_id != "":
		print("[WORLD] Local player ID already set: ", GameManager.local_player_id)
		_spawn_local_player(GameManager.local_player_id)
	else:
		print("[WORLD] Waiting for joined message...")

func _setup_minions_container() -> void:
	# Create minions container if it doesn't exist
	if not has_node("Minions"):
		minions_container = Node3D.new()
		minions_container.name = "Minions"
		add_child(minions_container)
	else:
		minions_container = get_node("Minions")

func _setup_ground_items_container() -> void:
	# Create ground items container if it doesn't exist
	if not has_node("GroundItems"):
		ground_items_container = Node3D.new()
		ground_items_container.name = "GroundItems"
		add_child(ground_items_container)
	else:
		ground_items_container = get_node("GroundItems")

func _setup_inventory_panel() -> void:
	if not has_node("InventoryPanel"):
		inventory_panel = Control.new()
		inventory_panel.name = "InventoryPanel"
		inventory_panel.set_script(inventory_panel_script)
		inventory_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
		add_child(inventory_panel)

func _load_camera_config() -> void:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if not config_loader:
		push_warning("[WORLD] ConfigLoader not found, using default camera settings")
		return

	# Load camera settings
	var offset = config_loader.get_camera_setting("baseOffset")
	if offset and offset is Array and offset.size() >= 3:
		camera_base_offset = Vector3(offset[0], offset[1], offset[2])

	var deadzone = config_loader.get_camera_setting("deadzone")
	if deadzone:
		camera_deadzone = deadzone

	var follow_speed = config_loader.get_camera_setting("followSpeed")
	if follow_speed:
		camera_follow_speed = follow_speed

	# Load screen shake settings
	var shake_config = config_loader.camera_config.get("screenShake", {})
	if shake_config.has("decay"):
		screen_shake_decay = shake_config["decay"]

	print("[WORLD] Loaded camera config - offset: ", camera_base_offset, " deadzone: ", camera_deadzone)

func _setup_xr() -> void:
	xr_interface = XRServer.find_interface("OpenXR")
	if xr_interface and xr_interface.initialize():
		print("[WORLD] OpenXR initialized successfully")
		get_viewport().use_xr = true
		is_xr_active = true

		# Create XR origin and camera dynamically
		xr_origin = XROrigin3D.new()
		xr_origin.name = "XROrigin3D"
		add_child(xr_origin)

		xr_camera = XRCamera3D.new()
		xr_camera.name = "XRCamera3D"
		xr_origin.add_child(xr_camera)

		# Use XR camera for all raycasting and UI projection
		camera = xr_camera

		# Disable the flat camera
		$Camera3D.current = false
	else:
		print("[WORLD] OpenXR not available, using flat camera")
		is_xr_active = false

func _setup_enemy_ui_manager() -> void:
	# Create enemy UI manager
	if not has_node("EnemyUIManager"):
		enemy_ui_manager = Control.new()
		enemy_ui_manager.name = "EnemyUIManager"
		enemy_ui_manager.set_script(enemy_ui_manager_script)
		enemy_ui_manager.set_anchors_preset(Control.PRESET_FULL_RECT)
		enemy_ui_manager.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(enemy_ui_manager)
		enemy_ui_manager.set_camera(camera)

func _setup_ability_bar() -> void:
	# Create ability bar UI if it doesn't exist
	if not has_node("AbilityBarUI"):
		var ability_bar = Control.new()
		ability_bar.name = "AbilityBarUI"
		ability_bar.set_script(ability_bar_script)

		# Make it fill the screen
		ability_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
		ability_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE  # Don't block mouse input

		add_child(ability_bar)

func _setup_modifier_panel() -> void:
	# Create modifier panel UI if it doesn't exist
	if not has_node("ModifierPanel"):
		var modifier_panel = Control.new()
		modifier_panel.name = "ModifierPanel"
		modifier_panel.set_script(modifier_panel_script)

		# Make it fill the screen
		modifier_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
		modifier_panel.mouse_filter = Control.MOUSE_FILTER_PASS  # Allow mouse interaction

		add_child(modifier_panel)

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")
	#print("[WORLD] Message received: ", msg_type)

	match msg_type:
		"joined":
			_handle_joined(message)
		"world_state":
			_handle_world_state(message)
		"ability_cast":
			_handle_ability_cast(message)
		"item_picked_up":
			_handle_item_picked_up(message)
		"item_equipped":
			_handle_inventory_update(message)
		"item_unequipped":
			_handle_inventory_update(message)

func _handle_joined(message: Dictionary) -> void:
	var player_id = message.get("playerID", "")
	GameManager.local_player_id = player_id
	print("[WORLD] Received joined message with player ID: ", player_id)
	_spawn_local_player(player_id)

func _spawn_local_player(player_id: String) -> void:
	if local_player != null:
		print("[WORLD] Local player already spawned, skipping")
		return

	print("[WORLD] Spawning local player with ID: ", player_id)

	# Spawn local player
	local_player = player_scene.instantiate()
	local_player.is_local = true
	local_player.player_id = player_id
	players_container.add_child(local_player)

	# Initialize camera focus point at player spawn
	camera_focus_point = local_player.global_position

	print("[WORLD] Spawned local player: ", player_id, " at position: ", local_player.global_position)
	print("[WORLD] local_player reference valid: ", local_player != null)

func _handle_world_state(state: Dictionary) -> void:
	# Handle players
	var players_data = state.get("players", [])
	for player_data in players_data:
		var pid = player_data.get("id", "")

		if pid == GameManager.local_player_id:
			# Update local player from server (for reconciliation)
			if is_instance_valid(local_player):
				local_player.apply_server_state(player_data)

			# Update inventory panel if player data includes inventory
			var inv_data = player_data.get("inventory", {})
			if inventory_panel and inv_data.size() > 0:
				inventory_panel.update_inventory(inv_data)
		else:
			# Update or create remote player
			if not remote_players.has(pid):
				var remote_player = player_scene.instantiate()
				remote_player.is_local = false
				remote_player.player_id = pid
				remote_players[pid] = remote_player
				players_container.add_child(remote_player)

			if is_instance_valid(remote_players[pid]):
				remote_players[pid].apply_server_state(player_data)

	# Handle enemies
	var enemies_data = state.get("enemies", [])
	var current_enemy_ids = []

	# Debug: Log enemy count changes
	if enemies_data.size() != enemies.size():
		print("[WORLD] Enemy count changed: ", enemies.size(), " -> ", enemies_data.size())

	for enemy_data in enemies_data:
		var eid = enemy_data.get("id", "")
		current_enemy_ids.append(eid)

		if not enemies.has(eid):
			# Create new enemy
			var enemy = CharacterBody3D.new()
			enemy.set_script(enemy_script)
			enemy.enemy_id = eid
			enemy.enemy_type = enemy_data.get("type", "basic")
			enemies[eid] = enemy

			# Add to scene tree first so _ready() gets called
			enemies_container.add_child(enemy)

			# Force setup appearance if _ready() didn't run properly
			if not enemy.mesh_instance:
				enemy._setup_appearance()

			print("[WORLD] Created new enemy: ", eid, " type: ", enemy.enemy_type, " mesh: ", enemy.mesh_instance != null)

			# Register with UI manager
			if enemy_ui_manager:
				enemy_ui_manager.register_enemy(eid, enemy)

		# Update enemy state (check if still valid - might be queued for deletion)
		if is_instance_valid(enemies[eid]):
			enemies[eid].apply_server_state(enemy_data)

			# Update UI with health
			if enemy_ui_manager:
				var health = enemy_data.get("health", 100.0)
				var max_health = enemy_data.get("maxHealth", 100.0)
				enemy_ui_manager.update_enemy_health(eid, health, max_health)

	# Remove enemies that no longer exist on server
	for eid in enemies.keys():
		if not eid in current_enemy_ids:
			print("[WORLD] Removing enemy: ", eid)
			if enemy_ui_manager:
				enemy_ui_manager.unregister_enemy(eid)
			if is_instance_valid(enemies[eid]):
				enemies[eid].queue_free()
			enemies.erase(eid)

	# Handle projectiles
	var projectiles_data = state.get("projectiles", [])
	var current_projectile_ids = []
	for proj_data in projectiles_data:
		var proj_id = proj_data.get("id", "")
		current_projectile_ids.append(proj_id)

		if not projectiles.has(proj_id):
			# Create new projectile
			var projectile = Node3D.new()
			projectile.set_script(projectile_script)
			projectile.projectile_id = proj_id
			projectile.ability_type = proj_data.get("abilityType", "fireball")
			projectiles[proj_id] = projectile
			projectiles_container.add_child(projectile)

		# Update projectile state (check if still valid - might be queued for deletion)
		if is_instance_valid(projectiles[proj_id]):
			projectiles[proj_id].apply_server_state(proj_data)

	# Remove projectiles that no longer exist on server
	for proj_id in projectiles.keys():
		if not proj_id in current_projectile_ids:
			if projectiles[proj_id]:
				projectiles[proj_id].queue_free()
			projectiles.erase(proj_id)

	# Handle minions
	var minions_data = state.get("minions", [])
	var current_minion_ids = []

	for minion_data in minions_data:
		var minion_id = minion_data.get("id", "")
		current_minion_ids.append(minion_id)

		if not minions.has(minion_id):
			# Create new minion
			var minion = _create_minion(minion_data)
			minions[minion_id] = minion
			minions_container.add_child(minion)

		# Update minion state
		if is_instance_valid(minions[minion_id]):
			_update_minion_state(minions[minion_id], minion_data)

	# Remove minions that no longer exist on server
	for minion_id in minions.keys():
		if not minion_id in current_minion_ids:
			if minions[minion_id]:
				minions[minion_id].queue_free()
			minions.erase(minion_id)

	# Handle ground items
	var ground_items_data = state.get("groundItems", [])
	var current_ground_item_ids = []

	for ground_item_data in ground_items_data:
		var ground_item_id = ground_item_data.get("id", "")
		current_ground_item_ids.append(ground_item_id)

		if not ground_items.has(ground_item_id):
			# Create new ground item
			var ground_item = _create_ground_item(ground_item_data)
			ground_items[ground_item_id] = ground_item
			ground_items_container.add_child(ground_item)

	# Remove ground items that no longer exist on server
	for ground_item_id in ground_items.keys():
		if not ground_item_id in current_ground_item_ids:
			if ground_items[ground_item_id]:
				ground_items[ground_item_id].queue_free()
			ground_items.erase(ground_item_id)

	# Handle damage events
	var damage_events = state.get("damageEvents", [])
	for damage_event in damage_events:
		_handle_damage_event(damage_event)

	# Handle death events
	var death_events = state.get("deathEvents", [])
	for death_event in death_events:
		_handle_death_event(death_event)

	# Handle ability cast events (from minions)
	var ability_cast_events = state.get("abilityCastEvents", [])
	for cast_event in ability_cast_events:
		_handle_minion_ability_cast(cast_event)

func _handle_ability_cast(message: Dictionary) -> void:
	var player_id = message.get("playerID", "")
	var ability_type = message.get("abilityType", "")
	var pos_data = message.get("position", {})
	var direction = message.get("direction", {})

	print("[WORLD] Ability cast: ", ability_type, " by player ", player_id)

	var cast_pos = Vector3(pos_data.get("x", 0.0), pos_data.get("y", 0.0), pos_data.get("z", 0.0))
	var cast_dir = Vector3(direction.get("x", 0.0), direction.get("y", 0.0), direction.get("z", 0.0))

	# Create visual effects for instant/melee abilities
	match ability_type:
		"lightning":
			_create_lightning_effect(cast_pos, cast_dir)
		"basic_attack":
			_create_melee_cone_effect(cast_pos, cast_dir)

	# Projectile abilities (fireball, frostbolt) will be created by world_state update

func _handle_minion_ability_cast(event: Dictionary) -> void:
	var caster_id = event.get("casterID", "")
	var ability_type = event.get("abilityType", "")
	var pos_data = event.get("position", {})
	var direction = event.get("direction", {})

	print("[WORLD] Minion ability cast: ", ability_type, " by minion ", caster_id)

	var cast_pos = Vector3(pos_data.get("x", 0.0), pos_data.get("y", 0.0), pos_data.get("z", 0.0))
	var cast_dir = Vector3(direction.get("x", 0.0), direction.get("y", 0.0), direction.get("z", 0.0))

	# Create visual effects for instant/melee abilities
	match ability_type:
		"lightning":
			_create_lightning_effect(cast_pos, cast_dir)
		"basic_attack":
			_create_melee_cone_effect(cast_pos, cast_dir)

	# Projectile abilities (fireball, frostbolt) are already handled by projectile rendering

func _handle_damage_event(damage_event: Dictionary) -> void:
	var target_id = damage_event.get("targetID", "")
	var damage = damage_event.get("damage", 0.0)
	var damage_type = damage_event.get("type", "physical")

	# Apply damage to enemy if it exists and is still valid
	if enemies.has(target_id) and is_instance_valid(enemies[target_id]):
		enemies[target_id].take_damage(damage, damage_type)

		# Spawn damage number
		_spawn_damage_number(enemies[target_id].global_position, damage, damage_type)

func _spawn_damage_number(spawn_pos: Vector3, damage: float, damage_type: String) -> void:
	var damage_number = Label3D.new()
	damage_number.set_script(damage_number_script)
	add_child(damage_number)
	damage_number.global_position = spawn_pos + Vector3(0, 1.5, 0)
	damage_number.setup(damage, damage_type)

	# Screen shake on hit
	add_screen_shake(0.1)

	# Explosion effect
	_create_explosion_effect(spawn_pos, damage_type)

func _update_camera_with_deadzone(delta: float) -> void:
	# Always move camera focus towards player with smooth lag
	var player_pos_2d = Vector2(local_player.global_position.x, local_player.global_position.z)
	var focus_pos_2d = Vector2(camera_focus_point.x, camera_focus_point.z)

	# Smooth lerp focus point towards player (always following, just delayed)
	var new_focus_2d = focus_pos_2d.lerp(player_pos_2d, delta * camera_follow_speed)
	camera_focus_point = Vector3(new_focus_2d.x, 0, new_focus_2d.y)

	# Position camera above focus point
	var target_pos = camera_focus_point + camera_base_offset

	# Apply screen shake
	if screen_shake_amount > 0:
		screen_shake_amount = max(0, screen_shake_amount - screen_shake_decay * delta)
		var shake_offset = Vector3(
			randf_range(-screen_shake_amount, screen_shake_amount),
			randf_range(-screen_shake_amount, screen_shake_amount),
			randf_range(-screen_shake_amount, screen_shake_amount)
		)
		target_pos += shake_offset

	if is_xr_active:
		# VR mode: position the XR origin.
		# The headset adds relative head rotation on top of this base orientation.
		xr_origin.global_position = xr_origin.global_position.lerp(target_pos, delta * camera_follow_speed)
	else:
		# Flat mode: move camera directly
		camera.global_position = camera.global_position.lerp(target_pos, delta * camera_follow_speed)
		camera.look_at(camera_focus_point, Vector3.UP)

func add_screen_shake(amount: float) -> void:
	screen_shake_amount += amount

func _create_explosion_effect(spawn_pos: Vector3, damage_type: String) -> void:
	# Create explosion particle effect
	var explosion = GPUParticles3D.new()
	add_child(explosion)
	explosion.global_position = spawn_pos
	explosion.emitting = true
	explosion.one_shot = true
	explosion.explosiveness = 1.0
	explosion.amount = 30
	explosion.lifetime = 0.5

	# Create particle material
	var particle_mat = ParticleProcessMaterial.new()
	particle_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	particle_mat.emission_sphere_radius = 0.2
	particle_mat.direction = Vector3(0, 1, 0)
	particle_mat.spread = 180.0
	particle_mat.initial_velocity_min = 3.0
	particle_mat.initial_velocity_max = 6.0
	particle_mat.gravity = Vector3(0, -5, 0)
	particle_mat.scale_min = 0.2
	particle_mat.scale_max = 0.5
	particle_mat.damping_min = 2.0
	particle_mat.damping_max = 4.0

	# Set color based on damage type
	match damage_type:
		"fire":
			particle_mat.color = Color(1.0, 0.5, 0.0, 0.9)
		"cold":
			particle_mat.color = Color(0.5, 0.8, 1.0, 0.9)
		"lightning":
			particle_mat.color = Color(1.0, 1.0, 0.3, 0.9)
		_:
			particle_mat.color = Color(1.0, 1.0, 1.0, 0.9)

	explosion.process_material = particle_mat

	# Create draw pass mesh
	var particle_mesh = QuadMesh.new()
	particle_mesh.size = Vector2(0.3, 0.3)
	explosion.draw_pass_1 = particle_mesh

	# Auto-delete after finished
	await get_tree().create_timer(2.0).timeout
	explosion.queue_free()

func _create_lightning_effect(origin: Vector3, direction: Vector3) -> void:
	# Create a line/beam effect for lightning ability
	var beam_length = 20.0  # Lightning range from config
	var beam_width = 1.0    # Width of the beam (line width from config)

	# Calculate end point
	var dir_normalized = direction.normalized()
	var end_point = origin + dir_normalized * beam_length

	# Create a cylinder mesh to represent the beam
	var mesh_instance = MeshInstance3D.new()
	add_child(mesh_instance)

	var cylinder = CylinderMesh.new()
	cylinder.top_radius = beam_width * 0.5
	cylinder.bottom_radius = beam_width * 0.5
	cylinder.height = beam_length
	mesh_instance.mesh = cylinder

	# Position and rotate the cylinder to align with direction
	mesh_instance.global_position = origin + dir_normalized * (beam_length * 0.5)
	mesh_instance.look_at(end_point, Vector3.UP)
	mesh_instance.rotate_object_local(Vector3.RIGHT, PI / 2)  # Rotate to align with direction

	# Create lightning material (bright yellow/white)
	var material = StandardMaterial3D.new()
	material.albedo_color = Color(1.0, 1.0, 0.3, 0.7)
	material.emission_enabled = true
	material.emission = Color(1.0, 1.0, 0.5)
	material.emission_energy_multiplier = 16.0
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mesh_instance.material_override = material

	# Add a glow light
	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 1.0, 0.5)
	light.light_energy = 3.0
	light.omni_range = 10.0
	mesh_instance.add_child(light)
	light.global_position = origin + dir_normalized * (beam_length * 0.5)

	# Add particles along the beam
	var particles = GPUParticles3D.new()
	mesh_instance.add_child(particles)
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 50
	particles.lifetime = 0.3
	particles.explosiveness = 1.0

	var particle_mat = ParticleProcessMaterial.new()
	particle_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	particle_mat.emission_box_extents = Vector3(beam_width, beam_length * 0.5, beam_width)
	particle_mat.direction = Vector3(0, 0, 0)
	particle_mat.spread = 180.0
	particle_mat.initial_velocity_min = 2.0
	particle_mat.initial_velocity_max = 4.0
	particle_mat.gravity = Vector3(0, 0, 0)
	particle_mat.color = Color(1.0, 1.0, 0.8, 1.0)
	particle_mat.scale_min = 0.1
	particle_mat.scale_max = 0.3
	particles.process_material = particle_mat

	var particle_mesh = QuadMesh.new()
	particle_mesh.size = Vector2(0.2, 0.2)
	particles.draw_pass_1 = particle_mesh

	# Fade out and remove
	var tween = create_tween()
	tween.tween_property(material, "albedo_color:a", 0.0, 0.2)
	await tween.finished
	mesh_instance.queue_free()

func _create_melee_cone_effect(origin: Vector3, direction: Vector3) -> void:
	# Create a cone visualization for melee attack
	var cone_range = 2.0   # BasicAttack range from config
	var cone_angle = 90  # BasicAttack angle from config (degrees)

	# Calculate cone parameters
	var dir_normalized = direction.normalized()
	var cone_radius = cone_range * tan(deg_to_rad(cone_angle / 2.0))

	# Create a cone mesh
	var mesh_instance = MeshInstance3D.new()
	add_child(mesh_instance)

	# Use a cylinder with one end smaller to approximate a cone
	var cone_mesh = CylinderMesh.new()
	cone_mesh.top_radius = cone_radius
	cone_mesh.bottom_radius = 0.1
	cone_mesh.height = cone_range
	mesh_instance.mesh = cone_mesh

	# Position the cone center between player and max range
	var cone_center = origin + dir_normalized * (cone_range * 0.5)
	cone_center.y = 0.5  # Raise slightly above ground
	mesh_instance.global_position = cone_center

	# Orient the cone: Y-axis should point along attack direction
	# The cylinder's Y-axis is the height, we want it along the attack direction
	# Build a transform basis with Y pointing along dir_normalized
	var up_vector = dir_normalized  # This will be the cone's Y axis (along its height)
	var right_vector = Vector3.UP.cross(up_vector).normalized()
	if right_vector.length() < 0.001:  # Handle edge case when direction is straight up/down
		right_vector = Vector3.RIGHT
	var forward_vector = up_vector.cross(right_vector).normalized()

	mesh_instance.global_transform.basis = Basis(right_vector, up_vector, forward_vector)

	# Create semi-transparent red material for melee attack
	var material = StandardMaterial3D.new()
	material.albedo_color = Color(1.0, 0.3, 0.3, 0.4)
	material.emission_enabled = true
	material.emission = Color(1.0, 0.5, 0.5)
	material.emission_energy_multiplier = 2.0
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_DISABLED  # Show both sides
	mesh_instance.material_override = material

	# Add slash particles
	var particles = GPUParticles3D.new()
	mesh_instance.add_child(particles)
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 30
	particles.lifetime = 0.2
	particles.explosiveness = 1.0

	var particle_mat = ParticleProcessMaterial.new()
	particle_mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	particle_mat.emission_box_extents = Vector3(cone_radius, 0.5, cone_range * 0.5)
	particle_mat.direction = Vector3(0, 1, 0)
	particle_mat.spread = 45.0
	particle_mat.initial_velocity_min = 3.0
	particle_mat.initial_velocity_max = 5.0
	particle_mat.gravity = Vector3(0, -5, 0)
	particle_mat.color = Color(1.0, 0.8, 0.8, 0.9)
	particle_mat.scale_min = 0.15
	particle_mat.scale_max = 0.3
	particles.process_material = particle_mat

	var particle_mesh = QuadMesh.new()
	particle_mesh.size = Vector2(0.25, 0.25)
	particles.draw_pass_1 = particle_mesh

	# Quick fade out and remove
	var tween = create_tween()
	tween.tween_property(material, "albedo_color:a", 0.0, 0.15)
	await tween.finished
	mesh_instance.queue_free()

func _handle_death_event(death_event: Dictionary) -> void:
	var entity_id = death_event.get("entityID", "")
	var entity_type = death_event.get("entityType", "")

	print("[WORLD] Entity died: ", entity_id, " (", entity_type, ")")

	# Death animation is handled by the entity itself via server state

func _handle_item_picked_up(message: Dictionary) -> void:
	var ground_item_id = message.get("groundItemID", "")
	print("[WORLD] Item picked up: ", ground_item_id)

	# Clear pending pickup if this was it
	if pending_pickup_target == ground_item_id:
		pending_pickup_target = ""

	# Update inventory panel with new data
	var inv_data = message.get("inventory", {})
	if inventory_panel and inv_data.size() > 0:
		inventory_panel.update_inventory(inv_data)

func _handle_inventory_update(message: Dictionary) -> void:
	# Update inventory panel with new data
	var inv_data = message.get("inventory", {})
	if inventory_panel and inv_data.size() > 0:
		inventory_panel.update_inventory(inv_data)
	print("[WORLD] Inventory updated")

func request_pickup(ground_item_id: String, item_position: Vector3) -> void:
	# Called by ground items when clicked - path to item and pick up
	if not is_instance_valid(local_player):
		return

	# Check if already in range
	var distance = local_player.global_position.distance_to(item_position)
	if distance <= PICKUP_RANGE:
		# Already in range, pick up immediately
		_send_pickup_request(ground_item_id)
	else:
		# Path to item, then pick up when in range
		pending_pickup_target = ground_item_id
		pending_pickup_position = item_position
		local_player.set_move_target(item_position)
		print("[WORLD] Pathing to ground item: ", ground_item_id)

func _send_pickup_request(ground_item_id: String) -> void:
	NetworkManager.send_message({
		"type": "pickup_item",
		"groundItemID": ground_item_id
	})
	print("[WORLD] Sent pickup request for: ", ground_item_id)

func _create_minion(minion_data: Dictionary) -> Node3D:
	var minion_type = minion_data.get("type", "pet")
	var ability_type = minion_data.get("abilityType", "fireball")

	var minion = Node3D.new()

	# Create visual representation based on minion type
	if minion_type == "pet":
		# Create a small animated pet (smaller sphere that follows the player)
		var mesh_instance = MeshInstance3D.new()
		var sphere = SphereMesh.new()
		sphere.radius = 0.3
		sphere.height = 0.6
		mesh_instance.mesh = sphere

		# Color based on ability type
		var material = StandardMaterial3D.new()
		match ability_type:
			"fireball":
				material.albedo_color = Color(1.0, 0.5, 0.2, 0.9)
				material.emission = Color(1.0, 0.5, 0.0)
			"frostbolt":
				material.albedo_color = Color(0.4, 0.8, 1.0, 0.9)
				material.emission = Color(0.5, 0.8, 1.0)
			_:
				material.albedo_color = Color(0.8, 0.8, 0.2, 0.9)
				material.emission = Color(1.0, 1.0, 0.5)

		material.emission_enabled = true
		material.emission_energy_multiplier = 1.5
		mesh_instance.material_override = material

		minion.add_child(mesh_instance)

		# Add a small glow
		var light = OmniLight3D.new()
		light.light_energy = 0.8
		light.omni_range = 2.0
		light.light_color = material.emission
		minion.add_child(light)

	elif minion_type == "turret":
		# Create a stationary turret (cone/pyramid shape)
		var mesh_instance = MeshInstance3D.new()
		var cone = CylinderMesh.new()
		cone.top_radius = 0.1
		cone.bottom_radius = 0.4
		cone.height = 0.8
		mesh_instance.mesh = cone

		# Color based on ability type
		var material = StandardMaterial3D.new()
		match ability_type:
			"fireball":
				material.albedo_color = Color(0.8, 0.3, 0.1)
				material.emission = Color(1.0, 0.4, 0.0)
			"frostbolt":
				material.albedo_color = Color(0.3, 0.6, 0.9)
				material.emission = Color(0.4, 0.7, 1.0)
			_:
				material.albedo_color = Color(0.7, 0.7, 0.2)
				material.emission = Color(0.9, 0.9, 0.4)

		material.emission_enabled = true
		material.emission_energy_multiplier = 2.0
		material.metallic = 0.6
		mesh_instance.material_override = material

		minion.add_child(mesh_instance)

		# Add a glow
		var light = OmniLight3D.new()
		light.light_energy = 1.0
		light.omni_range = 3.0
		light.light_color = material.emission
		minion.add_child(light)

	return minion

func _update_minion_state(minion: Node3D, state: Dictionary) -> void:
	# Update position
	var server_pos = state.get("position", {})
	var target_position = Vector3(
		server_pos.get("x", 0.0),
		server_pos.get("y", 0.5),  # Raise minions slightly above ground
		server_pos.get("z", 0.0)
	)

	# Smooth interpolation for minion position
	minion.global_position = minion.global_position.lerp(target_position, 0.3)

	# For pets, add a bobbing animation
	var minion_type = state.get("type", "pet")
	if minion_type == "pet":
		var time = Time.get_ticks_msec() / 1000.0
		minion.position.y = target_position.y + sin(time * 3.0) * 0.1  # Bob up and down

func _create_ground_item(ground_item_data: Dictionary) -> Node3D:
	var ground_item = Node3D.new()
	ground_item.set_script(ground_item_script)

	# Set item data
	ground_item.item_id = ground_item_data.get("id", "")
	ground_item.item_data = ground_item_data.get("item", {})

	# Set position (use position, not global_position, since node isn't in tree yet)
	var pos_data = ground_item_data.get("position", {})
	ground_item.position = Vector3(
		pos_data.get("x", 0.0),
		pos_data.get("y", 0.5),
		pos_data.get("z", 0.0)
	)

	return ground_item

func _on_disconnected() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _setup_navigation_mesh() -> void:
	var nav_region = NavigationRegion3D.new()
	add_child(nav_region)

	var nav_mesh = NavigationMesh.new()
	nav_mesh.agent_radius = 0.5
	nav_mesh.agent_height = 1.8
	nav_mesh.cell_size = 0.25
	nav_mesh.cell_height = 0.25  # Match cell_size to avoid rasterization errors

	# Create single polygon covering ground
	var vertices = PackedVector3Array([
		Vector3(-50, 0, -50),
		Vector3(50, 0, -50),
		Vector3(50, 0, 50),
		Vector3(-50, 0, 50)
	])

	# Set vertices first, then add polygon using indices
	nav_mesh.set_vertices(vertices)
	nav_mesh.add_polygon(PackedInt32Array([0, 1, 2, 3]))
	nav_region.navigation_mesh = nav_mesh

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			# If inventory has an item on cursor, drop it on the ground instead of moving
			if inventory_panel and inventory_panel.has_held_item():
				inventory_panel.drop_held_item()
				get_viewport().set_input_as_handled()
				return

			if is_instance_valid(local_player):
				_handle_ground_click(event.position)
				get_viewport().set_input_as_handled()

func _handle_ground_click(screen_pos: Vector2) -> void:
	var from = camera.project_ray_origin(screen_pos)
	var to = from + camera.project_ray_normal(screen_pos) * 1000.0

	var space_state = get_world_3d().direct_space_state

	# First, check for ground items (Layer 5, bit 4) - raycast against areas
	var item_query = PhysicsRayQueryParameters3D.create(from, to)
	item_query.collision_mask = 1 << 4  # Layer 5: Items
	item_query.collide_with_areas = true
	item_query.collide_with_bodies = false

	var item_result = space_state.intersect_ray(item_query)
	if item_result:
		# Walk up from the Area3D collider to find the ground_item node
		var node = item_result.collider
		while node:
			if "item_id" in node and node.item_id != "":
				request_pickup(node.item_id, node.global_position)
				return
			node = node.get_parent()

	# No item hit - check for ground (Layer 4, bit 3)
	var ground_query = PhysicsRayQueryParameters3D.create(from, to)
	ground_query.collision_mask = 1 << 3  # Layer 4: Environment

	var result = space_state.intersect_ray(ground_query)
	if result:
		local_player.set_move_target(result.position)
		_show_click_indicator(result.position)

func _setup_cursor_indicator() -> void:
	cursor_indicator = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 0.15
	sphere.height = 0.3
	cursor_indicator.mesh = sphere

	var material = StandardMaterial3D.new()
	material.albedo_color = Color(0.9, 0.9, 0.9, 0.6)
	material.emission_enabled = true
	material.emission = Color(1.0, 1.0, 1.0)
	material.emission_energy_multiplier = 4.0
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	cursor_indicator.material_override = material

	var light = OmniLight3D.new()
	light.light_color = Color(1.0, 1.0, 1.0)
	light.light_energy = 0.5
	light.omni_range = 2.0
	cursor_indicator.add_child(light)

	cursor_indicator.visible = false
	add_child(cursor_indicator)

func _update_cursor_indicator() -> void:
	if not camera or not cursor_indicator:
		return

	var mouse_pos = get_viewport().get_mouse_position()
	var from = camera.project_ray_origin(mouse_pos)
	var to = from + camera.project_ray_normal(mouse_pos) * 1000.0

	var space_state = get_world_3d().direct_space_state
	var query = PhysicsRayQueryParameters3D.create(from, to)
	query.collision_mask = 1 << 3  # Layer 4: Environment

	var result = space_state.intersect_ray(query)
	if result:
		cursor_indicator.global_position = result.position + Vector3(0, 0.05, 0)
		cursor_indicator.visible = true
	else:
		cursor_indicator.visible = false

func _show_click_indicator(pos: Vector3) -> void:
	var indicator = click_indicator_scene.instantiate()
	add_child(indicator)
	indicator.global_position = pos

func _process(delta: float) -> void:
	_update_cursor_indicator()

	if is_instance_valid(local_player):
		# Update camera with deadzone and separation
		_update_camera_with_deadzone(delta)

		# Check if we've reached a pending pickup target
		if pending_pickup_target != "":
			var distance = local_player.global_position.distance_to(pending_pickup_position)
			if distance <= PICKUP_RANGE:
				_send_pickup_request(pending_pickup_target)
				pending_pickup_target = ""
