extends Label3D
## Floating damage number that appears when entities take damage

var velocity: Vector3 = Vector3(0, 2, 0)
var lifetime: float = 1.5
var age: float = 0.0
var damage_type: String = "physical"

func _ready() -> void:
	billboard = BaseMaterial3D.BILLBOARD_ENABLED
	outline_render_priority = 1
	outline_size = 2

	# Set color based on damage type
	match damage_type:
		"fire":
			modulate = Color(1.0, 0.4, 0.0)  # Orange
			outline_modulate = Color(0.3, 0.1, 0.0)  # Dark orange
		"cold":
			modulate = Color(0.3, 0.7, 1.0)  # Light blue
			outline_modulate = Color(0.0, 0.2, 0.4)  # Dark blue
		"lightning":
			modulate = Color(1.0, 1.0, 0.3)  # Yellow
			outline_modulate = Color(0.3, 0.3, 0.0)  # Dark yellow
		"physical":
			modulate = Color(1.0, 1.0, 1.0)  # White
			outline_modulate = Color(0.3, 0.3, 0.3)  # Gray
		_:
			modulate = Color(1.0, 1.0, 1.0)

	# Random horizontal velocity for variety
	velocity.x = randf_range(-0.5, 0.5)
	velocity.z = randf_range(-0.5, 0.5)

func _process(delta: float) -> void:
	age += delta

	# Move upward
	global_position += velocity * delta

	# Slow down over time
	velocity.y -= delta * 2.0

	# Fade out
	var fade_progress = age / lifetime
	modulate.a = 1.0 - fade_progress

	# Remove when lifetime expires
	if age >= lifetime:
		queue_free()

func setup(damage_amount: float, dmg_type: String) -> void:
	text = str(int(damage_amount))
	damage_type = dmg_type
