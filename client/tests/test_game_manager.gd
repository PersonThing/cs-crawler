extends GutTest
## Unit tests for GameManager autoload

func before_each():
	# Reset state before each test
	GameManager.set_game_state(GameManager.GameState.DISCONNECTED)
	GameManager.local_player_id = ""
	GameManager.local_player_data.clear()

func test_initial_state():
	assert_eq(GameManager.current_state, GameManager.GameState.DISCONNECTED)
	assert_eq(GameManager.local_player_id, "")

func test_set_game_state_changes_state():
	GameManager.set_game_state(GameManager.GameState.LOBBY)
	assert_eq(GameManager.current_state, GameManager.GameState.LOBBY)

func test_set_game_state_emits_signal():
	var signal_watcher = watch_signals(GameManager)

	GameManager.set_game_state(GameManager.GameState.IN_GAME)

	assert_signal_emitted(GameManager, "game_state_changed")
	assert_signal_emit_count(GameManager, "game_state_changed", 1)

func test_set_game_state_does_not_emit_if_same():
	GameManager.set_game_state(GameManager.GameState.LOBBY)
	var signal_watcher = watch_signals(GameManager)

	GameManager.set_game_state(GameManager.GameState.LOBBY)

	assert_signal_not_emitted(GameManager, "game_state_changed")

func test_is_in_game():
	GameManager.set_game_state(GameManager.GameState.DISCONNECTED)
	assert_false(GameManager.is_in_game())

	GameManager.set_game_state(GameManager.GameState.IN_GAME)
	assert_true(GameManager.is_in_game())

func test_update_player_stats():
	var stats = {"health": 100, "max_health": 150}
	var signal_watcher = watch_signals(GameManager)

	GameManager.update_player_stats(stats)

	assert_eq(GameManager.local_player_data["health"], 100)
	assert_eq(GameManager.local_player_data["max_health"], 150)
	assert_signal_emitted(GameManager, "player_stats_updated")

func test_update_player_stats_merges():
	GameManager.local_player_data = {"health": 100, "mana": 50}

	GameManager.update_player_stats({"health": 75})

	assert_eq(GameManager.local_player_data["health"], 75)
	assert_eq(GameManager.local_player_data["mana"], 50)
