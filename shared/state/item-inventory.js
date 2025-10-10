import ItemSlotType from '#shared/config/item-slot-type.js'
import ItemType from '#shared/config/item-type.js'
import { BAG_SLOTS } from '../config/constants.js'
import InventorySlot from '../config/inventory-slot.js'

const GenerateShortHash = string => {
  let hash = 0
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0)
    hash |= 0 // Constrain to 32bit integer
  }
  return hash
}

const LogAndThrow = (message, ...args) => {
  console.error(message, ...args)
  throw new Error(message)
}

const ValidItemTypeNames = Object.values(ItemType).map(i => i.name)

const IsValidItem = item => item != null && item.itemType != null && ValidItemTypeNames.includes(item.itemType.name)

const AssertValidItem = item => {
  if (typeof item !== 'object' || item == null) {
    LogAndThrow('invalid item, must be an object, received: ', item)
  }
  if (!IsValidItem(item)) {
    LogAndThrow(`invalid item, itemType ${item?.itemType?.name} must be one of: ${ValidItemTypeNames.join(', ')}`)
  }
}

const AssertValidSlotIndex = index => {
  if (index < 0 || index > BAG_SLOTS) {
    throw new Error('invalid bag slot index, must be between 0 and ' + BAG_SLOTS, index)
  }
}

const AssertValidSlotName = slotName => {
  if (InventorySlot[slotName] == null) {
    throw new Error('invalid InventorySlot', slotName, 'must be one of: ' + Object.keys(InventorySlot).join(', '))
  }
}

export default class ItemInventory {
  constructor(content) {
    if (content == null) content = {}
    this.deserialize(content)
  }

  serialize() {
    return {
      equipped: this.equipped,
      bags: this.bags,
      cursor: this.cursor,
      hash: this.hash,
    }
  }

  deserialize(content) {
    this.equipped = content.equipped || {}
    this.bags = content.bags || []
    this.cursor = content.cursor || null
    this.updateHash()
  }

  updateHash() {
    this.hash = GenerateShortHash(
      JSON.stringify({
        equipped: this.equipped,
        bags: this.bags,
        cursor: this.cursor,
      })
    )
  }

  reset() {
    this.equipped = {}
    this.bags = []
    this.updateHash()
  }

  setBagSlot(index, item) {
    AssertValidSlotIndex(index)
    AssertValidItem(item)
    this.bags[index] = item
    this.updateHash()
  }

  clearBagSlot(index) {
    this.bags[index] = null
    this.updateHash()
  }

  setEquippedSlot(slotName, item) {
    AssertValidSlotName(slotName)
    AssertValidItem(item)
    this.equipped[slotName] = item
    this.updateHash()
  }

  getEquippedSlot(slotName) {
    AssertValidSlotName(slotName)
    return this.equipped[slotName] || null
  }

  clearEquippedSlot(slotName) {
    AssertValidSlotName(slotName)
    this.equipped[slotName] = null
    this.updateHash()
  }

  getValidSlotNamesForItem(item) {
    AssertValidItem(item)
    return Object.values(InventorySlot).filter(slot => item.itemType.validSlotTypes.includes(slot.slotType)).map(slot => slot.name)
  }

  isItemValidForSlot(item, slotName) {
    AssertValidSlotName(slotName)
    AssertValidItem(item)
    return this.getValidSlotNamesForItem(item).includes(slotName)
  }

  hasBagSpaceAvailable() {
    // we use a loop here because bags may not even have the right # of slots created yet
    for (let i = 0; i < BAG_SLOTS; i++) {
      if (this.bags[i] == null) {
        return true
      }
    }
    return false
  }

  isSlotFilled(slotName) {
    // something is directly equipped in this slot
    return (
      this.equipped[slotName] != null ||
      // or its an offhand slot and a 2h weapon is equipped in mainhand slot
      (slotName === InventorySlot.OffHand.name && this.equipped[InventorySlot.MainHand.name]?.itemType.bothHands)
    )
  }

