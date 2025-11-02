import { Container, Graphics } from 'pixi.js'
import DamageType from '#shared/config/abilities/damage-type.js'

// Color mapping for damage types
const DAMAGE_TYPE_COLORS = {
  [DamageType.Physical]: { fill: 0xcccccc, stroke: 0x888888 }, // Gray
  [DamageType.Fire]: { fill: 0xff4444, stroke: 0xff0000 }, // Red
  [DamageType.Cold]: { fill: 0x4444ff, stroke: 0x0000ff }, // Blue
  [DamageType.Lightning]: { fill: 0xffff44, stroke: 0xffff00 }, // Yellow
  [DamageType.Poison]: { fill: 0x44ff44, stroke: 0x00ff00 }, // Green
}

class AreaDamageEffectSprite extends Container {
  constructor(damageData) {
    super()

    this.damageData = damageData
    this.lifetime = 500 // 0.5 seconds
    this.startTime = Date.now()

    this.initSprite()
  }

  initSprite() {
    const { source, target, pattern, options } = this.damageData

    // Create visual indicator based on damage pattern
    this.indicator = new Graphics()

    switch (pattern) {
      case 'cone':
        this.createConeIndicator(source, target, options)
        break
      case 'line':
        this.createLineIndicator(source, target, options)
        break
      case 'radius':
        this.createRadiusIndicator(source, options)
        break
      default:
        this.createRadiusIndicator(source, { radius: 50 }) // Fallback
    }

    this.addChild(this.indicator)
    this.zIndex = 200 // Render above most other sprites
  }

  getColorsForDamageType(damageType) {
    const colors = DAMAGE_TYPE_COLORS[damageType]
    if (colors) {
      return colors
    }
    // Default to physical damage colors if damage type is unknown
    return DAMAGE_TYPE_COLORS[DamageType.Physical]
  }

  createConeIndicator(source, target, options) {
    const { range, angle, damageType } = options
    const colors = this.getColorsForDamageType(damageType)

    // Calculate direction from source to target
    const dx = target.x - source.x
    const dy = target.y - source.y
    const direction = Math.atan2(dy, dx)

    // Create cone shape
    this.indicator.moveTo(source.x, source.y)

    // Calculate cone edges
    const halfAngle = angle / 2
    const leftAngle = direction - halfAngle
    const rightAngle = direction + halfAngle

    // Draw cone
    const leftX = source.x + Math.cos(leftAngle) * range
    const leftY = source.y + Math.sin(leftAngle) * range

    this.indicator.lineTo(leftX, leftY)

    // Draw arc for cone edge
    const steps = 16
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const currentAngle = leftAngle + (rightAngle - leftAngle) * t
      const x = source.x + Math.cos(currentAngle) * range
      const y = source.y + Math.sin(currentAngle) * range
      this.indicator.lineTo(x, y)
    }

    this.indicator.lineTo(source.x, source.y)
    this.indicator.fill({ color: colors.fill, alpha: 0.3 })
    // this.indicator.stroke({ color: colors.stroke, width: 2, alpha: 0.8 })
  }

  createLineIndicator(source, target, options) {
    const { range, width, damageType } = options
    const colors = this.getColorsForDamageType(damageType)

    // Calculate direction from source to target
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) return

    // Normalize direction
    const dirX = dx / distance
    const dirY = dy / distance

    // Calculate perpendicular direction
    const perpX = -dirY
    const perpY = dirX

    // Calculate line rectangle corners
    const halfWidth = width / 2
    const endX = source.x + dirX * range
    const endY = source.y + dirY * range

    const p1x = source.x + perpX * halfWidth
    const p1y = source.y + perpY * halfWidth
    const p2x = source.x - perpX * halfWidth
    const p2y = source.y - perpY * halfWidth
    const p3x = endX - perpX * halfWidth
    const p3y = endY - perpY * halfWidth
    const p4x = endX + perpX * halfWidth
    const p4y = endY + perpY * halfWidth

    // Draw line rectangle
    this.indicator.moveTo(p1x, p1y)
    this.indicator.lineTo(p2x, p2y)
    this.indicator.lineTo(p3x, p3y)
    this.indicator.lineTo(p4x, p4y)
    this.indicator.lineTo(p1x, p1y)
    this.indicator.fill({ color: colors.fill, alpha: 0.3 })
    // this.indicator.stroke({ color: colors.stroke, width: 2, alpha: 0.8 })
  }

  createRadiusIndicator(source, options) {
    const { radius, damageType } = options
    const colors = this.getColorsForDamageType(damageType)

    // Draw circle
    this.indicator.circle(source.x, source.y, radius)
    this.indicator.fill({ color: colors.fill, alpha: 0.3 })
    // this.indicator.stroke({ color: colors.stroke, width: 2, alpha: 0.8 })
  }

  tick() {
    const elapsed = Date.now() - this.startTime
    const progress = elapsed / this.lifetime

    if (progress >= 1) {
      // Effect expired
      return false
    }

    // Fade out over time
    const alpha = 1 - progress
    this.indicator.alpha = alpha

    return true // Continue existing
  }
}

export default AreaDamageEffectSprite
