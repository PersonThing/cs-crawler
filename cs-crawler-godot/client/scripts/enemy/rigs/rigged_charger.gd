extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Charger enemy rigged model - bull-like quadruped with horns.
## Features: four legs, muscular torso, horns, galloping animation when charging.

# Constants for charger proportions (quadruped bull)
const HEAD_SIZE = Vector3(0.35, 0.30, 0.40)
const SNOUT_SIZE = Vector3(0.25, 0.18, 0.15)
const TORSO_SIZE = Vector3(0.55, 0.40, 0.75)  # Barrel-shaped torso
const NECK_SIZE = Vector3(0.28, 0.25, 0.28)

# Legs (four legs, quadruped)
const FRONT_UPPER_LEG_SIZE = Vector3(0.18, 0.30, 0.18)
const FRONT_LOWER_LEG_SIZE = Vector3(0.15, 0.28, 0.15)
const BACK_UPPER_LEG_SIZE = Vector3(0.20, 0.32, 0.20)
const BACK_LOWER_LEG_SIZE = Vector3(0.17, 0.30, 0.17)

# Horns
const HORN_SIZE = Vector3(0.08, 0.35, 0.08)

# Animation parameters
const WALK_CYCLE_SPEED: float = 8.0
const GALLOP_SPEED: float = 16.0
const LEG_SWING: float = 0.6
const GALLOP_SWING: float = 1.0

# Joint references (quadruped)
var head_node: MeshInstance3D
var neck: Node3D
var torso_node: MeshInstance3D
var front_left_shoulder: Node3D
var front_right_shoulder: Node3D
var front_left_knee: Node3D
var front_right_knee: Node3D
var back_left_hip: Node3D
var back_right_hip: Node3D
var back_left_knee: Node3D
var back_right_knee: Node3D
var left_horn: MeshInstance3D
var right_horn: MeshInstance3D

# State tracking
var _is_charging: bool = false
var _is_pawing: bool = false

