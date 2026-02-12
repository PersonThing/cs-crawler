extends "res://scripts/enemy/rigs/rigged_enemy_base.gd"
## Exploder enemy rigged model - blob body with pulsating animation.
## Features: sphere torso, stumpy legs, pulsating scale, increasing pulse frequency when charging.

# Constants for exploder proportions (blob-like)
const BODY_RADIUS = 0.45  # Large sphere body
const ARM_NUB_SIZE = Vector3(0.12, 0.08, 0.12)  # Tiny nub arms
const UPPER_LEG_SIZE = Vector3(0.22, 0.18, 0.22)  # Short thick legs
const LOWER_LEG_SIZE = Vector3(0.20, 0.15, 0.20)

# Animation parameters (pulsating, unstable)
const WALK_CYCLE_SPEED: float = 8.0
const PULSE_FREQUENCY: float = 2.0
const PULSE_SCALE_AMOUNT: float = 0.15
const CHARGE_PULSE_MULTIPLIER: float = 3.0  # Speed up when charging
const LOWER_LEG_SWING: float = 0.4

# Joint references
var body_sphere: MeshInstance3D
var left_arm_nub: Node3D
var right_arm_nub: Node3D
var left_hip: Node3D
var right_hip: Node3D
var left_knee: Node3D
var right_knee: Node3D

# State tracking
var _pulse_time: float = 0.0
var _is_charging: bool = false
var _base_body_scale: Vector3 = Vector3.ONE

func _build_skeleton() -> void:
	var orange = Color(0.9, 0.4, 0.1)
	var dark_orange = Color(0.6, 0.25, 0.05)
	var bright_orange = Color(1.0, 0.6, 0.2)

	# -- Hips (root pivot) --
	hips = Node3D.new()
	hips.name = "Hips"
	hips.position = Vector3(0, 0.8, 0)  # Lower to ground (stumpy)
	add_child(hips)

	# -- Left Leg (short and thick) --
	left_hip = Node3D.new()
	left_hip.name = "LeftHip"
	left_hip.position = Vector3(-0.18, 0, 0)
	hips.add_child(left_hip)

	var left_upper_leg = _create_limb("LeftUpperLeg", UPPER_LEG_SIZE, dark_orange, Vector3(0, 0, 0))
	left_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	left_hip.add_child(left_upper_leg)

	left_knee = Node3D.new()
	left_knee.name = "LeftKnee"
	left_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	left_hip.add_child(left_knee)

	var left_lower_leg = _create_limb("LeftLowerLeg", LOWER_LEG_SIZE, orange, Vector3(0, 0, 0))
	left_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	left_knee.add_child(left_lower_leg)

	# -- Right Leg --
	right_hip = Node3D.new()
	right_hip.name = "RightHip"
	right_hip.position = Vector3(0.18, 0, 0)
	hips.add_child(right_hip)

	var right_upper_leg = _create_limb("RightUpperLeg", UPPER_LEG_SIZE, dark_orange, Vector3(0, 0, 0))
	right_upper_leg.position = Vector3(0, -UPPER_LEG_SIZE.y / 2.0, 0)
	right_hip.add_child(right_upper_leg)

	right_knee = Node3D.new()
	right_knee.name = "RightKnee"
	right_knee.position = Vector3(0, -UPPER_LEG_SIZE.y, 0)
	right_hip.add_child(right_knee)

	var right_lower_leg = _create_limb("RightLowerLeg", LOWER_LEG_SIZE, orange, Vector3(0, 0, 0))
	right_lower_leg.position = Vector3(0, -LOWER_LEG_SIZE.y / 2.0, 0)
	right_knee.add_child(right_lower_leg)

	# -- Spine (body pivot) --
	spine = Node3D.new()
	spine.name = "Spine"
	spine.position = Vector3(0, 0.15, 0)
	hips.add_child(spine)

	# Body (large sphere - main feature)
	body_sphere = _create_sphere("Body", BODY_RADIUS, orange)
	body_sphere.position = Vector3(0, BODY_RADIUS, 0)
	spine.add_child(body_sphere)
	_base_body_scale = body_sphere.scale

	# Add glowing fuse on top
	var fuse = MeshInstance3D.new()
	var fuse_mesh = BoxMesh.new()
	fuse_mesh.size = Vector3(0.08, 0.2, 0.08)
	fuse.mesh = fuse_mesh
	fuse.position = Vector3(0, BODY_RADIUS + 0.1, 0)
	var fuse_mat = StandardMaterial3D.new()
	fuse_mat.albedo_color = Color(0.2, 0.1, 0.05)
	fuse_mat.emission_enabled = true
	fuse_mat.emission = bright_orange
	fuse_mat.emission_energy_multiplier = 1.5
	fuse.material_override = fuse_mat
	body_sphere.add_child(fuse)

	# Spark at fuse tip
	var spark = _create_sphere("Spark", 0.06, bright_orange)
	spark.position = Vector3(0, 0.12, 0)
	var spark_mat = spark.material_override as StandardMaterial3D
	spark_mat.emission_enabled = true
	spark_mat.emission = bright_orange
	spark_mat.emission_energy_multiplier = 4.0
	fuse.add_child(spark)

	# Add glowing cracks/veins on body
	for i in range(6):
		var crack = MeshInstance3D.new()
		var crack_mesh = BoxMesh.new()
		crack_mesh.size = Vector3(0.04, 0.25, 0.04)
		crack.mesh = crack_mesh
		var angle = i * PI / 3.0
		var radius = BODY_RADIUS - 0.02
		crack.position = Vector3(cos(angle) * radius, 0, sin(angle) * radius)
		crack.look_at(body_sphere.position, Vector3.UP)
		var crack_mat = StandardMaterial3D.new()
		crack_mat.albedo_color = bright_orange
		crack_mat.emission_enabled = true
		crack_mat.emission = bright_orange
		crack_mat.emission_energy_multiplier = 2.0
		crack.material_override = crack_mat
		body_sphere.add_child(crack)

	# Make body glow (emission)
	var body_mat = body_sphere.material_override as StandardMaterial3D
	body_mat.emission_enabled = true
	body_mat.emission = orange
	body_mat.emission_energy_multiplier = 1.0  # Will increase when charging

	# -- Left Arm Nub (tiny, vestigial) --
	left_arm_nub = Node3D.new()
	left_arm_nub.name = "LeftArmNub"
	left_arm_nub.position = Vector3(-BODY_RADIUS * 0.7, BODY_RADIUS * 0.5, 0)
	spine.add_child(left_arm_nub)

	var left_nub = _create_limb("LeftNub", ARM_NUB_SIZE, dark_orange, Vector3(0, 0, -20))
	left_nub.position = Vector3(0, 0, 0)
	left_arm_nub.add_child(left_nub)

	# -- Right Arm Nub --
	right_arm_nub = Node3D.new()
	right_arm_nub.name = "RightArmNub"
	right_arm_nub.position = Vector3(BODY_RADIUS * 0.7, BODY_RADIUS * 0.5, 0)
	spine.add_child(right_arm_nub)

	var right_nub = _create_limb("RightNub", ARM_NUB_SIZE, dark_orange, Vector3(0, 0, 20))
	right_nub.position = Vector3(0, 0, 0)
	right_arm_nub.add_child(right_nub)

