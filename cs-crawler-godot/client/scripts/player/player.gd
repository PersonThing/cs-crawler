extends CharacterBody3D
## Player controller with client prediction

@onready var name_label: Label3D = $NameLabel

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

func _ready() -> void:
	print("[PLAYER] _ready called - is_local: ", is_local, " player_id: ", player_id)
	if is_local:
		name_label.text = "You"
		_setup_navigation()
		print("[PLAYER] Navigation setup complete for local player")
	else:
		name_label.text = "Player"

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

func set_move_target(target: Vector3) -> void:
	print("[PLAYER] Click-to-move target set: ", target)
	move_target = target
	await get_tree().process_frame  # Wait for NavigationServer
	is_following_path = true
	navigation_agent.target_position = target
	print("[PLAYER] Navigation target set, is_following_path: ", is_following_path)

var _debug_frame_count: int = 0

func _physics_process(delta: float) -> void:
	_debug_frame_count += 1
	if _debug_frame_count == 60 and is_local:  # Log once per second at 60fps
		print("[PLAYER] _physics_process running (local player)")
		_debug_frame_count = 0

	if is_local:
		_handle_local_movement(delta)
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
		# Decelerate to stop
		velocity.x = move_toward(velocity.x, 0, move_speed * delta * 5)
		velocity.z = move_toward(velocity.z, 0, move_speed * delta * 5)
		move_and_slide()

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

func _apply_movement(direction: Vector3, _delta: float) -> void:
	if direction.length() > 0.1:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed
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

	# Update other stats
	if state.has("health"):
		pass  # TODO: Update health bar
