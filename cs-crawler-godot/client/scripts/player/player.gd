extends CharacterBody3D
## Player controller with client prediction

var player_id: String = ""
var is_local: bool = false
var move_speed: float = 5.0

# Client prediction
var input_sequence: int = 0
var pending_inputs: Array = []

# Navigation
var navigation_agent: NavigationAgent3D = null
var move_target: Vector3 = Vector3.ZERO
var is_following_path: bool = false

# Health
var current_health: float = 100.0
var max_health: float = 100.0

# Damage feedback
signal health_changed(current: float, maximum: float)
signal damage_taken(amount: float, damage_type: String)

# Ability cooldowns (client-side tracking for hold-to-cast)
var ability_cooldowns: Dictionary = {
	"fireball": 0.0,
	"frostbolt": 0.0,
	"lightning": 0.0,
	"basic_attack": 0.0
}
var ability_cooldown_times: Dictionary = {}  # Loaded from config

func _ready() -> void:
	print("[PLAYER] _ready called - is_local: ", is_local, " player_id: ", player_id)
	if is_local:
		_setup_navigation()
		_load_ability_configs()
		print("[PLAYER] Navigation setup complete for local player")

		# Connect to network messages for ability feedback
		NetworkManager.message_received.connect(_on_message_received)

func _load_ability_configs() -> void:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if not config_loader:
		push_warning("[PLAYER] ConfigLoader not found, using defaults")
		ability_cooldown_times["fireball"] = 0.2
		ability_cooldown_times["frostbolt"] = 0.8
		ability_cooldown_times["lightning"] = 1.0
		ability_cooldown_times["basic_attack"] = 0.3
		return

	# Load cooldowns from config for all abilities
	var ability_types = ["fireball", "frostbolt", "lightning", "basic_attack"]
	for ability_type in ability_types:
		var ability_config = config_loader.get_ability(ability_type)
		if ability_config and ability_config.has("cooldown"):
			ability_cooldown_times[ability_type] = ability_config["cooldown"]
			print("[PLAYER] Loaded %s cooldown: %s" % [ability_type, ability_config["cooldown"]])

func _on_message_received(message: Dictionary) -> void:
	if not is_local:
		return

	var msg_type = message.get("type", "")

	match msg_type:
		"ability_cast":
			_on_ability_cast_confirmed(message)
		"ability_failed":
			_on_ability_failed(message)

func _on_ability_cast_confirmed(message: Dictionary) -> void:
	var player_id_msg = message.get("playerID", "")
	if player_id_msg != player_id:
		return  # Not our ability

	var ability_type = message.get("abilityType", "")

	# Reset cooldown to full (server confirmed the cast)
	if ability_cooldowns.has(ability_type):
		ability_cooldowns[ability_type] = ability_cooldown_times.get(ability_type, 1.0)

func _on_ability_failed(message: Dictionary) -> void:
	# Server rejected the ability cast, reset cooldown to allow retry
	var ability_type = message.get("ability", "")
	if ability_cooldowns.has(ability_type):
		ability_cooldowns[ability_type] = 0.0

func _setup_navigation() -> void:
	navigation_agent = NavigationAgent3D.new()
	add_child(navigation_agent)

	navigation_agent.path_desired_distance = 0.5
	navigation_agent.target_desired_distance = 0.3
	navigation_agent.radius = 0.4
	navigation_agent.height = 1.8
	navigation_agent.max_speed = move_speed
	navigation_agent.avoidance_enabled = false  # Enable in Phase 3

	navigation_agent.navigation_finished.connect(_on_navigation_finished)
	navigation_agent.target_reached.connect(_on_target_reached)

func _on_navigation_finished() -> void:
	is_following_path = false
	_send_move_input(Vector3.ZERO)

func _on_target_reached() -> void:
	is_following_path = false

var _move_target_seq: int = 0

func set_move_target(target: Vector3) -> void:
	move_target = target
	_move_target_seq += 1
	var seq = _move_target_seq
	await get_tree().process_frame  # Wait for NavigationServer
	if seq != _move_target_seq:
		return  # A newer target was set, skip this one
	is_following_path = true
	navigation_agent.target_position = target

var _debug_frame_count: int = 0

func _physics_process(delta: float) -> void:
	_debug_frame_count += 1
	if _debug_frame_count == 60 and is_local:  # Log once per second at 60fps
		print("[PLAYER] _physics_process running (local player)")
		_debug_frame_count = 0

	if is_local:
		_handle_local_movement(delta)
		_handle_abilities(delta)
	else:
		_handle_remote_movement(delta)

var _last_input_log: int = 0

func _handle_local_movement(delta: float) -> void:
	# Check WASD input first (takes priority)
	var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_back")

	# Debug log occasionally
	_last_input_log += 1
	if _last_input_log >= 120:  # Every 2 seconds
		print("[PLAYER] Input check - dir length: ", input_dir.length(), " is_following_path: ", is_following_path)
		_last_input_log = 0

	if input_dir.length() > 0.1:
		# Manual control - cancel pathfinding
		is_following_path = false
		var direction = Vector3(input_dir.x, 0, input_dir.y).normalized()
		print("[PLAYER] WASD movement: ", direction)
		_apply_movement(direction, delta)
		_send_move_input(direction)

	elif is_following_path:
		print("[PLAYER] Following nav path")
		_follow_navigation_path(delta)

	else:
		# Stop movement completely
		velocity.x = 0
		velocity.z = 0
		move_and_slide()
		_send_move_input(Vector3.ZERO)

