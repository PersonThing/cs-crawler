extends Node3D
## Main game world - manages entities and game state

@onready var camera: Camera3D = $Camera3D
@onready var players_container: Node3D = $Players
@onready var enemies_container: Node3D = $Enemies
@onready var projectiles_container: Node3D = $Projectiles

var player_scene = preload("res://scenes/player/player.tscn")
var click_indicator_scene = preload("res://scenes/ui/click_indicator.tscn")
var local_player: Node3D = null
var remote_players: Dictionary = {}

func _ready() -> void:
	NetworkManager.message_received.connect(_on_message_received)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)
	_setup_navigation_mesh()

	# Check if we're already joined (main menu handled the join)
	if GameManager.local_player_id != "":
		print("[WORLD] Local player ID already set: ", GameManager.local_player_id)
		_spawn_local_player(GameManager.local_player_id)
	else:
		print("[WORLD] Waiting for joined message...")

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")
	#print("[WORLD] Message received: ", msg_type)

	match msg_type:
		"joined":
			_handle_joined(message)
		"world_state":
			_handle_world_state(message)

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

	print("[WORLD] Spawned local player: ", player_id, " at position: ", local_player.global_position)
	print("[WORLD] local_player reference valid: ", local_player != null)

func _handle_world_state(state: Dictionary) -> void:
	var players_data = state.get("players", [])

	for player_data in players_data:
		var pid = player_data.get("id", "")

		if pid == GameManager.local_player_id:
			# Update local player from server (for reconciliation)
			if local_player:
				local_player.apply_server_state(player_data)
		else:
			# Update or create remote player
			if not remote_players.has(pid):
				var remote_player = player_scene.instantiate()
				remote_player.is_local = false
				remote_player.player_id = pid
				remote_players[pid] = remote_player
				players_container.add_child(remote_player)

			remote_players[pid].apply_server_state(player_data)

func _on_disconnected() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _setup_navigation_mesh() -> void:
	var nav_region = NavigationRegion3D.new()
	add_child(nav_region)

	var nav_mesh = NavigationMesh.new()
	nav_mesh.agent_radius = 0.5
	nav_mesh.agent_height = 1.8
	nav_mesh.cell_size = 0.25
	nav_mesh.cell_height = 0.2

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
			if local_player:
				print("[WORLD] local_player exists, calling _handle_ground_click")
				_handle_ground_click(event.position)
			else:
				print("[WORLD] ERROR: local_player is null!")

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
	if local_player:
		# Camera follows local player
		var target_pos = local_player.global_position + Vector3(0, 15, 15)
		camera.global_position = camera.global_position.lerp(target_pos, delta * 5.0)
		camera.look_at(local_player.global_position, Vector3.UP)
