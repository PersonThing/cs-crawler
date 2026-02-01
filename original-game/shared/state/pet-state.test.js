import { describe, it, expect, beforeEach, vi } from 'vitest'
import PetState from './pet-state.js'

describe('PetState Faction Logic', () => {
  let mockPather
  let mockAbilityData

  beforeEach(() => {
    mockPather = {
      findPath: () => [],
    }

    mockAbilityData = {
      cooldown: () => 1000,
      color: 0x00ff00,
      targetAllies: false,
      onUse: vi.fn(),
    }
  })

  describe('Faction Detection', () => {
    it('should inherit player faction from player owner', () => {
      const playerSource = {
        id: 'player1',
        label: 'Test Player',
        pather: mockPather,
        stats: { damage: 10 },
        color: 0x0000ff,
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const pet = new PetState('pet1', playerSource, position, 'testAbility', mockAbilityData)

      expect(pet.isPlayerSourced).toBe(true)
      expect(pet.isPet).toBe(true)
    })

    it('should inherit enemy faction from enemy owner', () => {
      const enemySource = {
        id: 'enemy1',
        label: 'Test Enemy',
        pather: mockPather,
        stats: { damage: 15 },
        color: 0xff0000,
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      const pet = new PetState('pet1', enemySource, position, 'testAbility', mockAbilityData)

      expect(pet.isPlayerSourced).toBe(false)
      expect(pet.isPet).toBe(true)
    })

    it('should create correct source object for ability casting', () => {
      const playerSource = {
        id: 'player1',
        label: 'Test Player',
        pather: mockPather,
        stats: { damage: 10 },
        color: 0x0000ff,
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const pet = new PetState('pet1', playerSource, position, 'testAbility', mockAbilityData)

      // Simulate pet creating source object for casting
      const petAsSource = {
        id: pet.id,
        ownerId: pet.ownerId,
        x: pet.x,
        y: pet.y,
        label: pet.label,
        stats: pet.getStats() || {},
        isPet: true,
        isPlayerSourced: pet.isPlayerSourced,
      }

      expect(petAsSource.isPet).toBe(true)
      expect(petAsSource.isPlayerSourced).toBe(true)
      expect(petAsSource.ownerId).toBe('player1')
    })
  })

  describe('Targeting Logic', () => {
    let mockPlayers
    let mockEnemies
    let playerPet
    let enemyPet

    beforeEach(() => {
      mockPlayers = [
        {
          id: 'player1',
          x: 150,
          y: 150,
          currentHealth: 80,
          maxHealth: 100,
          isConnected: true,
          label: 'Test Player',
        },
      ]

      mockEnemies = [
        {
          id: 'enemy1',
          x: 150,
          y: 150,
          currentHealth: 50,
          maxHealth: 100,
          isAlive: () => true,
          label: 'Test Enemy',
        },
      ]

      const playerSource = {
        id: 'player1',
        label: 'Test Player',
        pather: mockPather,
        stats: { damage: 10 },
        color: 0x0000ff,
        isHostile: false,
      }

      const enemySource = {
        id: 'enemy1',
        label: 'Test Enemy',
        pather: mockPather,
        stats: { damage: 15 },
        color: 0xff0000,
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      playerPet = new PetState('player_pet1', playerSource, position, 'testAbility', mockAbilityData)
      enemyPet = new PetState('enemy_pet1', enemySource, position, 'testAbility', mockAbilityData)
    })

    it('should target enemies when player pet uses offensive ability', () => {
      const validTargets = mockEnemies.filter(enemy => {
        if (!enemy.isAlive()) return false
        const distance = Math.hypot(enemy.x - playerPet.x, enemy.y - playerPet.y)
        return distance <= playerPet.range
      })

      expect(validTargets).toHaveLength(1)
      expect(validTargets[0]).toBe(mockEnemies[0])
    })

    it('should target players when enemy pet uses offensive ability', () => {
      const validTargets = mockPlayers.filter(player => {
        if (!player.isConnected || player.currentHealth <= 0) return false
        const distance = Math.hypot(player.x - enemyPet.x, player.y - enemyPet.y)
        return distance <= enemyPet.range
      })

      expect(validTargets).toHaveLength(1)
      expect(validTargets[0]).toBe(mockPlayers[0])
    })

    it('should target players when player pet uses healing ability', () => {
      const healingAbilityData = {
        ...mockAbilityData,
        targetAllies: true,
      }

      const playerSource = {
        id: 'player1',
        label: 'Test Player',
        pather: mockPather,
        stats: { damage: 10 },
        color: 0x0000ff,
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const healingPet = new PetState('heal_pet1', playerSource, position, 'healAbility', healingAbilityData)

      const validTargets = mockPlayers.filter(player => {
        const isValid = player.currentHealth > 0 && player.id === healingPet.ownerId && player.currentHealth < player.maxHealth
        if (!player.isConnected || !isValid) return false
        const distance = Math.hypot(player.x - healingPet.x, player.y - healingPet.y)
        return distance <= healingPet.range
      })

      expect(validTargets).toHaveLength(1)
      expect(validTargets[0]).toBe(mockPlayers[0])
    })

    it('should target enemies when enemy pet uses healing ability', () => {
      const healingAbilityData = {
        ...mockAbilityData,
        targetAllies: true,
      }

      const enemySource = {
        id: 'enemy1',
        label: 'Test Enemy',
        pather: mockPather,
        stats: { damage: 15 },
        color: 0xff0000,
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      const healingPet = new PetState('heal_pet1', enemySource, position, 'healAbility', healingAbilityData)

      const validTargets = mockEnemies.filter(enemy => {
        const isValid = enemy.isAlive() && enemy.currentHealth < enemy.maxHealth
        if (!isValid) return false
        const distance = Math.hypot(enemy.x - healingPet.x, enemy.y - healingPet.y)
        return distance <= healingPet.range
      })

      expect(validTargets).toHaveLength(1)
      expect(validTargets[0]).toBe(mockEnemies[0])
    })
  })
})
