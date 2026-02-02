extends Control
## Modifier selection panel for choosing ability modifiers

# Available modifiers
var available_modifiers = [
	{"id": "homing", "name": "Homing", "description": "Projectiles track nearest enemy"},
	{"id": "piercing", "name": "Piercing", "description": "Projectiles pass through enemies"},
	{"id": "pet", "name": "Pet", "description": "Summon a pet that casts abilities"},
	{"id": "turret", "name": "Turret", "description": "Place a turret that casts abilities"}
]

# Selected modifiers (modifier_id -> bool)
var selected_modifiers: Dictionary = {}

# UI references
var panel_container: PanelContainer = null
var modifier_buttons: Dictionary = {}

# Track if modifiers have been activated
var modifiers_activated: bool = false

func _ready() -> void:
	_setup_ui()
	NetworkManager.message_received.connect(_on_message_received)

	# Activate all modifiers after a short delay to ensure connection is established
	await get_tree().create_timer(0.5).timeout
	_activate_all_modifiers()

func _setup_ui() -> void:
	# Create panel container
	panel_container = PanelContainer.new()
	panel_container.name = "ModifierPanelContainer"
	panel_container.anchor_left = 0.02
	panel_container.anchor_top = 0.3
	panel_container.anchor_right = 0.02
	panel_container.anchor_bottom = 0.7
	panel_container.offset_right = 220
	add_child(panel_container)

	# Create VBox for layout
	var vbox = VBoxContainer.new()
	vbox.name = "VBox"
	panel_container.add_child(vbox)

	# Add title label
	var title = Label.new()
	title.text = "Modifiers"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 18)
	vbox.add_child(title)

	# Add separator
	var separator = HSeparator.new()
	vbox.add_child(separator)

	# Add modifier buttons
	for modifier in available_modifiers:
		var button = _create_modifier_button(modifier)
		vbox.add_child(button)
		modifier_buttons[modifier["id"]] = button

func _activate_all_modifiers() -> void:
	# Only activate once
	if modifiers_activated:
		print("[MODIFIER_PANEL] Modifiers already activated, skipping")
		return

	modifiers_activated = true

	for modifier in available_modifiers:
		var mod_id = modifier["id"]
		selected_modifiers[mod_id] = true
		# Update button state
		if modifier_buttons.has(mod_id):
			var container = modifier_buttons[mod_id]
			var button = container.get_node("Button")
			if button:
				button.button_pressed = true
				_update_button_style(button, true)
		# Notify server
		NetworkManager.send_message({
			"type": "set_modifier",
			"modifierType": mod_id,
			"enabled": true
		})
	print("[MODIFIER_PANEL] All modifiers activated by default")

func _create_modifier_button(modifier_data: Dictionary) -> Control:
	var container = VBoxContainer.new()
	container.name = "Modifier_" + modifier_data["id"]

	# Create toggle button
	var button = Button.new()
	button.name = "Button"
	button.text = modifier_data["name"]
	button.toggle_mode = true
	button.custom_minimum_size = Vector2(200, 40)
	button.pressed.connect(func(): _on_modifier_toggled(modifier_data["id"], button.button_pressed))

	# Style: inactive by default
	_update_button_style(button, false)

	container.add_child(button)

	# Add description label
	var desc_label = Label.new()
	desc_label.text = modifier_data["description"]
	desc_label.add_theme_font_size_override("font_size", 10)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.custom_minimum_size = Vector2(200, 0)
	container.add_child(desc_label)

	# Add spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	container.add_child(spacer)

	return container

func _update_button_style(button: Button, active: bool) -> void:
	if active:
		# Bright green background for active
		var active_style = StyleBoxFlat.new()
		active_style.bg_color = Color(0.1, 0.5, 0.1, 0.9)
		active_style.border_color = Color(0.3, 1.0, 0.3)
		active_style.set_border_width_all(2)
		active_style.set_corner_radius_all(4)
		active_style.set_content_margin_all(6)
		button.add_theme_stylebox_override("pressed", active_style)
		button.add_theme_stylebox_override("normal", active_style)
		button.add_theme_color_override("font_color", Color(0.8, 1.0, 0.8))
		button.add_theme_color_override("font_pressed_color", Color(0.8, 1.0, 0.8))
	else:
		# Dim dark background for inactive
		var inactive_style = StyleBoxFlat.new()
		inactive_style.bg_color = Color(0.15, 0.15, 0.2, 0.9)
		inactive_style.border_color = Color(0.3, 0.3, 0.4)
		inactive_style.set_border_width_all(1)
		inactive_style.set_corner_radius_all(4)
		inactive_style.set_content_margin_all(6)
		button.add_theme_stylebox_override("normal", inactive_style)
		button.add_theme_stylebox_override("pressed", inactive_style)
		button.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
		button.add_theme_color_override("font_pressed_color", Color(0.5, 0.5, 0.6))

func _on_modifier_toggled(modifier_id: String, is_pressed: bool) -> void:
	selected_modifiers[modifier_id] = is_pressed

	# Update button style
	if modifier_buttons.has(modifier_id):
		var container = modifier_buttons[modifier_id]
		var button = container.get_node("Button")
		if button:
			_update_button_style(button, is_pressed)

	# Send to server
	var message = {
		"type": "set_modifier",
		"modifierType": modifier_id,
		"enabled": is_pressed
	}
	NetworkManager.send_message(message)

	print("[MODIFIER_PANEL] Toggled %s: %s" % [modifier_id, is_pressed])

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")

	match msg_type:
		"joined":
			# Player has joined - now safe to send modifier state to server
			_activate_all_modifiers()
		"modifier_updated":
			_handle_modifier_updated(message)

func _handle_modifier_updated(message: Dictionary) -> void:
	var modifier_id = message.get("modifierType", "")
	var enabled = message.get("enabled", false)

	# Update UI state
	if modifier_buttons.has(modifier_id):
		var container = modifier_buttons[modifier_id]
		var button = container.get_node("Button")
		if button:
			button.button_pressed = enabled

	selected_modifiers[modifier_id] = enabled

	# Update button style
	if modifier_buttons.has(modifier_id):
		var container = modifier_buttons[modifier_id]
		var button = container.get_node("Button")
		if button:
			_update_button_style(button, enabled)

	print("[MODIFIER_PANEL] Server confirmed: %s = %s" % [modifier_id, enabled])

func get_active_modifiers() -> Array[String]:
	var active = []
	for modifier_id in selected_modifiers:
		if selected_modifiers[modifier_id]:
			active.append(modifier_id)
	return active
