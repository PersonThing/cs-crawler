extends Node
## Global game state manager
## Handles game state, player data, and cross-scene coordination

signal game_state_changed(new_state: GameState)
signal player_stats_updated(stats: Dictionary)

enum GameState {
	DISCONNECTED,
	CONNECTING,
	LOBBY,
	IN_GAME,
	PAUSED
}

var current_state: GameState = GameState.DISCONNECTED
var local_player_id: String = ""
var username: String = ""
var local_player_data: Dictionary = {}
var game_config: Dictionary = {}
var pending_level_data: Dictionary = {}  # Level data received during scene transition

func _ready() -> void:
	print("GameManager initialized")

func set_game_state(new_state: GameState) -> void:
	if current_state != new_state:
		current_state = new_state
		game_state_changed.emit(new_state)
		print("Game state changed to: ", GameState.keys()[new_state])

func update_player_stats(stats: Dictionary) -> void:
	local_player_data.merge(stats, true)
	player_stats_updated.emit(stats)

func is_in_game() -> bool:
	return current_state == GameState.IN_GAME
