extends Control
## Main menu UI - handles connection to server

@onready var username_input: LineEdit = $VBoxContainer/UsernameInput
@onready var connect_button: Button = $VBoxContainer/ConnectButton
@onready var status_label: Label = $VBoxContainer/Status

func _ready() -> void:
	NetworkManager.connected_to_server.connect(_on_connected)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)
	NetworkManager.connection_error.connect(_on_connection_error)
	NetworkManager.message_received.connect(_on_message_received)

	# Set default username
	username_input.text = "Player%d" % randi_range(1000, 9999)

func _on_connect_pressed() -> void:
	var username = username_input.text.strip_edges()

	if username.is_empty():
		status_label.text = "Please enter a username"
		return

	status_label.text = "Connecting..."
	connect_button.disabled = true

	NetworkManager.connect_to_server()

func _on_connected() -> void:
	status_label.text = "Connected! Joining game..."

	# Send join message
	NetworkManager.send_message({
		"type": "join",
		"username": username_input.text,
		"worldID": "default"
	})

func _on_disconnected() -> void:
	status_label.text = "Disconnected"
	connect_button.disabled = false

func _on_connection_error(error: String) -> void:
	status_label.text = "Error: " + error
	connect_button.disabled = false

func _on_message_received(message: Dictionary) -> void:
	if message.get("type") == "joined":
		# Store player ID in GameManager
		var player_id = message.get("playerID", "")
		GameManager.local_player_id = player_id
		print("[MAIN_MENU] Received joined message, player ID: ", player_id)

		# Successfully joined, switch to game scene
		get_tree().change_scene_to_file("res://scenes/game_world.tscn")
