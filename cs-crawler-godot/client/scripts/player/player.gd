extends CharacterBody3D
## Player controller with client prediction

const RiggedPlayerModel = preload("res://scripts/player/rigged_player_model.gd")
const LOCAL_PLAYER_COLOR = Color(0.0, 0.67, 1.0)
const REMOTE_PLAYER_COLOR = Color(0.0, 0.85, 0.3)

var player_id: String = ""
var is_local: bool = false
var move_speed: float = 5.0

# Rigged model
var rigged_model: Node3D = null

# 3D Health bar
var health_bar_3d: Node3D = null
var health_bar_fill: MeshInstance3D = null

# 3D Skill bar (for VR)
var skill_bar_3d: Node3D = null
var skill_bar_buttons: Array[MeshInstance3D] = []
var skill_bar_cooldown_overlays: Array[MeshInstance3D] = []
var skill_bar_labels: Array[Label3D] = []
const ABILITY_COLORS_3D = {
	"fireball": Color(1.0, 0.5, 0.2),
	"frostbolt": Color(0.5, 0.8, 1.0),
	"lightning": Color(1.0, 1.0, 0.3),
	"basic_attack": Color(0.9, 0.2, 0.2),
}

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
	_setup_rigged_model()
	_setup_3d_health_bar()
	if is_local:
		_setup_navigation()
		_load_ability_configs()
		_setup_3d_skill_bar()
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

func _setup_rigged_model() -> void:
	# Remove the wozard model if present
	var wozard = get_node_or_null("wozard")
	if wozard:
		wozard.queue_free()

	# Remove the placeholder MeshInstance3D
	var placeholder = get_node_or_null("MeshInstance3D")
	if placeholder:
		placeholder.queue_free()

	# Create the rigged cube humanoid
	rigged_model = RiggedPlayerModel.new()
	rigged_model.name = "RiggedModel"
	var color = LOCAL_PLAYER_COLOR if is_local else REMOTE_PLAYER_COLOR
	rigged_model.setup(color)
	# Rotate to match wozard orientation (model faces -Z, wozard faced +X)
	rigged_model.rotation.y = -PI / 2.0
	add_child(rigged_model)

func _setup_3d_health_bar() -> void:
	# Create 3D health bar attached to player
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

	# Health fill bar (green for player)
	health_bar_fill = MeshInstance3D.new()
	health_bar_fill.name = "HealthFill"
	var fill_box = BoxMesh.new()
	fill_box.size = Vector3(1.1, 0.1, 0.06)
	health_bar_fill.mesh = fill_box
	health_bar_fill.position = Vector3(0, 0, 0.01)
	var fill_mat = StandardMaterial3D.new()
	fill_mat.albedo_color = Color(0.1, 0.8, 0.1)  # Green for player
	fill_mat.no_depth_test = true  # Render on top of everything
	fill_mat.render_priority = 11
	health_bar_fill.material_override = fill_mat
	health_bar_3d.add_child(health_bar_fill)

func _update_3d_health_bar() -> void:
	if not health_bar_fill or not health_bar_3d:
		return

	var health_percent = current_health / max_health if max_health > 0 else 1.0
	health_bar_fill.scale.x = health_percent
	health_bar_fill.position.x = -0.55 * (1.0 - health_percent)

	# Update color based on health
	var fill_mat = health_bar_fill.material_override as StandardMaterial3D
	if fill_mat:
		if health_percent > 0.5:
			fill_mat.albedo_color = Color(0.1, 0.8, 0.1)  # Green
		elif health_percent > 0.25:
			fill_mat.albedo_color = Color(0.9, 0.7, 0.1)  # Yellow
		else:
			fill_mat.albedo_color = Color(0.9, 0.2, 0.2)  # Red

	# Billboard: only rotate around Y axis to face camera (keeps position fixed)
	var camera = get_viewport().get_camera_3d()
	if camera and health_bar_3d:
		var cam_pos = camera.global_position
		var bar_pos = health_bar_3d.global_position
		var direction = Vector2(cam_pos.x - bar_pos.x, cam_pos.z - bar_pos.z)
		health_bar_3d.rotation.y = atan2(direction.x, direction.y)

