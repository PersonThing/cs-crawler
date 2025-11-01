import ProjectileState from '../../state/projectile-state.js'

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

// Helper function to update all projectiles
// deltaMS: milliseconds since last update
// players: array of player objects to test hits against
// pather (optional): instance of Pather to test collisions with the level (isWalkableAt)
function updateProjectiles(deltaMS, players = [], pather = null) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i]
    const shouldContinue = projectile.tick(deltaMS, players, pather)

    if (!shouldContinue) {
      projectiles.splice(i, 1)
    }
  }
}

// Helper function to get all active projectiles (for sending to clients)
function getActiveProjectiles() {
  return projectiles.filter(p => p.active).map(p => p.serialize())
}

export { createProjectile, updateProjectiles, getActiveProjectiles }
