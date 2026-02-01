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

func _ready() -> void:
	_load_ability_configs()
	_setup_ability_buttons()
	NetworkManager.message_received.connect(_on_message_received)

func _load_ability_configs() -> void:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if not config_loader:
		push_warning("[ABILITY_BAR] ConfigLoader not found, using defaults")
		abilities["fireball"] = {"name": "Fireball", "cooldown": 0.2, "icon": null, "keybind": "1"}
		abilities["frostbolt"] = {"name": "Frostbolt", "cooldown": 0.8, "icon": null, "keybind": "2"}
		abilities["lightning"] = {"name": "Lightning", "cooldown": 1.0, "icon": null, "keybind": "3"}
		abilities["basic_attack"] = {"name": "Basic Attack", "cooldown": 0.3, "icon": null, "keybind": "4"}
		return

	# Load all abilities from config
	var ability_types = ["fireball", "frostbolt", "lightning", "basic_attack"]
	for i in range(ability_types.size()):
		var ability_type = ability_types[i]
		var ability_config = config_loader.get_ability(ability_type)
		if ability_config:
			abilities[ability_type] = {
				"name": ability_config.get("name", ability_type.capitalize()),
				"cooldown": ability_config.get("cooldown", 1.0),
				"icon": null,
				"keybind": str(i + 1)
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

			# Add keybind label
			var keybind_label = Label.new()
			keybind_label.name = "KeybindLabel"
			keybind_label.text = str(i + 1)
			keybind_label.anchor_left = 0.0
			keybind_label.anchor_top = 0.0
			keybind_label.offset_left = 5
			keybind_label.offset_top = 5
			keybind_label.add_theme_font_size_override("font_size", 14)
			button.add_child(keybind_label)

			hbox.add_child(button)

	# Update button references
	if has_node("HBoxContainer"):
		ability_1 = get_node("HBoxContainer/Ability1")
		ability_2 = get_node("HBoxContainer/Ability2")
		ability_3 = get_node("HBoxContainer/Ability3")
		ability_4 = get_node("HBoxContainer/Ability4")

		# Set ability info
		ability_1.text = abilities.get("fireball", {}).get("name", "Fireball")
		ability_2.text = abilities.get("frostbolt", {}).get("name", "Frostbolt")
		ability_3.text = abilities.get("lightning", {}).get("name", "Lightning")
		ability_4.text = abilities.get("basic_attack", {}).get("name", "Basic Attack")

func _process(delta: float) -> void:
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
	match slot:
		0:
			return "fireball"
		1:
			return "frostbolt"
		2:
			return "lightning"
		3:
			return "basic_attack"
		_:
			return ""

func _get_slot_for_ability(ability_type: String) -> int:
	match ability_type:
		"fireball":
			return 0
		"frostbolt":
			return 1
		"lightning":
			return 2
		"basic_attack":
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