  setCursor(item) {
    AssertValidItem(item)
    this.cursor = item
    this.updateHash()
  }

  clearCursor() {
    this.cursor = null
    this.updateHash()
  }

  // returns whether the item was successfully picked up or not
  pickup(item) {
    AssertValidItem(item)

    // if a slot this item fits in is empty, equip it
    const possibleSlots = this.getValidSlotNamesForItem(item)
    for (let possibleSlotName of possibleSlots) {
      if (!this.isSlotFilled(possibleSlotName)) {
        if (this.tryEquip(item, possibleSlotName)) {
          return true
        }
      }
    }

    // try to put it in bags
    if (this.tryPutInBags(item)) {
      return true
    }

    // last resort, set to cursor
    // TODO: this is an ok idea maybe, but cursor item currently only shows if inventory-hud is open.. think about it
    // if (this.cursor == null) {
    //   this.setCursor(item)
    //   return true
    // }

    return false
  }

  // returns whether the item was successfully put in bags or not
  tryPutInBags(item) {
    AssertValidItem(item)
    for (let i = 0; i < BAG_SLOTS; i++) {
      if (this.bags[i] == null) {
        this.setBagSlot(i, item)
        return true
      }
    }
    return false
  }

  // returns whether the item was successfully equipped or not
  tryEquip(item, slotName) {
    AssertValidItem(item)

    if (!this.isItemValidForSlot(item, slotName)) {
      return false
    }

    let previouslyEquippedItem = this.equipped[slotName]

    // already equipped?
    if (previouslyEquippedItem === item) {
      return true
    }
    
    // trying to equip 2h to mainhand
    if (slotName === InventorySlot.MainHand.name && item.itemType.bothHands) {
      const otherSlot = slotName === InventorySlot.MainHand.name ? InventorySlot.OffHand.name : InventorySlot.MainHand.name
      const otherSlotItem = this.equipped[otherSlot]

      // swapping for a 2h?
      if (previouslyEquippedItem?.itemType.bothHands || otherSlotItem?.itemType.bothHands) {
        // do nothing special, just swap it out
      } else {
        // swapping for a 1h...
        // if both slots are filled...
        if (this.isSlotFilled(slotName) && this.isSlotFilled(otherSlot)) {
          // we need to be able to put otherSlot in bags first
          // if the new item is coming from bags, put this item in that slot
          if (!this.tryPutInBags(this.equipped[otherSlot])) {
            // couldn't put it in bags...
            // did new item come from bags? if so, put it in cursor instead
            return false
          }
          // we were able to put otherSlot in bags, clear it from equipped
          this.clearEquippedSlot(otherSlot)
        }

        // if clicked slot was empty, but otherSlot was filled, previouslyEquippedItem should be otherSlot
        if (previouslyEquippedItem == null && otherSlotItem != null) {
          previouslyEquippedItem = otherSlotItem
          this.clearEquippedSlot(otherSlot)
        }
      }
    }

    // trying to equip 1h in offhand, but a 2h is equipped
    if (
      slotName === InventorySlot.OffHand.name &&
      item.itemType.bothHands === false &&
      this.equipped[InventorySlot.MainHand.name]?.itemType.bothHands
    ) {
      // force the item into mainhand for simplicity
      // alternatively, we could allow it to go into offhand, but move the mainhand out to cursor
      slotName = InventorySlot.MainHand.name
      previouslyEquippedItem = this.equipped[InventorySlot.MainHand.name]
    }

    // equip it
    this.setEquippedSlot(slotName, item)

    // did item come from cursor?
    // if so, clear or swap previous item with cursor
    if (this.cursor === item) {
      // item came from cursor
      if (previouslyEquippedItem != null) {
        this.setCursor(previouslyEquippedItem)
      } else {
        this.clearCursor()
      }
      return true
    }

    // did item come from bags?
    // if so, clear or swap previous item with same bag slot
    const bagIndex = this.bags.findIndex(i => item === i)
    if (bagIndex >= 0) {
      // item came from bags
      if (previouslyEquippedItem != null) {
        this.setBagSlot(bagIndex, previouslyEquippedItem)
      } else {
        this.clearBagSlot(bagIndex)
      }
      return true
    }

    // item must've come from ground...
    // if we somehow have a previously equipped item, try to put it in bags
    if (previouslyEquippedItem != null) {
      if (!this.tryPutInBags(previouslyEquippedItem)) {
        // couldn't put it in bags, revert equip
        this.setEquippedSlot(slotName, previouslyEquippedItem)
        return false
      }
    }

    return true
  }

