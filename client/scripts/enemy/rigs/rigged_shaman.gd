extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Shaman enemy rigged model with stocky build and staff accessory.
## Features: wide shoulders, thick arms, staff in hand, tribal accessories, rhythmic swaying walk.

# Constants for shaman proportions (stocky and wide)
const HEAD_SIZE = Vector3(0.30, 0.28, 0.28)
const TORSO_SIZE = Vector3(0.60, 0.48, 0.35)  # Wide torso (120% width, 90% height)
const UPPER_ARM_SIZE = Vector3(0.17, 0.28, 0.17)  # Thick arms
const LOWER_ARM_SIZE = Vector3(0.15, 0.24, 0.15)
const UPPER_LEG_SIZE = Vector3(0.18, 0.30, 0.18)
const LOWER_LEG_SIZE = Vector3(0.15, 0.28, 0.15)

# Staff accessory
const STAFF_SHAFT_SIZE = Vector3(0.06, 0.95, 0.06)
const STAFF_HEAD_SIZE = Vector3(0.15, 0.20, 0.08)

# Tribal accessories
const NECKLACE_SIZE = Vector3(0.35, 0.08, 0.25)
const FACE_PAINT_SIZE = Vector3(0.08, 0.03, 0.02)

# Animation parameters (rhythmic, shamanic movement)
const WALK_CYCLE_SPEED: float = 7.0
const UPPER_LIMB_SWING: float = 0.35
const LOWER_ARM_SWING: float = 0.25
const LOWER_LEG_SWING: float = 0.5
const LOWER_LEG_PHASE: float = 0.3
const TORSO_BOB_AMOUNT: float = 0.08
const HEAD_BOB_AMOUNT: float = 0.05
const SWAY_AMOUNT: float = 0.12  # Rhythmic side-to-side sway

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

# Accessory references
var staff: Node3D
var necklace: MeshInstance3D

# Base positions
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0

