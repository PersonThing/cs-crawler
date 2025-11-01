import PetState from '../../state/pet-state.js'

// Global pets array - managed by server
let pets = []
let petIdCounter = 0

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
function updatePets(deltaMS, players = [], useAbilityCallback = null, enemies = []) {
  for (let i = pets.length - 1; i >= 0; i--) {
    const pet = pets[i]
    const shouldContinue = pet.tick(deltaMS, players, pets, enemies)

    // Handle pending casts (to avoid circular dependency)
    if (pet.pendingCast && useAbilityCallback) {
      useAbilityCallback(pet.pendingCast.abilityId, pet.pendingCast.source, pet.pendingCast.target, pet.pendingCast.modifiers)
      pet.pendingCast = null // Clear the pending cast
    }

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

// Helper function to clear all pets (for level resets)
function clearPets() {
  pets.length = 0
  petIdCounter = 0
}

export { createPet, updatePets, getActivePets, getPetCount, clearPets }
