extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Mage enemy rigged model with tall, slender build and floating animation.
## Features: tall proportions, wide robed torso, floating gait, glowing accents, arms outstretched.

# Constants for mage proportions (tall and slender)
const HEAD_SIZE = Vector3(0.28, 0.28, 0.28)
const TORSO_SIZE = Vector3(0.45, 0.60, 0.32)  # Wider robed torso, taller
const UPPER_ARM_SIZE = Vector3(0.10, 0.32, 0.10)  # Thin arms, longer
const LOWER_ARM_SIZE = Vector3(0.09, 0.30, 0.09)
const UPPER_LEG_SIZE = Vector3(0.12, 0.28, 0.12)  # Hidden under robe (smaller)
const LOWER_LEG_SIZE = Vector3(0.10, 0.25, 0.10)
const ROBE_LOWER_SIZE = Vector3(0.55, 0.35, 0.40)  # Pyramid-shaped lower robe

# Glow orb sizes
const HAND_ORB_SIZE = Vector3(0.14, 0.14, 0.14)
const CHEST_ORB_SIZE = Vector3(0.18, 0.18, 0.18)

# Animation parameters (slow, mystical floating)
const WALK_CYCLE_SPEED: float = 6.0
const FLOAT_FREQUENCY: float = 2.0  # How fast the floating oscillates
const FLOAT_AMOUNT: float = 0.15  # How much vertical movement
const ARM_SWAY_AMOUNT: float = 0.2
const ARM_SWAY_SPEED: float = 1.5

# Joint references
var head_node: MeshInstance3D
var torso_node: MeshInstance3D
var robe_lower: MeshInstance3D
var left_shoulder: Node3D
var right_shoulder: Node3D
var left_elbow: Node3D
var right_elbow: Node3D
var left_hip: Node3D
var right_hip: Node3D
var left_knee: Node3D
var right_knee: Node3D

# Magic effect references
var left_hand_orb: MeshInstance3D
var right_hand_orb: MeshInstance3D
var chest_orb: MeshInstance3D

# Base positions
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0
var _float_time: float = 0.0

