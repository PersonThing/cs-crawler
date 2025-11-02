import ProjectileState from '../../state/projectile-state.js'
import ItemAttribute from '../item-attribute.js'

// Global projectiles array - managed by server
let projectiles = []
let projectileIdCounter = 0

// Helper function to create projectiles
function createProjectile(source, target, options) {
  const projectileId = `projectile_${++projectileIdCounter}`
  const projectile = new ProjectileState(projectileId, source, target, options)
  projectiles.push(projectile)
  return projectile
}

// Helper function to create multiple projectiles based on ExtraProjectiles stat
function createProjectiles(source, target, options) {
  const extraProjectiles = (source.stats && source.stats[ItemAttribute.ExtraProjectiles]) || 0
  const totalProjectiles = 1 + extraProjectiles
  
  if (totalProjectiles === 1) {
    // Single projectile, use normal behavior
    return [createProjectile(source, target, options)]
  }
  
  // Multiple projectiles - spread them in a frontal cone
  const baseAngle = Math.atan2(target.y - source.y, target.x - source.x)
  const distance = Math.hypot(target.x - source.x, target.y - source.y)
  
  // Distance-based spread: closer = wider spread, farther = tighter spread
  // At 100px: 45° spread, At 400px: 15° spread, At 800px+: 5° spread
  const minSpread = Math.PI / 16 // 11.25 degrees minimum spread
  const maxSpread = Math.PI / 2 // 90 degrees maximum spread
  const minDistance = 100 // Distance for maximum spread
  const maxDistance = 800 // Distance for minimum spread
  
  // Interpolate spread based on distance (inverse relationship)
  const normalizedDistance = Math.max(0, Math.min(1, (distance - minDistance) / (maxDistance - minDistance)))
  const currentSpread = maxSpread - normalizedDistance * (maxSpread - minSpread)
  
  const angleStep = totalProjectiles > 1 ? currentSpread / (totalProjectiles - 1) : 0
  const startAngle = baseAngle - currentSpread / 2
  
  const createdProjectiles = []
  
  for (let i = 0; i < totalProjectiles; i++) {
    const angle = startAngle + angleStep * i
    
    // Calculate new target position for this projectile angle
    const projectileTarget = {
      x: source.x + Math.cos(angle) * distance,
      y: source.y + Math.sin(angle) * distance,
    }
    
    const projectile = createProjectile(source, projectileTarget, options)
    createdProjectiles.push(projectile)
  }
  
  return createdProjectiles
}

// Helper function to update all projectiles
// deltaMS: milliseconds since last update
// players: array of player objects to test hits against
// pather (optional): instance of Pather to test collisions with the level (isWalkableAt)
// enemies (optional): array of enemies that projectiles can damage
// effectDataCallback (optional): callback to handle effect data from onHit handlers
function updateProjectiles(deltaMS, players = [], pather = null, enemies = [], effectDataCallback = null) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i]
    const shouldContinue = projectile.tick(deltaMS, players, pather, enemies, effectDataCallback)

    if (!shouldContinue) {
      projectiles.splice(i, 1)
    }
  }
}

// Helper function to get all active projectiles (for sending to clients)
function getActiveProjectiles() {
  return projectiles.filter(p => p.active).map(p => p.serialize())
}

// Helper function to clear all projectiles (for level resets)
function clearProjectiles() {
  projectiles.length = 0
  projectileIdCounter = 0
}

export { createProjectile, createProjectiles, updateProjectiles, getActiveProjectiles, clearProjectiles }
