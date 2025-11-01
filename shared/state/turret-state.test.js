import { describe, it, expect, beforeEach, vi } from 'vitest'
import TurretState from './turret-state.js'

describe('TurretState Faction Logic', () => {
  let mockAbilityData

  beforeEach(() => {
    mockAbilityData = {
      cooldown: () => 1000,
      color: 0xff0000,
      targetAllies: false,
      onUse: vi.fn(),
    }
  })

  describe('Faction Detection', () => {
    it('should identify player-sourced turrets correctly', () => {
      const playerSource = {
        id: 'player1',
        stats: { damage: 10 },
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', playerSource, position, 'testAbility', mockAbilityData)

      expect(turret.isPlayerSourced).toBe(true)
    })

    it('should identify enemy-sourced turrets correctly', () => {
      const enemySource = {
        id: 'enemy1',
        stats: { damage: 15 },
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', enemySource, position, 'testAbility', mockAbilityData)

      expect(turret.isPlayerSourced).toBe(false)
    })

    it('should identify player pet-sourced turrets correctly', () => {
      const playerPetSource = {
        id: 'pet1',
        stats: { damage: 8 },
        isPet: true,
        isPlayerSourced: true,
        ownerId: 'player1',
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', playerPetSource, position, 'testAbility', mockAbilityData)

      expect(turret.isPlayerSourced).toBe(true)
    })

    it('should identify enemy pet-sourced turrets correctly', () => {
      const enemyPetSource = {
        id: 'enemy_pet1',
        stats: { damage: 12 },
        isPet: true,
        isPlayerSourced: false,
        ownerId: 'enemy1',
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', enemyPetSource, position, 'testAbility', mockAbilityData)

      expect(turret.isPlayerSourced).toBe(false)
    })
  })

  describe('Targeting Logic', () => {
    let mockPlayers
    let mockEnemies

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
    })

    it('should target enemies when player-sourced offensive turret', () => {
      const playerSource = {
        id: 'player1',
        stats: { damage: 10 },
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', playerSource, position, 'testAbility', mockAbilityData)

      // Mock the ability call
      let capturedTarget = null
      mockAbilityData.onUse = vi.fn((source, target) => {
        capturedTarget = target
      })

      turret.tick(16, mockPlayers, mockEnemies)

      expect(mockAbilityData.onUse).toHaveBeenCalled()
      expect(capturedTarget).toBe(mockEnemies[0])
    })

    it('should target players when enemy-sourced offensive turret', () => {
      const enemySource = {
        id: 'enemy1',
        stats: { damage: 15 },
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', enemySource, position, 'testAbility', mockAbilityData)

      // Mock the ability call
      let capturedTarget = null
      mockAbilityData.onUse = vi.fn((source, target) => {
        capturedTarget = target
      })

      turret.tick(16, mockPlayers, mockEnemies)

      expect(mockAbilityData.onUse).toHaveBeenCalled()
      expect(capturedTarget).toBe(mockPlayers[0])
    })

    it('should target players when player-sourced healing turret', () => {
      const healingAbilityData = {
        ...mockAbilityData,
        targetAllies: true,
      }

      const playerSource = {
        id: 'player1',
        stats: { damage: 10 },
        isHostile: false,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', playerSource, position, 'healAbility', healingAbilityData)

      // Mock the ability call
      let capturedTarget = null
      healingAbilityData.onUse = vi.fn((source, target) => {
        capturedTarget = target
      })

      turret.tick(16, mockPlayers, mockEnemies)

      expect(healingAbilityData.onUse).toHaveBeenCalled()
      expect(capturedTarget).toBe(mockPlayers[0])
    })

    it('should target enemies when enemy-sourced healing turret', () => {
      const healingAbilityData = {
        ...mockAbilityData,
        targetAllies: true,
      }

      const enemySource = {
        id: 'enemy1',
        stats: { damage: 15 },
        isHostile: true,
      }

      const position = { x: 100, y: 100 }
      const turret = new TurretState('turret1', enemySource, position, 'healAbility', healingAbilityData)

      // Mock the ability call
      let capturedTarget = null
      healingAbilityData.onUse = vi.fn((source, target) => {
        capturedTarget = target
      })

      turret.tick(16, mockPlayers, mockEnemies)

      expect(healingAbilityData.onUse).toHaveBeenCalled()
      expect(capturedTarget).toBe(mockEnemies[0])
    })

    it('should not target when no valid targets in range', () => {
      const playerSource = {
        id: 'player1',
        stats: { damage: 10 },
        isHostile: false,
      }

      // Place turret far from targets
      const position = { x: 1000, y: 1000 }
      const turret = new TurretState('turret1', playerSource, position, 'testAbility', mockAbilityData)

      turret.tick(16, mockPlayers, mockEnemies)

      expect(mockAbilityData.onUse).not.toHaveBeenCalled()
    })
  })
})
