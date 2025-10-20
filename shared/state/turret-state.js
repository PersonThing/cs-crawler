import ItemAttribute from '../config/item-attribute.js'
import { Textures } from '../config/textures.js'

class TurretState {
  constructor(id, source, position, abilityId, abilityData, modifiers = []) {
    // Required params validation
    if (!source) {
      throw new Error('TurretState requires source')
    }

    // Initialize turret properties
    this.id = id
    this.ownerId = source.id
    this.getStats = () => source.stats // make it check source stats dynamically in case player changes items - so existing turrets should use updated stats
    this.x = position.x
    this.y = position.y
    this.rotation = 0 // Initial rotation
    this.abilityId = abilityId
    this.abilityData = abilityData
    this.modifiers = modifiers.filter(m => m !== 'Turret') // Remove Turret modifier to prevent recursion
    this.range = 300 // Turret detection range
    this.lastCastTime = 0
    this.cooldown = abilityData.cooldown * 2 || 1000 // double ability base cooldown, they should shoot slower than normal ability
    this.createdAt = Date.now()
    this.lifetime = 10000 // Turret lasts for 10 seconds by default
    this.active = true
    this.texture = Textures.abilities.turret1 // Placeholder turret texture
    this.color = abilityData.color || 0xffffff // Use ability color for tinting
  }

  tick(deltaMS, players = []) {
    if (!this.active) {
      return false // Turret should be removed
    }

    const now = Date.now()

    // Check if turret has expired
    const age = now - this.createdAt
    if (age >= this.lifetime) {
      this.active = false
      console.log(`Turret ${this.id} expired after ${age}ms`)
      return false // Turret should be removed
    }

    // Check if turret can cast (cooldown)
    const timeSinceLastCast = now - this.lastCastTime
    if (timeSinceLastCast < this.cooldown) {
      return true // Turret should continue, but not cast yet
    }

    // Find valid targets in range (enemies of the turret owner)
    const validTargets = players.filter(player => {
      if (!player.isConnected || player.id === this.ownerId) return false
      
      const distance = Math.hypot(player.x - this.x, player.y - this.y)
      return distance <= this.range
    })

    if (validTargets.length > 0) {
      // Target the closest enemy
      const target = validTargets.reduce((closest, player) => {
        const distance = Math.hypot(player.x - this.x, player.y - this.y)
        const closestDistance = Math.hypot(closest.x - this.x, closest.y - this.y)
        return distance < closestDistance ? player : closest
      })

      // Update turret rotation to face the target
      const dx = target.x - this.x
      const dy = target.y - this.y
      this.rotation = Math.atan2(dy, dx) + (Math.PI / 2) // -90 degrees to align with sprite orientation

      // Cast the ability from the turret
      const turretAsSource = {
        id: this.id,
        ownerId: this.ownerId,
        x: this.x,
        y: this.y,
        label: `Turret(${this.ownerId})`,
        stats: this.getStats() || {},
      }

      if (this.abilityData.onUse) {
        this.abilityData.onUse(turretAsSource, target, this.modifiers)
        this.lastCastTime = now
        console.log(`Turret ${this.id} cast ${this.abilityId} at ${target.label}`)
      }
    }

    return true // Turret should continue
  }

  serialize() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      texture: this.texture,
      abilityId: this.abilityId,
      color: this.color,
      range: this.range,
    }
  }

  static getMaxTurrets(source) {
    const plusMaxTurrets = source.stats && source.stats[ItemAttribute.MaxTurrets] ? source.stats[ItemAttribute.MaxTurrets] : 0
    return 1 + plusMaxTurrets // everyone can spawn at least 1 turret, items can increase this
  }
}

export default TurretState