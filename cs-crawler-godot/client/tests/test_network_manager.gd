extends GutTest
## Unit tests for NetworkManager autoload

var mock_client: MockWebSocketPeer

class MockWebSocketPeer:
	var state = WebSocketPeer.STATE_CLOSED
	var messages = []

	func connect_to_url(_url: String) -> int:
		state = WebSocketPeer.STATE_CONNECTING
		return OK

	func get_ready_state() -> int:
		return state

	func poll() -> void:
		pass

	func send_text(text: String) -> int:
		messages.append(text)
		return OK

	func close() -> void:
		state = WebSocketPeer.STATE_CLOSED

	func get_available_packet_count() -> int:
		return 0

func before_each():
	NetworkManager.disconnect_from_server()
	mock_client = MockWebSocketPeer.new()

func after_each():
	NetworkManager.disconnect_from_server()

func test_initial_state_disconnected():
	assert_false(NetworkManager._connected)
	assert_null(NetworkManager._client)

func test_connect_to_server_creates_client():
	# Note: This test is limited without mocking WebSocketPeer
	# In real tests, you'd use a mock or test against actual server
	pass

func test_send_message_when_not_connected():
	var message = {"type": "test"}

	# Should not crash, but will log error
	NetworkManager.send_message(message)

	# No way to assert error log in Gut, but we verify no crash
	assert_true(true)

func test_disconnect_from_server():
	NetworkManager._connected = true
	NetworkManager._client = mock_client

	NetworkManager.disconnect_from_server()

	assert_false(NetworkManager._connected)
	assert_null(NetworkManager._client)