func update_animation(is_moving: bool, delta: float, ai_state: String = "idle") -> void:
	# Check if charging/about to explode
	_is_charging = (ai_state == "charging" or ai_state == "exploding" or ai_state == "attack")

	# Update walk time
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

	# Pulsating animation (faster when charging)
	var pulse_speed = PULSE_FREQUENCY
	if _is_charging:
		pulse_speed *= CHARGE_PULSE_MULTIPLIER

	_pulse_time += delta * pulse_speed

	# Scale pulsation
	var pulse = sin(_pulse_time) * PULSE_SCALE_AMOUNT
	body_sphere.scale = _base_body_scale * (1.0 + pulse)

	# Emission glow increases when charging
	var body_mat = body_sphere.material_override as StandardMaterial3D
	if body_mat and body_mat.emission_enabled:
		if _is_charging:
			# Pulse between 2.0 and 5.0
			var charge_pulse = sin(_pulse_time * 2.0) * 0.5 + 0.5  # 0 to 1
			body_mat.emission_energy_multiplier = 2.0 + charge_pulse * 3.0
		else:
			body_mat.emission_energy_multiplier = lerp(body_mat.emission_energy_multiplier, 1.0, delta * 2.0)

	# Waddle walk animation
	var t = walk_time
	var swing_amount = 1.0 if is_moving else 0.0

	# Stumpy leg waddle
	var upper_swing = sin(t) * 0.25
	left_hip.rotation.x = -upper_swing * swing_amount
	right_hip.rotation.x = upper_swing * swing_amount

	# Knee bending
	var left_knee_bend = maxf(0.0, sin(t + 0.3)) * LOWER_LEG_SWING * swing_amount + 0.1
	var right_knee_bend = maxf(0.0, sin(-t + 0.3)) * LOWER_LEG_SWING * swing_amount + 0.1
	left_knee.rotation.x = left_knee_bend
	right_knee.rotation.x = right_knee_bend

	# Body wobble when walking
	if is_moving:
		spine.rotation.z = sin(t * 2.0) * 0.15
	else:
		spine.rotation.z = sin(_pulse_time * 0.5) * 0.05

	# Arm nubs flail slightly
	left_arm_nub.rotation.z = -0.3 + sin(_pulse_time * 1.5) * 0.2
	right_arm_nub.rotation.z = 0.3 - sin(_pulse_time * 1.5) * 0.2

	# More frantic movement when charging
	if _is_charging:
		body_sphere.rotation.y += delta * 2.0  # Spin slightly
