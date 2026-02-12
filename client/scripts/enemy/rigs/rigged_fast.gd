extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Fast enemy rigged model with hunched biped design.
## Features: extreme forward tilt, long arms, digitigrade legs, rapid frantic movement.

# Constants for hunched fast enemy proportions
const HEAD_SIZE = Vector3(0.24, 0.24, 0.26)  # Slightly elongated snout
const TORSO_SIZE = Vector3(0.42, 0.48, 0.30)  # Wider, more bestial
const UPPER_ARM_SIZE = Vector3(0.13, 0.36, 0.13)  # Longer arms (120%)
const LOWER_ARM_SIZE = Vector3(0.11, 0.32, 0.11)
const UPPER_LEG_SIZE = Vector3(0.16, 0.28, 0.16)  # Shorter upper legs
const LOWER_LEG_SIZE = Vector3(0.14, 0.38, 0.14)  # Longer lower legs (digitigrade)

# Animation parameters (2x speed, very aggressive)
const WALK_CYCLE_SPEED: float = 20.0  # Double speed for frantic movement
const UPPER_LIMB_SWING: float = 0.8  # Exaggerated swing
const LOWER_ARM_SWING: float = 0.6
const LOWER_LEG_SWING: float = 0.7
const LOWER_LEG_PHASE: float = 0.4
const TORSO_BOB_AMOUNT: float = 0.08  # Aggressive bobbing
const HEAD_BOB_AMOUNT: float = 0.06
const SPINE_TILT: float = 45.0  # Extreme forward hunch

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

# Twitch parameters for aggressive idle
var _twitch_time: float = 0.0

func _build_skeleton() -> void:
	var fast_color = enemy_color
	var darker_fast = _darken(enemy_color, 0.25)
	var claw_color = Color(0.15, 0.15, 0.15)

	# -- Hips (root pivot, lowered for crouch) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.85, 0)  # Lower stance
	add_child(hips)

	# -- Left Leg (digitigrade - bent backward) --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.13, 0, 0)
	left_hip.rotation_degrees = Vector3(20, 0, 0)  # Pre-bent forward for crouch
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, darker_fast, Vector3(5, 0, 6))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_knee.rotation_degrees = Vector3(-35, 0, 0)  # Bent backward (digitigrade)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, claw_color, Vector3(-3, 0, -4))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg (digitigrade) --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.13, 0, 0)
	right_hip.rotation_degrees = Vector3(20, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, darker_fast, Vector3(5, 0, -6))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_knee.rotation_degrees = Vector3(-35, 0, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, claw_color, Vector3(-3, 0, 4))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine (extreme forward tilt) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	spine.rotation_degrees = Vector3(SPINE_TILT, 0, 0)  # Hunched forward dramatically
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (wider, more muscular looking)
	torso_node = _create_limb("Torso", TORSO_SIZE, fast_color, Vector3(-3, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Head (elongated, predatory)
	head_node = _create_limb("Head", HEAD_SIZE, fast_color, Vector3(5, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.03, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Eyes (aggressive, glowing)
	var eye_size = Vector3(0.08, 0.06, 0.03)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var eye_glow = Color(0.9, 0.2, 0.1)  # Red glowing eyes
	var left_eye = _create_limb("LeftEye", eye_size, eye_glow, Vector3(0, -10, 0))
	left_eye.position = Vector3(-0.07, 0.04, -eye_z)
	head_node.add_child(left_eye)

	var right_eye = _create_limb("RightEye", eye_size, eye_glow, Vector3(0, 10, 0))
	right_eye.position = Vector3(0.07, 0.04, -eye_z)
	head_node.add_child(right_eye)

	# Make eyes glow
	for eye in [left_eye, right_eye]:
		var mat = eye.material_override as StandardMaterial3D
		if mat:
			mat.emission_enabled = true
			mat.emission = eye_glow
			mat.emission_energy_multiplier = 1.5

	# Snout/jaw
	var snout = _create_limb("Snout", Vector3(0.14, 0.10, 0.18), darker_fast, Vector3(0, 0, 0))
	snout.position = Vector3(0, -0.08, -HEAD_SIZE.z / 2.0 - 0.06)
	head_node.add_child(snout)

	# -- Left Arm (long, reaching) --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.08, 0)
	left_shoulder.rotation_degrees = Vector3(15, 0, -8)  # Angled forward and down
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, fast_color, Vector3(-10, 0, -18))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, darker_fast, Vector3(6, 0, 14))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# Claw
	var left_claw = _create_limb("LeftClaw", Vector3(0.08, 0.12, 0.08), claw_color, Vector3(0, 0, 0))
	left_claw.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.06, 0)
	left_lower_arm.add_child(left_claw)

	# -- Right Arm (long, reaching) --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.08, 0)
	right_shoulder.rotation_degrees = Vector3(15, 0, 8)
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, fast_color, Vector3(-10, 0, 18))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, darker_fast, Vector3(6, 0, -14))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

	# Claw
	var right_claw = _create_limb("RightClaw", Vector3(0.08, 0.12, 0.08), claw_color, Vector3(0, 0, 0))
	right_claw.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.06, 0)
	right_lower_arm.add_child(right_claw)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	if is_moving:
		walk_time += delta * WALK_CYCLE_SPEED
	else:
		# Quick snap back to idle
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 12.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	# Aggressive twitching
	_twitch_time += delta * 25.0
	var twitch = sin(_twitch_time * 3.2) * 0.03

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Aggressive, exaggerated arm swing
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount
	left_shoulder.rotation.x = upper_swing + twitch
	right_shoulder.rotation.x = -upper_swing - twitch

	# Elbow bending (arms nearly touch ground when swinging back)
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.2
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING + 0.2
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Rapid leg motion
	left_hip.rotation.x = -upper_swing * 0.8
	right_hip.rotation.x = upper_swing * 0.8

	# Knee bending (digitigrade gait)
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	left_knee.rotation.x = left_knee_bend - 0.2  # Extra bend for digitigrade
	right_knee.rotation.x = right_knee_bend - 0.2

	# Aggressive bobbing
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT
		# Side-to-side sway
		spine.rotation.z = sin(t) * 0.1
	else:
		# Crouched idle stance
		spine.position.y = _base_spine_y
		head_node.position.y = _base_head_y
		# Slight predatory sway
		spine.rotation.z = sin(_twitch_time * 0.5) * 0.05
		# Head scanning
		head_node.rotation.y = sin(_twitch_time * 0.7) * 0.15
