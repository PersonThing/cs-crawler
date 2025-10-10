import ItemInventory from './item-inventory.js'
import { BLOCK_SIZE } from '../config/constants.js'

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

    this.equipped = {}
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
      equipped: this.equipped,
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
  }

  onTick(time, groundItems) {
    this.moveTowardTarget(time.deltaMS)

    // is attempting to pick up item?
    if (this.targetItem != null) {
      // is item still on the ground?
      const groundItemIndex = groundItems.findIndex(gi => gi.item.id === this.targetItem.item.id)
      if (groundItemIndex === -1) {
        console.log('target item no longer exists on ground, clearing targetItem')
        this.targetItem = null
      } else {
        const groundItem = groundItems[groundItemIndex]
        if (groundItem == null) {
          console.log('target item no longer exists on ground, clearing targetItem')
          this.targetItem = null
        } else {
          // is it close enough to pick up yet?
          const distance = Math.hypot(
            this.targetItem.position.x - this.x,
            this.targetItem.position.y - this.y
          )
          if (distance <= BLOCK_SIZE * 2 && this.inventory.pickup(groundItem.item)) {
            // successfully picked up
            groundItems.splice(groundItemIndex, 1)
            this.targetItem = null
            console.log('picked up item', groundItem.item.name)
          }
        }
      }
    }

    // if (this.attacking) {
    //   // if enough time has passed, animate attack again
    //   if (this.lastAttackTime == null || deltaMs - this.lastAttackTime > 200) {
    //     // console.log('animate an attack', deltaMs)
    //     // const mainHandEquipped = this.equipped[InventorySlot.MainHand.name]
    //     // const offhandEquipped = this.equipped[InventorySlot.OffHand.name]

    //     // if (mainHandEquipped != null && mainHandEquipped.itemType.bothHands === true) {
    //     //   // 2h weapon in main hand, animate that
    //     //   this.animateAttack(InventorySlot.MainHand.name, mainHandEquipped.attackingTexture)
    //     // } else {
    //     //   // animate both hands
    //     //   if (mainHandEquipped != null) {
    //     //     this.animateAttack(InventorySlot.MainHand.name, mainHandEquipped.attackingTexture)
    //     //   }
    //     //   if (offhandEquipped != null) {
    //     //     this.animateAttack(InventorySlot.OffHand.name, offhandEquipped.attackingTexture)
    //     //   }
    //     // }
    //     this.lastAttackTime = deltaMS
    //   }
    //   // console.log(deltaMS)
    // }
  }

  moveTowardTarget(deltaMS) {
    if (this.tempTarget == null && this.path.length) {
      this.tempTarget = this.path.shift()
    }

    if (this.tempTarget == null) {
      return
    }
    
    this.rotateToward(this.tempTarget)

    // Update position based on target
    const dx = this.tempTarget.x - this.x
    const dy = this.tempTarget.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > 1) {
      // compute move distance based on max speed (in pixels per second) and delta time
      const moveDistance = Math.min(distance, this.maxSpeed * (deltaMS / 1000))
      const angle = Math.atan2(dy, dx)
      this.setPosition(
        this.x + Math.cos(angle) * moveDistance,
        this.y + Math.sin(angle) * moveDistance
      )
    } else {
      // reached the temp target, target next point in path
      this.setPosition(this.tempTarget.x, this.tempTarget.y)
      this.tempTarget = this.path.shift()
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
    this.rotation = Math.atan2(dy, dx) + (90 * Math.PI) / 180 // add 90 degrees to account for sprite facing up by default
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
    if (
      // target is null
      target == null ||
      // target hasn't changed
      (this.target != null && target.x === this.target.x && target.y === this.target.y)
    ) {
      return
    }

    // target is the same as current position
    if (target.x == this.x && target.y == this.y) {
      return
    }

    this.target = target
    this.path = this.pather.findPath({ x: this.x, y: this.y }, target)
    this.tempTarget = this.path.shift()
  }

  setTargetItem(groundItem) {
    this.targetItem = groundItem
  }

  stopMoving() {
    this.target = null
    this.tempTarget = null
    this.path = []
  }

  attack(targetPoint) {
    this.isAttacking = true
    this.attackTarget = targetPoint
  }

  stopAttacking() {
    this.isAttacking = false
    this.attackTarget = null
  }

  setEquipped(equipped) {
    this.equipped = equipped
    this.computeStats()
  }

  computeStats() {
    const stats = {}
    // apply attributes from items
    Object.keys(equipped).forEach(itemKey => {
      const item = equipped[itemKey]
      if (item) {
        Object.keys(item.attributes).forEach(stat => {
          if (stats[stat] == null) stats[stat] = 0
          stats[stat] += item.attributes[stat]
        })
      }
    })
    // todo: apply stats for attack speed based on equipped weapons / 1h vs 2h etc
    // todo: apply entity base attributes (eg, from entity class, level, etc)
    // todo: apply temporary buffs/debuffs
    this.stats = stats
  }
}