func _build_skeleton() -> void:
	var mage_purple = Color(0.4, 0.2, 0.6)
	var dark_purple = Color(0.3, 0.15, 0.45)
	var glow_purple = Color(0.6, 0.3, 0.9)
	var skin_tone = Color(0.8, 0.7, 0.6)

	# -- Hips (root pivot, higher for floating) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.2, 0)  # Higher base for floating
	add_child(hips)

	# -- Left Leg (mostly hidden under robe) --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.10, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, dark_purple, Vector3(0, 0, 0))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, dark_purple, Vector3(0, 0, 0))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg (mostly hidden) --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.10, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, dark_purple, Vector3(0, 0, 0))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, dark_purple, Vector3(0, 0, 0))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# Lower robe (pyramid shape covering legs)
	robe_lower = _create_limb("RobeLower", ROBE_LOWER_SIZE, mage_purple, Vector3(0, 0, 0))
	robe_lower.position = Vector3(0, -ROBE_LOWER_SIZE.y / 2.0, 0)
	hips.add_child(robe_lower)

	# -- Spine --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (robed upper body)
	torso_node = _create_limb("Torso", TORSO_SIZE, mage_purple, Vector3(0, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Chest orb (magical focus)
	chest_orb = MeshInstance3D.new()
	chest_orb.name = "ChestOrb"
	var chest_sphere = SphereMesh.new()
	chest_sphere.radius = CHEST_ORB_SIZE.x / 2.0
	chest_orb.mesh = chest_sphere
	chest_orb.position = Vector3(0, TORSO_SIZE.y * 0.4, -TORSO_SIZE.z / 2.0 - 0.05)
	var chest_mat = StandardMaterial3D.new()
	chest_mat.albedo_color = glow_purple
	chest_mat.emission_enabled = true
	chest_mat.emission = glow_purple
	chest_mat.emission_energy_multiplier = 2.0
	chest_orb.material_override = chest_mat
	torso_node.add_child(chest_orb)

	# Head
	head_node = _create_limb("Head", HEAD_SIZE, skin_tone, Vector3(0, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.05, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Hood (part of head)
	var hood = _create_limb("Hood", Vector3(0.32, 0.28, 0.30), dark_purple, Vector3(0, 0, 0))
	hood.position = Vector3(0, 0.08, 0.02)
	head_node.add_child(hood)

	# Eyes (glowing)
	var eye_size = Vector3(0.08, 0.06, 0.03)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var left_eye = _create_limb("LeftEye", eye_size, glow_purple, Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.08, 0, -eye_z)
	head_node.add_child(left_eye)
	var right_eye = _create_limb("RightEye", eye_size, glow_purple, Vector3(0, 0, 0))
	right_eye.position = Vector3(0.08, 0, -eye_z)
	head_node.add_child(right_eye)

	# Make eyes glow
	for eye in [left_eye, right_eye]:
		if eye.material_override:
			var mat = eye.material_override as StandardMaterial3D
			mat.emission_enabled = true
			mat.emission = glow_purple
			mat.emission_energy_multiplier = 1.8

	# -- Left Arm (outstretched) --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.10, 0)
	left_shoulder.rotation_degrees = Vector3(0, 0, -45)  # Outstretched
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, mage_purple, Vector3(0, 0, 0))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, skin_tone, Vector3(0, 0, 0))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# Left hand orb
	left_hand_orb = MeshInstance3D.new()
	left_hand_orb.name = "LeftHandOrb"
	var left_sphere = SphereMesh.new()
	left_sphere.radius = HAND_ORB_SIZE.x / 2.0
	left_hand_orb.mesh = left_sphere
	left_hand_orb.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.08, 0)
	var left_orb_mat = StandardMaterial3D.new()
	left_orb_mat.albedo_color = glow_purple
	left_orb_mat.emission_enabled = true
	left_orb_mat.emission = glow_purple
	left_orb_mat.emission_energy_multiplier = 2.5
	left_hand_orb.material_override = left_orb_mat
	left_elbow.add_child(left_hand_orb)

	# -- Right Arm (outstretched) --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.10, 0)
	right_shoulder.rotation_degrees = Vector3(0, 0, 45)  # Outstretched
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, mage_purple, Vector3(0, 0, 0))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, skin_tone, Vector3(0, 0, 0))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

	# Right hand orb
	right_hand_orb = MeshInstance3D.new()
	right_hand_orb.name = "RightHandOrb"
	var right_sphere = SphereMesh.new()
	right_sphere.radius = HAND_ORB_SIZE.x / 2.0
	right_hand_orb.mesh = right_sphere
	right_hand_orb.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.08, 0)
	var right_orb_mat = StandardMaterial3D.new()
	right_orb_mat.albedo_color = glow_purple
	right_orb_mat.emission_enabled = true
	right_orb_mat.emission = glow_purple
	right_orb_mat.emission_energy_multiplier = 2.5
	right_hand_orb.material_override = right_orb_mat
	right_elbow.add_child(right_hand_orb)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Always float, regardless of movement
	_float_time += delta * FLOAT_FREQUENCY

	# Floating up and down
	var float_offset = sin(_float_time) * FLOAT_AMOUNT
	hips.position.y = 1.2 + float_offset

	# Gentle swaying of arms
	var arm_sway_time = delta * ARM_SWAY_SPEED
	walk_time += arm_sway_time

	var sway = sin(walk_time) * ARM_SWAY_AMOUNT
	left_shoulder.rotation.x = sway
	right_shoulder.rotation.x = -sway

	# Gentle elbow bend
	left_elbow.rotation.x = -0.15 + sin(walk_time * 1.3) * 0.1
	right_elbow.rotation.x = -0.15 + sin(walk_time * 1.3) * 0.1

	# Robe sway
	robe_lower.rotation.z = sin(_float_time * 1.2) * 0.05

	# Legs don't move much (hidden under robe, just slight positioning)
	left_hip.rotation.x = 0.0
	right_hip.rotation.x = 0.0
	left_knee.rotation.x = 0.0
	right_knee.rotation.x = 0.0

	# Head and torso slight sway
	head_node.rotation.y = sin(_float_time * 0.8) * 0.1
	spine.rotation.z = sin(_float_time * 0.6) * 0.08

	# Pulsing glow on orbs
	var pulse = (sin(_float_time * 3.0) + 1.0) / 2.0  # 0.0 to 1.0
	var energy = 2.0 + pulse * 1.5  # 2.0 to 3.5

	if left_hand_orb and left_hand_orb.material_override:
		var mat = left_hand_orb.material_override as StandardMaterial3D
		mat.emission_energy_multiplier = energy
	if right_hand_orb and right_hand_orb.material_override:
		var mat = right_hand_orb.material_override as StandardMaterial3D
		mat.emission_energy_multiplier = energy
	if chest_orb and chest_orb.material_override:
		var mat = chest_orb.material_override as StandardMaterial3D
		mat.emission_energy_multiplier = energy * 0.8