  clickBagSlot(index) {
    AssertValidSlotIndex(index)

    const bagItem = this.bags[index]
    const cursorItem = this.cursor

    if (bagItem == null && this.cursor == null) {
      return null
    }

    if (cursorItem != null) {
      this.setBagSlot(index, cursorItem)
    } else {
      this.clearBagSlot(index)
    }

    if (bagItem != null) {
      this.setCursor(bagItem)
    } else {
      this.clearCursor()
    }
  }

  clickEquippedSlot(slotName) {
    AssertValidSlotName(slotName)

    const previouslyEquippedItem = this.equipped[slotName]
    if (previouslyEquippedItem == null && this.cursor == null) {
      return false
    }

    const cursorItem = this.cursor
    if (cursorItem != null) {
      return this.tryEquip(cursorItem, slotName)
    } else if (previouslyEquippedItem != null) {
      this.setCursor(previouslyEquippedItem)
      this.clearEquippedSlot(slotName)
    }

    return true
  }

  tryEquipFromBagSlot(index, reverseOrder = false) {
    AssertValidSlotIndex(index)
    const bagItem = this.bags[index]
    if (bagItem == null) {
      return false
    }

    const possibleSlots = this.getValidSlotNamesForItem(bagItem)
    if (reverseOrder) {
      // shift key reverses order.. try to put in last possible slot first
      // this is useful for shift+right click to put onto offhand, for example
      possibleSlots.reverse()
    }
    for (let k = 0; k < possibleSlots.length; k++) {
      const possibleSlotName = possibleSlots[k]

      if (InventorySlot[possibleSlotName].slotType === ItemSlotType.Bonus) {
        // skip bonus slots for non-bonus items
        if (bagItem.itemType.name !== ItemType.Bonus.name) {
          continue
        }

        // bonus item into bonus slot.. try to fill empty slots first
        if (this.isSlotFilled(possibleSlotName)) {
          if (k < possibleSlots.length - 1) {
            console.log(possibleSlotName, 'filled, trying', possibleSlots[k + 1], bagItem.id)
            continue
          } else {
            // all possible slots are filled, try to swap with first eligible slot
            console.log('all slots filled, trying to put into', possibleSlots[0], bagItem.id)
            return this.tryEquip(bagItem, possibleSlots[0])
          }
        }
      }

      // if mainhand is filled with a 1h, and we're trying to equip a 1h, try offhand first
      if (possibleSlotName === InventorySlot.MainHand.name) {
        if (
          this.isSlotFilled(InventorySlot.MainHand.name) &&
          !this.equipped[InventorySlot.MainHand.name]?.itemType.bothHands &&
          !bagItem.itemType.bothHands
        ) {
          if (!this.isSlotFilled(InventorySlot.OffHand.name)) {
            if (this.tryEquip(bagItem, InventorySlot.OffHand.name)) {
              // we were able to put it into offhand, great
              return true
            }
            // we were unable to put it into offhand, will get forced into mainhand below
          }
        }
      }

      if (this.tryEquip(bagItem, possibleSlotName)) {
        return true
      }
    }

    return false
  }
}
