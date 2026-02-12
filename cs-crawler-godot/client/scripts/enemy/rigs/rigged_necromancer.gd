extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Necromancer enemy rigged model - tallest enemy with gliding movement.
## Features: robed figure, skull accessories, arms spread during summon, ghostly trail effect.

# Constants for necromancer proportions (tall and imposing)
const HEAD_SIZE = Vector3(0.28, 0.32, 0.28)  # Skull head
const TORSO_SIZE = Vector3(0.45, 0.65, 0.35)  # Tall torso
const ROBE_SIZE = Vector3(0.85, 1.2, 0.85)  # Wide flowing robe (hides legs)
const UPPER_ARM_SIZE = Vector3(0.14, 0.35, 0.14)  # Long thin arms
const LOWER_ARM_SIZE = Vector3(0.12, 0.32, 0.12)

# Skull accessories
const SKULL_SIZE = Vector3(0.12, 0.12, 0.12)
const HOOD_SIZE = Vector3(0.38, 0.25, 0.38)

# Animation parameters (gliding, ethereal movement)
const WALK_CYCLE_SPEED: float = 3.0
const ARM_SWAY: float = 0.15
const GLIDE_BOB_AMOUNT: float = 0.12
const GLIDE_FREQUENCY: float = 1.5
const SUMMON_ARM_SPREAD: float = 1.8  # Radians

# Joint references
var head_node: MeshInstance3D
var torso_node: MeshInstance3D
var robe_node: MeshInstance3D
var left_shoulder: Node3D
var right_shoulder: Node3D
var left_elbow: Node3D
var right_elbow: Node3D

# Base positions
var _base_head_y: float = 0.0
var _base_spine_y: float = 0.0
var _glide_time: float = 0.0

# State tracking
var _is_summoning: bool = false

