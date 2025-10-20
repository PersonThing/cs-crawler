import ProjectileState from '../../state/projectile-state.js'
import TurretState from '../../state/turret-state.js'
import PetState from '../../state/pet-state.js'

// Global projectiles array - managed by server
let projectiles = []
let projectileIdCounter = 0

// Global turrets array - managed by server
let turrets = []
let turretIdCounter = 0

// Global pets array - managed by server
let pets = []
let petIdCounter = 0

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

// Helper function to create pets
function createPet(source, position, abilityId, abilityData, modifiers = []) {
  const maxPets = PetState.getMaxPets(source)

  // Remove oldest pet if at max capacity
  const ownerPets = pets.filter(p => p.ownerId === source.id && p.active)
  if (ownerPets.length >= maxPets) {
    const oldestPet = ownerPets.sort((a, b) => a.createdAt - b.createdAt)[0]
    oldestPet.active = false
    console.log(`Removed oldest pet (${oldestPet.id}) to make room for new one`)
  }

  const petId = `pet_${source.username}_${++petIdCounter}`
  const pet = new PetState(petId, source, position, abilityId, abilityData, modifiers)
  pets.push(pet)
  console.log(`Created pet ${pet.id} for ${source.label} at (${position.x}, ${position.y})`)
  return pet
}

// Helper function to update all pets
function updatePets(deltaMS, players = []) {
  for (let i = pets.length - 1; i >= 0; i--) {
    const pet = pets[i]
    const shouldContinue = pet.tick(deltaMS, players, pets)
    if (!shouldContinue) {
      pets.splice(i, 1)
    }
  }
}

// Helper function to get all active pets (for sending to clients)
function getActivePets() {
  return pets.filter(p => p.active).map(p => p.serialize())
}

// Helper function to get pet count for a specific player and ability
function getPetCount(playerId, abilityId = null) {
  return pets.filter(p => p.active && p.ownerId === playerId && (abilityId === null || p.abilityId === abilityId)).length
}

export {
  updateProjectiles,
  getActiveProjectiles,
  createProjectile,
  updateTurrets,
  getActiveTurrets,
  createTurret,
  getTurretCount,
  updatePets,
  getActivePets,
  createPet,
  getPetCount,
}
