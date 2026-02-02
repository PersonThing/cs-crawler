extends Control
## Inventory panel UI - compact floating panel at bottom-center
## Toggle with 'I' or 'B' key (configurable via hotkeys.json)
## Left-click: pick up item onto cursor / place item / swap
## Right-click bag item: equip (swap if slot occupied)
## Right-click equipped item: unequip to bag
## Click ground with item on cursor: drop item

# UI references (built in _ready)
var panel_root: PanelContainer = null
var equipment_container: GridContainer = null
var bag_container: GridContainer = null
var item_tooltip: PanelContainer = null
var tooltip_label: RichTextLabel = null
var cursor_icon: Control = null

# Equipment slots
var equipment_slots: Dictionary = {}
var bag_slots: Array = []

# Cursor item state
var held_item: Variant = null
var held_source_slot: Control = null
var held_source_is_equipment: bool = false

# Inventory data cache
var inventory_data: Dictionary = {}

# Hotkey keycodes loaded from config
var inventory_keycodes: Array = []

# --- Constants ---

const EQUIP_SLOT_SIZE = Vector2(48, 48)
const BAG_SLOT_SIZE = Vector2(34, 34)

const RARITY_COLORS = {
	"normal": Color(0.6, 0.6, 0.6, 1.0),
	"rare": Color(0.3, 0.5, 1.0, 1.0),
	"unique": Color(1.0, 0.5, 0.0, 1.0),
}

const SLOT_LABELS = {
	"head": "Head",
	"chest": "Chest",
	"hands": "Hands",
	"feet": "Feet",
	"weapon1": "Wpn 1",
	"weapon2": "Wpn 2",
	"amulet": "Amul",
	"ring1": "Ring",
	"ring2": "Ring",
}

# 4x3 grid layout with null = empty placeholder
const EQUIP_GRID_LAYOUT = [
	[null, "head", null],
	["weapon1", "chest", "weapon2"],
	["hands", null, "feet"],
	["ring1", "amulet", "ring2"],
]

# Maps item type -> eligible equipment slot names
const ITEM_TYPE_TO_SLOTS = {
	"head": ["head"],
	"chest": ["chest"],
	"hands": ["hands"],
	"feet": ["feet"],
	"weapon_1h": ["weapon1", "weapon2"],
	"weapon_2h": ["weapon1"],
	"amulet": ["amulet"],
	"ring": ["ring1", "ring2"],
}

# Key name -> Godot physical keycode
const KEY_NAME_TO_CODE = {
	"a": KEY_A, "b": KEY_B, "c": KEY_C, "d": KEY_D, "e": KEY_E,
	"f": KEY_F, "g": KEY_G, "h": KEY_H, "i": KEY_I, "j": KEY_J,
	"k": KEY_K, "l": KEY_L, "m": KEY_M, "n": KEY_N, "o": KEY_O,
	"p": KEY_P, "q": KEY_Q, "r": KEY_R, "s": KEY_S, "t": KEY_T,
	"u": KEY_U, "v": KEY_V, "w": KEY_W, "x": KEY_X, "y": KEY_Y,
	"z": KEY_Z, "tab": KEY_TAB, "escape": KEY_ESCAPE,
}

func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_load_hotkeys()
	_build_ui()

func _load_hotkeys() -> void:
	var config_loader = get_node_or_null("/root/ConfigLoader")
	if config_loader:
		var data = config_loader._load_json("res://../../config/client/hotkeys.json")
		if data:
			var hotkeys = data.get("hotkeys", {})
			var inv_keys = hotkeys.get("inventory", ["i", "b"])
			for key_name in inv_keys:
				var code = KEY_NAME_TO_CODE.get(key_name.to_lower(), 0)
				if code != 0:
					inventory_keycodes.append(code)
			print("[INVENTORY] Loaded hotkeys: ", inv_keys)
			return

	# Defaults: I and B
	inventory_keycodes = [KEY_I, KEY_B]

