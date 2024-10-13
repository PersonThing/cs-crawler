import { BAG_SLOTS } from "./constants"
import ItemSlotType from "./item-slot-type"


class PlayerInventory {
  constructor() {
    this.equipped = {}
    this.bags = []
  }

  // returns whether the item was successfully picked up or not
  pickup(item) {
    if (item == null || item.itemType == null) throw new Error('invalid item, cant pick up', item)

    // if the slot this item goes in is empty, equip it
    if (this.equipped[item.itemType.slotType] == null) {
      this.equip(item)
      return true
    }

    // otherwise put it in inventory
    // find lowest empty bag slot
    return this.putInBags(item)
  }

  // returns whether the item was successfully put in bags or not
  putInBags(item) {
    for (let i=0; i<BAG_SLOTS; i++) {
      if (this.bags[i] == null) {
        this.bags[i] = item
        return true
      }
    }
    return false
  }

  // returns whether the item was successfully equipped or not
  equip(item, equipToSlot) {
    if (item == null) throw new Error('invalid item, cant equip', item)
    if (ItemSlotType[equipToSlot] == null) throw new Error('equip failed, invalid ItemSlotType', equipToSlot)
    
    // TODO: assert that we meet the requirements to equip this item

    // if the item is in bags, remove it from bags
    const ix = this.bags.findIndex(i => item === i)
    if (ix != null) {
      this.bags[ix] = null
    }

    // if there's already another item in that slot, put it in bags first
    if (this.equipped[equipToSlot] != null) {
      if (!this.putInBags(this.equipped[equipToSlot])) {
        // wasn't able to put it in bags, so we can't equip this item either
        return false
      }
    }

    this.equipped[equipToSlot] = item
  }
}

export default PlayerInventory