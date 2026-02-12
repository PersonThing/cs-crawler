extends Control
## Ability bar UI showing abilities and cooldowns

# Dynamic node references (created at runtime)
var ability_1: Button = null
var ability_2: Button = null
var ability_3: Button = null
var ability_4: Button = null

# Cooldown overlays
var cooldown_overlays: Array[ColorRect] = []
var cooldown_labels: Array[Label] = []

# Ability data (loaded from config)
var abilities: Dictionary = {}

var cooldowns: Dictionary = {}  # ability_type -> time_remaining

# Ability color mapping for icons
const ABILITY_COLORS = {
	"fireball": Color(1.0, 0.5, 0.2),      # Orange/red
	"frostbolt": Color(0.5, 0.8, 1.0),     # Light blue
	"lightning": Color(1.0, 1.0, 0.3),     # Yellow
	"basic_attack": Color(0.9, 0.2, 0.2),  # Red
}

func _ready() -> void:
	_load_ability_configs()
	_setup_ability_buttons()
	NetworkManager.message_received.connect(_on_message_received)

func _create_ability_icon(ability_type: String) -> Control:
	# Create a circular colored icon for the ability
	var panel = Panel.new()
	panel.name = "Icon"
	panel.anchor_left = 0.5
	panel.anchor_top = 0.5
	panel.anchor_right = 0.5
	panel.anchor_bottom = 0.5
	panel.offset_left = -25
	panel.offset_top = -25
	panel.offset_right = 25
	panel.offset_bottom = 25
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Create circular style
	var style = StyleBoxFlat.new()
	var color = ABILITY_COLORS.get(ability_type, Color.WHITE)
	style.bg_color = color
	style.set_corner_radius_all(25)  # Make it circular

	# Add subtle border
	style.border_color = Color(1.0, 1.0, 1.0, 0.3)
	style.set_border_width_all(2)

	panel.add_theme_stylebox_override("panel", style)

	return panel

func _load_ability_configs() -> void:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if not config_loader:
		push_warning("[ABILITY_BAR] ConfigLoader not found, using defaults")
		# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
		# Keys: 1 = X, 2 = Y, 3 = A, 4 = B
		abilities["lightning"] = {"name": "Lightning", "cooldown": 1.0, "icon": null, "keybind": "1"}
		abilities["basic_attack"] = {"name": "Basic Attack", "cooldown": 0.3, "icon": null, "keybind": "2"}
		abilities["fireball"] = {"name": "Fireball", "cooldown": 0.2, "icon": null, "keybind": "3"}
		abilities["frostbolt"] = {"name": "Frostbolt", "cooldown": 0.8, "icon": null, "keybind": "4"}
		return

	# Load all abilities from config
	# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
	# Keys: 1 = X, 2 = Y, 3 = A, 4 = B
	var ability_types = ["lightning", "basic_attack", "fireball", "frostbolt"]
	var keybinds = ["1", "2", "3", "4"]
	for i in range(ability_types.size()):
		var ability_type = ability_types[i]
		var ability_config = config_loader.get_ability(ability_type)
		if ability_config:
			abilities[ability_type] = {
				"name": ability_config.get("name", ability_type.capitalize()),
				"cooldown": ability_config.get("cooldown", 1.0),
				"icon": null,
				"keybind": keybinds[i]
			}
			print("[ABILITY_BAR] Loaded %s config: %s" % [ability_type, abilities[ability_type]])

func _setup_ability_buttons() -> void:
	# Create ability slots
	if not has_node("HBoxContainer"):
		var hbox = HBoxContainer.new()
		hbox.name = "HBoxContainer"
		hbox.anchor_left = 0.5
		hbox.anchor_right = 0.5
		hbox.anchor_top = 1.0
		hbox.anchor_bottom = 1.0
		hbox.offset_left = -200
		hbox.offset_right = 200
		hbox.offset_top = -120
		hbox.offset_bottom = -20
		hbox.alignment = BoxContainer.ALIGNMENT_CENTER
		add_child(hbox)

		for i in range(4):
			var button = Button.new()
			button.name = "Ability" + str(i + 1)
			button.custom_minimum_size = Vector2(80, 80)
			button.disabled = true  # Can't click to cast (use keybinds)

			# Add ability icon (colored circle)
			var ability_type = _get_ability_type_for_slot(i)
			if ability_type:
				var icon = _create_ability_icon(ability_type)
				button.add_child(icon)

			# Add cooldown overlay
			var overlay = ColorRect.new()
			overlay.name = "CooldownOverlay"
			overlay.color = Color(0, 0, 0, 0.7)
			overlay.anchor_right = 1.0
			overlay.anchor_bottom = 1.0
			overlay.visible = false
			button.add_child(overlay)
			cooldown_overlays.append(overlay)

			# Add cooldown label
			var label = Label.new()
			label.name = "CooldownLabel"
			label.anchor_right = 1.0
			label.anchor_bottom = 1.0
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			label.add_theme_font_size_override("font_size", 24)
			label.visible = false
			button.add_child(label)
			cooldown_labels.append(label)

			# Add keybind label (will be updated for VR mode)
			# Order: X, Y, A, B maps to keys 1, 2, 3, 4
			var keyboard_keys = ["1", "2", "3", "4"]
			var keybind_label = Label.new()
			keybind_label.name = "KeybindLabel"
			keybind_label.text = keyboard_keys[i]  # Default to keyboard
			keybind_label.anchor_left = 0.0
			keybind_label.anchor_top = 0.0
			keybind_label.offset_left = 5
			keybind_label.offset_top = 5
			keybind_label.add_theme_font_size_override("font_size", 14)
			button.add_child(keybind_label)

			# Store reference for VR label updates
			if not has_meta("keybind_labels"):
				set_meta("keybind_labels", [])
			get_meta("keybind_labels").append(keybind_label)

			hbox.add_child(button)

	# Update button references
	if has_node("HBoxContainer"):
		ability_1 = get_node("HBoxContainer/Ability1")
		ability_2 = get_node("HBoxContainer/Ability2")
		ability_3 = get_node("HBoxContainer/Ability3")
		ability_4 = get_node("HBoxContainer/Ability4")

		# Clear button text (we have icons now)
		ability_1.text = ""
		ability_2.text = ""
		ability_3.text = ""
		ability_4.text = ""

