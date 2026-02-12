extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Tank enemy rigged model with bulky proportions and armor plating.
## Features: massive torso, thick limbs, small head, armor accessories, heavy stomp walk.

# Constants for tank proportions (bulky and armored)
const HEAD_SIZE = Vector3(0.24, 0.24, 0.24)  # Smaller head relative to body
const TORSO_SIZE = Vector3(0.72, 0.60, 0.45)  # Massive torso (150% width/height)
const UPPER_ARM_SIZE = Vector3(0.20, 0.32, 0.20)  # Thick arms (140%)
const LOWER_ARM_SIZE = Vector3(0.18, 0.28, 0.18)
const UPPER_LEG_SIZE = Vector3(0.24, 0.36, 0.24)  # Thick legs (140%)
const LOWER_LEG_SIZE = Vector3(0.20, 0.32, 0.20)

# Armor plate sizes
const SHOULDER_PLATE_SIZE = Vector3(0.30, 0.15, 0.25)
const CHEST_PLATE_SIZE = Vector3(0.60, 0.30, 0.10)
const KNEE_PLATE_SIZE = Vector3(0.22, 0.15, 0.18)

# Animation parameters (slow and heavy)
const WALK_CYCLE_SPEED: float = 4.0  # Slow, heavy movement
const UPPER_LIMB_SWING: float = 0.3  # Limited swing (heavy armor)
const LOWER_ARM_SWING: float = 0.2
const LOWER_LEG_SWING: float = 0.35
const LOWER_LEG_PHASE: float = 0.3
const TORSO_BOB_AMOUNT: float = 0.10  # Heavy stomp bob
const HEAD_BOB_AMOUNT: float = 0.06

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

# Armor accessories
var left_shoulder_plate: MeshInstance3D
var right_shoulder_plate: MeshInstance3D
var chest_plate: MeshInstance3D

# Base positions
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0

func _build_skeleton() -> void:
	var tank_gray = Color(0.5, 0.5, 0.5)
	var metal_dark = Color(0.3, 0.3, 0.35)
	var armor_color = Color(0.4, 0.4, 0.45)

	# -- Hips (root pivot) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.1, 0)
	add_child(hips)

	# -- Left Leg --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.18, 0, 0)  # Wider stance
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, tank_gray, Vector3(2, 0, 4))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, metal_dark, Vector3(-2, 0, -2))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# Left knee armor plate
	var left_knee_plate = _create_limb("LeftKneePlate", KNEE_PLATE_SIZE, armor_color, Vector3(0, 0, 0))
	left_knee_plate.position = Vector3(0, 0, -KNEE_PLATE_SIZE.z / 2.0 - 0.05)
	left_knee.add_child(left_knee_plate)

	# -- Right Leg --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.18, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, tank_gray, Vector3(2, 0, -4))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, metal_dark, Vector3(-2, 0, 2))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# Right knee armor plate
	var right_knee_plate = _create_limb("RightKneePlate", KNEE_PLATE_SIZE, armor_color, Vector3(0, 0, 0))
	right_knee_plate.position = Vector3(0, 0, -KNEE_PLATE_SIZE.z / 2.0 - 0.05)
	right_knee.add_child(right_knee_plate)

	# -- Spine --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (massive, armored)
	torso_node = _create_limb("Torso", TORSO_SIZE, tank_gray, Vector3(-1, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Chest armor plate (front)
	chest_plate = _create_limb("ChestPlate", CHEST_PLATE_SIZE, armor_color, Vector3(0, 0, 0))
	chest_plate.position = Vector3(0, TORSO_SIZE.y * 0.3, -TORSO_SIZE.z / 2.0 - 0.03)
	# Add metallic emission for armor
	if chest_plate.material_override:
		var mat = chest_plate.material_override as StandardMaterial3D
		mat.metallic = 0.6
		mat.roughness = 0.4
	torso_node.add_child(chest_plate)

	# Head (small relative to body)
	head_node = _create_limb("Head", HEAD_SIZE, tank_gray, Vector3(0, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.05, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Eyes (glowing red visor)
	var visor_size = Vector3(0.18, 0.06, 0.02)
	var visor_z = HEAD_SIZE.z / 2.0 + 0.01
	var visor = _create_limb("Visor", visor_size, Color(0.8, 0.1, 0.1), Vector3(0, 0, 0))
	visor.position = Vector3(0, 0.02, -visor_z)
	head_node.add_child(visor)
	# Make visor glow
	if visor.material_override:
		var mat = visor.material_override as StandardMaterial3D
		mat.emission_enabled = true
		mat.emission = Color(0.8, 0.1, 0.1)
		mat.emission_energy_multiplier = 1.5

	# -- Left Arm --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0 - 0.05, TORSO_SIZE.y - 0.12, 0)
	spine.add_child(left_shoulder)

	# Left shoulder armor plate
	left_shoulder_plate = _create_limb("LeftShoulderPlate", SHOULDER_PLATE_SIZE, armor_color, Vector3(0, -10, 0))
	left_shoulder_plate.position = Vector3(-SHOULDER_PLATE_SIZE.x / 4.0, 0.05, 0)
	if left_shoulder_plate.material_override:
		var mat = left_shoulder_plate.material_override as StandardMaterial3D
		mat.metallic = 0.6
		mat.roughness = 0.4
	left_shoulder.add_child(left_shoulder_plate)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, tank_gray, Vector3(-8, 0, -15))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, metal_dark, Vector3(5, 0, 12))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# -- Right Arm --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0 + 0.05, TORSO_SIZE.y - 0.12, 0)
	spine.add_child(right_shoulder)

	# Right shoulder armor plate
	right_shoulder_plate = _create_limb("RightShoulderPlate", SHOULDER_PLATE_SIZE, armor_color, Vector3(0, 10, 0))
	right_shoulder_plate.position = Vector3(SHOULDER_PLATE_SIZE.x / 4.0, 0.05, 0)
	if right_shoulder_plate.material_override:
		var mat = right_shoulder_plate.material_override as StandardMaterial3D
		mat.metallic = 0.6
		mat.roughness = 0.4
	right_shoulder.add_child(right_shoulder_plate)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, tank_gray, Vector3(-8, 0, 15))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, metal_dark, Vector3(5, 0, -12))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	if is_moving:
		walk_time += delta * WALK_CYCLE_SPEED
	else:
		# Slow decay to idle
		if abs(walk_time) > 0.01:
			var target = roundf(walk_time / (2.0 * PI)) * 2.0 * PI
			walk_time = lerp(walk_time, target, delta * 5.0)
			if abs(walk_time - target) < 0.02:
				walk_time = 0.0
		else:
			walk_time = 0.0

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Limited, heavy arm swing
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount
	left_shoulder.rotation.x = upper_swing * 0.7  # Less swing due to armor weight
	right_shoulder.rotation.x = -upper_swing * 0.7

	# Minimal elbow bending
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.05
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING + 0.05
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Heavy leg stomp
	left_hip.rotation.x = -upper_swing * 0.9
	right_hip.rotation.x = upper_swing * 0.9

	# Knee bending (stiff, heavy)
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	left_knee.rotation.x = left_knee_bend * 0.8  # Limited by armor
	right_knee.rotation.x = right_knee_bend * 0.8

	# Heavy bobbing (stomp impact)
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT
		# Slight forward lean when walking
		spine.rotation.x = sin(t) * 0.03
	else:
		spine.position.y = _base_spine_y
		head_node.position.y = _base_head_y
		spine.rotation.x = 0.0
