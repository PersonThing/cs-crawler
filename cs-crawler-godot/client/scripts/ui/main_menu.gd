extends Control
## Main menu UI - handles connection to server

@onready var username_input: LineEdit = $VBoxContainer/UsernameInput
@onready var server_ip_input: LineEdit = null  # Will be created dynamically
@onready var connect_button: Button = $VBoxContainer/ConnectButton
@onready var status_label: Label = $VBoxContainer/Status

const DEFAULT_SERVER_IP = "localhost:7000"
const SETTINGS_FILE = "user://server_settings.cfg"

var server_ip: String = DEFAULT_SERVER_IP

func _ready() -> void:
	NetworkManager.connected_to_server.connect(_on_connected)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)
	NetworkManager.connection_error.connect(_on_connection_error)
	NetworkManager.message_received.connect(_on_message_received)

	# Create server IP input if it doesn't exist
	_setup_server_ip_input()

	# Load saved settings
	_load_settings()

	# Set default username
	username_input.text = "Player%d" % randi_range(1000, 9999)

func _setup_server_ip_input() -> void:
	# Check if server IP input already exists
	if not has_node("VBoxContainer/ServerIPInput"):
		# Find the VBoxContainer
		var vbox = get_node("VBoxContainer")

		# Create label for server IP
		var ip_label = Label.new()
		ip_label.name = "ServerIPLabel"
		ip_label.text = "Server IP:Port"

		# Create server IP input
		server_ip_input = LineEdit.new()
		server_ip_input.name = "ServerIPInput"
		server_ip_input.placeholder_text = "localhost:7000 or 192.168.1.x:7000"
		server_ip_input.text = server_ip

		# Insert before username input (index 0)
		vbox.add_child(ip_label)
		vbox.move_child(ip_label, 0)
		vbox.add_child(server_ip_input)
		vbox.move_child(server_ip_input, 1)
	else:
		server_ip_input = get_node("VBoxContainer/ServerIPInput")
		server_ip_input.text = server_ip

func _load_settings() -> void:
	var config = ConfigFile.new()
	var err = config.load(SETTINGS_FILE)

	if err == OK:
		server_ip = config.get_value("network", "server_ip", DEFAULT_SERVER_IP)
		if server_ip_input:
			server_ip_input.text = server_ip
		print("[MAIN_MENU] Loaded server IP: ", server_ip)
	else:
		print("[MAIN_MENU] No saved settings, using default: ", DEFAULT_SERVER_IP)

func _save_settings() -> void:
	var config = ConfigFile.new()
	config.set_value("network", "server_ip", server_ip)
	config.save(SETTINGS_FILE)
	print("[MAIN_MENU] Saved server IP: ", server_ip)

func _on_connect_pressed() -> void:
	var username = username_input.text.strip_edges()

	if username.is_empty():
		status_label.text = "Please enter a username"
		return

	# Get server IP from input
	if server_ip_input:
		server_ip = server_ip_input.text.strip_edges()
		if server_ip.is_empty():
			server_ip = DEFAULT_SERVER_IP
			server_ip_input.text = server_ip

	# Save settings
	_save_settings()

	# Build WebSocket URL
	var ws_url = "ws://" + server_ip + "/ws"

	status_label.text = "Connecting to " + server_ip + "..."
	connect_button.disabled = true

	print("[MAIN_MENU] Connecting to: ", ws_url)
	NetworkManager.connect_to_server(ws_url)

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