func _build_ui() -> void:
	# --- Main panel (compact, anchored bottom-center) ---
	panel_root = PanelContainer.new()
	panel_root.name = "PanelRoot"

	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(0.08, 0.08, 0.12, 0.95)
	panel_style.border_color = Color(0.35, 0.35, 0.45)
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(6)
	panel_style.set_content_margin_all(10)
	panel_root.add_theme_stylebox_override("panel", panel_style)
	panel_root.mouse_filter = Control.MOUSE_FILTER_STOP

	# Anchor bottom-right, above the ability bar
	panel_root.anchor_left = 1.0
	panel_root.anchor_top = 1.0
	panel_root.anchor_right = 1.0
	panel_root.anchor_bottom = 1.0
	panel_root.offset_left = -570
	panel_root.offset_top = -400
	panel_root.offset_right = -10
	panel_root.offset_bottom = -130
	panel_root.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	panel_root.grow_vertical = Control.GROW_DIRECTION_BEGIN

	add_child(panel_root)

	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 10)
	panel_root.add_child(hbox)

	# --- Equipment section (left) ---
	var equip_vbox = VBoxContainer.new()
	equip_vbox.add_theme_constant_override("separation", 4)
	hbox.add_child(equip_vbox)

	var equip_label = Label.new()
	equip_label.text = "Equipment"
	equip_label.add_theme_font_size_override("font_size", 13)
	equip_vbox.add_child(equip_label)

	equipment_container = GridContainer.new()
	equipment_container.columns = 3
	equipment_container.add_theme_constant_override("h_separation", 3)
	equipment_container.add_theme_constant_override("v_separation", 3)
	equip_vbox.add_child(equipment_container)
	_create_equipment_slots()

	# --- Bag section (right) ---
	var bag_vbox = VBoxContainer.new()
	bag_vbox.add_theme_constant_override("separation", 4)
	hbox.add_child(bag_vbox)

	var bag_label = Label.new()
	bag_label.text = "Bag"
	bag_label.add_theme_font_size_override("font_size", 13)
	bag_vbox.add_child(bag_label)

	bag_container = GridContainer.new()
	bag_container.columns = 10
	bag_container.add_theme_constant_override("h_separation", 2)
	bag_container.add_theme_constant_override("v_separation", 2)
	bag_vbox.add_child(bag_container)
	_create_bag_slots()

	# --- Tooltip (child of this Control so it can overflow) ---
	item_tooltip = PanelContainer.new()
	item_tooltip.visible = false
	item_tooltip.z_index = 200
	item_tooltip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	item_tooltip.custom_minimum_size = Vector2(220, 0)
	var tt_style = StyleBoxFlat.new()
	tt_style.bg_color = Color(0.08, 0.08, 0.12, 0.97)
	tt_style.border_color = Color(0.5, 0.5, 0.6)
	tt_style.set_border_width_all(2)
	tt_style.set_corner_radius_all(4)
	tt_style.set_content_margin_all(8)
	item_tooltip.add_theme_stylebox_override("panel", tt_style)
	add_child(item_tooltip)

	tooltip_label = RichTextLabel.new()
	tooltip_label.fit_content = true
	tooltip_label.bbcode_enabled = true
	tooltip_label.scroll_active = false
	tooltip_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tooltip_label.custom_minimum_size = Vector2(200, 0)
	item_tooltip.add_child(tooltip_label)

	# --- Cursor icon (follows mouse when holding an item) ---
	cursor_icon = PanelContainer.new()
	cursor_icon.name = "CursorIcon"
	cursor_icon.visible = false
	cursor_icon.z_index = 300
	cursor_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cursor_icon.custom_minimum_size = Vector2(40, 40)
	var ci_style = StyleBoxFlat.new()
	ci_style.bg_color = Color(0.2, 0.2, 0.3, 0.9)
	ci_style.border_color = Color.WHITE
	ci_style.set_border_width_all(2)
	ci_style.set_corner_radius_all(3)
	cursor_icon.add_theme_stylebox_override("panel", ci_style)
	add_child(cursor_icon)

	var ci_label = Label.new()
	ci_label.name = "CursorLabel"
	ci_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ci_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ci_label.add_theme_font_size_override("font_size", 9)
	ci_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cursor_icon.add_child(ci_label)

func _create_equipment_slots() -> void:
	for row in EQUIP_GRID_LAYOUT:
		for slot_name in row:
			if slot_name == null:
				# Empty placeholder cell
				var empty = Control.new()
				empty.custom_minimum_size = EQUIP_SLOT_SIZE
				empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
				equipment_container.add_child(empty)
			else:
				var slot = _create_item_slot(slot_name, true)
				equipment_slots[slot_name] = slot
				equipment_container.add_child(slot)