func _build_skeleton() -> void:
	var bone_white = Color(0.95, 0.95, 0.9)
	var dark_purple = Color(0.15, 0.05, 0.25)
	var purple = Color(0.3, 0.15, 0.4)
	var ghostly_green = Color(0.2, 0.6, 0.5)

	# -- Hips (elevated for gliding effect) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 1.8, 0)  # Higher than normal (tallest enemy)
	add_child(hips)

	# -- Robe (large pyramid covering lower body, no legs visible) --
	robe_node = MeshInstance3D.new()
	robe_node.name = "Robe"
	var robe_mesh = BoxMesh.new()
	robe_mesh.size = ROBE_SIZE
	robe_node.mesh = robe_mesh
	robe_node.position = Vector3(0, -ROBE_SIZE.y / 2.0 + 0.1, 0)
	robe_node.scale = Vector3(1.0, 1.0, 1.0)  # Taper via scale can be added
	var robe_mat = StandardMaterial3D.new()
	robe_mat.albedo_color = dark_purple
	robe_mat.roughness = 0.7
	robe_node.material_override = robe_mat
	hips.add_child(robe_node)

	# Add skull ornaments on robe hem
	for i in range(4):
		var skull = _create_limb("RobeSkull_%d" % i, SKULL_SIZE, bone_white, Vector3(0, 0, 0))
		var angle = i * PI / 2.0
		var radius = ROBE_SIZE.x / 2.0 - 0.05
		skull.position = Vector3(
			cos(angle) * radius,
			-ROBE_SIZE.y / 2.0 + 0.1,
			sin(angle) * radius
		)
		robe_node.add_child(skull)

	# -- Spine --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0, 0)
	hips.add_child(spine)
	_base_spine_y = spine.position.y

	# Torso (tall, slender)
	torso_node = _create_limb("Torso", TORSO_SIZE, purple, Vector3(0, 0, 0))
	torso_node.position = Vector3(0, TORSO_SIZE.y / 2.0, 0)
	spine.add_child(torso_node)

	# Glowing amulet on chest
	var amulet = MeshInstance3D.new()
	var amulet_mesh = BoxMesh.new()
	amulet_mesh.size = Vector3(0.15, 0.18, 0.06)
	amulet.mesh = amulet_mesh
	amulet.position = Vector3(0, TORSO_SIZE.y / 4.0, -TORSO_SIZE.z / 2.0 - 0.03)
	var amulet_mat = StandardMaterial3D.new()
	amulet_mat.albedo_color = ghostly_green
	amulet_mat.emission_enabled = true
	amulet_mat.emission = ghostly_green
	amulet_mat.emission_energy_multiplier = 2.5
	amulet.material_override = amulet_mat
	torso_node.add_child(amulet)

	# Shoulder skull ornaments
	var left_skull = _create_limb("LeftShoulderSkull", SKULL_SIZE, bone_white, Vector3(0, 0, 0))
	left_skull.position = Vector3(-TORSO_SIZE.x / 2.0 - 0.08, TORSO_SIZE.y / 2.0 - 0.05, 0)
	torso_node.add_child(left_skull)

	var right_skull = _create_limb("RightShoulderSkull", SKULL_SIZE, bone_white, Vector3(0, 0, 0))
	right_skull.position = Vector3(TORSO_SIZE.x / 2.0 + 0.08, TORSO_SIZE.y / 2.0 - 0.05, 0)
	torso_node.add_child(right_skull)

	# Head (skull)
	head_node = _create_limb("Head", HEAD_SIZE, bone_white, Vector3(0, 0, 0))
	head_node.position = Vector3(0, TORSO_SIZE.y + HEAD_SIZE.y / 2.0 + 0.05, 0)
	spine.add_child(head_node)
	_base_head_y = head_node.position.y

	# Hood over skull
	var hood = _create_limb("Hood", HOOD_SIZE, dark_purple, Vector3(0, 0, 0))
	hood.position = Vector3(0, HEAD_SIZE.y / 3.0, 0)
	head_node.add_child(hood)

	# Glowing eyes (deep in hood)
	var eye_size = Vector3(0.08, 0.06, 0.04)
	var eye_z = HEAD_SIZE.z / 2.0 + 0.02
	var left_eye = _create_limb("LeftEye", eye_size, ghostly_green, Vector3(0, 0, 0))
	left_eye.position = Vector3(-0.08, -0.02, -eye_z)
	head_node.add_child(left_eye)

	# Make eyes glow
	var left_eye_mat = left_eye.material_override as StandardMaterial3D
	left_eye_mat.emission_enabled = true
	left_eye_mat.emission = ghostly_green
	left_eye_mat.emission_energy_multiplier = 3.0

	var right_eye = _create_limb("RightEye", eye_size, ghostly_green, Vector3(0, 0, 0))
	right_eye.position = Vector3(0.08, -0.02, -eye_z)
	head_node.add_child(right_eye)

	var right_eye_mat = right_eye.material_override as StandardMaterial3D
	right_eye_mat.emission_enabled = true
	right_eye_mat.emission = ghostly_green
	right_eye_mat.emission_energy_multiplier = 3.0

	# -- Left Arm (long, skeletal) --
	left_shoulder = Node3D.new()
	left_shoulder.name = "LeftShoulder"
	left_shoulder.position = Vector3(-TORSO_SIZE.x / 2.0 - UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.1, 0)
	spine.add_child(left_shoulder)

	var left_upper_arm = _create_limb("LeftUpperArm", UPPER_ARM_SIZE, _darken(purple, 0.2), Vector3(0, 0, 0))
	left_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	left_shoulder.add_child(left_upper_arm)

	left_elbow = Node3D.new()
	left_elbow.name = "LeftElbow"
	left_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	left_shoulder.add_child(left_elbow)

	var left_lower_arm = _create_limb("LeftLowerArm", LOWER_ARM_SIZE, bone_white, Vector3(0, 0, 0))
	left_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	left_elbow.add_child(left_lower_arm)

	# Claw-like fingers
	var left_hand = _create_limb("LeftHand", Vector3(0.18, 0.08, 0.15), bone_white, Vector3(0, 0, 0))
	left_hand.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.05, 0)
	left_elbow.add_child(left_hand)

	# -- Right Arm (mirror of left) --
	right_shoulder = Node3D.new()
	right_shoulder.name = "RightShoulder"
	right_shoulder.position = Vector3(TORSO_SIZE.x / 2.0 + UPPER_ARM_SIZE.x / 2.0, TORSO_SIZE.y - 0.1, 0)
	spine.add_child(right_shoulder)

	var right_upper_arm = _create_limb("RightUpperArm", UPPER_ARM_SIZE, _darken(purple, 0.2), Vector3(0, 0, 0))
	right_upper_arm.position = Vector3(0, -UPPER_ARM_SIZE.y / 2.0, 0)
	right_shoulder.add_child(right_upper_arm)

	right_elbow = Node3D.new()
	right_elbow.name = "RightElbow"
	right_elbow.position = Vector3(0, -UPPER_ARM_SIZE.y, 0)
	right_shoulder.add_child(right_elbow)

	var right_lower_arm = _create_limb("RightLowerArm", LOWER_ARM_SIZE, bone_white, Vector3(0, 0, 0))
	right_lower_arm.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0, 0)
	right_elbow.add_child(right_lower_arm)

	var right_hand = _create_limb("RightHand", Vector3(0.18, 0.08, 0.15), bone_white, Vector3(0, 0, 0))
	right_hand.position = Vector3(0, -LOWER_ARM_SIZE.y / 2.0 - 0.05, 0)
	right_elbow.add_child(right_hand)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Check if summoning
	_is_summoning = (ai_state == "summoning" or ai_state == "casting")

	# Update glide time
	_glide_time += delta * GLIDE_FREQUENCY

	# Constant gliding bob (no leg movement)
	var bob = sin(_glide_time) * GLIDE_BOB_AMOUNT
	hips.position.y = 1.8 + bob

	# Gentle robe sway
	if robe_node:
		robe_node.rotation.z = sin(_glide_time * 0.8) * 0.08

	# Head slight tilt
	head_node.rotation.z = sin(_glide_time * 0.6) * 0.06

	if _is_summoning:
		# Summoning pose: arms spread wide and raised
		var summon_progress = sin(_glide_time * 2.0) * 0.5 + 0.5  # 0 to 1 oscillation

		left_shoulder.rotation.x = -0.3  # Slightly forward
		left_shoulder.rotation.z = -SUMMON_ARM_SPREAD  # Spread wide
		left_elbow.rotation.x = -0.4 - summon_progress * 0.3  # Slight bend

		right_shoulder.rotation.x = -0.3
		right_shoulder.rotation.z = SUMMON_ARM_SPREAD
		right_elbow.rotation.x = -0.4 - summon_progress * 0.3

		# Torso slight backward lean
		spine.rotation.x = -0.15

	else:
		# Normal ethereal arm sway
		if is_moving:
			walk_time += delta * WALK_CYCLE_SPEED
		else:
			walk_time = _glide_time  # Use glide time for idle sway

		var t = walk_time
		var arm_sway = sin(t) * ARM_SWAY

		# Gentle arm sway (not walking motion, just floating)
		left_shoulder.rotation.x = arm_sway * 0.5
		left_shoulder.rotation.z = -0.3 + sin(t * 0.7) * 0.2
		left_elbow.rotation.x = -0.2 + abs(sin(t)) * 0.15

		right_shoulder.rotation.x = -arm_sway * 0.5
		right_shoulder.rotation.z = 0.3 - sin(t * 0.7) * 0.2
		right_elbow.rotation.x = -0.2 + abs(cos(t)) * 0.15

		spine.rotation.x = 0.0
