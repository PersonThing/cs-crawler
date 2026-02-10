import { Container, Graphics } from 'pixi.js'

// Body part dimensions (pixels, before ART_SCALE)
const HEAD_W = 7, HEAD_H = 7
const TORSO_W = 10, TORSO_H = 14
const UPPER_ARM_W = 4, UPPER_ARM_H = 9
const LOWER_ARM_W = 3, LOWER_ARM_H = 8
const UPPER_LEG_W = 5, UPPER_LEG_H = 10
const LOWER_LEG_W = 4, LOWER_LEG_H = 9

// Joint positions relative to torso center
const HEAD_Y = -TORSO_H / 2 - HEAD_H / 2 + 1
const SHOULDER_X = TORSO_W / 2 + 1
const SHOULDER_Y = -TORSO_H / 2 + 3
const HIP_X = TORSO_W / 4
const HIP_Y = TORSO_H / 2 - 1

// Walk animation
const WALK_CYCLE_SPEED = 8 // radians per second
const UPPER_LIMB_SWING = 0.55 // max swing angle in radians (~31 degrees)
const LOWER_ARM_SWING = 0.35
const LOWER_LEG_SWING = 0.5
const LOWER_LEG_PHASE = 0.3 // phase offset for knee bend

// Colors
const SKIN_COLOR = 0xE8B89D
const SKIN_HIGHLIGHT = 0xF5CCAF
const SKIN_SHADOW = 0xC9967A
const SHOE_COLOR = 0x4A3728
const SHOE_HIGHLIGHT = 0x5C4838
const SHOE_SHADOW = 0x2E1F14

function drawCube(graphics, w, h, faceColor, highlightColor, shadowColor) {
  const edgeSize = Math.max(1, Math.floor(Math.min(w, h) * 0.2))

  // Main face
  graphics.rect(-w / 2, -h / 2, w, h).fill(faceColor)

  // Top highlight edge
  graphics.rect(-w / 2, -h / 2, w, edgeSize).fill(highlightColor)

  // Bottom shadow edge
  graphics.rect(-w / 2, h / 2 - edgeSize, w, edgeSize).fill(shadowColor)

  // Left highlight
  graphics.rect(-w / 2, -h / 2, edgeSize, h).fill({ color: highlightColor, alpha: 0.5 })

  // Right shadow
  graphics.rect(w / 2 - edgeSize, -h / 2, edgeSize, h).fill({ color: shadowColor, alpha: 0.5 })
}

function createBone(w, h, faceColor, highlightColor, shadowColor) {
  const joint = new Container()
  const graphics = new Graphics()
  // Draw the cube with pivot at the top center (joint point)
  drawCube(graphics, w, h, faceColor, highlightColor, shadowColor)
  // Offset so the rotation pivot is at the top of the part
  graphics.y = h / 2
  joint.addChild(graphics)
  return joint
}

class RiggedPlayerModel extends Container {
  constructor(color) {
    super()

    this.playerColor = color || 0x00aaff
    this.walkTime = 0
    this.isMoving = false

    // Derive torso/leg colors from player color
    const torsoColor = color
    const torsoHighlight = lightenColor(color, 0.3)
    const torsoShadow = darkenColor(color, 0.3)
    const pantsColor = darkenColor(color, 0.45)
    const pantsHighlight = darkenColor(color, 0.25)
    const pantsShadow = darkenColor(color, 0.6)

    this.buildSkeleton(
      torsoColor, torsoHighlight, torsoShadow,
      pantsColor, pantsHighlight, pantsShadow
    )
  }