func _create_bag_slots() -> void:
	for i in range(60):
		var slot = _create_item_slot("bag_" + str(i), false)
		bag_slots.append(slot)
		bag_container.add_child(slot)

func _create_item_slot(slot_id: String, is_equipment: bool) -> PanelContainer:
	var slot = PanelContainer.new()
	slot.name = slot_id
	slot.custom_minimum_size = EQUIP_SLOT_SIZE if is_equipment else BAG_SLOT_SIZE
	slot.mouse_filter = Control.MOUSE_FILTER_STOP

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.13, 0.13, 0.18, 0.9)
	style.border_color = Color(0.25, 0.25, 0.35)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	slot.add_theme_stylebox_override("panel", style)

	var center = CenterContainer.new()
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	slot.add_child(center)

	var icon = ColorRect.new()
	icon.name = "Icon"
	icon.custom_minimum_size = Vector2(32, 32) if is_equipment else Vector2(22, 22)
	icon.color = Color(0, 0, 0, 0)
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(icon)

	var label = Label.new()
	label.name = "Label"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 8 if not is_equipment else 9)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.set_anchors_preset(Control.PRESET_FULL_RECT)
	slot.add_child(label)

	if is_equipment:
		label.text = SLOT_LABELS.get(slot_id, slot_id)
		label.add_theme_color_override("font_color", Color(0.35, 0.35, 0.45))

	slot.set_meta("slot_id", slot_id)
	slot.set_meta("is_equipment", is_equipment)
	slot.set_meta("item_data", {})

	slot.gui_input.connect(_on_slot_gui_input.bind(slot))
	slot.mouse_entered.connect(_on_slot_mouse_entered.bind(slot))
	slot.mouse_exited.connect(_on_slot_mouse_exited)

	return slot

# --- Input handling ---

func _on_slot_gui_input(event: InputEvent, slot: Control) -> void:
	if not event is InputEventMouseButton or not event.pressed:
		return
	var mouse_event = event as InputEventMouseButton

	if mouse_event.button_index == MOUSE_BUTTON_LEFT:
		_handle_left_click(slot)
	elif mouse_event.button_index == MOUSE_BUTTON_RIGHT:
		_handle_right_click(slot)

func _handle_left_click(slot: Control) -> void:
	var slot_item = _get_slot_item(slot)
	var is_equip = slot.get_meta("is_equipment")

	if held_item == null:
		# Nothing on cursor - pick up item from this slot
		if slot_item.size() > 0:
			held_item = slot_item
			held_source_slot = slot
			held_source_is_equipment = is_equip
			_update_cursor_icon()
			_update_slot_highlights()
			_hide_tooltip()
	else:
		# We have an item on cursor - place or swap
		if held_source_is_equipment and not is_equip:
			# Unequip to specific bag slot
			var target_bag_idx = _bag_index(slot)
			_send_unequip_request(held_source_slot.get_meta("slot_id"), target_bag_idx)
		elif not held_source_is_equipment and is_equip:
			# Equip from bag
			var bag_idx = _bag_index(held_source_slot)
			_send_equip_request(bag_idx)
		elif not held_source_is_equipment and not is_equip:
			# Bag-to-bag swap
			var from_idx = _bag_index(held_source_slot)
			var to_idx = _bag_index(slot)
			_send_swap_bag_request(from_idx, to_idx)
		elif held_source_is_equipment and is_equip:
			# Equipment-to-equipment: not supported, just drop back
			pass

		# Clear cursor
		held_item = null
		held_source_slot = null
		_update_cursor_icon()
		_update_slot_highlights()

func _handle_right_click(slot: Control) -> void:
	# If holding an item, cancel
	if held_item != null:
		held_item = null
		held_source_slot = null
		_update_cursor_icon()
		_update_slot_highlights()
		return

	var slot_item = _get_slot_item(slot)
	if slot_item.size() == 0:
		return

	var is_equip = slot.get_meta("is_equipment")
	if is_equip:
		_send_unequip_request(slot.get_meta("slot_id"))
	else:
		var bag_idx = _bag_index(slot)
		_send_equip_request(bag_idx)

