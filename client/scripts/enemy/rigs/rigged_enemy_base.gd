extends Node3D
## Base class for procedurally generated rigged enemy models.
## Provides shared utilities for skeleton building and animation.
## Enemy-specific rigs should extend this class and override _build_skeleton() and update_animation().

# Animation state
var walk_time: float = 0.0
var enemy_type: String = "basic"
var enemy_color: Color = Color.WHITE

# Joint references (to be set by subclasses)
var hips: Node3D = null
var spine: Node3D = null

# Override in subclasses to build unique skeletons
func _build_skeleton() -> void:
	push_warning("_build_skeleton() not implemented in subclass")

# Called when enemy is instantiated
func setup(color: Color, type: String) -> void:
	enemy_color = color
	enemy_type = type
	_build_skeleton()

# Override in subclasses for custom animations
# ai_state can be: idle, chase, attack, flee, etc.
func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Base implementation does nothing - subclasses should override
	pass

# Utility function to create a limb mesh
func _create_limb(limb_name: String, size: Vector3, color: Color, rotation_degrees: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mesh_instance = MeshInstance3D.new()
	mesh_instance.name = limb_name

	var box = BoxMesh.new()
	box.size = size
	mesh_instance.mesh = box

	# Apply rotation to make it less blocky
	mesh_instance.rotation_degrees = rotation_degrees

	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.85
	mesh_instance.material_override = mat

	return mesh_instance

# Create a sphere mesh (useful for heads, joints, etc.)
func _create_sphere(sphere_name: String, radius: float, color: Color) -> MeshInstance3D:
	var mesh_instance = MeshInstance3D.new()
	mesh_instance.name = sphere_name

	var sphere = SphereMesh.new()
	sphere.radius = radius
	sphere.height = radius * 2
	mesh_instance.mesh = sphere

	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.85
	mesh_instance.material_override = mat

	return mesh_instance

# Lighten a color by adding to RGB channels
func _lighten(color: Color, amount: float) -> Color:
	return Color(
		minf(color.r + amount, 1.0),
		minf(color.g + amount, 1.0),
		minf(color.b + amount, 1.0),
		color.a
	)

# Darken a color by multiplying RGB channels
func _darken(color: Color, amount: float) -> Color:
	return Color(
		maxf(color.r * (1.0 - amount), 0.0),
		maxf(color.g * (1.0 - amount), 0.0),
		maxf(color.b * (1.0 - amount), 0.0),
		color.a
	)

# Apply a color tint (for status effects like rage, buff, charge)
func apply_color_tint(tint_color: Color, strength: float = 0.5) -> void:
	var tinted = enemy_color.lerp(tint_color, strength)
	_apply_color_to_all_materials(tinted)

# Reset color to base
func reset_color() -> void:
	_apply_color_to_all_materials(enemy_color)

# Helper to apply color to all mesh materials in the rig
func _apply_color_to_all_materials(color: Color) -> void:
	for child in _get_all_mesh_instances(self):
		if child.material_override and child.material_override is StandardMaterial3D:
			child.material_override.albedo_color = color

# Recursively get all MeshInstance3D nodes
func _get_all_mesh_instances(node: Node) -> Array:
	var meshes = []
	if node is MeshInstance3D:
		meshes.append(node)
	for child in node.get_children():
		meshes.append_array(_get_all_mesh_instances(child))
	return meshes