  buildSkeleton(torsoColor, torsoHighlight, torsoShadow, pantsColor, pantsHighlight, pantsShadow) {
    // --- Legs (drawn first, behind torso) ---

    // Left leg
    this.leftHip = new Container()
    this.leftHip.x = -HIP_X
    this.leftHip.y = HIP_Y
    this.addChild(this.leftHip)

    this.leftUpperLeg = createBone(UPPER_LEG_W, UPPER_LEG_H, pantsColor, pantsHighlight, pantsShadow)
    this.leftHip.addChild(this.leftUpperLeg)

    this.leftKnee = new Container()
    this.leftKnee.y = UPPER_LEG_H
    this.leftUpperLeg.addChild(this.leftKnee)

    this.leftLowerLeg = createBone(LOWER_LEG_W, LOWER_LEG_H, SHOE_COLOR, SHOE_HIGHLIGHT, SHOE_SHADOW)
    this.leftKnee.addChild(this.leftLowerLeg)

    // Right leg
    this.rightHip = new Container()
    this.rightHip.x = HIP_X
    this.rightHip.y = HIP_Y
    this.addChild(this.rightHip)

    this.rightUpperLeg = createBone(UPPER_LEG_W, UPPER_LEG_H, pantsColor, pantsHighlight, pantsShadow)
    this.rightHip.addChild(this.rightUpperLeg)

    this.rightKnee = new Container()
    this.rightKnee.y = UPPER_LEG_H
    this.rightUpperLeg.addChild(this.rightKnee)

    this.rightLowerLeg = createBone(LOWER_LEG_W, LOWER_LEG_H, SHOE_COLOR, SHOE_HIGHLIGHT, SHOE_SHADOW)
    this.rightKnee.addChild(this.rightLowerLeg)

    // --- Torso ---
    this.torsoGraphics = new Graphics()
    drawCube(this.torsoGraphics, TORSO_W, TORSO_H, torsoColor, torsoHighlight, torsoShadow)
    this.addChild(this.torsoGraphics)

    // --- Arms (drawn after torso, in front) ---

    // Left arm
    this.leftShoulder = new Container()
    this.leftShoulder.x = -SHOULDER_X
    this.leftShoulder.y = SHOULDER_Y
    this.addChild(this.leftShoulder)

    this.leftUpperArm = createBone(UPPER_ARM_W, UPPER_ARM_H, torsoColor, torsoHighlight, torsoShadow)
    this.leftShoulder.addChild(this.leftUpperArm)

    this.leftElbow = new Container()
    this.leftElbow.y = UPPER_ARM_H
    this.leftUpperArm.addChild(this.leftElbow)

    this.leftLowerArm = createBone(LOWER_ARM_W, LOWER_ARM_H, SKIN_COLOR, SKIN_HIGHLIGHT, SKIN_SHADOW)
    this.leftElbow.addChild(this.leftLowerArm)

    // Right arm
    this.rightShoulder = new Container()
    this.rightShoulder.x = SHOULDER_X
    this.rightShoulder.y = SHOULDER_Y
    this.addChild(this.rightShoulder)

    this.rightUpperArm = createBone(UPPER_ARM_W, UPPER_ARM_H, torsoColor, torsoHighlight, torsoShadow)
    this.rightShoulder.addChild(this.rightUpperArm)

    this.rightElbow = new Container()
    this.rightElbow.y = UPPER_ARM_H
    this.rightUpperArm.addChild(this.rightElbow)

    this.rightLowerArm = createBone(LOWER_ARM_W, LOWER_ARM_H, SKIN_COLOR, SKIN_HIGHLIGHT, SKIN_SHADOW)
    this.rightElbow.addChild(this.rightLowerArm)

    // --- Head (on top of everything) ---
    this.headGraphics = new Graphics()
    drawCube(this.headGraphics, HEAD_W, HEAD_H, SKIN_COLOR, SKIN_HIGHLIGHT, SKIN_SHADOW)
    this.headGraphics.y = HEAD_Y
    this.addChild(this.headGraphics)

    // Eyes (two small dark squares)
    const eyeSize = 1.5
    const eyeSpacing = 2.5
    const eyeY = HEAD_Y - 1
    this.headGraphics.rect(-eyeSpacing - eyeSize / 2, eyeY - eyeSize / 2 - HEAD_Y, eyeSize, eyeSize).fill(0x222222)
    this.headGraphics.rect(eyeSpacing - eyeSize / 2, eyeY - eyeSize / 2 - HEAD_Y, eyeSize, eyeSize).fill(0x222222)
  }

  update(isMoving, deltaMs) {
    this.isMoving = isMoving

    if (isMoving) {
      this.walkTime += (deltaMs / 1000) * WALK_CYCLE_SPEED
    } else {
      // Smoothly return to idle pose
      this.walkTime *= 0.85
      if (Math.abs(this.walkTime) < 0.01) this.walkTime = 0
    }

    const t = this.walkTime
    const swing = isMoving ? 1 : Math.min(1, Math.abs(Math.sin(t)))

    // Upper limb swing (arms and legs alternate: left arm + right leg go forward together)
    const upperSwing = Math.sin(t) * UPPER_LIMB_SWING * swing

    // Left arm swings forward when right leg goes forward
    this.leftUpperArm.rotation = upperSwing
    this.rightUpperArm.rotation = -upperSwing

    // Lower arms: slight bend that increases as upper arm swings back
    const leftArmBend = Math.max(0, -upperSwing) * LOWER_ARM_SWING + 0.15
    const rightArmBend = Math.max(0, upperSwing) * LOWER_ARM_SWING + 0.15
    this.leftLowerArm.rotation = leftArmBend
    this.rightLowerArm.rotation = rightArmBend

    // Legs: opposite to arms
    this.leftUpperLeg.rotation = -upperSwing
    this.rightUpperLeg.rotation = upperSwing

    // Lower legs: knee bend during walk (bends when leg swings back)
    const leftKneeBend = Math.max(0, Math.sin(t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing
    const rightKneeBend = Math.max(0, Math.sin(-t + LOWER_LEG_PHASE)) * LOWER_LEG_SWING * swing
    this.leftLowerLeg.rotation = leftKneeBend
    this.rightLowerLeg.rotation = rightKneeBend

    // Subtle torso bob
    if (isMoving) {
      this.torsoGraphics.y = Math.abs(Math.sin(t * 2)) * 1
      this.headGraphics.y = HEAD_Y + Math.abs(Math.sin(t * 2)) * 0.8
    } else {
      this.torsoGraphics.y = 0
      this.headGraphics.y = HEAD_Y
    }
  }
}

function lightenColor(color, amount) {
  const r = Math.min(255, ((color >> 16) & 0xFF) + Math.floor(255 * amount))
  const g = Math.min(255, ((color >> 8) & 0xFF) + Math.floor(255 * amount))
  const b = Math.min(255, (color & 0xFF) + Math.floor(255 * amount))
  return (r << 16) | (g << 8) | b
}

function darkenColor(color, amount) {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xFF) * (1 - amount)))
  const g = Math.max(0, Math.floor(((color >> 8) & 0xFF) * (1 - amount)))
  const b = Math.max(0, Math.floor((color & 0xFF) * (1 - amount)))
  return (r << 16) | (g << 8) | b
}

export default RiggedPlayerModel
