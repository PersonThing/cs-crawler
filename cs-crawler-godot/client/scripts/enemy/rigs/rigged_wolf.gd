extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Wolf enemy rigged model - lean canine quadruped.
## Features: four legs, elongated snout, ears, tail, running animation with alternating diagonal legs.

# Constants for wolf proportions (lean canine)
const HEAD_SIZE = Vector3(0.22, 0.18, 0.30)
const SNOUT_SIZE = Vector3(0.12, 0.10, 0.25)
const TORSO_SIZE = Vector3(0.40, 0.35, 0.65)  # Lean body
const NECK_SIZE = Vector3(0.20, 0.18, 0.20)

# Legs (four legs, lean and agile)
const FRONT_UPPER_LEG_SIZE = Vector3(0.14, 0.28, 0.14)
const FRONT_LOWER_LEG_SIZE = Vector3(0.12, 0.26, 0.12)
const BACK_UPPER_LEG_SIZE = Vector3(0.16, 0.30, 0.16)
const BACK_LOWER_LEG_SIZE = Vector3(0.14, 0.28, 0.14)

# Ears and tail
const EAR_SIZE = Vector3(0.08, 0.15, 0.05)
const TAIL_SEGMENT_SIZE = Vector3(0.10, 0.10, 0.18)

# Animation parameters
const WALK_CYCLE_SPEED: float = 10.0
const RUN_SPEED: float = 16.0
const LEG_SWING: float = 0.7
const RUN_SWING: float = 1.2

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
var left_ear: MeshInstance3D
var right_ear: MeshInstance3D
var tail_base: Node3D
var tail_mid: Node3D
var tail_tip: Node3D

# State tracking
var _is_attacking: bool = false
var _tail_time: float = 0.0

