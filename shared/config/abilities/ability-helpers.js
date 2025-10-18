import { Textures } from '../textures.js'
import DamageType from './damage-type.js'

// Global projectiles array - managed by server
let projectiles = []
let projectileIdCounter = 0

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

        // Apply damage (TODO: implement actual damage system)
        console.log(`Projectile hit ${player.label} for ${projectile.damage} ${projectile.damageType} damage`)

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
}
