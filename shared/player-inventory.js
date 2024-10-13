import { BAG_SLOTS } from './constants.js'
import { createStore } from './create-store.js'
import InventorySlot from './inventory-slot.js'

class PlayerInventory {
  constructor() {
    this.equipped = {}
    this.bags = []
    this.store = createStore()

    this.store = createStore({
      equipped: {},
      bags: [],
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
    })
  }

  reset() {
    this.equipped = {}
    this.bags = []
    this.updateStore()
  }

  setBagSlot(index, item) {
    if (index < 0 || index > BAG_SLOTS) {
      throw new Error(
        'invalid bag slot index, must be between 0 and ' + BAG_SLOTS,
        index
      )
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

  // returns whether the item was successfully picked up or not
  pickup(item) {
    if (item == null || item.itemType == null) {
      throw new Error('invalid item, cant pick up', item)
    }

    // if the slot this item goes in is empty, equip it
    for (let i = 0; i < item.itemType.validSlotTypes.length; i++) {
      const slotType = item.itemType.validSlotTypes[i]
      const possibleSlots = Object.values(InventorySlot).filter(
        (slot) => slot.slotType === slotType
      )
      for (let k = 0; k < possibleSlots.length; k++) {
        const possibleSlotName = possibleSlots[k].name
        if (this.equipped[possibleSlotName] == null) {
          if (this.equip(item, possibleSlotName)) {
            return true
          }
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

  // returns whether the item was successfully equipped or not
  equip(item, equipToSlot) {
    if (item == null) {
      throw new Error('invalid item, cant equip', item)
    }

    // TODO: assert that we meet the requirements to equip this item
    
    // if there's already another item in that slot, put it in bags first
    if (this.equipped[equipToSlot] != null) {
      if (!this.putInBags(this.equipped[equipToSlot])) {
        // wasn't able to put it in bags, so we can't equip this item either
        return false
      }
    }
    
    // we're good now, force it on

    // if it's in bags, remove it
    const ix = this.bags.findIndex((i) => item === i)
    if (ix > 0) {
      this.setBagSlot(ix, null)
    }
    // set in equipped
    this.setEquippedSlot(equipToSlot, item)
    return true
  }
}

export default PlayerInventory
