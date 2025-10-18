import ItemInventory from './item-inventory.js'
import { BLOCK_SIZE } from '../config/constants.js'
import InventoryStatCalculator from '../utils/inventory-stat-calculator.js'
import { Abilities } from '#shared/config/abilities/abilities.js'

export default class LivingEntityState {
  constructor({ id, label, pather, color, targetItem, inventory, x = 0, y = 0 }) {
    this.pather = pather

    this.id = id
    this.label = label
    this.x = x
    this.y = y
    this.rotation = 0
    this.maxSpeed = 500
    this.target = null
    this.isAttacking = false
    this.attackTarget = null

    this.stats = {}
    this.path = []

    this.color = color
    this.targetItem = targetItem
    this.inventory = new ItemInventory(inventory)
  }

  serialize() {
    return {
      id: this.id,
      label: this.label,
      x: this.x,
      y: this.y,
      isAttacking: this.isAttacking,
      attackTarget: this.attackTarget,
      target: this.target,
      rotation: this.rotation,
      color: this.color,
      targetItem: this.targetItem,
      inventory: this.inventory.serialize(),
    }
  }

  deserialize(data) {
    if (data.inventory) {
      // remove inventory key from data or it'll overwrite this.inventory
      // we just want to set inventory content rather than replace the whole object
      this.inventory.deserialize(data.inventory)
      delete data.inventory
    }
    Object.assign(this, data)
    this.computeStats()
  }

  setInventory(inventory) {
    this.inventory.deserialize(inventory)
    this.computeStats()
  }

  tick(time, groundItems) {
    this.moveTowardTarget(time.deltaMS)

    // is attempting to pick up item?
    if (this.targetItem != null) {
      // is item still on the ground?
      const groundItemIndex = groundItems.findIndex(gi => gi.item.id === this.targetItem.item.id)
      if (groundItemIndex === -1) {
        console.log('targetItem no longer exists on ground, clearing')
        this.targetItem = null
      } else {
        const groundItem = groundItems[groundItemIndex]
        // is it close enough to pick up yet?
        const distance = Math.hypot(this.targetItem.position.x - this.x, this.targetItem.position.y - this.y)
        if (distance <= BLOCK_SIZE * 2 && this.inventory.pickup(groundItem.item)) {
          // successfully picked up - remove from the passed groundItems array
          groundItems.splice(groundItemIndex, 1)
          this.targetItem = null
          console.log('picked up item', groundItem.item.name)
        }
      }
    }
  }

  moveTowardTarget(deltaMS) {
    if (this.tempTarget == null && this.path.length) {
      this.tempTarget = this.path.shift() || null
    }

    if (this.tempTarget == null) {
      return
    }

    this.rotateToward(this.tempTarget)

    // Update position based on target
    const dx = this.tempTarget.x - this.x
    const dy = this.tempTarget.y - this.y
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy)
    const distanceToMoveThisFrame = this.maxSpeed * (deltaMS / 1000)

    if (distanceToMoveThisFrame < distanceToTarget) {
      const angle = Math.atan2(dy, dx)
      // compute move distance based on max speed (in pixels per second) and delta time
      this.setPosition(this.x + Math.cos(angle) * distanceToMoveThisFrame, this.y + Math.sin(angle) * distanceToMoveThisFrame)
    } else {
      // we've reached the target, snap to it
      this.setPosition(this.tempTarget.x, this.tempTarget.y)

      // use the remaining distance available to move toward the next point in the path, if there is one
      this.tempTarget = this.path.shift() || null
      if (this.tempTarget != null) {
        // what % of the distance we should've gone this frame is left after reaching the last tempTarget?
        const percentMovementLeft = 1 - distanceToTarget / distanceToMoveThisFrame

        // move the remainder of the available distance toward the next target
        this.moveTowardTarget(deltaMS * percentMovementLeft)
      }
    }
  }

  rotateToward(target) {
    // if target is null or exactly the same as current position, do nothing
    if (target == null || (target.x === this.x && target.y === this.y)) {
      return
    }

    // calculate angle to target
    const dx = target.x - this.x
    const dy = target.y - this.y
    this.rotation = Math.atan2(dy, dx) + Math.PI / 2 // add 90 degrees to account for sprite facing up by default
  }

  setPosition(x, y) {
    if (isNaN(x) || isNaN(y) || typeof x !== 'number' || typeof y !== 'number') {
      console.error('Invalid position values set:', { x, y })
      return
    }
    this.x = x
    this.y = y
  }

  setTarget(target) {
    // target is null
    if (target == null) {
      this.target = null
      return
    }

    // target hasn't changed
    if (this.target != null && target.x === this.target.x && target.y === this.target.y) {
      return
    }

    // target is the same as current position
    if (target.x == this.x && target.y == this.y) {
      return
    }

    this.target = target
    this.path = this.pather.findPath({ x: this.x, y: this.y }, target)
    this.tempTarget = this.path.shift() || null
  }

  setTargetItem(groundItem) {
    this.targetItem = groundItem
  }

  attack(targetPoint) {
    this.isAttacking = true
    this.attackTarget = targetPoint
  }

  stopAttacking() {
    this.isAttacking = false
    this.attackTarget = null
  }

  computeStats() {
    if (this.inventory.equippedSequence === this.computedEquippedSequence) {
      return
    }
    this.stats = InventoryStatCalculator.calculateStats(this.inventory.equipped)
    this.computedEquippedSequence = this.inventory.equippedSequence
  }

  hasAbilityUnlocked(abilityId) {
    // BasicAttack is always available
    if (abilityId === Abilities.BasicAttack.id) {
      return true
    }

    // Make sure stats are up to date
    this.computeStats()

    // Check if the ability is granted by equipment (ability-specific stats)
    return this.stats[abilityId] != null && this.stats[abilityId] > 0
  }
}