func _follow_navigation_path(_delta: float) -> void:
	if navigation_agent.is_navigation_finished():
		is_following_path = false
		_send_move_input(Vector3.ZERO)
		return

	var next_position = navigation_agent.get_next_path_position()
	var direction = (next_position - global_position).normalized()
	direction.y = 0  # XZ plane only

	if direction.length() > 0.1:
		_apply_movement(direction.normalized(), _delta)
		_send_move_input(direction.normalized())

func _apply_movement(direction: Vector3, delta: float) -> void:
	if direction.length() > 0.1:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed

		# Rotate player to face movement direction (subtract PI/2 to correct model orientation)
		var target_rotation = atan2(direction.x, direction.z) - PI / 2.0
		rotation.y = lerp_angle(rotation.y, target_rotation, delta * 10.0)
	else:
		velocity.x = 0
		velocity.z = 0
	move_and_slide()

func _send_move_input(direction: Vector3) -> void:
	var msg = {
		"type": "move",
		"velocity": {
			"x": direction.x,
			"y": 0.0,
			"z": direction.z
		},
		"rotation": rotation.y,
		"timestamp": Time.get_ticks_msec()
	}

	NetworkManager.send_message(msg)

	# Store for reconciliation
	input_sequence += 1
	pending_inputs.append({
		"sequence": input_sequence,
		"velocity": direction,
		"timestamp": Time.get_ticks_msec()
	})

	# Keep only recent inputs
	if pending_inputs.size() > 30:
		pending_inputs.pop_front()

func _handle_remote_movement(_delta: float) -> void:
	# Remote players are interpolated based on server state
	# Position is set in apply_server_state()
	pass

func _handle_abilities(delta: float) -> void:
	# Update cooldowns
	for ability_type in ability_cooldowns.keys():
		if ability_cooldowns[ability_type] > 0:
			ability_cooldowns[ability_type] -= delta

	# Cast abilities with keys 1-4 (hold to continuously cast)
	if Input.is_action_pressed("ability_1"):
		_try_cast_ability("fireball")
	elif Input.is_action_pressed("ability_2"):
		_try_cast_ability("frostbolt")
	elif Input.is_action_pressed("ability_3"):
		_try_cast_ability("lightning")
	elif Input.is_action_pressed("ability_4"):
		_try_cast_ability("basic_attack")

func _try_cast_ability(ability_type: String) -> void:
	# Check client-side cooldown
	if ability_cooldowns.get(ability_type, 0.0) > 0:
		return  # Still on cooldown

	# Cast the ability
	_cast_ability(ability_type)

	# Start cooldown timer
	ability_cooldowns[ability_type] = ability_cooldown_times.get(ability_type, 1.0)

func _cast_ability(ability_type: String) -> void:
	# Calculate direction from mouse position (raycast to ground)
	var mouse_pos = get_viewport().get_mouse_position()
	var camera = get_viewport().get_camera_3d()

	if not camera:
		return

	var from = camera.project_ray_origin(mouse_pos)
	var to = from + camera.project_ray_normal(mouse_pos) * 1000.0

	var space_state = get_world_3d().direct_space_state
	var query = PhysicsRayQueryParameters3D.create(from, to)
	query.collision_mask = 1 << 3  # Layer 4: Environment

	var result = space_state.intersect_ray(query)
	var direction: Vector3

	if result:
		# Aim towards mouse position on ground
		direction = (result.position - global_position).normalized()
	else:
		# Default to forward direction
		direction = -transform.basis.z

	# Rotate player to face cast direction (subtract PI/2 to correct model orientation)
	var target_rotation = atan2(direction.x, direction.z) - PI / 2.0
	rotation.y = target_rotation  # Instant rotation for ability casting

	# Send ability use message to server
	var msg = {
		"type": "use_ability",
		"abilityType": ability_type,
		"direction": {
			"x": direction.x,
			"y": direction.y,
			"z": direction.z
		},
		"timestamp": Time.get_ticks_msec()
	}

	NetworkManager.send_message(msg)
	print("[PLAYER] Cast ability: ", ability_type, " in direction: ", direction)

func apply_server_state(state: Dictionary) -> void:
	var server_pos = state.get("position", {})
	var target_position = Vector3(
		server_pos.get("x", 0.0),
		server_pos.get("y", 0.0),
		server_pos.get("z", 0.0)
	)

	if is_local:
		# Server reconciliation for local player
		# Only correct if difference is significant
		var pos_error = global_position.distance_to(target_position)
		if pos_error > 0.5:
			print("[PLAYER] Server correction - Current: ", global_position, " Server: ", target_position, " Error: ", pos_error)
			global_position = global_position.lerp(target_position, 0.3)
		else:
			print("[PLAYER] Server state - Pos: ", target_position, " (no correction needed)")
	else:
		# Smooth interpolation for remote players
		global_position = global_position.lerp(target_position, 0.2)

		# Apply rotation for remote players
		if state.has("rotation"):
			var server_rotation = state.get("rotation", 0.0)
			rotation.y = server_rotation

	# Update health
	if state.has("health"):
		var new_health = state.get("health", current_health)
		var old_health = current_health
		current_health = new_health

		# Emit damage taken signal if health decreased
		if new_health < old_health:
			var damage = old_health - new_health
			damage_taken.emit(damage, "physical")

		# Emit health changed signal
		health_changed.emit(current_health, max_health)

	if state.has("maxHealth"):
		max_health = state.get("maxHealth", max_health)
		health_changed.emit(current_health, max_health)