func _setup_3d_skill_bar() -> void:
	# Create 3D skill bar under the player (for VR mode)
	skill_bar_3d = Node3D.new()
	skill_bar_3d.name = "SkillBar3D"
	skill_bar_3d.position = Vector3(0, 0.1, -1.5)  # Under and in front of player
	add_child(skill_bar_3d)

	# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
	var ability_types = ["lightning", "basic_attack", "fireball", "frostbolt"]
	var vr_labels = ["X", "Y", "A", "B"]
	var button_size = 0.5
	var spacing = 0.1
	var total_width = (4 * button_size) + (3 * spacing)
	var start_x = -total_width / 2.0 + button_size / 2.0

	for i in range(4):
		var ability_type = ability_types[i]
		var x_pos = start_x + i * (button_size + spacing)

		# Create button background (dark box)
		var bg_mesh = MeshInstance3D.new()
		var bg_box = BoxMesh.new()
		bg_box.size = Vector3(button_size, button_size, 0.05)
		bg_mesh.mesh = bg_box
		bg_mesh.position = Vector3(x_pos, 0, 0)
		var bg_mat = StandardMaterial3D.new()
		bg_mat.albedo_color = Color(0.15, 0.15, 0.15, 0.9)
		bg_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		bg_mat.no_depth_test = true  # Render on top of everything
		bg_mat.render_priority = 20
		bg_mesh.material_override = bg_mat
		skill_bar_3d.add_child(bg_mesh)

		# Create ability icon (colored circle)
		var icon_mesh = MeshInstance3D.new()
		var sphere = SphereMesh.new()
		sphere.radius = button_size * 0.35
		sphere.height = button_size * 0.7
		icon_mesh.mesh = sphere
		icon_mesh.position = Vector3(x_pos, 0, 0.03)
		var icon_mat = StandardMaterial3D.new()
		icon_mat.albedo_color = ABILITY_COLORS_3D.get(ability_type, Color.WHITE)
		icon_mat.emission_enabled = true
		icon_mat.emission = ABILITY_COLORS_3D.get(ability_type, Color.WHITE)
		icon_mat.emission_energy_multiplier = 0.5
		icon_mat.no_depth_test = true  # Render on top of everything
		icon_mat.render_priority = 21
		icon_mesh.material_override = icon_mat
		skill_bar_3d.add_child(icon_mesh)
		skill_bar_buttons.append(icon_mesh)

		# Create cooldown overlay (dark box that shrinks from top)
		var cd_mesh = MeshInstance3D.new()
		var cd_box = BoxMesh.new()
		cd_box.size = Vector3(button_size * 0.9, button_size * 0.9, 0.06)
		cd_mesh.mesh = cd_box
		cd_mesh.position = Vector3(x_pos, 0, 0.04)
		cd_mesh.visible = false
		var cd_mat = StandardMaterial3D.new()
		cd_mat.albedo_color = Color(0, 0, 0, 0.7)
		cd_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		cd_mat.no_depth_test = true  # Render on top of everything
		cd_mat.render_priority = 22
		cd_mesh.material_override = cd_mat
		skill_bar_3d.add_child(cd_mesh)
		skill_bar_cooldown_overlays.append(cd_mesh)

		# Create keybind label (A, B, X, Y for VR or 1-4 for keyboard)
		var label = Label3D.new()
		label.text = vr_labels[i]  # Default to VR labels
		label.font_size = 64
		label.position = Vector3(x_pos, button_size * 0.3, 0.06)
		label.pixel_size = 0.003
		label.outline_size = 8
		label.modulate = Color(1, 1, 1, 0.9)
		label.no_depth_test = true  # Render on top of everything
		label.render_priority = 23
		skill_bar_3d.add_child(label)
		skill_bar_labels.append(label)

