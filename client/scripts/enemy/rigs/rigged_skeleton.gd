extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Skeleton rigged model with thin proportions and jerky animation.
## Features: thin limbs, gaps at joints, fast jerky movement, rattling idle.

# Constants for skeleton proportions (60% width of normal)
const HEAD_SIZE = Vector3(0.26, 0.26, 0.26)
const TORSO_SIZE = Vector3(0.30, 0.50, 0.18)
const UPPER_ARM_SIZE = Vector3(0.09, 0.28, 0.09)
const LOWER_ARM_SIZE = Vector3(0.08, 0.25, 0.08)
const UPPER_LEG_SIZE = Vector3(0.11, 0.32, 0.11)
const LOWER_LEG_SIZE = Vector3(0.09, 0.30, 0.09)

# Joint gap offset to show separation
const JOINT_GAP: float = 0.05

# Animation parameters (faster and jerkier than player)
const WALK_CYCLE_SPEED: float = 15.0  # 1.5x speed for fast movement
const UPPER_LIMB_SWING: float = 0.7  # More exaggerated
const LOWER_ARM_SWING: float = 0.5
const LOWER_LEG_SWING: float = 0.6
const LOWER_LEG_PHASE: float = 0.35
const TORSO_BOB_AMOUNT: float = 0.05
const HEAD_BOB_AMOUNT: float = 0.04

# Jerky animation parameters
const JERK_FREQUENCY: float = 20.0  # Fast jittery motion
const JERK_AMOUNT: float = 0.02

# Joint references
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

# Base positions
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0

# Rattle timer for idle animation
var _rattle_time: float = 0.0

func _build_skeleton() -> void:
	var bone_white = Color(0.9, 0.9, 0.85)
	var bone_shadow = Color(0.7, 0.7, 0.65)
	var bone_dark = Color(0.5, 0.5, 0.45)

	# -- Hips (root pivot) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.0, 0)
	add_child(hips)

	# -- Left Leg --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.10, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, bone_white, Vector3(2, 0, 4))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0 - JOINT_GAP, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y - JOINT_GAP, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, bone_shadow, Vector3(-2, 0, -2))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0 - JOINT_GAP, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.10, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, bone_white, Vector3(2, 0, -4))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0 - JOINT_GAP, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y - JOINT_GAP, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, bone_shadow, Vector3(-2, 0, 2))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0 - JOINT_GAP, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (thin ribcage)
	torso_node = _create_limb("Torso", TORSO_SIZE, bone_white, Vector3(-1, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Ribs (decorative lines)
	var rib_color = bone_dark
	for i in range(3):
		var rib = _create_limb("Rib%d" % i, Vector3(TORSO_SIZE.x * 0.9, 0.02, TORSO_SIZE.z * 0.6), rib_color, Vector3(0, 0, 0))
		rib.position = Vector3(0, TORSO_SIZE.y * 0.3 - i * 0.12, 0)
		torso_node.add_child(rib)

	# Head (skull-like)
	head_node = _create_limb("Head", HEAD_SIZE, bone_white, Vector3(0, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.05 + JOINT_GAP, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Eyes (dark sockets)
	var eye_size = Vector3(0.07, 0.05, 0.04)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var left_eye = _create_limb("LeftEye", eye_size, Color(0.05, 0.05, 0.05), Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.07, 0.02, -eye_z)
	head_node.add_child(left_eye)
	var right_eye = _create_limb("RightEye", eye_size, Color(0.05, 0.05, 0.05), Vector3(0, 0, 0))
	right_eye.position = Vector3(0.07, 0.02, -eye_z)
	head_node.add_child(right_eye)

	# Jaw (small box below head)
	var jaw = _create_limb("Jaw", Vector3(0.18, 0.08, 0.14), bone_shadow, Vector3(0, 0, 0))
	jaw.position = Vector3(0, -0.12, -0.02)
	head_node.add_child(jaw)

	# -- Left Arm --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.05, 0)
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, bone_white, Vector3(-6, 0, -12))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0 - JOINT_GAP, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y - JOINT_GAP, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, bone_shadow, Vector3(4, 0, 10))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - JOINT_GAP, 0)
	left_elbow.add_child(left_lower_arm)

	# -- Right Arm --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.05, 0)
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, bone_white, Vector3(-6, 0, 12))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0 - JOINT_GAP, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y - JOINT_GAP, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, bone_shadow, Vector3(4, 0, -10))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - JOINT_GAP, 0)
	right_elbow.add_child(right_lower_arm)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	if is_moving:
		walk_time += delta * WALK_CYCLE_SPEED
	else:
		# Quick decay to idle
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 10.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	# Add jittery motion
	_rattle_time += delta * JERK_FREQUENCY
	var jitter_x = sin(_rattle_time * 3.7) * JERK_AMOUNT
	var jitter_y = sin(_rattle_time * 4.3) * JERK_AMOUNT

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Fast, exaggerated arm swing
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount
	left_shoulder.rotation.x = upper_swing
	right_shoulder.rotation.x = -upper_swing

	# Elbow bending
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.1
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING + 0.1
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Fast leg motion
	left_hip.rotation.x = -upper_swing
	right_hip.rotation.x = upper_swing

	# Knee bending
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	left_knee.rotation.x = left_knee_bend
	right_knee.rotation.x = right_knee_bend

	# Bobbing with jitter
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT + jitter_y
		spine.position.x = jitter_x
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT
	else:
		# Idle rattle
		spine.position.y = _base_spine_y + jitter_y * 0.5
		spine.position.x = jitter_x * 0.5
		head_node.position.y = _base_head_y

		# Slight jaw chatter in idle
		var jaw_node = head_node.get_node_or_null("Jaw")
		if jaw_node:
			jaw_node.rotation.x = abs(sin(_rattle_time * 2.0)) * 0.1
