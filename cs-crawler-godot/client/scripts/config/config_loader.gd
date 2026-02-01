extends Node
## Global configuration loader singleton
## Loads JSON configs from the config directory

var abilities: Dictionary = {}
var enemies: Dictionary = {}
var player_config: Dictionary = {}
var combat_config: Dictionary = {}
var camera_config: Dictionary = {}

func _ready() -> void:
	print("[CONFIG] Loading configuration files...")
	_load_abilities()
	_load_enemies()
	_load_player()
	_load_combat()
	_load_camera()
	print("[CONFIG] All configuration files loaded")

func _load_abilities() -> void:
	var data = _load_json("res://../../config/shared/abilities.json")
	if data:
		abilities = data.get("abilities", {})
		print("[CONFIG] Loaded ", abilities.size(), " abilities (version ", data.get("version", "?"), ")")
	else:
		push_error("[CONFIG] Failed to load abilities, using defaults")
		_use_default_abilities()

func _load_enemies() -> void:
	var data = _load_json("res://../../config/shared/enemies.json")
	if data:
		enemies = data.get("enemyTypes", {})
		print("[CONFIG] Loaded ", enemies.size(), " enemy types (version ", data.get("version", "?"), ")")
	else:
		push_error("[CONFIG] Failed to load enemies, using defaults")
		_use_default_enemies()

func _load_player() -> void:
	var data = _load_json("res://../../config/shared/player.json")
	if data:
		player_config = data
		print("[CONFIG] Loaded player config (version ", data.get("version", "?"), ")")
	else:
		push_error("[CONFIG] Failed to load player config, using defaults")
		_use_default_player()

func _load_combat() -> void:
	var data = _load_json("res://../../config/shared/combat.json")
	if data:
		combat_config = data
		print("[CONFIG] Loaded combat config (version ", data.get("version", "?"), ")")
	else:
		push_error("[CONFIG] Failed to load combat config, using defaults")
		_use_default_combat()

func _load_camera() -> void:
	var data = _load_json("res://../../config/client/camera.json")
	if data:
		camera_config = data
		print("[CONFIG] Loaded camera config (version ", data.get("version", "?"), ")")
	else:
		push_error("[CONFIG] Failed to load camera config, using defaults")
		_use_default_camera()

func _load_json(file_path: String) -> Dictionary:
	if not FileAccess.file_exists(file_path):
		push_error("[CONFIG] File not found: " + file_path)
		return {}

	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file:
		push_error("[CONFIG] Failed to open: " + file_path)
		return {}

	var json_text = file.get_as_text()
	file.close()

	var json = JSON.new()
	var parse_result = json.parse(json_text)

	if parse_result != OK:
		push_error("[CONFIG] Failed to parse JSON in: " + file_path)
		push_error("[CONFIG] Error: " + json.get_error_message() + " at line " + str(json.get_error_line()))
		return {}

	var data = json.get_data()
	if typeof(data) != TYPE_DICTIONARY:
		push_error("[CONFIG] Expected dictionary in: " + file_path)
		return {}

	return data

# Getter methods
func get_ability(ability_type: String) -> Dictionary:
	return abilities.get(ability_type, {})

func get_enemy(enemy_type: String) -> Dictionary:
	return enemies.get(enemy_type, {})

func get_player_stat(stat_name: String) -> float:
	var base_stats = player_config.get("baseStats", {})
	return base_stats.get(stat_name, 0.0)

func get_camera_setting(setting_name: String) -> Variant:
	var camera_settings = camera_config.get("camera", {})
	return camera_settings.get(setting_name, null)

func get_collision_radius(collision_type: String) -> float:
	var radii = combat_config.get("collisionRadii", {})
	return radii.get(collision_type, 0.5)

# Fallback defaults
func _use_default_abilities() -> void:
	abilities = {
		"fireball": {
			"name": "Fireball",
			"cooldown": 0.5,
			"damage": 25.0,
			"damageType": "fire"
		}
	}

func _use_default_enemies() -> void:
	enemies = {
		"basic": {
			"name": "Basic Enemy",
			"health": 100,
			"maxHealth": 100,
			"visual": {
				"color": [0.8, 0.2, 0.2],
				"height": 1.8,
				"radius": 0.4
			}
		}
	}

func _use_default_player() -> void:
	player_config = {
		"baseStats": {
			"health": 100,
			"maxHealth": 100,
			"moveSpeed": 5.0
		}
	}

func _use_default_combat() -> void:
	combat_config = {
		"collisionRadii": {
			"projectile": 0.5,
			"melee": 1.5,
			"aoe": 5.0
		}
	}

func _use_default_camera() -> void:
	camera_config = {
		"camera": {
			"baseOffset": [0, 20, 7.3],
			"deadzone": 3.0,
			"followSpeed": 4.0,
			"angle": 70,
			"fov": 70
		},
		"screenShake": {
			"amount": 0.1,
			"decay": 5.0
		}
	}
