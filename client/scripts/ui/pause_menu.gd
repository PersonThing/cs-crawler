extends CanvasLayer
## Pause menu - shown when ESC is pressed during gameplay
## ESC closes inventory first if open, then shows this menu

var menu_panel: PanelContainer = null
var is_visible: bool = false

func _ready() -> void:
	_setup_ui()
	hide_menu()

func _setup_ui() -> void:
	# Create dark overlay
	var overlay = ColorRect.new()
	overlay.name = "Overlay"
	overlay.color = Color(0, 0, 0, 0.5)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)

	# Create centered panel
	menu_panel = PanelContainer.new()
	menu_panel.name = "MenuPanel"

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.15, 0.15, 0.18, 0.95)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.4, 0.4, 0.5)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 30
	style.content_margin_right = 30
	style.content_margin_top = 20
	style.content_margin_bottom = 20
	menu_panel.add_theme_stylebox_override("panel", style)

	# Center the panel
	menu_panel.set_anchors_preset(Control.PRESET_CENTER)
	menu_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	menu_panel.grow_vertical = Control.GROW_DIRECTION_BOTH

	# VBox for content
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 15)

	# Title
	var title = Label.new()
	title.text = "Game Paused"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 24)
	vbox.add_child(title)

	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	vbox.add_child(spacer)

	# Save and Exit button
	var save_exit_btn = Button.new()
	save_exit_btn.text = "Save and Exit"
	save_exit_btn.custom_minimum_size = Vector2(200, 40)
	save_exit_btn.pressed.connect(_on_save_exit_pressed)
	vbox.add_child(save_exit_btn)

	# Cancel button
	var cancel_btn = Button.new()
	cancel_btn.text = "Cancel"
	cancel_btn.custom_minimum_size = Vector2(200, 40)
	cancel_btn.pressed.connect(_on_cancel_pressed)
	vbox.add_child(cancel_btn)

	menu_panel.add_child(vbox)
	add_child(menu_panel)

func _get_inventory_panel() -> Control:
	# Find inventory panel in the game world (parent node)
	var game_world = get_parent()
	if game_world and "inventory_panel" in game_world:
		return game_world.inventory_panel
	return null

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		# First check if inventory is open - close it instead of showing pause menu
		var inventory = _get_inventory_panel()
		if inventory and inventory.visible:
			inventory.visible = false
			get_viewport().set_input_as_handled()
			return

		# Toggle pause menu
		if is_visible:
			hide_menu()
		else:
			show_menu()
		get_viewport().set_input_as_handled()

func show_menu() -> void:
	is_visible = true
	visible = true

func hide_menu() -> void:
	is_visible = false
	visible = false

func _on_save_exit_pressed() -> void:
	hide_menu()
	# Return to lobby (stay connected to server)
	GameManager.local_player_id = ""  # Clear local player
	get_tree().change_scene_to_file("res://scenes/lobby.tscn")

func _on_cancel_pressed() -> void:
	hide_menu()
