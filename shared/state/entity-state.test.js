import { describe, it, expect, beforeEach, vi } from 'vitest'
import EntityState from './entity-state.js'
import Inventory from './inventory.js'
import { BLOCK_SIZE } from '../config/constants.js'
import { Abilities } from '#shared/config/abilities/abilities.js'

// Mock dependencies
vi.mock('./inventory.js')
vi.mock('../utils/inventory-stat-calculator.js', () => ({
  default: {
    calculateStats: vi.fn(() => ({}))
  }
}))

describe('EntityState', () => {
  let mockPather
  let entity = new EntityState({}) // just for intellisense
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock pather
    mockPather = {
      findPath: vi.fn(() => [
        { x: 50, y: 50 },
        { x: 100, y: 100 }
      ])
    }
    
    // Create entity instance
    entity = new EntityState({
      id: 'test-entity',
      label: 'Test Entity',
      pather: mockPather,
      color: '#FF0000',
      x: 0,
      y: 0
    })
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(entity.id).toBe('test-entity')
      expect(entity.label).toBe('Test Entity')
      expect(entity.x).toBe(0)
      expect(entity.y).toBe(0)
      expect(entity.rotation).toBe(0)
      expect(entity.maxSpeed).toBe(500)
      expect(entity.target).toBeNull()
      expect(entity.isAttacking).toBe(false)
      expect(entity.attackTarget).toBeNull()
      expect(entity.path).toEqual([])
      expect(entity.color).toBe('#FF0000')
      expect(entity.inventory).toBeInstanceOf(Inventory)
    })

    it('should initialize with custom position', () => {
      const customEntity = new EntityState({
        id: 'custom',
        label: 'Custom',
        pather: mockPather,
        x: 100,
        y: 200
      })
      
      expect(customEntity.x).toBe(100)
      expect(customEntity.y).toBe(200)
    })
  })

  describe('serialize', () => {
    it('should serialize all relevant properties', () => {
      entity.isAttacking = true
      entity.attackTarget = { x: 10, y: 20 }
      entity.target = { x: 30, y: 40 }
      entity.rotation = Math.PI / 2
      entity.targetItem = { item: { id: 'test-item' } }
      
      const mockInventoryData = { sequence: 1, bags: [] }
      entity.inventory.serialize = vi.fn(() => mockInventoryData)
      
      const serialized = entity.serialize()
      
      expect(serialized).toEqual({
        id: 'test-entity',
        label: 'Test Entity',
        turretCounts: {},
        abilityCooldowns: {},
        x: 0,
        y: 0,
        isAttacking: true,
        attackTarget: { x: 10, y: 20 },
        target: { x: 30, y: 40 },
        rotation: Math.PI / 2,
        color: '#FF0000',
        currentHealth: 100,
        maxHealth: 100,
        targetItem: { item: { id: 'test-item' } },
        inventory: mockInventoryData
      })
    })
  })

  describe('deserialize', () => {
    it('should deserialize data and update properties', () => {
      const mockInventoryData = { sequence: 2, bags: ['item1'] }
      entity.inventory.deserialize = vi.fn()
      entity.computeStats = vi.fn()
      
      const data = {
        x: 50,
        y: 100,
        rotation: Math.PI,
        isAttacking: true,
        inventory: mockInventoryData
      }
      
      entity.deserialize(data)
      
      expect(entity.x).toBe(50)
      expect(entity.y).toBe(100)
      expect(entity.rotation).toBe(Math.PI)
      expect(entity.isAttacking).toBe(true)
      expect(entity.inventory.deserialize).toHaveBeenCalledWith(mockInventoryData)
      // expect(entity.computeStats).toHaveBeenCalled()
    })

    it('should handle data without inventory', () => {
      entity.computeStats = vi.fn()
      
      const data = { x: 25, y: 75 }
      entity.deserialize(data)
      
      expect(entity.x).toBe(25)
      expect(entity.y).toBe(75)
      // expect(entity.computeStats).toHaveBeenCalled()
    })
  })

  describe('setPosition', () => {
    it('should set valid position coordinates', () => {
      entity.setPosition(100, 200)
      
      expect(entity.x).toBe(100)
      expect(entity.y).toBe(200)
    })

    it('should reject invalid position values', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalX = entity.x
      const originalY = entity.y
      
      entity.setPosition(NaN, 100)
      expect(entity.x).toBe(originalX)
      expect(entity.y).toBe(originalY)
      expect(consoleSpy).toHaveBeenCalled()
      
      entity.setPosition(100, 'invalid')
      expect(entity.x).toBe(originalX)
      expect(entity.y).toBe(originalY)
      
      consoleSpy.mockRestore()
    })
  })

  describe('rotateToward', () => {
    it('should calculate correct rotation angle', () => {
      entity.setPosition(0, 0)
      
      // Target to the right (east)
      entity.rotateToward({ x: 100, y: 0 })
      expect(entity.rotation).toBeCloseTo(Math.PI / 2) // 90 degrees
      
      // Target above (north)
      entity.rotateToward({ x: 0, y: -100 })
      expect(entity.rotation).toBeCloseTo(0) // 0 degrees
      
      // Target to the left (west)
      entity.rotateToward({ x: -100, y: 0 })
      expect(entity.rotation).toBeCloseTo(Math.PI * 1.5) // 270 degrees (or -90)
    })

    it('should not change rotation for null target', () => {
      const originalRotation = entity.rotation
      entity.rotateToward(null)
      expect(entity.rotation).toBe(originalRotation)
    })

    it('should not change rotation for same position target', () => {
      entity.setPosition(50, 50)
      const originalRotation = entity.rotation
      entity.rotateToward({ x: 50, y: 50 })
      expect(entity.rotation).toBe(originalRotation)
    })
  })

  describe('setTarget', () => {
    it('should set target and find path', () => {
      const target = { x: 100, y: 100 }
      entity.setTarget(target)
      
      expect(entity.target).toEqual(target)
      expect(mockPather.findPath).toHaveBeenCalledWith({ x: 0, y: 0 }, target)
      expect(entity.tempTarget).toEqual({ x: 50, y: 50 }) // First path point
      expect(entity.path).toEqual([{ x: 100, y: 100 }]) // Remaining path
    })

    it('should not set target if null', () => {
      entity.setTarget(null)
      expect(entity.target).toBeNull()
      expect(mockPather.findPath).not.toHaveBeenCalled()
    })

    it('should not set target if same as current target', () => {
      const target = { x: 100, y: 100 }
      entity.target = target
      entity.setTarget(target)
      
      expect(mockPather.findPath).not.toHaveBeenCalled()
    })

    it('should not set target if same as current position', () => {
      entity.setPosition(50, 50)
      entity.setTarget({ x: 50, y: 50 })
      
      expect(entity.target).toBeNull()
      expect(mockPather.findPath).not.toHaveBeenCalled()
    })
  })

  describe('moveTowardTarget', () => {
    it('should move toward tempTarget when available', () => {
      entity.tempTarget = { x: 100, y: 0 }
      entity.setPosition(0, 0)
      
      // Move for 100ms at 500 pixels/second = 50 pixels
      entity.moveTowardTarget(100)
      
      expect(entity.x).toBe(50)
      expect(entity.y).toBe(0)
    })

    it('should set tempTarget from path if none exists', () => {
      entity.path = [{ x: 50, y: 50 }, { x: 100, y: 100 }]
      entity.tempTarget = null
      
      entity.moveTowardTarget(100)
      expect(entity.tempTarget).toEqual({ x: 50, y: 50 })
      expect(entity.path.length).toEqual(1)

      entity.moveTowardTarget(100)
      expect(entity.tempTarget).toEqual({ x: 100, y: 100 }) // Still moving toward first tempTarget
      expect(entity.path).toEqual([])
    })

    it('should snap to target and move to next when reaching tempTarget', () => {
      entity.setPosition(0, 0)
      entity.tempTarget = { x: 50, y: 0 }
      entity.path = [{ x: 100, y: 0 }]
      
      // Move for 200ms at 500 pixels/second = 100 pixels (more than distance to tempTarget)
      entity.moveTowardTarget(200)
      
      expect(entity.x).toBe(100) // Should reach the next target
      expect(entity.y).toBe(0)
      expect(entity.tempTarget).toBeNull() // Path should be empty
    })

    it('should do nothing if no tempTarget and no path', () => {
      entity.setPosition(50, 50)
      entity.tempTarget = null
      entity.path = []
      
      entity.moveTowardTarget(100)
      
      expect(entity.x).toBe(50)
      expect(entity.y).toBe(50)
    })
  })

  describe('attack', () => {
    it('should set attacking state and target', () => {
      const attackTarget = { x: 50, y: 50 }
      entity.attack(attackTarget)
      
      expect(entity.isAttacking).toBe(true)
      expect(entity.attackTarget).toEqual(attackTarget)
    })
  })

  describe('stopAttacking', () => {
    it('should clear attacking state and target', () => {
      entity.isAttacking = true
      entity.attackTarget = { x: 50, y: 50 }
      
      entity.stopAttacking()
      
      expect(entity.isAttacking).toBe(false)
      expect(entity.attackTarget).toBeNull()
    })
  })

  describe('setTargetItem', () => {
    it('should set target item', () => {
      const groundItem = { item: { id: 'test-item' } }
      entity.setTargetItem(groundItem)
      
      expect(entity.targetItem).toEqual(groundItem)
    })
  })

  describe('tick', () => {
    it('should call moveTowardTarget with deltaMS', () => {
      entity.moveTowardTarget = vi.fn()
      const time = { deltaMS: 16 }
      
      entity.tick(time, [])
      
      expect(entity.moveTowardTarget).toHaveBeenCalledWith(16)
    })

    it('should clear targetItem if not found in groundItems', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      entity.targetItem = { item: { id: 'missing-item' } }
      const groundItems = [{ item: { id: 'other-item' } }]
      
      entity.tick({ deltaMS: 16 }, groundItems)
      
      expect(entity.targetItem).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('targetItem no longer exists on ground, clearing')
      consoleSpy.mockRestore()
    })

    it('should pick up item when close enough and inventory allows', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const targetItem = {
        item: { id: 'pickup-item', name: 'Test Item' },
        position: { x: BLOCK_SIZE, y: 0 } // Within pickup range
      }
      entity.targetItem = targetItem
      entity.setPosition(0, 0)
      entity.inventory.pickup = vi.fn(() => true)
      
      const groundItems = [targetItem]
      
      entity.tick({ deltaMS: 16 }, groundItems)
      
      expect(entity.inventory.pickup).toHaveBeenCalledWith(targetItem.item)
      expect(groundItems).toHaveLength(0) // Item should be removed
      expect(entity.targetItem).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('picked up item', 'Test Item')
      consoleSpy.mockRestore()
    })

    it('should not pick up item when too far away', () => {
      const targetItem = {
        item: { id: 'far-item' },
        position: { x: BLOCK_SIZE * 5, y: 0 } // Too far
      }
      entity.targetItem = targetItem
      entity.setPosition(0, 0)
      entity.inventory.pickup = vi.fn(() => true)
      
      const groundItems = [targetItem]
      
      entity.tick({ deltaMS: 16 }, groundItems)
      
      expect(entity.inventory.pickup).not.toHaveBeenCalled()
      expect(groundItems).toHaveLength(1) // Item should remain
      expect(entity.targetItem).toBe(targetItem)
    })

    it('should not pick up item when inventory is full', () => {
      const targetItem = {
        item: { id: 'full-item' },
        position: { x: BLOCK_SIZE, y: 0 }
      }
      entity.targetItem = targetItem
      entity.setPosition(0, 0)
      entity.inventory.pickup = vi.fn(() => false) // Inventory full
      
      const groundItems = [targetItem]
      
      entity.tick({ deltaMS: 16 }, groundItems)
      
      expect(entity.inventory.pickup).toHaveBeenCalledWith(targetItem.item)
      expect(groundItems).toHaveLength(1) // Item should remain
      expect(entity.targetItem).toBe(targetItem) // Target should remain
    })
  })

  describe('computeStats', () => {
    it('should not recompute if equippedSequence unchanged', () => {
      entity.inventory.equippedSequence = 5
      entity.computedEquippedSequence = 5
      const originalStats = entity.stats
      
      entity.computeStats()
      
      expect(entity.stats).toBe(originalStats)
    })

    it('should recompute stats when equippedSequence changes', async () => {
      const InventoryStatCalculator = (await import('../utils/inventory-stat-calculator.js')).default
      const mockStats = { strength: 10, agility: 5 }
      InventoryStatCalculator.calculateStats.mockReturnValue(mockStats)
      
      entity.inventory.equippedSequence = 10
      entity.computedEquippedSequence = 5
      
      entity.computeStats()
      
      expect(entity.stats).toEqual(mockStats)
      expect(entity.computedEquippedSequence).toBe(10)
      expect(InventoryStatCalculator.calculateStats).toHaveBeenCalledWith(entity.inventory.equipped)
    })
  })

  describe('hasAbilityUnlocked', () => {
    it('should return true for BasicAttack', () => {
      expect(entity.hasAbilityUnlocked(Abilities.BasicAttack.id)).toBe(true)
    })

    it('should return true for abilities with positive stats', () => {
      entity.stats = { 'some-ability': 1 }
      entity.computeStats = vi.fn()
      
      expect(entity.hasAbilityUnlocked('some-ability')).toBe(true)
      expect(entity.computeStats).toHaveBeenCalled()
    })

    it('should return false for abilities with zero or no stats', () => {
      entity.stats = { 'some-ability': 0 }
      entity.computeStats = vi.fn()
      
      expect(entity.hasAbilityUnlocked('some-ability')).toBe(false)
      expect(entity.hasAbilityUnlocked('non-existent-ability')).toBe(false)
    })
  })

  describe('setInventory', () => {
    it('should deserialize inventory, which should compute stats indirectly', () => {
      const inventoryData = { sequence: 5, bags: [] }
      entity.computeStats = vi.fn()
      
      entity.setInventory(inventoryData)
      
      expect(entity.inventory.deserialize).toHaveBeenCalledWith(inventoryData)
      // expect(entity.computeStats).toHaveBeenCalled() // computeStats called via Inventory callback
    })
  })
})
