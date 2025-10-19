import { Textures } from '../textures.js'
import DamageType from './damage-type.js'
import ItemAttributeType from '../item-attribute-type.js'

// Global projectiles array - managed by server
let projectiles = []
let projectileIdCounter = 0

// Global turrets array - managed by server
let turrets = []
let turretIdCounter = 0

// Helper function to create projectiles
function createProjectile(source, target, { speed, lifetime, texture, damage, damageType, radius = null, onHit = null }) {
  // required options
  if (speed === undefined) {
    throw new Error('createProjectile requires speed option')
  }
  if (lifetime === undefined) {
    throw new Error('createProjectile requires lifetime option')
  }
  if (texture === undefined) {
    throw new Error('createProjectile requires texture option')
  }
  if (damage === undefined) {
    throw new Error('createProjectile requires damage option')
  }
  if (damageType === undefined) {
    throw new Error('createProjectile requires damageType option')
  }

  // other options must be valid if passed
  if (onHit && typeof onHit !== 'function') {
    throw new Error('createProjectile onHit option must be a function')
  }
  if (radius !== null && typeof radius !== 'number') {
    throw new Error('createProjectile radius option must be a number')
  }

  // Calculate direction vector from source to target
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy)

  // Normalize direction vector
  const velocityX = distance > 0 ? (dx / distance) * speed : 0
  const velocityY = distance > 0 ? (dy / distance) * speed : 0

  const projectile = {
    id: `projectile_${++projectileIdCounter}`,
    sourceId: source.id,
    x: source.x,
    y: source.y,
    targetX: target.x,
    targetY: target.y,
    velocityX,
    velocityY,
    speed,
    texture,
    damage,
    damageType,
    onHit,
    radius,
    createdAt: Date.now(),
    lifetime,
    active: true,
  }

  projectiles.push(projectile)
  return projectile
}

// Helper function to create turrets
function createTurret(source, position, abilityId, abilityData, modifiers = []) {
  const maxTurrets = (source.stats && source.stats[ItemAttributeType.MaxTurrets]) || 2
  
  // Remove oldest turret if at max capacity
  const ownerTurrets = turrets.filter(t => t.ownerId === source.id && t.active)
  if (ownerTurrets.length >= maxTurrets) {
    const oldestTurret = ownerTurrets.sort((a, b) => a.createdAt - b.createdAt)[0]
    oldestTurret.active = false
    console.log(`Removed oldest turret (${oldestTurret.id}) to make room for new one`)
  }

  const turret = {
    id: `turret_${++turretIdCounter}`,
    ownerId: source.id,
    x: position.x,
    y: position.y,
    rotation: 0, // Initial rotation
    abilityId,
    abilityData,
    modifiers: modifiers.filter(m => m !== 'Turret'), // Remove Turret modifier to prevent recursion
    range: 500, // Turret detection range
    lastCastTime: 0,
    cooldown: abilityData.cooldown * 2 || 1000, // double ability base cooldown, they should shoot slower than normal ability
    createdAt: Date.now(),
    lifetime: 10000, // Turret lasts for 10 seconds by default
    active: true,
    texture: Textures.abilities.turret0, // Placeholder turret texture
  }

  turrets.push(turret)
  console.log(`Created turret ${turret.id} for ${source.label} at (${position.x}, ${position.y})`)
  return turret
}

