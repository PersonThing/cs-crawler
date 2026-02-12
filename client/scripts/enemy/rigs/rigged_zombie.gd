extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Zombie rigged model with asymmetric shambling animation.
## Features: hunched spine, asymmetric arms, slow shambling walk, twitchy idle.

# Constants for zombie proportions
const HEAD_SIZE = Vector3(0.28, 0.28, 0.28)
const TORSO_SIZE = Vector3(0.48, 0.5, 0.26)
const UPPER_ARM_SIZE_LEFT = Vector3(0.13, 0.27, 0.13)   # Shorter left arm
const UPPER_ARM_SIZE_RIGHT = Vector3(0.14, 0.33, 0.14)  # Longer drooping right arm
const LOWER_ARM_SIZE = Vector3(0.12, 0.25, 0.12)
const UPPER_LEG_SIZE = Vector3(0.17, 0.32, 0.17)
const LOWER_LEG_SIZE = Vector3(0.14, 0.3, 0.14)

# Animation parameters (slower than player)
const WALK_CYCLE_SPEED: float = 5.0  # Half speed for shambling
const UPPER_LIMB_SWING: float = 0.4
const LOWER_ARM_SWING: float = 0.3
const LOWER_LEG_SWING: float = 0.45
const LOWER_LEG_PHASE: float = 0.25
const TORSO_BOB_AMOUNT: float = 0.06  # More pronounced bob
const HEAD_BOB_AMOUNT: float = 0.04

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

# Base positions for bobbing
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0

# Twitch timer for idle animation
var _twitch_timer: float = 0.0
var _next_twitch_time: float = 2.0

func _build_skeleton() -> void:
	var zombie_color = enemy_color
	var darker_zombie = _darken(enemy_color, 0.3)
	var decayed_skin = Color(0.4, 0.5, 0.3)  # Greenish tint

	# -- Hips (root pivot) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.95, 0)  # Slightly lower (hunched)
	add_child(hips)

	# -- Left Leg --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.12, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, darker_zombie, Vector3(3, 0, 5))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, Color(0.25, 0.2, 0.15), Vector3(-2, 0, -3))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg (slightly dragging) --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.12, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, darker_zombie, Vector3(3, 0, -5))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, Color(0.25, 0.2, 0.15), Vector3(-2, 0, 3))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine (hunched forward) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	spine.rotation_degrees = Vector3(10, 0, 0)  # Hunched forward
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso
	torso_node = _create_limb("Torso", TORSO_SIZE, zombie_color, Vector3(-2, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Head
	head_node = _create_limb("Head", HEAD_SIZE, decayed_skin, Vector3(3, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.03, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Eyes (dark, sunken)
	var eye_size = Vector3(0.05, 0.05, 0.03)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var left_eye = _create_limb("LeftEye", eye_size, Color(0.1, 0.1, 0.1), Vector3(0, -8, 0))
	left_eye.position = Vector3(-0.08, 0, -eye_z)
	head_node.add_child(left_eye)
	var right_eye = _create_limb("RightEye", eye_size, Color(0.1, 0.1, 0.1), Vector3(0, 8, 0))
	right_eye.position = Vector3(0.08, 0, -eye_z)
	head_node.add_child(right_eye)

	# -- Left Arm (shorter) --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE_LEFT.x / 2.0, TORSO_SIZE.y - 0.1, 0)
	left_shoulder.rotation_degrees = Vector3(0, 0, -5)  # Slight asymmetry
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE_LEFT, zombie_color, Vector3(-8, 0, -15))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE_LEFT.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE_LEFT.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, decayed_skin, Vector3(5, 0, 12))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# -- Right Arm (longer, drooping) --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE_RIGHT.x / 2.0, TORSO_SIZE.y - 0.05, 0)
	right_shoulder.rotation_degrees = Vector3(0, 0, 3)  # Asymmetry opposite direction
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE_RIGHT, zombie_color, Vector3(-8, 0, 15))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE_RIGHT.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE_RIGHT.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, decayed_skin, Vector3(5, 0, -12))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	if is_moving:
		walk_time += delta * WALK_CYCLE_SPEED
	else:
		# Slow decay to idle
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 6.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

		# Twitching in idle
		_twitch_timer += delta
		if _twitch_timer >= _next_twitch_time:
			_apply_twitch()
			_twitch_timer = 0.0
			_next_twitch_time = randf_range(1.5, 3.5)

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Shambling arm swing (asymmetric)
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount
	left_shoulder.rotation.x = upper_swing * 0.8  # Left arm moves less
	right_shoulder.rotation.x = -upper_swing * 1.2  # Right arm swings more

	# Elbow bending
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.15
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING + 0.2  # More droop
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Shambling leg motion
	left_hip.rotation.x = -upper_swing * 0.9
	right_hip.rotation.x = upper_swing * 0.7  # Dragging right leg

	# Knee bending (irregular)
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE * 0.7)) * LOWER_LEG_SWING * swing_amount * 0.8
	left_knee.rotation.x = left_knee_bend
	right_knee.rotation.x = right_knee_bend

	# Pronounced bobbing
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT
	else:
		spine.position.y = _base_spine_y
		head_node.position.y = _base_head_y

func _apply_twitch() -> void:
	# Random twitch: quick head turn or shoulder jerk
	var twitch_type = randi() % 2
	if twitch_type == 0:
		# Head twitch
		var tween = create_tween()
		tween.tween_property(head_node, "rotation_degrees:y", randf_range(-15, 15), 0.1)
		tween.tween_property(head_node, "rotation_degrees:y", 0, 0.2)
	else:
		# Shoulder twitch
		var tween = create_tween()
		var which_shoulder = left_shoulder if randf() > 0.5 else right_shoulder
		tween.tween_property(which_shoulder, "rotation_degrees:z", randf_range(-10, 10), 0.08)
		tween.tween_property(which_shoulder, "rotation_degrees:z", 0, 0.15)
