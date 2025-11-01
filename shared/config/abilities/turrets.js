import TurretState from '../../state/turret-state.js'

// Global turrets array - managed by server
let turrets = []
let turretIdCounter = 0

// Helper function to create turrets
function createTurret(source, position, abilityId, abilityData, modifiers = []) {
  const maxTurrets = TurretState.getMaxTurrets(source)

  // Remove oldest turret if at max capacity
  const ownerTurrets = turrets.filter(t => t.ownerId === source.id && t.active)
  if (ownerTurrets.length >= maxTurrets) {
    const oldestTurret = ownerTurrets.sort((a, b) => a.createdAt - b.createdAt)[0]
    oldestTurret.active = false
    console.log(`Removed oldest turret (${oldestTurret.id}) to make room for new one`)
  }

  const turretId = `turret_${source.username}_${++turretIdCounter}`
  const turret = new TurretState(turretId, source, position, abilityId, abilityData, modifiers)
  turrets.push(turret)
  console.log(`Created turret ${turret.id} for ${source.label} at (${position.x}, ${position.y})`)
  return turret
}

// Helper function to update all turrets
function updateTurrets(deltaMS, players = []) {
  for (let i = turrets.length - 1; i >= 0; i--) {
    const turret = turrets[i]
    const shouldContinue = turret.tick(deltaMS, players)
    if (!shouldContinue) {
      turrets.splice(i, 1)
    }
  }
}

// Helper function to get all active turrets (for sending to clients)
function getActiveTurrets() {
  return turrets.filter(t => t.active).map(t => t.serialize())
}

// Helper function to get turret count for a specific player and ability
function getTurretCount(playerId, abilityId = null) {
  return turrets.filter(t => t.active && t.ownerId === playerId && (abilityId === null || t.abilityId === abilityId)).length
}

export { createTurret, updateTurrets, getActiveTurrets, getTurretCount }
