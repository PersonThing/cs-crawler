import EntityState from './entity-state.js'
import { Textures } from '#shared/config/textures.js'
import ItemAttribute from '#shared/config/item-attribute.js'

const ENEMY_DETECTION_RANGE = 300 // Range to detect players
const ENEMY_ATTACK_RANGE = 50 // Range to attack players

export default class EnemyState extends EntityState {
  constructor({ id, enemyType, x, y, pather }) {
    const enemyConfig = EnemyTypes[enemyType]
    if (!enemyConfig) {
      throw new Error(`Unknown enemy type: ${enemyType}`)
    }

    super({
      id,
      label: `${enemyConfig.name} (${id})`,
      pather,
      color: enemyConfig.color,
      x,
      y,
      inventory: enemyConfig.defaultInventory || [],
    })

    this.enemyType = enemyType
    this.detectionRange = ENEMY_DETECTION_RANGE
    this.attackRange = ENEMY_ATTACK_RANGE
    this.currentTarget = null
    this.isHostile = true
    this.spawnX = x
    this.spawnY = y
    this.wanderRadius = 100 // How far from spawn point they can wander
    this.lastAction = Date.now()
    this.actionCooldown = 1000 // Minimum time between actions

    // Apply enemy type configuration
    this.maxHealth = enemyConfig.maxHealth || 100
    this.currentHealth = this.maxHealth
    this.maxSpeed = enemyConfig.maxSpeed || 200
    this.texture = enemyConfig.texture
    this.baseStats = enemyConfig.baseStats || {}

    // Set base stats before computing final stats
    Object.entries(this.baseStats).forEach(([key, value]) => {
      this.stats[key] = (this.stats[key] || 0) + value
    })

    this.computeStats() // Recalculate with inventory items
    
    // Set damage property for easy access
    this.damage = this.stats[ItemAttribute.Damage] || 10 // Default damage if not specified
  }

  computeStats() {
    super.computeStats()
    // Update damage property whenever stats are recomputed
    this.damage = this.stats[ItemAttribute.Damage] || 10
  }

  tick(deltaMS, players = []) {
    const now = Date.now()

    // Don't act too frequently
    if (now - this.lastAction < this.actionCooldown) {
      return true
    }

    // Check if enemy is dead
    if (!this.isAlive()) {
      return false // Enemy should be removed
    }

    // Find valid player targets within detection range
    const validTargets = players.filter(player => {
      if (!player.isConnected || player.currentHealth <= 0) return false

      const distance = Math.hypot(player.x - this.x, player.y - this.y)
      return distance <= this.detectionRange
    })

    if (validTargets.length > 0) {
      // Get closest player
      const closestPlayer = validTargets.reduce((closest, player) => {
        const distance = Math.hypot(player.x - this.x, player.y - this.y)
        const closestDistance = Math.hypot(closest.x - this.x, closest.y - this.y)
        return distance < closestDistance ? player : closest
      })

      this.currentTarget = closestPlayer
      const distanceToTarget = Math.hypot(closestPlayer.x - this.x, closestPlayer.y - this.y)

      if (distanceToTarget <= this.attackRange) {
        // Attack the player
        this.attack(closestPlayer)
        
        // Deal damage to the player
        if (closestPlayer.takeDamage) {
          closestPlayer.takeDamage(this.damage, this)
          console.log(`${this.label} dealt ${this.damage} damage to ${closestPlayer.label}`)
        }
        
        this.lastAction = now
      } else {
        // Move toward the player
        this.setTarget({ x: closestPlayer.x, y: closestPlayer.y })
        this.moveTowardTarget(deltaMS)
      }
    } else {
      // No targets, clear current target and maybe wander
      this.currentTarget = null

      // Simple wandering behavior - return to spawn if too far away
      const distanceFromSpawn = Math.hypot(this.x - this.spawnX, this.y - this.spawnY)
      if (distanceFromSpawn > this.wanderRadius) {
        this.setTarget({ x: this.spawnX, y: this.spawnY })
        this.moveTowardTarget(deltaMS)
      }
    }

    return true // Enemy should continue
  }

  attackTarget(target) {
    if (!target || !this.isAlive()) return

    // Face the target
    this.rotateToward(target)

    // Deal damage
    const damage = this.stats[ItemAttribute.Damage] || 10
    target.takeDamage(damage, this)

    console.log(`${this.label} attacked ${target.label} for ${damage} damage`)
  }

  takeDamage(amount, source = null) {
    this.currentHealth = Math.max(0, this.currentHealth - amount)

    if (this.currentHealth <= 0) {
      console.log(`${this.label} was defeated by ${source?.label || 'unknown'}`)
      this.onDeath(source)
    }

    return this.currentHealth
  }

  onDeath(killer = null) {
    // TODO: Drop loot, give experience, etc.
    console.log(`${this.label} died`)
  }

  isAlive() {
    return this.currentHealth > 0
  }

  serialize() {
    return {
      id: this.id,
      label: this.label,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      enemyType: this.enemyType,
      texture: this.texture,
      isAttacking: this.isAttacking,
      target: this.currentTarget ? { x: this.currentTarget.x, y: this.currentTarget.y } : null,
      inventory: this.inventory.serialize(),
    }
  }
}

// Enemy type definitions
export const EnemyTypes = {
  burning_zombie: {
    name: 'Burning Zombie',
    texture: Textures.entity.hostile.burning_zombie.bzombie,
    color: 0x4d7c47,
    maxHealth: 80,
    maxSpeed: 150,
    baseStats: {
      [ItemAttribute.Damage]: 15,
      [ItemAttribute.Defense]: 5,
    },
    defaultInventory: [],
  },

  burning_skeleton: {
    name: 'Burning Skeleton',
    texture: Textures.entity.hostile.burning_skeleton.bskeleton,
    color: 0x8b7355,
    maxHealth: 60,
    maxSpeed: 200,
    baseStats: {
      [ItemAttribute.Damage]: 12,
      [ItemAttribute.Defense]: 3,
      [ItemAttribute.CriticalChance]: 0.15,
    },
    defaultInventory: [],
  },
}
