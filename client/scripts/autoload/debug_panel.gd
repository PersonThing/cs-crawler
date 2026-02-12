extends CanvasLayer
## Global debug panel - write to it from anywhere with DebugPanel.msg("text")
## Toggle visibility with F11

var _panel: PanelContainer
var _label: RichTextLabel
var _lines: Array[String] = []
var _max_lines: int = 50
var _visible: bool = true
var _user_scrolled: bool = false

# Watched values: key -> value (displayed persistently at the top)
var _watched: Dictionary = {}

func _ready() -> void:
	layer = 100  # Always on top

	_panel = PanelContainer.new()
	_panel.name = "DebugPanelContainer"
	# Top-left, fixed width
	_panel.anchor_left = 0.0
	_panel.anchor_top = 0.0
	_panel.anchor_right = 0.0
	_panel.anchor_bottom = 0.0
	_panel.offset_left = 10
	_panel.offset_top = 40
	_panel.offset_right = 450
	_panel.offset_bottom = 500
	_panel.mouse_filter = Control.MOUSE_FILTER_PASS

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0.7)
	style.set_corner_radius_all(4)
	style.set_content_margin_all(8)
	_panel.add_theme_stylebox_override("panel", style)
	add_child(_panel)

	_label = RichTextLabel.new()
	_label.name = "DebugLabel"
	_label.bbcode_enabled = true
	_label.scroll_following = false
	_label.mouse_filter = Control.MOUSE_FILTER_STOP
	_label.add_theme_font_size_override("normal_font_size", 12)
	_label.add_theme_color_override("default_color", Color(0.8, 1.0, 0.8))
	_label.get_v_scroll_bar().value_changed.connect(_on_scroll)
	_panel.add_child(_label)

	_panel.visible = _visible
	msg("[color=yellow]Debug panel ready. F11 to toggle.[/color]")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_F11:
		_visible = not _visible
		_panel.visible = _visible
		get_viewport().set_input_as_handled()

func _on_scroll(_value: float) -> void:
	var scrollbar = _label.get_v_scroll_bar()
	# User is "at the bottom" if within a small threshold of max scroll
	_user_scrolled = scrollbar.value < (scrollbar.max_value - scrollbar.page - 1.0)

## Add a timestamped log line
func msg(text: String) -> void:
	var time_str = Time.get_time_string_from_system().substr(0, 8)
	_lines.append("[color=gray]%s[/color] %s" % [time_str, text])
	if _lines.size() > _max_lines:
		_lines.pop_front()
	_refresh()

## Set a watched value (displayed persistently at the top)
func watch(key: String, value) -> void:
	_watched[key] = str(value)
	_refresh()

## Remove a watched value
func unwatch(key: String) -> void:
	_watched.erase(key)
	_refresh()

func _refresh() -> void:
	var output = ""

	# Watched values at the top
	if _watched.size() > 0:
		for key in _watched:
			output += "[color=cyan]%s:[/color] %s\n" % [key, _watched[key]]
		output += "[color=gray]---[/color]\n"

	# Log lines
	output += "\n".join(_lines)
	_label.text = output

	# Only auto-scroll to bottom if user hasn't scrolled up
	if not _user_scrolled:
		# Defer so the scrollbar updates after text change
		_label.call_deferred("scroll_to_line", _label.get_line_count())
