extends Control
## In-game chat panel with message log and input

@onready var chat_container: VBoxContainer = null
@onready var chat_log: RichTextLabel = null
@onready var chat_input: LineEdit = null
@onready var send_button: Button = null

var is_chat_focused: bool = false
const MAX_MESSAGES: int = 100

func _ready() -> void:
	_setup_ui()
	NetworkManager.message_received.connect(_on_message_received)

func _setup_ui() -> void:
	# Main container - positioned at bottom left
	set_anchors_preset(PRESET_BOTTOM_LEFT)
	anchor_left = 0.0
	anchor_right = 0.0
	anchor_top = 1.0
	anchor_bottom = 1.0
	offset_left = 10
	offset_right = 400
	offset_top = -250
	offset_bottom = -10
	mouse_filter = MOUSE_FILTER_PASS

	# Background panel
	var bg = ColorRect.new()
	bg.name = "Background"
	bg.set_anchors_preset(PRESET_FULL_RECT)
	bg.color = Color(0.1, 0.1, 0.15, 0.7)
	bg.mouse_filter = MOUSE_FILTER_PASS
	add_child(bg)

	# VBox for layout
	chat_container = VBoxContainer.new()
	chat_container.name = "ChatContainer"
	chat_container.set_anchors_preset(PRESET_FULL_RECT)
	chat_container.offset_left = 5
	chat_container.offset_right = -5
	chat_container.offset_top = 5
	chat_container.offset_bottom = -5
	add_child(chat_container)

	# Chat log (rich text for colors)
	chat_log = RichTextLabel.new()
	chat_log.name = "ChatLog"
	chat_log.bbcode_enabled = true
	chat_log.scroll_following = true
	chat_log.size_flags_vertical = SIZE_EXPAND_FILL
	chat_log.mouse_filter = MOUSE_FILTER_PASS
	chat_container.add_child(chat_log)

	# Input container
	var input_container = HBoxContainer.new()
	input_container.name = "InputContainer"
	chat_container.add_child(input_container)

	# Chat input
	chat_input = LineEdit.new()
	chat_input.name = "ChatInput"
	chat_input.placeholder_text = "Press Enter to chat..."
	chat_input.size_flags_horizontal = SIZE_EXPAND_FILL
	chat_input.text_submitted.connect(_on_chat_submitted)
	chat_input.focus_entered.connect(_on_chat_focus_entered)
	chat_input.focus_exited.connect(_on_chat_focus_exited)
	input_container.add_child(chat_input)

	# Send button
	send_button = Button.new()
	send_button.name = "SendButton"
	send_button.text = "Send"
	send_button.pressed.connect(_on_send_pressed)
	input_container.add_child(send_button)

	# Add welcome message
	add_system_message("Press Enter to chat. Type /help for commands.")

func _input(event: InputEvent) -> void:
	# When chat is focused, consume ALL key events so they don't trigger game actions
	if is_chat_focused and event is InputEventKey:
		# Let Escape through to unfocus
		if event.pressed and event.keycode == KEY_ESCAPE:
			chat_input.release_focus()
		# Consume all other key events when chat is focused
		get_viewport().set_input_as_handled()
		return

	# Press Enter to focus chat input
	if event is InputEventKey and event.pressed and event.keycode == KEY_ENTER:
		if not is_chat_focused:
			chat_input.grab_focus()
			get_viewport().set_input_as_handled()

func _on_chat_focus_entered() -> void:
	is_chat_focused = true

func _on_chat_focus_exited() -> void:
	is_chat_focused = false

func _on_send_pressed() -> void:
	_send_chat_message()

func _on_chat_submitted(_text: String) -> void:
	_send_chat_message()
	chat_input.release_focus()

func _send_chat_message() -> void:
	var message = chat_input.text.strip_edges()
	if message.is_empty():
		return

	# Check for local commands
	if message.begins_with("/"):
		_handle_local_command(message)
	else:
		# Send to server
		
		
		NetworkManager.send_message({
			"type": "chat",
			"content": message,
			"channel": "world"
		})

	chat_input.text = ""

func _handle_local_command(message: String) -> void:
	var parts = message.substr(1).split(" ", false)
	if parts.is_empty():
		return

	var command = parts[0].to_lower()

	match command:
		"help":
			add_system_message("Commands: /help, /whisper <player> <message>, /me <action>, /players")
		_:
			# Send command to server for processing
			NetworkManager.send_message({
				"type": "chat",
				"content": message,
				"channel": "world"
			})

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")

	if msg_type == "chat_message":
		var chat_data = message.get("message", message)
		var sender = chat_data.get("senderName", "Unknown")
		var content = chat_data.get("content", "")
		var chat_type = chat_data.get("type", "normal")

		match chat_type:
			"system":
				add_system_message(content)
			"whisper":
				add_whisper_message(sender, content)
			_:
				add_chat_message(sender, content)

func add_chat_message(sender: String, content: String) -> void:
	chat_log.append_text("[color=white]%s:[/color] %s\n" % [sender, content])
	_trim_messages()

func add_system_message(content: String) -> void:
	chat_log.append_text("[color=yellow][System] %s[/color]\n" % content)
	_trim_messages()

func add_whisper_message(sender: String, content: String) -> void:
	chat_log.append_text("[color=magenta][Whisper from %s] %s[/color]\n" % [sender, content])
	_trim_messages()

func _trim_messages() -> void:
	# Keep chat log from growing too large (this is a simple approach)
	# In a real implementation, you'd count lines and remove old ones
	pass

func is_input_focused() -> bool:
	return is_chat_focused
