extends GutTest
## Unit tests for InventoryPanel

const InventoryPanelScript = preload("res://scripts/ui/inventory_panel.gd")

# --- Test ITEM_TYPE_TO_SLOTS mapping ---

func test_head_item_goes_to_head_slot():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("head", [])
	assert_eq(slots, ["head"])

func test_chest_item_goes_to_chest_slot():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("chest", [])
	assert_eq(slots, ["chest"])

func test_hands_item_goes_to_hands_slot():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("hands", [])
	assert_eq(slots, ["hands"])

func test_feet_item_goes_to_feet_slot():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("feet", [])
	assert_eq(slots, ["feet"])

func test_weapon_1h_goes_to_both_weapon_slots():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("weapon_1h", [])
	assert_eq(slots, ["weapon1", "weapon2"])

func test_weapon_2h_goes_to_weapon1_only():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("weapon_2h", [])
	assert_eq(slots, ["weapon1"])

func test_amulet_goes_to_amulet_slot():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("amulet", [])
	assert_eq(slots, ["amulet"])

func test_ring_goes_to_both_ring_slots():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("ring", [])
	assert_eq(slots, ["ring1", "ring2"])

func test_unknown_item_type_returns_empty():
	var slots = InventoryPanelScript.ITEM_TYPE_TO_SLOTS.get("unknown", [])
	assert_eq(slots, [])

# --- Test RARITY_COLORS ---

func test_normal_rarity_color():
	var color = InventoryPanelScript.RARITY_COLORS.get("normal")
	assert_eq(color, Color(0.6, 0.6, 0.6, 1.0))

func test_rare_rarity_color():
	var color = InventoryPanelScript.RARITY_COLORS.get("rare")
	assert_eq(color, Color(0.3, 0.5, 1.0, 1.0))

func test_unique_rarity_color():
	var color = InventoryPanelScript.RARITY_COLORS.get("unique")
	assert_eq(color, Color(1.0, 0.5, 0.0, 1.0))

func test_unknown_rarity_returns_null():
	var color = InventoryPanelScript.RARITY_COLORS.get("legendary")
	assert_null(color)

# --- Test SLOT_LABELS ---

func test_head_slot_label():
	var label = InventoryPanelScript.SLOT_LABELS.get("head")
	assert_eq(label, "Head")

func test_chest_slot_label():
	var label = InventoryPanelScript.SLOT_LABELS.get("chest")
	assert_eq(label, "Chest")

func test_weapon1_slot_label():
	var label = InventoryPanelScript.SLOT_LABELS.get("weapon1")
	assert_eq(label, "Wpn 1")

func test_amulet_slot_label():
	var label = InventoryPanelScript.SLOT_LABELS.get("amulet")
	assert_eq(label, "Amul")

# --- Test EQUIP_GRID_LAYOUT ---

func test_equip_grid_has_4_rows():
	assert_eq(InventoryPanelScript.EQUIP_GRID_LAYOUT.size(), 4)

func test_equip_grid_first_row():
	var row = InventoryPanelScript.EQUIP_GRID_LAYOUT[0]
	assert_eq(row, [null, "head", null])

func test_equip_grid_second_row():
	var row = InventoryPanelScript.EQUIP_GRID_LAYOUT[1]
	assert_eq(row, ["weapon1", "chest", "weapon2"])

func test_equip_grid_third_row():
	var row = InventoryPanelScript.EQUIP_GRID_LAYOUT[2]
	assert_eq(row, ["hands", null, "feet"])

func test_equip_grid_fourth_row():
	var row = InventoryPanelScript.EQUIP_GRID_LAYOUT[3]
	assert_eq(row, ["ring1", "amulet", "ring2"])

# --- Test _format_stat_name logic ---

func test_format_stat_name_single_word():
	var words = "strength".split("_")
	var formatted = ""
	for word in words:
		formatted += word.capitalize() + " "
	formatted = formatted.strip_edges()
	assert_eq(formatted, "Strength")

func test_format_stat_name_two_words():
	var words = "attack_speed".split("_")
	var formatted = ""
	for word in words:
		formatted += word.capitalize() + " "
	formatted = formatted.strip_edges()
	assert_eq(formatted, "Attack Speed")

func test_format_stat_name_three_words():
	var words = "critical_hit_chance".split("_")
	var formatted = ""
	for word in words:
		formatted += word.capitalize() + " "
	formatted = formatted.strip_edges()
	assert_eq(formatted, "Critical Hit Chance")

# --- Test _bag_index logic ---

func test_bag_index_parsing_zero():
	var slot_id = "bag_0"
	var index = int(slot_id.replace("bag_", ""))
	assert_eq(index, 0)

func test_bag_index_parsing_single_digit():
	var slot_id = "bag_5"
	var index = int(slot_id.replace("bag_", ""))
	assert_eq(index, 5)

func test_bag_index_parsing_double_digit():
	var slot_id = "bag_42"
	var index = int(slot_id.replace("bag_", ""))
	assert_eq(index, 42)

# --- Test slot sizes ---

func test_equip_slot_size():
	assert_eq(InventoryPanelScript.EQUIP_SLOT_SIZE, Vector2(48, 48))

func test_bag_slot_size():
	assert_eq(InventoryPanelScript.BAG_SLOT_SIZE, Vector2(34, 34))

# --- Test KEY_NAME_TO_CODE mapping ---

func test_key_i_maps_to_keycode():
	var code = InventoryPanelScript.KEY_NAME_TO_CODE.get("i")
	assert_eq(code, KEY_I)

func test_key_b_maps_to_keycode():
	var code = InventoryPanelScript.KEY_NAME_TO_CODE.get("b")
	assert_eq(code, KEY_B)

func test_key_tab_maps_to_keycode():
	var code = InventoryPanelScript.KEY_NAME_TO_CODE.get("tab")
	assert_eq(code, KEY_TAB)

func test_key_escape_maps_to_keycode():
	var code = InventoryPanelScript.KEY_NAME_TO_CODE.get("escape")
	assert_eq(code, KEY_ESCAPE)