func _build_skeleton() -> void:
	var gray = Color(0.35, 0.35, 0.40)
	var dark_gray = Color(0.25, 0.25, 0.28)
	var light_gray = Color(0.45, 0.45, 0.5)
	var yellow_eye = Color(0.95, 0.85, 0.2)

	# -- Hips (root pivot for quadruped) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.9, 0)
	add_child(hips)

	# -- Back Left Leg --
	back_left_hip = Node3D.new()
	back_left_hip.name = "BackLeftHip"
	back_left_hip.position = Vector3(-0.15, 0, 0.22)
	hips.add_child(back_left_hip)

	var back_left_upper = _create_limb("BackLeftUpperLeg", BACK_UPPER_LEG_SIZE, gray, Vector3(5, 0, 0))
	back_left_upper.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y / 2.0, 0)
	back_left_hip.add_child(back_left_upper)

	back_left_knee = Node3D.new()
	back_left_knee.name = "BackLeftKnee"
	back_left_knee.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y, 0)
	back_left_hip.add_child(back_left_knee)

	var back_left_lower = _create_limb("BackLeftLowerLeg", BACK_LOWER_LEG_SIZE, dark_gray, Vector3(-3, 0, 0))
	back_left_lower.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0, 0)
	back_left_knee.add_child(back_left_lower)

	# Paw
	var back_left_paw = _create_limb("BackLeftPaw", Vector3(0.15, 0.06, 0.18), Color(0.2, 0.2, 0.22), Vector3(0, 0, 0))
	back_left_paw.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0 - 0.03, 0)
	back_left_knee.add_child(back_left_paw)

	# -- Back Right Leg --
	back_right_hip = Node3D.new()
	back_right_hip.name = "BackRightHip"
	back_right_hip.position = Vector3(0.15, 0, 0.22)
	hips.add_child(back_right_hip)

	var back_right_upper = _create_limb("BackRightUpperLeg", BACK_UPPER_LEG_SIZE, gray, Vector3(5, 0, 0))
	back_right_upper.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y / 2.0, 0)
	back_right_hip.add_child(back_right_upper)

	back_right_knee = Node3D.new()
	back_right_knee.name = "BackRightKnee"
	back_right_knee.position = Vector3(0, -BACK_UPPER_LEG_SIZE.y, 0)
	back_right_hip.add_child(back_right_knee)

	var back_right_lower = _create_limb("BackRightLowerLeg", BACK_LOWER_LEG_SIZE, dark_gray, Vector3(-3, 0, 0))
	back_right_lower.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0, 0)
	back_right_knee.add_child(back_right_lower)

	var back_right_paw = _create_limb("BackRightPaw", Vector3(0.15, 0.06, 0.18), Color(0.2, 0.2, 0.22), Vector3(0, 0, 0))
	back_right_paw.position = Vector3(0, -BACK_LOWER_LEG_SIZE.y / 2.0 - 0.03, 0)
	back_right_knee.add_child(back_right_paw)

	# -- Spine (torso pivot) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0.12, 0)
	hips.add_child(spine)

	# Torso (lean, wolf-like)
	torso_node = _create_limb("Torso", TORSO_SIZE, gray, Vector3(-3, 0, 0))
	torso_node.position = Vector3(0, 0, 0)
	spine.add_child(torso_node)

	# White chest fur patch
	var chest_patch = _create_limb("ChestPatch", Vector3(0.25, 0.20, 0.15), light_gray, Vector3(0, 0, 0))
	chest_patch.position = Vector3(0, -0.08, -TORSO_SIZE.z / 2.0 + 0.05)
	torso_node.add_child(chest_patch)

	# -- Tail (articulated, 3 segments) --
	tail_base = Node3D.new()
	tail_base.name = "TailBase"
	tail_base.position = Vector3(0, 0.08, TORSO_SIZE.z / 2.0)
	spine.add_child(tail_base)

	var tail_base_mesh = _create_limb("TailBaseMesh", TAIL_SEGMENT_SIZE, gray, Vector3(0, 0, 0))
	tail_base_mesh.position = Vector3(0, 0, TAIL_SEGMENT_SIZE.z / 2.0)
	tail_base.add_child(tail_base_mesh)

	tail_mid = Node3D.new()
	tail_mid.name = "TailMid"
	tail_mid.position = Vector3(0, 0, TAIL_SEGMENT_SIZE.z)
	tail_base.add_child(tail_mid)

	var tail_mid_mesh = _create_limb("TailMidMesh", TAIL_SEGMENT_SIZE * Vector3(0.9, 0.9, 1.0), dark_gray, Vector3(0, 0, 0))
	tail_mid_mesh.position = Vector3(0, 0, TAIL_SEGMENT_SIZE.z / 2.0)
	tail_mid.add_child(tail_mid_mesh)

	tail_tip = Node3D.new()
	tail_tip.name = "TailTip"
	tail_tip.position = Vector3(0, 0, TAIL_SEGMENT_SIZE.z)
	tail_mid.add_child(tail_tip)

	var tail_tip_mesh = _create_limb("TailTipMesh", TAIL_SEGMENT_SIZE * Vector3(0.7, 0.7, 1.0), light_gray, Vector3(0, 0, 0))
	tail_tip_mesh.position = Vector3(0, 0, TAIL_SEGMENT_SIZE.z / 2.0)
	tail_tip.add_child(tail_tip_mesh)

	# -- Front Left Leg --
	front_left_shoulder = Node3D.new()
	front_left_shoulder.name = "FrontLeftShoulder"
	front_left_shoulder.position = Vector3(-0.15, -0.02, -TORSO_SIZE.z / 2.0 + 0.1)
	spine.add_child(front_left_shoulder)

	var front_left_upper = _create_limb("FrontLeftUpperLeg", FRONT_UPPER_LEG_SIZE, gray, Vector3(5, 0, 0))
	front_left_upper.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y / 2.0, 0)
	front_left_shoulder.add_child(front_left_upper)

	front_left_knee = Node3D.new()
	front_left_knee.name = "FrontLeftKnee"
	front_left_knee.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y, 0)
	front_left_shoulder.add_child(front_left_knee)

	var front_left_lower = _create_limb("FrontLeftLowerLeg", FRONT_LOWER_LEG_SIZE, dark_gray, Vector3(-3, 0, 0))
	front_left_lower.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0, 0)
	front_left_knee.add_child(front_left_lower)

	var front_left_paw = _create_limb("FrontLeftPaw", Vector3(0.14, 0.06, 0.16), Color(0.2, 0.2, 0.22), Vector3(0, 0, 0))
	front_left_paw.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0 - 0.03, 0)
	front_left_knee.add_child(front_left_paw)

	# -- Front Right Leg --
	front_right_shoulder = Node3D.new()
	front_right_shoulder.name = "FrontRightShoulder"
	front_right_shoulder.position = Vector3(0.15, -0.02, -TORSO_SIZE.z / 2.0 + 0.1)
	spine.add_child(front_right_shoulder)

	var front_right_upper = _create_limb("FrontRightUpperLeg", FRONT_UPPER_LEG_SIZE, gray, Vector3(5, 0, 0))
	front_right_upper.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y / 2.0, 0)
	front_right_shoulder.add_child(front_right_upper)

	front_right_knee = Node3D.new()
	front_right_knee.name = "FrontRightKnee"
	front_right_knee.position = Vector3(0, -FRONT_UPPER_LEG_SIZE.y, 0)
	front_right_shoulder.add_child(front_right_knee)

	var front_right_lower = _create_limb("FrontRightLowerLeg", FRONT_LOWER_LEG_SIZE, dark_gray, Vector3(-3, 0, 0))
	front_right_lower.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0, 0)
	front_right_knee.add_child(front_right_lower)

	var front_right_paw = _create_limb("FrontRightPaw", Vector3(0.14, 0.06, 0.16), Color(0.2, 0.2, 0.22), Vector3(0, 0, 0))
	front_right_paw.position = Vector3(0, -FRONT_LOWER_LEG_SIZE.y / 2.0 - 0.03, 0)
	front_right_knee.add_child(front_right_paw)

	# -- Neck --
	neck = Node3D.new()
	neck.name = "Neck"
	neck.position = Vector3(0, 0.08, -TORSO_SIZE.z / 2.0)
	spine.add_child(neck)

	var neck_mesh = _create_limb("NeckMesh", NECK_SIZE, gray, Vector3(0, 0, 0))
	neck_mesh.position = Vector3(0, 0, -NECK_SIZE.z / 2.0)
	neck.add_child(neck_mesh)

	# -- Head --
	head_node = _create_limb("Head", HEAD_SIZE, gray, Vector3(0, 0, 0))
	head_node.position = Vector3(0, 0, -NECK_SIZE.z - HEAD_SIZE.z / 2.0)
	neck.add_child(head_node)

	# Snout (elongated)
	var snout = _create_limb("Snout", SNOUT_SIZE, dark_gray, Vector3(0, 0, 0))
	snout.position = Vector3(0, -0.05, -HEAD_SIZE.z / 2.0 - SNOUT_SIZE.z / 2.0)
	head_node.add_child(snout)

	# Nose (black)
	var nose = _create_limb("Nose", Vector3(0.08, 0.06, 0.04), Color(0.1, 0.1, 0.1), Vector3(0, 0, 0))
	nose.position = Vector3(0, 0, -SNOUT_SIZE.z / 2.0 - 0.02)
	snout.add_child(nose)

	# Eyes (yellow, predatory)
	var eye_size = Vector3(0.08, 0.06, 0.03)
	var left_eye = _create_limb("LeftEye", eye_size, yellow_eye, Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.10, 0.03, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(left_eye)

	# Make eyes glow
	var left_eye_mat = left_eye.material_override as StandardMaterial3D
	left_eye_mat.emission_enabled = true
	left_eye_mat.emission = yellow_eye * 0.6
	left_eye_mat.emission_energy_multiplier = 1.5

	var right_eye = _create_limb("RightEye", eye_size, yellow_eye, Vector3(0, 0, 0))
	right_eye.position = Vector3(0.10, 0.03, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(right_eye)

	var right_eye_mat = right_eye.material_override as StandardMaterial3D
	right_eye_mat.emission_enabled = true
	right_eye_mat.emission = yellow_eye * 0.6
	right_eye_mat.emission_energy_multiplier = 1.5

	# Ears (pointed, alert)
	left_ear = _create_limb("LeftEar", EAR_SIZE, gray, Vector3(0, 0, -20))
	left_ear.position = Vector3(-0.12, HEAD_SIZE.y / 2.0, 0.05)
	head_node.add_child(left_ear)

	right_ear = _create_limb("RightEar", EAR_SIZE, gray, Vector3(0, 0, 20))
	right_ear.position = Vector3(0.12, HEAD_SIZE.y / 2.0, 0.05)
	head_node.add_child(right_ear)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Check state
	_is_attacking = (ai_state == "attack" or ai_state == "attacking")

	# Update walk time
	var cycle_speed = RUN_SPEED if is_moving else WALK_CYCLE_SPEED * 0.3
	if is_moving:
		walk_time += delta * cycle_speed
	else:
		# Slow decay
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 8.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	# Tail wagging
	_tail_time += delta * 3.0
	tail_base.rotation.x = sin(_tail_time) * 0.3
	tail_mid.rotation.x = sin(_tail_time + 0.5) * 0.25
	tail_tip.rotation.x = sin(_tail_time + 1.0) * 0.2

	var t = walk_time
	var swing_amount = RUN_SWING if is_moving else LEG_SWING

	# Crouch pose when attacking
	if _is_attacking:
		spine.position.y = 0.05  # Lower to ground
		neck.rotation.x = -0.3  # Head down
		head_node.rotation.x = 0.2  # Snout points forward

		# Ears back (alert, aggressive)
		left_ear.rotation.z = 0.4
		right_ear.rotation.z = -0.4

		# Front legs splayed for pounce
		front_left_shoulder.rotation.x = -0.2
		front_right_shoulder.rotation.x = -0.2

		return  # Skip normal walk animation

	else:
		spine.position.y = 0.12
		neck.rotation.x = 0.0
		head_node.rotation.x = 0.0

		# Ears upright
		left_ear.rotation.z = 0.0
		right_ear.rotation.z = 0.0

	# Quadruped running: diagonal pairs (alternating gait)
	# Back left + front right
	# Back right + front left

	var back_left_phase = sin(t)
	var back_right_phase = sin(t + PI)
	var front_left_phase = sin(t + PI)
	var front_right_phase = sin(t)

	# Back legs
	back_left_hip.rotation.x = back_left_phase * swing_amount
	back_left_knee.rotation.x = maxf(0.0, back_left_phase) * swing_amount * 0.7

	back_right_hip.rotation.x = back_right_phase * swing_amount
	back_right_knee.rotation.x = maxf(0.0, back_right_phase) * swing_amount * 0.7

	# Front legs
	front_left_shoulder.rotation.x = front_left_phase * swing_amount * 0.9
	front_left_knee.rotation.x = maxf(0.0, front_left_phase) * swing_amount * 0.5

	front_right_shoulder.rotation.x = front_right_phase * swing_amount * 0.9
	front_right_knee.rotation.x = maxf(0.0, front_right_phase) * swing_amount * 0.5

	# Body bob when running
	if is_moving:
		var bob = abs(sin(t * 2.0)) * 0.08
		spine.position.y = 0.12 + bob

		# Lean forward when running
		neck.rotation.x = -0.15
	else:
		# Idle breathing
		var breath = sin(_tail_time * 0.5) * 0.02
		spine.position.y = 0.12 + breath
