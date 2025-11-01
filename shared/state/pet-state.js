import EntityState from './entity-state.js'
import ItemAttribute from '../config/item-attribute.js'
import { Textures } from '../config/textures.js'

const PET_LIFETIME = 60000 // 60 seconds
const PET_LEASH_DISTANCE = 200 // Stay near owner
const PET_DETECTION_RANGE = 400 // Range to detect targets

export default class PetState extends EntityState {
  constructor(id, source, position, abilityId, abilityData, modifiers = []) {
    // Required params validation
    if (!source) {
      throw new Error('PetState requires source')
    }

    // Initialize as living entity
    super({
      id,
      label: `Pet(${source.label})`,
      pather: source.pather, // Use same pather as owner
      color: source.color,
      x: position.x,
      y: position.y,
      targetItem: null,
      inventory: null, // Pets don't have inventory
    })

    // Pet-specific properties
    this.ownerId = source.id
    this.getStats = () => source.stats // Use owner's stats dynamically
    this.abilityId = abilityId
    this.abilityData = abilityData
    this.modifiers = modifiers.filter(m => m !== 'Pet') // Remove Pet modifier to prevent recursion
    this.range = PET_DETECTION_RANGE
    this.leashDistance = PET_LEASH_DISTANCE
    this.lastCastTime = 0
    this.cooldown = abilityData.cooldown({ isPet: true }, this.modifiers)
    this.createdAt = Date.now()
    this.lifetime = PET_LIFETIME
    this.active = true
    this.texture = Textures.abilities.weird_cat
    this.petColor = abilityData.color || 0xffffff
    this.targetAllies = abilityData.targetAllies ? true : false
    this.currentTarget = null

    // Pet has lower health than players
    this.maxHealth = 50
    this.currentHealth = 50
    this.maxSpeed = 400 // Slightly slower than players
  }

  tick(deltaMS, players = [], allPets = []) {
    if (!this.active) {
      return false // Pet should be removed
    }

    // Store reference to all pets for collision avoidance
    this.allPetsReference = allPets

    const now = Date.now()

    // Check if pet has expired
    const age = now - this.createdAt
    if (age >= this.lifetime) {
      this.active = false
      console.log(`Pet ${this.id} expired after ${age}ms`)
      return false // Pet should be removed
    }

    // Check if pet died
    if (!this.isAlive()) {
      this.active = false
      console.log(`Pet ${this.id} was defeated`)
      return false // Pet should be removed
    }

    // Find owner
    const owner = players.find(p => p.id === this.ownerId && p.isConnected)
    if (!owner) {
      this.active = false
      console.log(`Pet ${this.id} lost its owner`)
      return false // Pet should be removed
    }

    // First priority: Stay leashed to owner
    const distanceToOwner = Math.hypot(owner.x - this.x, owner.y - this.y)
    if (distanceToOwner > this.leashDistance) {
      // Move toward owner
      this.setTarget({ x: owner.x, y: owner.y })
      this.moveTowardTarget(deltaMS)
      return true // Pet should continue but focus on returning to owner
    }

    // Second priority: Look for targets and engage
    this.findAndEngageTarget(deltaMS, players, owner)

    // Always move toward current target if we have one
    if (this.target) {
      this.moveTowardTarget(deltaMS)
    }

    return true // Pet should continue
  }

