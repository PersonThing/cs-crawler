extends Node3D
## Main game world - manages entities and game state

@onready var camera: Camera3D = $Camera3D
@onready var players_container: Node3D = $Players
@onready var enemies_container: Node3D = $Enemies
@onready var projectiles_container: Node3D = $Projectiles

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

var local_player: Node3D = null
var remote_players: Dictionary = {}
var enemies: Dictionary = {}
var projectiles: Dictionary = {}
var enemy_ui_manager: Control = null

func _ready() -> void:
	_load_camera_config()
	NetworkManager.message_received.connect(_on_message_received)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)
	_setup_navigation_mesh()
	_setup_enemy_ui_manager()
	_setup_ability_bar()

	# Check if we're already joined (main menu handled the join)
	if GameManager.local_player_id != "":
		print("[WORLD] Local player ID already set: ", GameManager.local_player_id)
		_spawn_local_player(GameManager.local_player_id)
	else:
		print("[WORLD] Waiting for joined message...")

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
			enemies_container.add_child(enemy)

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
			if enemy_ui_manager:
				enemy_ui_manager.unregister_enemy(eid)
			if enemies[eid]:
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

	# Handle damage events
	var damage_events = state.get("damageEvents", [])
	for damage_event in damage_events:
		_handle_damage_event(damage_event)

	# Handle death events
	var death_events = state.get("deathEvents", [])
	for death_event in death_events:
		_handle_death_event(death_event)

func _handle_ability_cast(message: Dictionary) -> void:
	var player_id = message.get("playerID", "")
	var ability_type = message.get("abilityType", "")

	print("[WORLD] Ability cast: ", ability_type, " by player ", player_id)

	# Projectile will be created by world_state update
	# This message is for immediate visual feedback

func _handle_damage_event(damage_event: Dictionary) -> void:
	var target_id = damage_event.get("targetID", "")
	var damage = damage_event.get("damage", 0.0)
	var damage_type = damage_event.get("type", "physical")

	# Apply damage to enemy if it exists
	if enemies.has(target_id):
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

	# Move camera to target position
	camera.global_position = camera.global_position.lerp(target_pos, delta * camera_follow_speed)

	# Camera rotation - fixed angle, looking at focus point
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

func _handle_death_event(death_event: Dictionary) -> void:
	var entity_id = death_event.get("entityID", "")
	var entity_type = death_event.get("entityType", "")

	print("[WORLD] Entity died: ", entity_id, " (", entity_type, ")")

	# Death animation is handled by the entity itself via server state

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

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			print("[WORLD] Mouse click detected at: ", event.position)
			if is_instance_valid(local_player):
				print("[WORLD] local_player exists, calling _handle_ground_click")
				_handle_ground_click(event.position)
			else:
				print("[WORLD] ERROR: local_player is null or freed!")

func _handle_ground_click(screen_pos: Vector2) -> void:
	var from = camera.project_ray_origin(screen_pos)
	var to = from + camera.project_ray_normal(screen_pos) * 1000.0

	print("[WORLD] Raycast from: ", from, " to: ", to)

	var space_state = get_world_3d().direct_space_state
	var query = PhysicsRayQueryParameters3D.create(from, to)
	query.collision_mask = 1 << 3  # Layer 4 (bit 3): Environment

	print("[WORLD] Raycast collision_mask: ", query.collision_mask)

	var result = space_state.intersect_ray(query)
	if result:
		print("[WORLD] Raycast hit at: ", result.position)
		local_player.set_move_target(result.position)
		_show_click_indicator(result.position)
	else:
		print("[WORLD] Raycast missed - no ground collision")

func _show_click_indicator(pos: Vector3) -> void:
	var indicator = click_indicator_scene.instantiate()
	add_child(indicator)
	indicator.global_position = pos

func _process(delta: float) -> void:
	if is_instance_valid(local_player):
		# Update camera with deadzone and separation
		_update_camera_with_deadzone(delta)