// Helper function to update all turrets
function updateTurrets(deltaMS, players = []) {
  const now = Date.now()
  
  for (let i = turrets.length - 1; i >= 0; i--) {
    const turret = turrets[i]

    if (!turret.active) {
      turrets.splice(i, 1)
      continue
    }

    // Check if turret has expired
    const age = now - turret.createdAt
    if (age >= turret.lifetime) {
      turret.active = false
      console.log(`Turret ${turret.id} expired after ${age}ms`)
      turrets.splice(i, 1)
      continue
    }

    // Check if turret can cast (cooldown)
    const timeSinceLastCast = now - turret.lastCastTime
    if (timeSinceLastCast < turret.cooldown) {
      continue
    }

    // Find valid targets in range (enemies of the turret owner)
    const validTargets = players.filter(player => {
      if (!player.isConnected || player.id === turret.ownerId) return false
      
      const distance = Math.hypot(player.x - turret.x, player.y - turret.y)
      return distance <= turret.range
    })

    if (validTargets.length > 0) {
      // Target the closest enemy
      const target = validTargets.reduce((closest, player) => {
        const distance = Math.hypot(player.x - turret.x, player.y - turret.y)
        const closestDistance = Math.hypot(closest.x - turret.x, closest.y - turret.y)
        return distance < closestDistance ? player : closest
      })

      // Update turret rotation to face the target
      const dx = target.x - turret.x
      const dy = target.y - turret.y
      turret.rotation = Math.atan2(dy, dx) + (Math.PI / 2) // -90 degrees to align with sprite orientation

      // Cast the ability from the turret
      const turretAsSource = {
        id: turret.id,
        x: turret.x,
        y: turret.y,
        label: `Turret(${turret.ownerId})`,
        stats: {} // Turrets don't have stats for now
      }

      if (turret.abilityData.onUse) {
        turret.abilityData.onUse(turretAsSource, target, turret.modifiers)
        turret.lastCastTime = now
        console.log(`Turret ${turret.id} cast ${turret.abilityId} at ${target.label}`)
      }
    }
  }
}

// Helper function to get all active turrets (for sending to clients)
function getActiveTurrets() {
  return turrets
    .filter(t => t.active)
    .map(t => ({
      id: t.id,
      ownerId: t.ownerId,
      x: t.x,
      y: t.y,
      rotation: t.rotation,
      texture: t.texture,
      abilityId: t.abilityId,
    }))
}

// Helper function to get turret count for a specific player and ability
function getTurretCount(playerId, abilityId = null) {
  return turrets.filter(t => 
    t.active && 
    t.ownerId === playerId && 
    (abilityId === null || t.abilityId === abilityId)
  ).length
}

// Helper function to update all projectiles
function updateProjectiles(deltaMS, players = []) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i]

    if (!projectile.active) {
      projectiles.splice(i, 1)
      continue
    }

    const now = Date.now()
    const age = now - projectile.createdAt

    // Check if projectile has expired
    if (age >= projectile.lifetime) {
      projectile.active = false
      if (projectile.onHit) {
        projectile.onHit(projectile, null) // null target means expired
      }
      projectiles.splice(i, 1)
      continue
    }

    // Move projectile
    const deltaSeconds = deltaMS / 1000
    projectile.x += projectile.velocityX * deltaSeconds
    projectile.y += projectile.velocityY * deltaSeconds

    // Check for collisions with players (excluding source)
    for (const player of players) {
      if (player.id === projectile.sourceId || !player.isConnected) continue

      const distance = Math.hypot(player.x - projectile.x, player.y - projectile.y)
      if (distance <= projectile.radius) {
        // Hit detected
        projectile.active = false // TODO: if pierce enabled and projectile has it, change this logic

        // Apply damage
        const isDead = player.takeDamage(projectile.damage)
        console.log(`Projectile hit ${player.label} for ${projectile.damage} ${projectile.damageType} damage (${player.currentHealth}/${player.maxHealth} HP remaining)`)
        
        if (isDead) {
          console.log(`${player.label} has been defeated!`)
        }

        if (projectile.onHit) {
          projectile.onHit(projectile, player)
        }

        projectiles.splice(i, 1)
        break
      }
    }
  }
}

// Helper function to get all active projectiles (for sending to clients)
function getActiveProjectiles() {
  return projectiles
    .filter(p => p.active)
    .map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      texture: p.texture,
      rotation: Math.atan2(p.velocityY, p.velocityX) - (Math.PI / 2),
    }))
}

export {
  updateProjectiles,
  getActiveProjectiles,
  createProjectile,
  updateTurrets,
  getActiveTurrets,
  createTurret,
  getTurretCount,
}
