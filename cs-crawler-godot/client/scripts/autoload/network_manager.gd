extends Node
## Network communication manager
## Handles WebSocket connection to game server

signal connected_to_server()
signal disconnected_from_server()
signal message_received(message: Dictionary)
signal connection_error(error: String)

const SERVER_URL = "ws://localhost:7000/ws"

var _client: WebSocketPeer = null
var _connected: bool = false

func _ready() -> void:
	print("NetworkManager initialized")
	set_process(false)

func connect_to_server(url: String = SERVER_URL) -> void:
	if _connected:
		print("Already connected to server")
		return

	_client = WebSocketPeer.new()
	var err = _client.connect_to_url(url)

	if err != OK:
		connection_error.emit("Failed to initiate connection: " + str(err))
		return

	print("Connecting to server: ", url)
	GameManager.set_game_state(GameManager.GameState.CONNECTING)
	set_process(true)

func disconnect_from_server() -> void:
	if _client:
		_client.close()
		_client = null
	_connected = false
	set_process(false)
	GameManager.set_game_state(GameManager.GameState.DISCONNECTED)
	disconnected_from_server.emit()
	print("Disconnected from server")

func send_message(message: Dictionary) -> void:
	if not _connected:
		push_error("Cannot send message: not connected to server")
		return

	var json_string = JSON.stringify(message)
	var err = _client.send_text(json_string)

	if err != OK:
		push_error("Failed to send message: " + str(err))

func _process(_delta: float) -> void:
	if not _client:
		return

	_client.poll()
	var state = _client.get_ready_state()

	match state:
		WebSocketPeer.STATE_OPEN:
			if not _connected:
				_connected = true
				GameManager.set_game_state(GameManager.GameState.LOBBY)
				connected_to_server.emit()
				print("Connected to server")

			# Process incoming messages
			while _client.get_available_packet_count() > 0:
				var packet = _client.get_packet()
				var json_string = packet.get_string_from_utf8()
				var json = JSON.new()
				var parse_result = json.parse(json_string)

				if parse_result == OK:
					var message = json.data
					message_received.emit(message)
				else:
					push_error("Failed to parse JSON: " + json_string)

		WebSocketPeer.STATE_CLOSING:
			pass

		WebSocketPeer.STATE_CLOSED:
			var close_code = _client.get_close_code()
			var close_reason = _client.get_close_reason()
			print("WebSocket closed with code: ", close_code, ", reason: ", close_reason)
			disconnect_from_server()