# --- Slot highlighting ---

func _update_slot_highlights() -> void:
	if held_item == null or not (held_item is Dictionary) or held_item.size() == 0:
		# Reset all equipment slots to normal
		for slot_name in equipment_slots:
			equipment_slots[slot_name].modulate = Color(1, 1, 1, 1)
		return

	# Determine eligible slots for held item
	var item_type = str(held_item.get("type", ""))
	var eligible = ITEM_TYPE_TO_SLOTS.get(item_type, [])

	for slot_name in equipment_slots:
		var slot = equipment_slots[slot_name]
		if slot_name in eligible:
			# Eligible: bright highlight
			slot.modulate = Color(1, 1, 1, 1)
			var style = slot.get_theme_stylebox("panel") as StyleBoxFlat
			if style:
				style.border_color = Color(0.3, 1.0, 0.3)
				style.set_border_width_all(2)
		else:
			# Not eligible: dim
			slot.modulate = Color(0.4, 0.4, 0.4, 0.6)

# --- Tooltip ---

func _on_slot_mouse_entered(slot: Control) -> void:
	if held_item != null:
		return
	var item_data = _get_slot_item(slot)
	if item_data.size() > 0:
		_show_tooltip(item_data)

func _on_slot_mouse_exited() -> void:
	_hide_tooltip()

func _hide_tooltip() -> void:
	if item_tooltip:
		item_tooltip.visible = false

func _show_tooltip(item_data: Dictionary) -> void:
	if not item_tooltip or not tooltip_label:
		return
	if item_data.size() == 0:
		return

	var rarity = str(item_data.get("rarity", "normal"))
	var rarity_color = RARITY_COLORS.get(rarity, Color.WHITE)
	var color_hex = rarity_color.to_html(false)

	var item_name = str(item_data.get("name", "Unknown Item"))
	var item_level = item_data.get("level", 1)

	var text = "[b][color=#%s]%s[/color][/b]\n" % [color_hex, item_name]
	text += "[color=#888888]%s  |  Level %s[/color]\n" % [rarity.capitalize(), str(item_level)]

	var affixes = item_data.get("affixes", [])
	if affixes is Array and affixes.size() > 0:
		text += "\n"
		for affix in affixes:
			if affix is Dictionary:
				var stat_name = _format_stat_name(str(affix.get("stat", "")))
				var value = affix.get("value", 0.0)
				text += "[color=#88ff88]+%.1f %s[/color]\n" % [float(value), stat_name]

	var item_set_name = str(item_data.get("setName", ""))
	if item_set_name != "":
		text += "\n[color=#00ff00]Set: %s[/color]" % item_set_name

	tooltip_label.clear()
	tooltip_label.append_text(text)
	item_tooltip.visible = true
	_reposition_tooltip.call_deferred()

func _reposition_tooltip() -> void:
	if not item_tooltip or not item_tooltip.visible:
		return
	var mouse_pos = get_global_mouse_position()
	var tt_size = item_tooltip.size
	var vp_size = get_viewport_rect().size
	var pos = mouse_pos + Vector2(15, 15)
	if pos.x + tt_size.x > vp_size.x:
		pos.x = mouse_pos.x - tt_size.x - 15
	if pos.y + tt_size.y > vp_size.y:
		pos.y = mouse_pos.y - tt_size.y - 15
	item_tooltip.global_position = pos

func _format_stat_name(stat: String) -> String:
	var words = stat.split("_")
	var formatted = ""
	for word in words:
		formatted += word.capitalize() + " "
	return formatted.strip_edges()

# --- Cursor icon ---

func _update_cursor_icon() -> void:
	if not cursor_icon:
		return

	if held_item == null or (held_item is Dictionary and held_item.size() == 0):
		cursor_icon.visible = false
		return

	cursor_icon.visible = true
	var ci_label = cursor_icon.get_node_or_null("CursorLabel")
	if ci_label:
		var item_name = str(held_item.get("name", "?"))
		ci_label.text = item_name.split(" ")[-1].substr(0, 5)

	var rarity = str(held_item.get("rarity", "normal"))
	var color = RARITY_COLORS.get(rarity, Color.GRAY)
	var style = cursor_icon.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		style.border_color = color
		style.bg_color = color * 0.3

