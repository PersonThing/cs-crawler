import { BAG_SLOTS } from './constants.js'
import createStore from './create-store.js'
import InventorySlot from './inventory-slot.js'

class PlayerInventory {
  constructor() {
    this.equipped = {}
    this.bags = []
    this.cursor = null
    this.store = createStore()

    this.store = createStore({
      equipped: {},
      bags: [],
      cursor: null,
    })
  }

  serialize() {
    return {
      equipped: this.equipped,
      bags: this.bags,
    }
  }

  deserialize(content) {
    this.equipped = content.equipped
    this.bags = content.bags
    this.updateStore()
  }

  updateStore() {
    this.store.set({
      bags: this.bags,
      equipped: this.equipped,
      cursor: this.cursor,
    })
  }

  reset() {
    this.equipped = {}
    this.bags = []
    this.updateStore()
  }

  setBagSlot(index, item) {
    if (index < 0 || index > BAG_SLOTS) {
      throw new Error('invalid bag slot index, must be between 0 and ' + BAG_SLOTS, index)
    }
    this.bags[index] = item
    this.updateStore()
  }

  setEquippedSlot(slotName, item) {
    if (InventorySlot[slotName] == null) {
      throw new Error('equip failed, invalid InventorySlot', slotName)
    }
    this.equipped[slotName] = item
    this.updateStore()
  }

  getValidSlotNamesForItem(item) {
    return item.itemType.validSlotTypes.flatMap(slotType => {
      return Object.values(InventorySlot)
        .filter(slot => slot.slotType === slotType)
        .map(slot => slot.name)
    })
  }

  canEquip(slotName, item) {
    if (InventorySlot[slotName] == null) {
      throw new Error('equip failed, invalid InventorySlot', slotName)
    }

    if (item == null) {
      throw new Error('equip failed, invalid item', item)
    }

    if (!this.getValidSlotNamesForItem(item).includes(slotName)) {
      return false
    }

    // if they're trying to equip a 2h weapon and both mainhand and offhand are currently full, they need at least 1 bag slot empty
    if (item.itemType.bothHands) {
      if (
        this.isSlotFilled(InventorySlot.MainHand.name) &&
        this.isSlotFilled(InventorySlot.OffHand.name)
      ) {
        return this.bags.some(i => i == null)
      }
    }

    return true
  }

  setCursor(item) {
    this.cursor = item
    this.updateStore()
  }

  // returns whether the item was successfully picked up or not
  pickup(item) {
    if (item == null || item.itemType == null) {
      throw new Error('invalid item, cant pick up', item)
    }

    // if a slot this item fits in is empty, equip it
    const possibleSlots = this.getValidSlotNamesForItem(item)
    for (let k = 0; k < possibleSlots.length; k++) {
      const possibleSlotName = possibleSlots[k]
      if (!this.isSlotFilled(possibleSlotName)) {
        if (this.equip(item, possibleSlotName, false)) {
          return true
        }
      }
    }

    // otherwise put it in inventory
    // find lowest empty bag slot
    return this.putInBags(item)
  }

  // returns whether the item was successfully put in bags or not
  putInBags(item) {
    for (let i = 0; i < BAG_SLOTS; i++) {
      if (this.bags[i] == null) {
        this.setBagSlot(i, item)
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
      (slotName === InventorySlot.OffHand.name &&
        this.equipped[InventorySlot.MainHand.name]?.itemType.bothHands)
    )
  }

  // returns whether the item was successfully equipped or not
  equip(item, slotName) {
    if (!this.canEquip(slotName, item)) {
      return false
    }

    // if trying to equip offhand, but a 2h is equipped, try to put the 2h in bags first
    if (
      slotName === InventorySlot.OffHand.name &&
      this.equipped[InventorySlot.MainHand.name]?.itemType.bothHands
    ) {
      if (!this.putInBags(this.equipped[InventorySlot.MainHand.name])) {
        return false
      }
    }

    // if trying to equip 2h, but an offhand is equipped, try to put the offhand in bags first
    if (
      slotName === InventorySlot.MainHand.name &&
      item.itemType.bothHands &&
      this.equipped[InventorySlot.OffHand.name] != null
    ) {
      if (!this.putInBags(this.equipped[InventorySlot.OffHand.name])) {
        return false
      }
    }

    // if there's something in the slot already, fail
    // caller should put in bags or on cursor first
    if (this.isSlotFilled(slotName)) {
      return false
    }

    // we're good now, force it on

    // TODO: we should have already removed it from bags and placed it on cursor
    const ix = this.bags.findIndex(i => item === i)
    if (ix > 0) {
      this.setBagSlot(ix, null)
    }

    // set in equipped
    this.setEquippedSlot(slotName, item)
    return true
  }

  clickBagSlot(index) {
    if (index < 0 || index > BAG_SLOTS) {
      throw new Error(`invalid bag slot index ${index}, must be between 0 and ${BAG_SLOTS}`)
    }

    const bagItem = this.bags[index]
    const cursorItem = this.cursor

    if (bagItem == null && this.cursor == null) {
      return null
    }

    this.setBagSlot(index, cursorItem)
    this.setCursor(bagItem)
  }

  clickEquippedSlot(slotName) {
    if (InventorySlot[slotName] == null) {
      throw new Error('invalid InventorySlot', slotName)
    }
    const previouslyEquippedItem = this.equipped[slotName]
    if (previouslyEquippedItem == null && this.cursor == null) {
      return null
    }

    const cursorItem = this.cursor
    if (cursorItem != null) {
      // placing from cursor
      if (this.canEquip(slotName, cursorItem)) {
        this.setEquippedSlot(slotName, cursorItem)
        this.setCursor(previouslyEquippedItem)
        // if we equipped a 2h weapon and there's something in offhand, put it in bags
        if (slotName === InventorySlot.MainHand.name && cursorItem.itemType.bothHands) {
          if (this.isSlotFilled(InventorySlot.OffHand.name)) {
            this.putInBags(this.equipped[InventorySlot.OffHand.name])
            this.setEquippedSlot(InventorySlot.OffHand.name, null)
          }
        }
      }
    } else if (previouslyEquippedItem) {
      // picking up from slot to cursor
      this.setCursor(previouslyEquippedItem)
      this.setEquippedSlot(slotName, null)
    }
  }
}

export default PlayerInventory
