extends Node3D
## Procedurally generated cube-based humanoid with walk animation.
## Each body part is a BoxMesh on a joint (Node3D pivot).
## Bone hierarchy:
##   Root
##   └── Hips
##       ├── LeftLeg -> UpperLeg -> Knee -> LowerLeg
##       ├── RightLeg -> UpperLeg -> Knee -> LowerLeg
##       └── Spine
##           ├── Torso mesh
##           ├── Head mesh (with eyes)
##           ├── LeftArm -> UpperArm -> Elbow -> LowerArm
##           └── RightArm -> UpperArm -> Elbow -> LowerArm

# Colors
var player_color: Color = Color(0.0, 0.67, 1.0)
const SKIN_COLOR = Color(0.91, 0.72, 0.62)
const SKIN_SHADOW = Color(0.79, 0.59, 0.48)
const SHOE_COLOR = Color(0.29, 0.22, 0.16)
const EYE_COLOR = Color(0.13, 0.13, 0.13)

# Walk animation parameters
const WALK_CYCLE_SPEED: float = 10.0  # radians per second
const UPPER_LIMB_SWING: float = 0.6   # max swing angle (~34 degrees)
const LOWER_ARM_SWING: float = 0.4
const LOWER_LEG_SWING: float = 0.55
const LOWER_LEG_PHASE: float = 0.3
const TORSO_BOB_AMOUNT: float = 0.04
const HEAD_BOB_AMOUNT: float = 0.03

# Body dimensions
const HEAD_SIZE = Vector3(0.3, 0.3, 0.3)
const TORSO_SIZE = Vector3(0.45, 0.55, 0.25)
const UPPER_ARM_SIZE = Vector3(0.14, 0.3, 0.14)
const LOWER_ARM_SIZE = Vector3(0.12, 0.27, 0.12)
const UPPER_LEG_SIZE = Vector3(0.17, 0.35, 0.17)
const LOWER_LEG_SIZE = Vector3(0.14, 0.33, 0.14)

# Joint references
var hips: Node3D
var spine: Node3D
var head_node: MeshInstance3D
var torso_node: MeshInstance3D
var left_shoulder: Node3D
var right_shoulder: Node3D
var left_elbow: Node3D
var right_elbow: Node3D
var left_hip: Node3D
var right_hip: Node3D
var left_knee: Node3D
var right_knee: Node3D

# Animation state
var walk_time: float = 0.0
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0

func _init() -> void:
	pass

func setup(color: Color) -> void:
	player_color = color
	_build_skeleton()

func _build_skeleton() -> void:
	var torso_color = player_color
	var torso_highlight = _lighten(player_color, 0.25)
	var pants_color = _darken(player_color, 0.4)

	# -- Hips (root pivot for legs + spine) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.0, 0)
	add_child(hips)

	# -- Left Leg --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.12, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, pants_color)
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, SHOE_COLOR)
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.12, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, pants_color)
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, SHOE_COLOR)
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine (torso + head + arms) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso
	torso_node = _create_limb("Torso", TORSO_SIZE, torso_color)
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Head
	head_node = _create_limb("Head", HEAD_SIZE, SKIN_COLOR)
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.03, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Eyes (two small dark cubes on the front of the head)
	var eye_size = Vector3(0.06, 0.06, 0.04)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var left_eye = _create_limb("LeftEye", eye_size, EYE_COLOR)
	left_eye.position = Vector3(-0.08, 0.03, -eye_z)
	head_node.add_child(left_eye)
	var right_eye = _create_limb("RightEye", eye_size, EYE_COLOR)
	right_eye.position = Vector3(0.08, 0.03, -eye_z)
	head_node.add_child(right_eye)

	# -- Left Arm --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.05, 0)
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, torso_highlight)
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, SKIN_COLOR)
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# -- Right Arm --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.05, 0)
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, torso_highlight)
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, SKIN_COLOR)
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)


func _create_limb(limb_name: String, size: Vector3, color: Color) -> MeshInstance3D:
	var mesh_instance = MeshInstance3D.new()
	mesh_instance.name = limb_name

	var box = BoxMesh.new()
	box.size = size
	mesh_instance.mesh = box

	var mat = StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.85
	mesh_instance.material_override = mat

	return mesh_instance


func update_animation(is_moving: bool, delta: float) -> void:
	if is_moving:
		walk_time += delta * WALK_CYCLE_SPEED
	else:
		# Smoothly return to idle
		if abs(walk_time) > 0.01:
			# Decay toward nearest multiple of 2*PI (idle pose)
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 8.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Upper limb swing (sin wave)
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount

	# Arms swing opposite to legs (left arm forward when right leg forward)
	left_shoulder.rotation.x = upper_swing
	right_shoulder.rotation.x = -upper_swing

	# Lower arm bend: bends more when upper arm swings backward
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.1
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING + 0.1
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Legs swing opposite to arms
	left_hip.rotation.x = -upper_swing
	right_hip.rotation.x = upper_swing

	# Lower leg: knee bends during back-swing
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	left_knee.rotation.x = left_knee_bend
	right_knee.rotation.x = right_knee_bend

	# Torso + head bob (double frequency)
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT
	else:
		spine.position.y = _base_spine_y
		head_node.position.y = _base_head_y


func _lighten(color: Color, amount: float) -> Color:
	return Color(
		minf(color.r + amount, 1.0),
		minf(color.g + amount, 1.0),
		minf(color.b + amount, 1.0),
		color.a
	)


func _darken(color: Color, amount: float) -> Color:
	return Color(
		maxf(color.r * (1.0 - amount), 0.0),
		maxf(color.g * (1.0 - amount), 0.0),
		maxf(color.b * (1.0 - amount), 0.0),
		color.a
	)