var _vr_labels_applied: bool = false

func _process(delta: float) -> void:
	# Update keybind labels for VR mode (X, Y, A, B instead of 3, 4, 1, 2)
	if not _vr_labels_applied:
		var game_world = get_node_or_null("/root/GameWorld")
		if game_world and game_world.is_xr_active and has_meta("keybind_labels"):
			var labels = get_meta("keybind_labels")
			var vr_keys = ["X", "Y", "A", "B"]  # Lightning, Basic Attack, Fireball, Frostbolt
			for i in range(min(labels.size(), vr_keys.size())):
				labels[i].text = vr_keys[i]
			_vr_labels_applied = true
	# Update cooldown displays
	for ability_type in cooldowns.keys():
		cooldowns[ability_type] -= delta

		if cooldowns[ability_type] <= 0:
			cooldowns.erase(ability_type)
		else:
			_update_cooldown_display(ability_type, cooldowns[ability_type])

	# Clear cooldown displays for abilities not on cooldown
	for i in range(4):
		var ability_type = _get_ability_type_for_slot(i)
		if ability_type and not cooldowns.has(ability_type):
			_clear_cooldown_display(i)

func _get_ability_type_for_slot(slot: int) -> String:
	# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
	match slot:
		0:
			return "lightning"
		1:
			return "basic_attack"
		2:
			return "fireball"
		3:
			return "frostbolt"
		_:
			return ""

func _get_slot_for_ability(ability_type: String) -> int:
	# Order: X, Y, A, B (Lightning, Basic Attack, Fireball, Frostbolt)
	match ability_type:
		"lightning":
			return 0
		"basic_attack":
			return 1
		"fireball":
			return 2
		"frostbolt":
			return 3
		_:
			return -1

func _update_cooldown_display(ability_type: String, time_remaining: float) -> void:
	var slot = _get_slot_for_ability(ability_type)
	if slot < 0 or slot >= cooldown_overlays.size():
		return

	var overlay = cooldown_overlays[slot]
	var label = cooldown_labels[slot]

	overlay.visible = true
	label.visible = true
	label.text = "%.1f" % time_remaining

	# Update overlay height based on cooldown progress
	var ability_data = abilities.get(ability_type, {})
	var max_cooldown = ability_data.get("cooldown", 1.0)
	var progress = time_remaining / max_cooldown

	overlay.anchor_top = 1.0 - progress
	overlay.offset_top = 0

func _clear_cooldown_display(slot: int) -> void:
	if slot < 0 or slot >= cooldown_overlays.size():
		return

	cooldown_overlays[slot].visible = false
	cooldown_labels[slot].visible = false

func _on_message_received(message: Dictionary) -> void:
	var msg_type = message.get("type", "")

	match msg_type:
		"ability_cast":
			_handle_ability_cast(message)
		"ability_failed":
			_handle_ability_failed(message)

func _handle_ability_cast(message: Dictionary) -> void:
	var player_id = message.get("playerID", "")
	var ability_type = message.get("abilityType", "")

	# Only track cooldowns for local player
	if player_id == GameManager.local_player_id:
		var ability_data = abilities.get(ability_type, {})
		var cooldown_time = ability_data.get("cooldown", 1.0)
		cooldowns[ability_type] = cooldown_time
		print("[ABILITY_BAR] Started cooldown for %s: %.2fs (data: %s)" % [ability_type, cooldown_time, ability_data])

func _handle_ability_failed(message: Dictionary) -> void:
	var reason = message.get("reason", "Unknown error")
	print("[ABILITY_BAR] Ability failed: ", reason)
	# TODO: Show error message to player
