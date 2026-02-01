extends Node3D
## Click indicator that fades out after appearing

var lifetime: float = 0.5
var elapsed: float = 0.0
var cylinder: CSGCylinder3D

func _ready() -> void:
	position.y = 0.02  # Slightly above ground
	cylinder = $CSGCylinder3D

func _process(delta: float) -> void:
	elapsed += delta

	# Fade out - modify material transparency
	var alpha = 1.0 - (elapsed / lifetime)
	if cylinder and cylinder.material:
		var mat = cylinder.material as StandardMaterial3D
		if mat:
			mat.albedo_color.a = alpha

	# Expand slightly
	scale = Vector3.ONE * (1.0 + (elapsed / lifetime) * 0.2)

	if elapsed >= lifetime:
		queue_free()