func _build_skeleton() -> void:
	var orc_green = Color(0.3, 0.6, 0.3)
	var dark_green = Color(0.2, 0.45, 0.2)
	var wood_color = Color(0.35, 0.22, 0.08)
	var bone_white = Color(0.9, 0.9, 0.85)
	var paint_red = Color(0.8, 0.1, 0.1)

	# -- Hips (root pivot, lower for stocky stance) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.95, 0)
	add_child(hips)

	# -- Left Leg --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.15, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, dark_green, Vector3(3, 0, 5))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, orc_green, Vector3(-2, 0, -3))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.15, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, dark_green, Vector3(3, 0, -5))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, orc_green, Vector3(-2, 0, 3))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (wide, muscular)
	torso_node = _create_limb("Torso", TORSO_SIZE, orc_green, Vector3(-2, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Skull necklace (tribal accessory)
	necklace = _create_limb("Necklace", NECKLACE_SIZE, bone_white, Vector3(0, 0, 0))
	necklace.position = Vector3(0, TORSO_SIZE.y - 0.05, -TORSO_SIZE.z / 2.0 - 0.02)
	torso_node.add_child(necklace)

	# Small skull ornaments on necklace
	for i in range(3):
		var skull = MeshInstance3D.new()
		var skull_mesh = BoxMesh.new()
		skull_mesh.size = Vector3(0.08, 0.08, 0.08)
		skull.mesh = skull_mesh
		var skull_mat = StandardMaterial3D.new()
		skull_mat.albedo_color = bone_white
		skull.material_override = skull_mat
		skull.position = Vector3(-0.12 + i * 0.12, -0.04, 0)
		necklace.add_child(skull)

	# Head
	head_node = _create_limb("Head", HEAD_SIZE, orc_green, Vector3(2, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.03, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Face paint (tribal markings)
	var left_paint = _create_limb("LeftFacePaint", FACE_PAINT_SIZE, paint_red, Vector3(0, 0, 0))
	left_paint.position = Vector3(-0.08, 0.05, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(left_paint)

	var right_paint = _create_limb("RightFacePaint", FACE_PAINT_SIZE, paint_red, Vector3(0, 0, 0))
	right_paint.position = Vector3(0.08, 0.05, -HEAD_SIZE.z / 2.0 - 0.01)
	head_node.add_child(right_paint)

	# Eyes (dark)
	var eye_size = Vector3(0.06, 0.04, 0.03)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.01
	var left_eye = _create_limb("LeftEye", eye_size, Color(0.1, 0.1, 0.05), Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.08, 0.02, -eye_z)
	head_node.add_child(left_eye)
	var right_eye = _create_limb("RightEye", eye_size, Color(0.1, 0.1, 0.05), Vector3(0, 0, 0))
	right_eye.position = Vector3(0.08, 0.02, -eye_z)
	head_node.add_child(right_eye)

	# -- Left Arm (free swinging) --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.08, 0)
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, orc_green, Vector3(-10, 0, -18))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, dark_green, Vector3(6, 0, 14))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# -- Right Arm (holds staff) --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.08, 0)
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, orc_green, Vector3(-10, 0, 18))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, dark_green, Vector3(6, 0, -14))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

	# Staff (attached to right hand)
	staff = Node3D.new()
	staff.name = "Staff"
	staff.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(staff)

	# Staff shaft
	var staff_shaft = _create_limb("StaffShaft", STAFF_SHAFT_SIZE, wood_color, Vector3(0, 0, 0))
	staff_shaft.position = Vector3(0, -STAFF_SHAFT_SIZE.y / 2.0 + 0.05, 0)
	staff.add_child(staff_shaft)

	# Staff head (skull totem)
	var staff_head = _create_limb("StaffHead", STAFF_HEAD_SIZE, bone_white, Vector3(0, 0, 0))
	staff_head.position = Vector3(0, -STAFF_SHAFT_SIZE.y / 2.0 - STAFF_HEAD_SIZE.y / 2.0, 0)
	staff.add_child(staff_head)

	# Glowing gem on staff
	var gem = MeshInstance3D.new()
	var gem_mesh = SphereMesh.new()
	gem_mesh.radius = 0.06
	gem.mesh = gem_mesh
	gem.position = Vector3(0, -STAFF_HEAD_SIZE.y / 2.0 - 0.04, 0)
	var gem_mat = StandardMaterial3D.new()
	gem_mat.albedo_color = Color(0.2, 0.8, 0.3)
	gem_mat.emission_enabled = true
	gem_mat.emission = Color(0.2, 0.8, 0.3)
	gem_mat.emission_energy_multiplier = 2.0
	gem.material_override = gem_mat
	staff.add_child(gem)

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

	var t = walk_time
	var swing_amount = 1.0 if is_moving else clampf(abs(sin(t)), 0.0, 1.0)

	# Rhythmic arm swing
	var upper_swing = sin(t) * UPPER_LIMB_SWING * swing_amount
	left_shoulder.rotation.x = upper_swing * 1.2  # Left arm swings more freely
	right_shoulder.rotation.x = -upper_swing * 0.6  # Right arm more restricted (holding staff)

	# Elbow bending
	var left_arm_bend = maxf(0.0, -upper_swing) * LOWER_ARM_SWING + 0.1
	var right_arm_bend = maxf(0.0, upper_swing) * LOWER_ARM_SWING * 0.5 + 0.15  # Staff grip
	left_elbow.rotation.x = -left_arm_bend
	right_elbow.rotation.x = -right_arm_bend

	# Staff slight rotation with arm
	if staff:
		staff.rotation.z = sin(t * 0.8) * 0.15

	# Wide leg stomp
	left_hip.rotation.x = -upper_swing
	right_hip.rotation.x = upper_swing

	# Knee bending
	var left_knee_bend = maxf(0.0, sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	var right_knee_bend = maxf(0.0, sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing_amount
	left_knee.rotation.x = left_knee_bend
	right_knee.rotation.x = right_knee_bend

	# Rhythmic bobbing and swaying
	if is_moving:
		var bob = abs(sin(t * 2.0))
		spine.position.y = _base_spine_y + bob * TORSO_BOB_AMOUNT
		head_node.position.y = _base_head_y + bob * HEAD_BOB_AMOUNT

		# Side-to-side sway (shamanic rhythm)
		spine.rotation.z = sin(t) * SWAY_AMOUNT
		head_node.rotation.z = -sin(t) * 0.08  # Counter-sway
	else:
		spine.position.y = _base_spine_y
		head_node.position.y = _base_head_y
		# Idle swaying
		spine.rotation.z = sin(t * 0.5) * 0.05
		head_node.rotation.z = 0.0
