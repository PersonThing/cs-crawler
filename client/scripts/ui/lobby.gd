extends Control
## Lobby UI - handles game list, game creation, and lobby chat

@onready var games_list: ItemList = $MainContainer/LeftPanel/GamesList
@onready var status_label: Label = $MainContainer/LeftPanel/StatusLabel
@onready var chat_log: RichTextLabel = $MainContainer/RightPanel/ChatLog
@onready var chat_input: LineEdit = $MainContainer/RightPanel/ChatInputContainer/ChatInput
@onready var create_dialog: Window = $CreateGameDialog
@onready var name_input: LineEdit = $CreateGameDialog/VBoxContainer/NameInput
@onready var visibility_option: OptionButton = $CreateGameDialog/VBoxContainer/VisibilityOption
@onready var max_players_spinbox: SpinBox = $CreateGameDialog/VBoxContainer/MaxPlayersSpinBox

var games: Array = []
var selected_game_id: String = ""

func _ready() -> void:
	NetworkManager.message_received.connect(_on_message_received)
	NetworkManager.disconnected_from_server.connect(_on_disconnected)

	games_list.item_selected.connect(_on_game_selected)

	# Request game list on load
	_request_game_list()

	# Add welcome message to chat
	_add_system_message("Welcome to the lobby, %s!" % GameManager.username)

func _request_game_list() -> void:
	NetworkManager.send_message({
		"type": "list_games"
	})

func _on_refresh_pressed() -> void:
	_request_game_list()
	status_label.text = "Refreshing game list..."

func _on_game_selected(index: int) -> void:
	if index >= 0 and index < games.size():
		selected_game_id = games[index].get("id", "")

func _on_join_pressed() -> void:
	if selected_game_id.is_empty():
		status_label.text = "Please select a game to join"
		return

	# Find the selected game
	var game = null
	for g in games:
		if g.get("id", "") == selected_game_id:
			game = g
			break

	if game == null:
		status_label.text = "Game not found"
		return

	var visibility = game.get("visibility", "public")

	if visibility == "private":
		# Request to join private game
		NetworkManager.send_message({
			"type": "request_join",
			"gameID": selected_game_id
		})
		status_label.text = "Requesting to join..."
	else:
		# Join public game directly
		NetworkManager.send_message({
			"type": "join_game",
			"gameID": selected_game_id
		})
		status_label.text = "Joining game..."

func _on_create_pressed() -> void:
	# Create game directly with player name, public, 8 players
	var game_name = "%s's game" % GameManager.username

	NetworkManager.send_message({
		"type": "create_game",
		"name": game_name,
		"visibility": "public",
		"maxPlayers": 8
	})

	status_label.text = "Creating game..."

func _on_disconnect_pressed() -> void:
	NetworkManager.disconnect_from_server()
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _on_send_chat_pressed() -> void:
	_send_chat_message()

func _on_chat_submitted(_text: String) -> void:
	_send_chat_message()

func _send_chat_message() -> void:
	var message = chat_input.text.strip_edges()
	if message.is_empty():
		return

	NetworkManager.send_message({
		"type": "chat",
		"content": message,
		"channel": "lobby"
	})

	chat_input.text = ""

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")

	match msg_type:
		"game_list":
			_handle_game_list(message)
		"game_created":
			_handle_game_created(message)
		"joined":
			_handle_joined(message)
		"join_request_sent":
			_handle_join_request_sent(message)
		"join_request_response":
			_handle_join_request_response(message)
		"chat_message":
			_handle_chat_message(message)
		"error":
			_handle_error(message)
		"level_data":
			# Store level data for when we transition to game world
			GameManager.pending_level_data = message

func _handle_game_list(message: Dictionary) -> void:
	games = message.get("games", [])
	games_list.clear()

	for game in games:
		var name = game.get("name", "Unknown")
		var current = game.get("currentCount", 0)
		var max_p = game.get("maxPlayers", 4)
		var visibility = game.get("visibility", "public")
		var host = game.get("hostName", "Unknown")

		var display = "%s (%d/%d) - %s [%s]" % [name, current, max_p, host, visibility]
		games_list.add_item(display)

	status_label.text = "Found %d games" % games.size()

func _handle_game_created(message: Dictionary) -> void:
	# The server sends the game object under "game" key
	var game_data = message.get("game", {})
	var game_id = game_data.get("id", "")

	if game_id.is_empty():
		status_label.text = "Error: Game created but no ID returned"
		return

	status_label.text = "Game created! Joining..."

	# Auto-join the created game
	NetworkManager.send_message({
		"type": "join_game",
		"gameID": game_id
	})

func _handle_joined(message: Dictionary) -> void:
	var player_id = message.get("playerID", "")
	GameManager.local_player_id = player_id
	print("[LOBBY] Joined game, player ID: ", player_id)

	# Switch to game world
	get_tree().change_scene_to_file("res://scenes/game_world.tscn")

func _handle_join_request_sent(message: Dictionary) -> void:
	status_label.text = "Join request sent. Waiting for host approval..."

func _handle_join_request_response(message: Dictionary) -> void:
	var approved = message.get("approved", false)
	if approved:
		status_label.text = "Join approved! Joining game..."
		var game_id = message.get("gameID", "")
		NetworkManager.send_message({
			"type": "join_game",
			"gameID": game_id
		})
	else:
		status_label.text = "Join request denied by host"

func _handle_chat_message(message: Dictionary) -> void:
	var sender = message.get("senderName", "Unknown")
	var content = message.get("content", "")
	var msg_type = message.get("chatType", "normal")

	match msg_type:
		"system":
			_add_system_message(content)
		"whisper":
			_add_whisper_message(sender, content)
		_:
			_add_chat_message(sender, content)

func _handle_error(message: Dictionary) -> void:
	var error_msg = message.get("message", "Unknown error")
	status_label.text = "Error: " + error_msg

func _add_chat_message(sender: String, content: String) -> void:
	chat_log.append_text("[color=cyan]%s:[/color] %s\n" % [sender, content])

func _add_system_message(content: String) -> void:
	chat_log.append_text("[color=yellow][System] %s[/color]\n" % content)

func _add_whisper_message(sender: String, content: String) -> void:
	chat_log.append_text("[color=magenta][Whisper from %s] %s[/color]\n" % [sender, content])

func _on_disconnected() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")