  findAndEngageTarget(deltaMS, players, owner) {
    const now = Date.now()

    // Find valid targets
    const validTargets = players.filter(player => {
      const isValid =
        player.currentHealth > 0 && // must be alive
        this.targetAllies
          ? player.id === this.ownerId && player.currentHealth < player.maxHealth // todo: allies = owner only for now, skip anyone at full health
          : player.id !== this.ownerId // todo: enemies = other players only for now

      if (!player.isConnected || !isValid) return false

      const distance = Math.hypot(player.x - this.x, player.y - this.y)
      return distance <= this.range
    })

    if (validTargets.length > 0) {
      // Get closest valid target
      const target = validTargets.reduce((closest, player) => {
        const distance = Math.hypot(player.x - this.x, player.y - this.y)
        const closestDistance = Math.hypot(closest.x - this.x, closest.y - this.y)
        return distance < closestDistance ? player : closest
      })

      this.currentTarget = target

      // Rotate to face target
      this.rotateToward(target)

      // Check if pet can cast (cooldown)
      const timeSinceLastCast = now - this.lastCastTime
      if (timeSinceLastCast >= this.cooldown) {
        // Cast the ability from the pet
        const petAsSource = {
          id: this.id,
          ownerId: this.ownerId,
          x: this.x,
          y: this.y,
          label: this.label,
          stats: this.getStats() || {},
          isPet: true,
        }

        if (this.abilityData.onUse) {
          // Store cast request to be handled by pet helpers
          this.pendingCast = {
            abilityId: this.abilityId,
            source: petAsSource,
            target: target,
            modifiers: this.modifiers,
          }
          this.lastCastTime = now
          console.log(`Pet ${this.id} wants to cast ${this.abilityId} at ${target.label}`)
        }
      }
    } else {
      // No targets in range, look for targets to move toward
      const allTargets = players.filter(player => {
        const isValid =
          player.currentHealth > 0 && // must be alive
          this.targetAllies
            ? player.id === this.ownerId && player.currentHealth < player.maxHealth
            : player.id !== this.ownerId

        return player.isConnected && isValid
      })

      if (allTargets.length > 0) {
        // Find closest target and move toward it (but stay within leash)
        const closestTarget = allTargets.reduce((closest, player) => {
          const distance = Math.hypot(player.x - this.x, player.y - this.y)
          const closestDistance = Math.hypot(closest.x - this.x, closest.y - this.y)
          return distance < closestDistance ? player : closest
        })

        // Only move toward target if it won't break leash
        const ownerToTargetDistance = Math.hypot(closestTarget.x - owner.x, closestTarget.y - owner.y)
        if (ownerToTargetDistance <= this.leashDistance) {
          this.setTarget({ x: closestTarget.x, y: closestTarget.y })
          this.currentTarget = closestTarget
        } else {
          // Target is too far, stay near owner
          this.currentTarget = null
          if (Math.hypot(owner.x - this.x, owner.y - this.y) > this.leashDistance * 0.5) {
            this.setTarget({ x: owner.x, y: owner.y })
          }
        }
      } else {
        // No targets at all, stay near owner
        this.currentTarget = null
        if (Math.hypot(owner.x - this.x, owner.y - this.y) > this.leashDistance * 0.5) {
          this.setTarget({ x: owner.x, y: owner.y })
        }
      }
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      ownerId: this.ownerId,
      texture: this.texture,
      abilityId: this.abilityId,
      color: this.petColor,
      range: this.range,
      leashDistance: this.leashDistance,
      isPet: true,
    }
  }

  // Override moveTowardTarget to include collision avoidance
  moveTowardTarget(deltaMS) {
    if (this.tempTarget == null && this.path.length) {
      this.tempTarget = this.path.shift() || null
    }

    if (this.tempTarget == null) {
      return
    }

    this.rotateToward(this.tempTarget)

    // Calculate desired movement
    const dx = this.tempTarget.x - this.x
    const dy = this.tempTarget.y - this.y
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy)
    const distanceToMoveThisFrame = this.maxSpeed * (deltaMS / 1000)

    if (distanceToMoveThisFrame < distanceToTarget) {
      const angle = Math.atan2(dy, dx)
      let newX = this.x + Math.cos(angle) * distanceToMoveThisFrame
      let newY = this.y + Math.sin(angle) * distanceToMoveThisFrame

      // Apply collision avoidance with other pets
      const avoidanceForce = this.calculatePetAvoidance(newX, newY)
      newX += avoidanceForce.x
      newY += avoidanceForce.y

      this.setPosition(newX, newY)
    } else {
      // we've reached the target, snap to it
      this.setPosition(this.tempTarget.x, this.tempTarget.y)

      // use the remaining distance available to move toward the next point in the path
      this.tempTarget = this.path.shift() || null
      if (this.tempTarget != null) {
        const percentMovementLeft = 1 - distanceToTarget / distanceToMoveThisFrame
        this.moveTowardTarget(deltaMS * percentMovementLeft)
      }
    }
  }

  // Calculate avoidance force to prevent pets from stacking
  calculatePetAvoidance(proposedX, proposedY) {
    const avoidanceRadius = 40 // Minimum distance between pets
    const avoidanceStrength = 20 // How strong the avoidance force is
    let forceX = 0
    let forceY = 0

    // Check against other pets (passed via closure or instance variable)
    if (this.allPetsReference) {
      for (const otherPet of this.allPetsReference) {
        if (otherPet.id === this.id || !otherPet.active) continue

        const dx = proposedX - otherPet.x
        const dy = proposedY - otherPet.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < avoidanceRadius && distance > 0) {
          // Calculate repulsion force (inverse square law-ish)
          const repulsionStrength = (avoidanceStrength * (avoidanceRadius - distance)) / avoidanceRadius
          const normalizedDx = dx / distance
          const normalizedDy = dy / distance

          forceX += normalizedDx * repulsionStrength
          forceY += normalizedDy * repulsionStrength
        }
      }
    }

    return { x: forceX, y: forceY }
  }

  static getMaxPets(source) {
    const plusMaxPets = source.stats && source.stats[ItemAttribute.MaxPets] ? source.stats[ItemAttribute.MaxPets] : 0
    return 1 + plusMaxPets // everyone can spawn at least 1 pet, items can increase this
  }
}