func _update_3d_skill_bar() -> void:
	if not skill_bar_3d or not is_local:
		return

	# Billboard: only rotate around Y axis to face camera (keeps position fixed)
	var camera = get_viewport().get_camera_3d()
	if camera:
		var cam_pos = camera.global_position
		var bar_pos = skill_bar_3d.global_position
		var direction = Vector2(cam_pos.x - bar_pos.x, cam_pos.z - bar_pos.z)
		skill_bar_3d.rotation.y = atan2(direction.x, direction.y)

	# Update cooldown overlays based on ability cooldowns
	# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
	var ability_types = ["lightning", "basic_attack", "fireball", "frostbolt"]
	for i in range(4):
		var ability_type = ability_types[i]
		var cooldown_remaining = ability_cooldowns.get(ability_type, 0.0)
		var max_cooldown = ability_cooldown_times.get(ability_type, 1.0)

		if cooldown_remaining > 0 and i < skill_bar_cooldown_overlays.size():
			var overlay = skill_bar_cooldown_overlays[i]
			overlay.visible = true
			# Scale overlay based on cooldown progress
			var progress = cooldown_remaining / max_cooldown
			overlay.scale.y = progress
		elif i < skill_bar_cooldown_overlays.size():
			skill_bar_cooldown_overlays[i].visible = false

	# Update labels based on VR mode
	# Order: 1 = X (Lightning), 2 = Y (Basic Attack), 3 = A (Fireball), 4 = B (Frostbolt)
	var game_world = get_node_or_null("/root/GameWorld")
	var is_vr = game_world and game_world.is_xr_active
	var labels_to_use = ["X", "Y", "A", "B"] if is_vr else ["1", "2", "3", "4"]
	for i in range(min(skill_bar_labels.size(), 4)):
		skill_bar_labels[i].text = labels_to_use[i]

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

	# Update 3D health bar billboard
	_update_3d_health_bar()

	# Update 3D skill bar (local player only)
	if is_local:
		_update_3d_skill_bar()

	if is_local:
		_handle_local_movement(delta)
		_handle_abilities(delta)
	else:
		_handle_remote_movement(delta)

	# Update rigged model walk animation
	if rigged_model:
		var is_moving = Vector2(velocity.x, velocity.z).length() > 0.1
		rigged_model.update_animation(is_moving, delta)

var _last_input_log: int = 0

func _handle_local_movement(delta: float) -> void:
	# Check WASD input first (takes priority)
	var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_back")

	# Also check VR joystick input from game world
	var game_world = get_node_or_null("/root/GameWorld")
	if game_world and "vr_joystick_input" in game_world:
		var vr_input: Vector2 = game_world.vr_joystick_input
		if vr_input.length() > input_dir.length():
			input_dir = vr_input

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
	# Order: 1 = X (Lightning), 2 = Y (Basic Attack), 3 = A (Fireball), 4 = B (Frostbolt)
	if Input.is_action_pressed("ability_1"):
		_try_cast_ability("lightning")
	elif Input.is_action_pressed("ability_2"):
		_try_cast_ability("basic_attack")
	elif Input.is_action_pressed("ability_3"):
		_try_cast_ability("fireball")
	elif Input.is_action_pressed("ability_4"):
		_try_cast_ability("frostbolt")

	# VR controller abilities: A, B (right hand), X, Y (left hand)
	var game_world = get_node_or_null("/root/GameWorld")
	if game_world and game_world.is_xr_active:
		var left = game_world.xr_left_controller
		var right = game_world.xr_right_controller
		if right:
			# Right A -> Fireball, Right B -> Frostbolt
			if right.is_button_pressed("ax_button"):
				_try_cast_ability("fireball")
			elif right.is_button_pressed("by_button"):
				_try_cast_ability("frostbolt")
		if left:
			# Left X -> Lightning, Left Y -> Basic Attack
			if left.is_button_pressed("ax_button"):
				_try_cast_ability("lightning")
			elif left.is_button_pressed("by_button"):
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
		_update_3d_health_bar()

	if state.has("maxHealth"):
		max_health = state.get("maxHealth", max_health)
		health_changed.emit(current_health, max_health)
		_update_3d_health_bar()
