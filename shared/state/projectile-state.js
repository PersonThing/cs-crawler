export default class ProjectileState {
  constructor(
    id,
    source,
    target,
    { speed, lifetime, texture, damage, damageType, radius = null, onHit = null, homing = false, homingRange = 300, piercing = false }
  ) {
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
    this.isPlayerSourced = source.isPet ? source.isPlayerSourced : !source.isHostile // Pets inherit owner faction, others check isHostile
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
    this.homing = homing
    this.homingRange = homingRange
    this.currentTarget = null
    this.lastHomingUpdate = 0
    this.piercing = piercing
    this.hitTargets = new Set() // Track which entities have been hit
    this.currentlyTouchingTargets = new Set() // Track which entities are currently being touched
    this.createdAt = Date.now()
    this.lifetime = lifetime
    this.active = true
  }

  tick(deltaMS, players = [], pather = null, enemies = [], effectDataCallback = null) {
    if (!this.active) {
      return false // Projectile should be removed
    }

    const now = Date.now()
    const age = now - this.createdAt

    // Check if projectile has expired
    if (age >= this.lifetime) {
      this.active = false
      if (this.onHit) {
        const effectData = this.onHit(this, null, enemies) // null target means expired, pass enemies array
        if (effectData && effectDataCallback) {
          effectDataCallback(effectData)
        }
      }
      return false // Projectile should be removed
    }

    // Handle homing behavior - update target every 100ms
    if (this.homing && now - this.lastHomingUpdate > 100) {
      this.updateHomingTarget(players, enemies)
      this.lastHomingUpdate = now
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
          const effectData = this.onHit(this, null, enemies) // null target indicates wall/hit by environment, pass enemies array
          if (effectData && effectDataCallback) {
            effectDataCallback(effectData)
          }
        } catch (err) {
          console.error('Error in projectile onHit handler:', err)
        }
      }
      return false // Projectile should be removed
    }

    // Not blocked: commit new position
    this.x = newX
    this.y = newY

    // Check for collisions based on faction
    if (this.isPlayerSourced) {
      // Track which enemies are currently being touched this frame
      const currentlyTouchingEnemies = new Set()
      
      // Player-sourced projectiles damage enemies
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue

        const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y)
        if (distance <= this.radius) {
          // Currently touching this enemy
          currentlyTouchingEnemies.add(enemy.id)
          
          // For piercing projectiles, check if we've already hit this enemy
          if (this.piercing && this.hitTargets.has(enemy.id)) {
            continue // Skip this enemy, we've already hit them
          }

          // For non-piercing projectiles, deactivate on hit
          if (!this.piercing) {
            this.active = false
          } else {
            // For piercing projectiles, add to hit targets
            this.hitTargets.add(enemy.id)
          }

          const isDead = enemy.takeDamage(this.damage, { id: this.sourceId })
          // console.log(
          //   `Player projectile hit ${enemy.label} for ${this.damage} ${this.damageType} damage (${enemy.currentHealth}/${enemy.maxHealth} HP remaining)`
          // )

          if (isDead) {
            console.log(`${enemy.label} has been defeated!`)
          }

          if (this.onHit) {
            const effectData = this.onHit(this, enemy, enemies)
            if (effectData && effectDataCallback) {
              effectDataCallback(effectData)
            }
          }

          // For non-piercing projectiles, return false to stop movement
          if (!this.piercing) {
            return false
          }
        }
      }
      
      // For piercing projectiles, remove enemies from hit list that are no longer being touched
      if (this.piercing) {
        // Find enemies that were touching last frame but not this frame
        for (const enemyId of this.currentlyTouchingTargets) {
          if (!currentlyTouchingEnemies.has(enemyId)) {
            // Enemy is no longer being touched, remove from hit targets
            this.hitTargets.delete(enemyId)
          }
        }
        // Update currently touching targets
        this.currentlyTouchingTargets = currentlyTouchingEnemies
      }
    } else {
      // Track which players are currently being touched this frame
      const currentlyTouchingPlayers = new Set()
      
      // Enemy-sourced projectiles damage players
      for (const player of players) {
        if (player.id === this.sourceId || player.id === this.sourceOwnerId || !player.isConnected) continue
        if (player.currentHealth <= 0) continue

        const distance = Math.hypot(player.x - this.x, player.y - this.y)
        if (distance <= this.radius) {
          // Currently touching this player
          currentlyTouchingPlayers.add(player.id)
          
          // For piercing projectiles, check if we've already hit this player
          if (this.piercing && this.hitTargets.has(player.id)) {
            continue // Skip this player, we've already hit them
          }

          // For non-piercing projectiles, deactivate on hit
          if (!this.piercing) {
            this.active = false
          } else {
            // For piercing projectiles, add to hit targets
            this.hitTargets.add(player.id)
          }

          const isDead = player.takeDamage(this.damage, { id: this.sourceId })
          // console.log(
          //   `Enemy projectile hit ${player.label} for ${this.damage} ${this.damageType} damage (${player.currentHealth}/${player.maxHealth} HP remaining)`
          // )

          if (isDead) {
            console.log(`${player.label} has been defeated!`)
          }

          if (this.onHit) {
            const effectData = this.onHit(this, player, enemies)
            if (effectData && effectDataCallback) {
              effectDataCallback(effectData)
            }
          }

          // For non-piercing projectiles, return false to stop movement
          if (!this.piercing) {
            return false
          }
        }
      }
      
      // For piercing projectiles, remove players from hit list that are no longer being touched
      if (this.piercing) {
        // Find players that were touching last frame but not this frame
        for (const playerId of this.currentlyTouchingTargets) {
          if (!currentlyTouchingPlayers.has(playerId)) {
            // Player is no longer being touched, remove from hit targets
            this.hitTargets.delete(playerId)
          }
        }
        // Update currently touching targets
        this.currentlyTouchingTargets = currentlyTouchingPlayers
      }
    }

    return true // Projectile should continue
  }

  updateHomingTarget(players, enemies) {
    // Find valid targets based on projectile faction
    let validTargets = []
    
    if (this.isPlayerSourced) {
      // Player-sourced projectiles target enemies
      validTargets = enemies.filter(enemy => enemy.isAlive && enemy.isAlive())
    } else {
      // Enemy-sourced projectiles target players
      validTargets = players.filter(player => player.isConnected && player.currentHealth > 0)
    }

    // Find closest target within homing range
    let closestTarget = null
    let closestDistance = this.homingRange

    for (const target of validTargets) {
      const distance = Math.hypot(target.x - this.x, target.y - this.y)
      if (distance < closestDistance) {
        closestTarget = target
        closestDistance = distance
      }
    }

    // Update velocity to aim toward the new target
    if (closestTarget) {
      this.currentTarget = closestTarget
      const dx = closestTarget.x - this.x
      const dy = closestTarget.y - this.y
      const distance = Math.hypot(dx, dy)
      
      if (distance > 0) {
        this.velocityX = (dx / distance) * this.speed
        this.velocityY = (dy / distance) * this.speed
      }
    }
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
