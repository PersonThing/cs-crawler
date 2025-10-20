export default class ProjectileState {
  constructor(id, source, target, { speed, lifetime, texture, damage, damageType, radius = null, onHit = null }) {
    // Validate required options
    if (speed === undefined) {
      throw new Error('ProjectileState requires speed option')
    }
    if (lifetime === undefined) {
      throw new Error('ProjectileState requires lifetime option')
    }
    if (texture === undefined) {
      throw new Error('ProjectileState requires texture option')
    }
    if (damage === undefined) {
      throw new Error('ProjectileState requires damage option')
    }
    if (damageType === undefined) {
      throw new Error('ProjectileState requires damageType option')
    }

    // Validate optional options
    if (onHit && typeof onHit !== 'function') {
      throw new Error('ProjectileState onHit option must be a function')
    }
    if (radius !== null && typeof radius !== 'number') {
      throw new Error('ProjectileState radius option must be a number')
    }

    // Calculate direction vector from source to target
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.hypot(dx, dy)

    // Normalize direction vector
    const velocityX = distance > 0 ? (dx / distance) * speed : 0
    const velocityY = distance > 0 ? (dy / distance) * speed : 0

    // Initialize projectile properties
    this.id = id
    this.sourceId = source.id
    this.sourceOwnerId = source.ownerId || null
    this.x = source.x
    this.y = source.y
    this.targetX = target.x
    this.targetY = target.y
    this.velocityX = velocityX
    this.velocityY = velocityY
    this.speed = speed
    this.texture = texture
    this.damage = damage
    this.damageType = damageType
    this.onHit = onHit
    this.radius = radius
    this.createdAt = Date.now()
    this.lifetime = lifetime
    this.active = true
  }

  tick(deltaMS, players = [], pather = null) {
    if (!this.active) {
      return false // Projectile should be removed
    }

    const now = Date.now()
    const age = now - this.createdAt

    // Check if projectile has expired
    if (age >= this.lifetime) {
      this.active = false
      if (this.onHit) {
        this.onHit(this, null) // null target means expired
      }
      return false // Projectile should be removed
    }

    // Move projectile, but first check collisions along the path to avoid tunneling
    const deltaSeconds = deltaMS / 1000
    const oldX = this.x
    const oldY = this.y
    const newX = oldX + this.velocityX * deltaSeconds
    const newY = oldY + this.velocityY * deltaSeconds

    // If we have a pather, sample along the segment between old and new positions
    let blockedByWall = false
    if (pather) {
      const dx = newX - oldX
      const dy = newY - oldY
      const travelDist = Math.hypot(dx, dy)
      // choose step size half of a block to reduce chance of tunneling
      const stepSize = Math.max(1, Math.floor(pather.blockSize / 2))
      const steps = Math.max(1, Math.ceil(travelDist / stepSize))
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        const sampleX = oldX + dx * t
        const sampleY = oldY + dy * t
        if (!pather.isWalkableAt(sampleX, sampleY)) {
          blockedByWall = true
          break
        }
      }
    }

    if (blockedByWall) {
      // projectile hit a wall
      this.active = false
      if (this.onHit) {
        try {
          this.onHit(this, null) // null target indicates wall/hit by environment
        } catch (err) {
          console.error('Error in projectile onHit handler:', err)
        }
      }
      return false // Projectile should be removed
    }

    // Not blocked: commit new position
    this.x = newX
    this.y = newY

    // Check for collisions with players (excluding source)
    for (const player of players) {
      if (player.id === this.sourceId || player.id === this.sourceOwnerId || !player.isConnected) continue

      const distance = Math.hypot(player.x - this.x, player.y - this.y)
      if (distance <= this.radius) {
        // Hit detected
        this.active = false // TODO: if pierce enabled and projectile has it, change this logic

        // Apply damage
        const isDead = player.takeDamage(this.damage)
        console.log(
          `Projectile hit ${player.label} for ${this.damage} ${this.damageType} damage (${player.currentHealth}/${player.maxHealth} HP remaining)`
        )

        if (isDead) {
          console.log(`${player.label} has been defeated!`)
        }

        if (this.onHit) {
          this.onHit(this, player)
        }

        return false // Projectile should be removed
      }
    }

    return true // Projectile should continue
  }

  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      texture: this.texture,
      rotation: Math.atan2(this.velocityY, this.velocityX) - Math.PI / 2,
    }
  }
}
