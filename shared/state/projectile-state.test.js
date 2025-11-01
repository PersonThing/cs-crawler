import { describe, it, expect, beforeEach, vi } from 'vitest'
import ProjectileState from './projectile-state.js'

describe('ProjectileState Faction Logic', () => {
  let mockPather

  beforeEach(() => {
    mockPather = {
      isWalkableAt: () => true,
    }
  })

  describe('Faction Detection', () => {
    it('should identify player-sourced projectiles correctly', () => {
      const playerSource = {
        id: 'player1',
        x: 100,
        y: 100,
        isHostile: false,
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 5,
      }

      const projectile = new ProjectileState('proj1', playerSource, target, options)

      expect(projectile.isPlayerSourced).toBe(true)
    })

    it('should identify enemy-sourced projectiles correctly', () => {
      const enemySource = {
        id: 'enemy1',
        x: 100,
        y: 100,
        isHostile: true,
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 5,
      }

      const projectile = new ProjectileState('proj1', enemySource, target, options)

      expect(projectile.isPlayerSourced).toBe(false)
    })

    it('should identify player pet-sourced projectiles correctly', () => {
      const playerPetSource = {
        id: 'pet1',
        x: 100,
        y: 100,
        isPet: true,
        isPlayerSourced: true,
        ownerId: 'player1',
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 5,
      }

      const projectile = new ProjectileState('proj1', playerPetSource, target, options)

      expect(projectile.isPlayerSourced).toBe(true)
    })

    it('should identify enemy pet-sourced projectiles correctly', () => {
      const enemyPetSource = {
        id: 'enemy_pet1',
        x: 100,
        y: 100,
        isPet: true,
        isPlayerSourced: false,
        ownerId: 'enemy1',
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 5,
      }

      const projectile = new ProjectileState('proj1', enemyPetSource, target, options)

      expect(projectile.isPlayerSourced).toBe(false)
    })
  })

  describe('Collision Targeting', () => {
    let projectile
    let mockPlayers
    let mockEnemies

    beforeEach(() => {
      mockPlayers = [
        {
          id: 'player1',
          x: 150,
          y: 150,
          currentHealth: 100,
          maxHealth: 100,
          isConnected: true,
          takeDamage: vi.fn(() => false),
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
          takeDamage: vi.fn(() => false),
          label: 'Test Enemy',
        },
      ]
    })

    it('should target enemies when fired by player', () => {
      const playerSource = {
        id: 'player1',
        x: 100,
        y: 100,
        isHostile: false,
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 10,
      }

      projectile = new ProjectileState('proj1', playerSource, target, options)
      projectile.x = 150
      projectile.y = 150

      const shouldContinue = projectile.tick(16, mockPlayers, mockPather, mockEnemies)

      expect(shouldContinue).toBe(false) // Projectile should be removed after hit
      expect(mockEnemies[0].takeDamage).toHaveBeenCalledWith(10, { id: 'player1' })
      expect(mockPlayers[0].takeDamage).not.toHaveBeenCalled()
    })

    it('should target players when fired by enemy', () => {
      const enemySource = {
        id: 'enemy1',
        x: 100,
        y: 100,
        isHostile: true,
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 15,
        damageType: 'physical',
        radius: 10,
      }

      projectile = new ProjectileState('proj1', enemySource, target, options)
      projectile.x = 150
      projectile.y = 150

      const shouldContinue = projectile.tick(16, mockPlayers, mockPather, mockEnemies)

      expect(shouldContinue).toBe(false) // Projectile should be removed after hit
      expect(mockPlayers[0].takeDamage).toHaveBeenCalledWith(15, { id: 'enemy1' })
      expect(mockEnemies[0].takeDamage).not.toHaveBeenCalled()
    })

    it('should target enemies when fired by player pet', () => {
      const playerPetSource = {
        id: 'pet1',
        x: 100,
        y: 100,
        isPet: true,
        isPlayerSourced: true,
        ownerId: 'player1',
      }

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 8,
        damageType: 'magical',
        radius: 10,
      }

      projectile = new ProjectileState('proj1', playerPetSource, target, options)
      projectile.x = 150
      projectile.y = 150

      const shouldContinue = projectile.tick(16, mockPlayers, mockPather, mockEnemies)

      expect(shouldContinue).toBe(false) // Projectile should be removed after hit
      expect(mockEnemies[0].takeDamage).toHaveBeenCalledWith(8, { id: 'pet1' })
      expect(mockPlayers[0].takeDamage).not.toHaveBeenCalled()
    })

    it('should not target source player or owner', () => {
      const playerSource = {
        id: 'player1',
        x: 100,
        y: 100,
        isHostile: true, // Enemy projectile
      }

      // Add source player to mock players
      mockPlayers[0].id = 'player1'

      const target = { x: 200, y: 200 }
      const options = {
        speed: 300,
        lifetime: 1000,
        texture: 'test_texture',
        damage: 10,
        damageType: 'physical',
        radius: 10,
      }

      projectile = new ProjectileState('proj1', playerSource, target, options)
      projectile.x = 150
      projectile.y = 150

      const shouldContinue = projectile.tick(16, mockPlayers, mockPather, mockEnemies)

      expect(shouldContinue).toBe(true) // Projectile should continue (no hit)
      expect(mockPlayers[0].takeDamage).not.toHaveBeenCalled()
    })
  })
})