func _process(_delta: float) -> void:
	if cursor_icon and cursor_icon.visible:
		cursor_icon.global_position = get_global_mouse_position() - Vector2(20, 20)

# --- Public API for game_world ---

func has_held_item() -> bool:
	return held_item != null and held_item is Dictionary and held_item.size() > 0

func drop_held_item() -> void:
	if not has_held_item():
		return
	_send_drop_request()
	held_item = null
	held_source_slot = null
	_update_cursor_icon()
	_update_slot_highlights()

# --- Network requests ---

func _send_equip_request(bag_slot: int) -> void:
	NetworkManager.send_message({
		"type": "equip_item",
		"bagSlot": bag_slot
	})

func _send_unequip_request(equipment_slot: String, target_bag_slot: int = -1) -> void:
	var msg = {
		"type": "unequip_item",
		"slot": equipment_slot
	}
	if target_bag_slot >= 0:
		msg["targetBagSlot"] = target_bag_slot
	NetworkManager.send_message(msg)

func _send_swap_bag_request(from_slot: int, to_slot: int) -> void:
	if from_slot == to_slot:
		return
	NetworkManager.send_message({
		"type": "swap_bag",
		"fromSlot": from_slot,
		"toSlot": to_slot
	})

func _send_drop_request() -> void:
	var msg = {"type": "drop_item"}
	if held_source_is_equipment:
		msg["source"] = "equipment"
		msg["slot"] = held_source_slot.get_meta("slot_id")
	else:
		msg["source"] = "bag"
		msg["slot"] = _bag_index(held_source_slot)
	NetworkManager.send_message(msg)

# --- Helpers ---

func _get_slot_item(slot: Control) -> Dictionary:
	var data = slot.get_meta("item_data")
	if data is Dictionary:
		return data
	return {}

func _bag_index(slot: Control) -> int:
	var slot_id = str(slot.get_meta("slot_id"))
	return int(slot_id.replace("bag_", ""))

# --- Update from server ---

func update_inventory(inventory: Dictionary) -> void:
	inventory_data = inventory

	var equipment = inventory.get("equipment", {})
	for slot_name in equipment_slots.keys():
		var item_data = equipment.get(slot_name, null)
		_update_slot_display(equipment_slots[slot_name], item_data, true)

	var bags = inventory.get("bags", [])
	for i in range(min(bags.size(), bag_slots.size())):
		_update_slot_display(bag_slots[i], bags[i], false)

func _update_slot_display(slot: PanelContainer, item_data, is_equipment: bool) -> void:
	var data: Dictionary = {}
	if item_data is Dictionary and item_data.size() > 0:
		data = item_data

	slot.set_meta("item_data", data)

	var icon = slot.find_child("Icon", true, false) as ColorRect
	var label = slot.find_child("Label", true, false) as Label

	if data.size() == 0:
		if icon:
			icon.color = Color(0, 0, 0, 0)
		if label:
			if is_equipment:
				var slot_id = slot.get_meta("slot_id")
				label.text = SLOT_LABELS.get(slot_id, slot_id)
				label.add_theme_color_override("font_color", Color(0.35, 0.35, 0.45))
			else:
				label.text = ""
		var style = slot.get_theme_stylebox("panel") as StyleBoxFlat
		if style:
			style.border_color = Color(0.25, 0.25, 0.35)
			style.set_border_width_all(1)
	else:
		var rarity = str(data.get("rarity", "normal"))
		var color = RARITY_COLORS.get(rarity, Color.GRAY)

		if icon:
			icon.color = color * 0.6

		if label:
			var item_name = str(data.get("name", "?"))
			label.text = item_name.split(" ")[-1].substr(0, 5)
			label.add_theme_color_override("font_color", Color.WHITE)

		var style = slot.get_theme_stylebox("panel") as StyleBoxFlat
		if style:
			style.border_color = color
			style.set_border_width_all(2)

# --- Toggle ---

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode in inventory_keycodes:
			visible = not visible
			if not visible:
				held_item = null
				held_source_slot = null
				_update_cursor_icon()
				_update_slot_highlights()
				_hide_tooltip()
			get_viewport().set_input_as_handled()