func _build_skeleton() -> void:
	var brown = Color(0.45, 0.25, 0.15)
	var dark_brown = Color(0.3, 0.18, 0.1)
	var horn_color = Color(0.85, 0.8, 0.7)
	var eye_red = Color(0.9, 0.1, 0.1)

	# -- Hips (root pivot for quadruped, centered on body) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.0, 0)  # Lower for quadruped stance
	add_child(hips)

	# -- Back Left Leg --
	back_left_hip = Node3D.new()
	back_left_hip.name = "BackLeftHip"
	back_left_hip.position = Vector3(-0.20, 0, 0.25)
	hips.add_child(back_left_hip)

	var back_left_upper = _create_limb("BackLeftUpperLeg", BACK_UPPER_LEG_SIZE, brown, Vector3(5, 0, 0))
	back_left_upper.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y / 2.0, 0)
	back_left_hip.add_child(back_left_upper)

	back_left_knee = Node3D.new()
	back_left_knee.name = "BackLeftKnee"
	back_left_knee.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y, 0)
	back_left_hip.add_child(back_left_knee)

	var back_left_lower = _create_limb("BackLeftLowerLeg", BACK_LOWER_LEG_SIZE, dark_brown, Vector3(-3, 0, 0))
	back_left_lower.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0, 0)
	back_left_knee.add_child(back_left_lower)

	# Hoof
	var back_left_hoof = _create_limb("BackLeftHoof", Vector3(0.18, 0.08, 0.18), Color(0.15, 0.15, 0.15), Vector3(0, 0, 0))
	back_left_hoof.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0 - 0.04, 0)
	back_left_knee.add_child(back_left_hoof)

	# -- Back Right Leg --
	back_right_hip = Node3D.new()
	back_right_hip.name = "BackRightHip"
	back_right_hip.position = Vector3(0.20, 0, 0.25)
	hips.add_child(back_right_hip)

	var back_right_upper = _create_limb("BackRightUpperLeg", BACK_UPPER_LEG_SIZE, brown, Vector3(5, 0, 0))
	back_right_upper.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y / 2.0, 0)
	back_right_hip.add_child(back_right_upper)

	back_right_knee = Node3D.new()
	back_right_knee.name = "BackRightKnee"
	back_right_knee.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y, 0)
	back_right_hip.add_child(back_right_knee)

	var back_right_lower = _create_limb("BackRightLowerLeg", BACK_LOWER_LEG_SIZE, dark_brown, Vector3(-3, 0, 0))
	back_right_lower.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0, 0)
	back_right_knee.add_child(back_right_lower)

	var back_right_hoof = _create_limb("BackRightHoof", Vector3(0.18, 0.08, 0.18), Color(0.15, 0.15, 0.15), Vector3(0, 0, 0))
	back_right_hoof.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0 - 0.04, 0)
	back_right_knee.add_child(back_right_hoof)

	# -- Spine (torso pivot) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0.15, 0)
	hips.add_child(spine)

	# Torso (barrel-shaped, muscular)
	torso_node = _create_limb("Torso", TORSO_SIZE, brown, Vector3(-5, 0, 0))
	torso_node.position = Vector3(0, 0, 0)
	spine.add_child(torso_node)

	# -- Front Left Leg (attached to front of torso) --
	front_left_shoulder = Node3D.new()
	front_left_shoulder.name = "FrontLeftShoulder"
	front_left_shoulder.position = Vector3(-0.20, -0.05, -TORSO_SIZE.z / 2.0 + 0.1)
	spine.add_child(front_left_shoulder)

	var front_left_upper = _create_limb("FrontLeftUpperLeg", FRONT_UPPER_LEG_SIZE, brown, Vector3(5, 0, 0))
	front_left_upper.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y / 2.0, 0)
	front_left_shoulder.add_child(front_left_upper)

	front_left_knee = Node3D.new()
	front_left_knee.name = "FrontLeftKnee"
	front_left_knee.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y, 0)
	front_left_shoulder.add_child(front_left_knee)

	var front_left_lower = _create_limb("FrontLeftLowerLeg", FRONT_LOWER_LEG_SIZE, dark_brown, Vector3(-3, 0, 0))
	front_left_lower.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0, 0)
	front_left_knee.add_child(front_left_lower)

	var front_left_hoof = _create_limb("FrontLeftHoof", Vector3(0.16, 0.08, 0.16), Color(0.15, 0.15, 0.15), Vector3(0, 0, 0))
	front_left_hoof.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0 - 0.04, 0)
	front_left_knee.add_child(front_left_hoof)

	# -- Front Right Leg --
	front_right_shoulder = Node3D.new()
	front_right_shoulder.name = "FrontRightShoulder"
	front_right_shoulder.position = Vector3(0.20, -0.05, -TORSO_SIZE.z / 2.0 + 0.1)
	spine.add_child(front_right_shoulder)

	var front_right_upper = _create_limb("FrontRightUpperLeg", FRONT_UPPER_LEG_SIZE, brown, Vector3(5, 0, 0))
	front_right_upper.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y / 2.0, 0)
	front_right_shoulder.add_child(front_right_upper)

	front_right_knee = Node3D.new()
	front_right_knee.name = "FrontRightKnee"
	front_right_knee.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y, 0)
	front_right_shoulder.add_child(front_right_knee)

	var front_right_lower = _create_limb("FrontRightLowerLeg", FRONT_LOWER_LEG_SIZE, dark_brown, Vector3(-3, 0, 0))
	front_right_lower.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0, 0)
	front_right_knee.add_child(front_right_lower)

	var front_right_hoof = _create_limb("FrontRightHoof", Vector3(0.16, 0.08, 0.16), Color(0.15, 0.15, 0.15), Vector3(0, 0, 0))
	front_right_hoof.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0 - 0.04, 0)
	front_right_knee.add_child(front_right_hoof)

	# -- Neck --
	neck = Node3D.new()
	neck.name = "Neck"
	neck.position = Vector3(0, 0.1, -TORSO_SIZE.z / 2.0)
	spine.add_child(neck)

	var neck_mesh = _create_limb("NeckMesh", NECK_SIZE, brown, Vector3(0, 0, 0))
	neck_mesh.position = Vector3(0, 0, -NECK_SIZE.z / 2.0)
	neck.add_child(neck_mesh)

	# -- Head --
	head_node = _create_limb("Head", HEAD_SIZE, dark_brown, Vector3(0, 0, 0))
	head_node.position = Vector3(0, 0, -NECK_SIZE.z - HEAD_SIZE.z / 2.0)
	neck.add_child(head_node)

	# Snout
	var snout = _create_limb("Snout", SNOUT_SIZE, brown, Vector3(0, 0, 0))
	snout.position = Vector3(0, -0.08, -HEAD_SIZE.z / 2.0 - SNOUT_SIZE.z / 2.0)
	head_node.add_child(snout)

	# Nostrils (angry red)
	var nostril_size = Vector3(0.06, 0.04, 0.03)
	var left_nostril = _create_limb("LeftNostril", nostril_size, Color(0.3, 0.1, 0.1), Vector3(0, 0, 0))
	left_nostril.position = Vector3(-0.08, -0.02, -SNOUT_SIZE.z / 2.0 - 0.01)
	snout.add_child(left_nostril)

	var right_nostril = _create_limb("RightNostril", nostril_size, Color(0.3, 0.1, 0.1), Vector3(0, 0, 0))
	right_nostril.position = Vector3(0.08, -0.02, -SNOUT_SIZE.z / 2.0 - 0.01)
	snout.add_child(right_nostril)

	# Eyes (red, angry)
	var eye_size = Vector3(0.08, 0.06, 0.04)
	var left_eye = _create_limb("LeftEye", eye_size, eye_red, Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.12, 0.05, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(left_eye)

	var right_eye = _create_limb("RightEye", eye_size, eye_red, Vector3(0, 0, 0))
	right_eye.position = Vector3(0.12, 0.05, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(right_eye)

	# Horns (curved forward)
	left_horn = _create_limb("LeftHorn", HORN_SIZE, horn_color, Vector3(0, 0, -35))
	left_horn.position = Vector3(-0.15, HEAD_SIZE.y / 2.0, -0.05)
	head_node.add_child(left_horn)

	right_horn = _create_limb("RightHorn", HORN_SIZE, horn_color, Vector3(0, 0, 35))
	right_horn.position = Vector3(0.15, HEAD_SIZE.y / 2.0, -0.05)
	head_node.add_child(right_horn)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Check state
	_is_charging = (ai_state == "charging" or ai_state == "charge")
	_is_pawing = (ai_state == "rage" or ai_state == "angry")

	# Update walk time
	var cycle_speed = GALLOP_SPEED if _is_charging else WALK_CYCLE_SPEED
	if is_moving:
		walk_time += delta * cycle_speed
	else:
		# Slow decay
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 6.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	var t = walk_time
	var swing_amount = GALLOP_SWING if _is_charging else LEG_SWING

	# Pawing ground animation (when idle and angry)
	if _is_pawing and not is_moving:
		# Front right leg paws ground
		front_right_shoulder.rotation.x = abs(sin(t * 4.0)) * 0.6
		front_right_knee.rotation.x = abs(sin(t * 4.0)) * 0.4

		# Lean forward slightly
		neck.rotation.x = -0.2
		head_node.rotation.x = 0.1

		return  # Skip normal walk animation

	# Quadruped gallop: diagonal pairs move together
	# Back left + front right
	# Back right + front left

	var back_left_phase = sin(t)
	var back_right_phase = sin(t + PI)  # Opposite phase
	var front_left_phase = sin(t + PI)  # Matches back right
	var front_right_phase = sin(t)  # Matches back left

	# Back legs
	back_left_hip.rotation.x = back_left_phase * swing_amount
	back_left_knee.rotation.x = maxf(0.0, back_left_phase) * swing_amount * 0.8

	back_right_hip.rotation.x = back_right_phase * swing_amount
	back_right_knee.rotation.x = maxf(0.0, back_right_phase) * swing_amount * 0.8

	# Front legs
	front_left_shoulder.rotation.x = front_left_phase * swing_amount
	front_left_knee.rotation.x = maxf(0.0, front_left_phase) * swing_amount * 0.6

	front_right_shoulder.rotation.x = front_right_phase * swing_amount
	front_right_knee.rotation.x = maxf(0.0, front_right_phase) * swing_amount * 0.6

	# Body bob when moving
	if is_moving:
		var bob = abs(sin(t * 2.0)) * 0.1
		spine.position.y = 0.15 + bob

		# Lean forward when charging
		if _is_charging:
			neck.rotation.x = -0.4
			head_node.rotation.x = 0.2
		else:
			neck.rotation.x = -0.1
			head_node.rotation.x = 0.0
	else:
		spine.position.y = 0.15
		neck.rotation.x = 0.0
		head_node.rotation.x = 0.0
