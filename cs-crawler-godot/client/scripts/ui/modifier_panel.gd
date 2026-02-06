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
	# Create panel container - small horizontal layout attached to right of skill bar
	panel_container = PanelContainer.new()
	panel_container.name = "ModifierPanelContainer"
	# Position at bottom of screen, right of the skill bar
	panel_container.anchor_left = 0.5
	panel_container.anchor_right = 0.5
	panel_container.anchor_top = 1.0
	panel_container.anchor_bottom = 1.0
	# Skill bar is 400px wide centered, so start at +200 (right edge of skill bar) + 10px gap
	panel_container.offset_left = 210
	panel_container.offset_right = 380  # 4 buttons x 40px + gaps
	panel_container.offset_top = -100
	panel_container.offset_bottom = -30

	# Semi-transparent background
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.15, 0.8)
	style.set_corner_radius_all(6)
	style.set_content_margin_all(6)
	panel_container.add_theme_stylebox_override("panel", style)
	add_child(panel_container)

	# Create HBox for horizontal layout (4 small buttons)
	var hbox = HBoxContainer.new()
	hbox.name = "HBox"
	hbox.add_theme_constant_override("separation", 4)
	panel_container.add_child(hbox)

	# Add modifier buttons (small, square)
	for modifier in available_modifiers:
		var button = _create_small_modifier_button(modifier)
		hbox.add_child(button)
		modifier_buttons[modifier["id"]] = button

func _create_small_modifier_button(modifier_data: Dictionary) -> Button:
	var button = Button.new()
	button.name = "Modifier_" + modifier_data["id"]
	button.text = modifier_data["name"][0]  # First letter only (H, P, P, T)
	button.toggle_mode = true
	button.custom_minimum_size = Vector2(36, 36)
	button.tooltip_text = modifier_data["name"] + "\n" + modifier_data["description"]
	button.pressed.connect(func(): _on_modifier_toggled(modifier_data["id"], button.button_pressed))

	# Style: inactive by default
	_update_small_button_style(button, false)

	return button

func _update_small_button_style(button: Button, active: bool) -> void:
	if active:
		# Bright green background for active
		var active_style = StyleBoxFlat.new()
		active_style.bg_color = Color(0.15, 0.5, 0.15, 0.95)
		active_style.border_color = Color(0.4, 1.0, 0.4)
		active_style.set_border_width_all(2)
		active_style.set_corner_radius_all(4)
		button.add_theme_stylebox_override("pressed", active_style)
		button.add_theme_stylebox_override("normal", active_style)
		button.add_theme_color_override("font_color", Color(0.9, 1.0, 0.9))
		button.add_theme_color_override("font_pressed_color", Color(0.9, 1.0, 0.9))
	else:
		# Dim dark background for inactive
		var inactive_style = StyleBoxFlat.new()
		inactive_style.bg_color = Color(0.2, 0.2, 0.25, 0.9)
		inactive_style.border_color = Color(0.35, 0.35, 0.4)
		inactive_style.set_border_width_all(1)
		inactive_style.set_corner_radius_all(4)
		button.add_theme_stylebox_override("normal", inactive_style)
		button.add_theme_stylebox_override("pressed", inactive_style)
		button.add_theme_color_override("font_color", Color(0.55, 0.55, 0.6))
		button.add_theme_color_override("font_pressed_color", Color(0.55, 0.55, 0.6))

func _activate_all_modifiers() -> void:
	# Only activate once
	if modifiers_activated:
		print("[MODIFIER_PANEL] Modifiers already activated, skipping")
		return

	modifiers_activated = true

	for modifier in available_modifiers:
		var mod_id = modifier["id"]
		selected_modifiers[mod_id] = true
		# Update button state (button is stored directly now)
		if modifier_buttons.has(mod_id):
			var button = modifier_buttons[mod_id] as Button
			if button:
				button.button_pressed = true
				_update_small_button_style(button, true)
		# Notify server
		NetworkManager.send_message({
			"type": "set_modifier",
			"modifierType": mod_id,
			"enabled": true
		})
	print("[MODIFIER_PANEL] All modifiers activated by default")

func _on_modifier_toggled(modifier_id: String, is_pressed: bool) -> void:
	selected_modifiers[modifier_id] = is_pressed

	# Update button style (button is stored directly now)
	if modifier_buttons.has(modifier_id):
		var button = modifier_buttons[modifier_id] as Button
		if button:
			_update_small_button_style(button, is_pressed)

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

	selected_modifiers[modifier_id] = enabled

	# Update UI state (button is stored directly now)
	if modifier_buttons.has(modifier_id):
		var button = modifier_buttons[modifier_id] as Button
		if button:
			button.button_pressed = enabled
			_update_small_button_style(button, enabled)

	print("[MODIFIER_PANEL] Server confirmed: %s = %s" % [modifier_id, enabled])

func get_active_modifiers() -> Array[String]:
	var active = []
	for modifier_id in selected_modifiers:
		if selected_modifiers[modifier_id]:
			active.append(modifier_id)
	return active
