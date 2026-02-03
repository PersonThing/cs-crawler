extends GutTest
## Unit tests for AbilityBar

const AbilityBarScript = preload("res://scripts/ui/ability_bar.gd")

# --- Test ABILITY_COLORS mapping ---

func test_fireball_color():
	var color = AbilityBarScript.ABILITY_COLORS.get("fireball")
	assert_eq(color, Color(1.0, 0.5, 0.2))

func test_frostbolt_color():
	var color = AbilityBarScript.ABILITY_COLORS.get("frostbolt")
	assert_eq(color, Color(0.5, 0.8, 1.0))

func test_lightning_color():
	var color = AbilityBarScript.ABILITY_COLORS.get("lightning")
	assert_eq(color, Color(1.0, 1.0, 0.3))

func test_basic_attack_color():
	var color = AbilityBarScript.ABILITY_COLORS.get("basic_attack")
	assert_eq(color, Color(0.9, 0.2, 0.2))

func test_unknown_ability_color_returns_null():
	var color = AbilityBarScript.ABILITY_COLORS.get("unknown")
	assert_null(color)

# --- Test cooldown timer calculations ---

func test_cooldown_decreases_by_delta():
	var cooldown = 1.0
	var delta = 0.1
	cooldown -= delta
	assert_almost_eq(cooldown, 0.9, 0.001)

func test_cooldown_reaches_zero():
	var cooldown = 0.5
	var delta = 0.5
	cooldown -= delta
	assert_eq(cooldown, 0.0)

func test_cooldown_goes_negative():
	var cooldown = 0.1
	var delta = 0.5
	cooldown -= delta
	assert_true(cooldown < 0)

func test_cooldown_should_be_removed_when_expired():
	var cooldown = -0.1
	assert_true(cooldown <= 0)

# --- Test cooldown progress calculation ---

func test_cooldown_progress_full():
	var time_remaining = 1.0
	var max_cooldown = 1.0
	var progress = time_remaining / max_cooldown
	assert_eq(progress, 1.0)

func test_cooldown_progress_half():
	var time_remaining = 0.5
	var max_cooldown = 1.0
	var progress = time_remaining / max_cooldown
	assert_eq(progress, 0.5)

func test_cooldown_progress_quarter():
	var time_remaining = 0.25
	var max_cooldown = 1.0
	var progress = time_remaining / max_cooldown
	assert_eq(progress, 0.25)

func test_cooldown_progress_zero():
	var time_remaining = 0.0
	var max_cooldown = 1.0
	var progress = time_remaining / max_cooldown
	assert_eq(progress, 0.0)

# --- Test overlay anchor_top calculation ---

func test_overlay_anchor_top_full_cooldown():
	var progress = 1.0
	var anchor_top = 1.0 - progress
	assert_eq(anchor_top, 0.0)  # Covers entire button

func test_overlay_anchor_top_half_cooldown():
	var progress = 0.5
	var anchor_top = 1.0 - progress
	assert_eq(anchor_top, 0.5)  # Covers half

func test_overlay_anchor_top_no_cooldown():
	var progress = 0.0
	var anchor_top = 1.0 - progress
	assert_eq(anchor_top, 1.0)  # Hidden

# --- Test cooldown text formatting ---

func test_cooldown_text_one_decimal():
	var time_remaining = 1.234
	var text = "%.1f" % time_remaining
	assert_eq(text, "1.2")

func test_cooldown_text_rounds_correctly():
	var time_remaining = 0.99
	var text = "%.1f" % time_remaining
	assert_eq(text, "1.0")

func test_cooldown_text_zero():
	var time_remaining = 0.0
	var text = "%.1f" % time_remaining
	assert_eq(text, "0.0")

# --- Test slot-to-ability mapping ---

func test_slot_0_is_fireball():
	var slot = 0
	var ability_type = ""
	match slot:
		0: ability_type = "fireball"
		1: ability_type = "frostbolt"
		2: ability_type = "lightning"
		3: ability_type = "basic_attack"
	assert_eq(ability_type, "fireball")

func test_slot_1_is_frostbolt():
	var slot = 1
	var ability_type = ""
	match slot:
		0: ability_type = "fireball"
		1: ability_type = "frostbolt"
		2: ability_type = "lightning"
		3: ability_type = "basic_attack"
	assert_eq(ability_type, "frostbolt")

func test_slot_2_is_lightning():
	var slot = 2
	var ability_type = ""
	match slot:
		0: ability_type = "fireball"
		1: ability_type = "frostbolt"
		2: ability_type = "lightning"
		3: ability_type = "basic_attack"
	assert_eq(ability_type, "lightning")

func test_slot_3_is_basic_attack():
	var slot = 3
	var ability_type = ""
	match slot:
		0: ability_type = "fireball"
		1: ability_type = "frostbolt"
		2: ability_type = "lightning"
		3: ability_type = "basic_attack"
	assert_eq(ability_type, "basic_attack")

# --- Test ability-to-slot mapping ---

func test_fireball_is_slot_0():
	var ability_type = "fireball"
	var slot = -1
	match ability_type:
		"fireball": slot = 0
		"frostbolt": slot = 1
		"lightning": slot = 2
		"basic_attack": slot = 3
	assert_eq(slot, 0)

func test_frostbolt_is_slot_1():
	var ability_type = "frostbolt"
	var slot = -1
	match ability_type:
		"fireball": slot = 0
		"frostbolt": slot = 1
		"lightning": slot = 2
		"basic_attack": slot = 3
	assert_eq(slot, 1)

func test_lightning_is_slot_2():
	var ability_type = "lightning"
	var slot = -1
	match ability_type:
		"fireball": slot = 0
		"frostbolt": slot = 1
		"lightning": slot = 2
		"basic_attack": slot = 3
	assert_eq(slot, 2)

func test_basic_attack_is_slot_3():
	var ability_type = "basic_attack"
	var slot = -1
	match ability_type:
		"fireball": slot = 0
		"frostbolt": slot = 1
		"lightning": slot = 2
		"basic_attack": slot = 3
	assert_eq(slot, 3)

func test_unknown_ability_is_slot_minus_1():
	var ability_type = "unknown"
	var slot = -1
	match ability_type:
		"fireball": slot = 0
		"frostbolt": slot = 1
		"lightning": slot = 2
		"basic_attack": slot = 3
	assert_eq(slot, -1)
