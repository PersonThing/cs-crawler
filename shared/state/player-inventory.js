import ItemType from '#shared/config/item-type.js'
import { BAG_SLOTS } from '../config/constants.js'
import InventorySlot from '../config/inventory-slot.js'
import createPersistedStore from '../stores/create-persisted-store.js'

const LogAndThrow = (message, ...args) => {
  console.error(message, ...args)
  throw new Error(message)
}

const validItemTypeNames = Object.values(ItemType).map(i => i.name)

const AssertValidItem = item => {
  if (typeof item !== 'object' || item == null) {
    LogAndThrow('invalid item, must be an object, received: ', item)
  }
  if (typeof item.itemType !== 'object' || item.itemType == null || !validItemTypeNames.includes(item.itemType.name)) {
    LogAndThrow(`invalid item, itemType ${item?.itemType?.name} must be one of: ${validItemTypeNames.join(', ')}`)
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

export default class PlayerInventory {
  constructor(playerId, content) {
    if (content == null) content = {}

    // could use player's id for key if we want to support multiple players on same client
    this.store = createPersistedStore(
      `inventory_${playerId}`,
      content,
      value =>
        value &&
        typeof value.equipped === 'object' &&
        Array.isArray(value.bags) &&
        value.bags.length <= BAG_SLOTS
    )

    // load from store initially
    const { equipped, bags, cursor } = this.store.get()
    this.equipped = equipped || {}
    this.bags = bags || []
    this.cursor = cursor || null
  }

  serialize() {
    const values = this.store.get()
    return {
      equipped: values.equipped,
      bags: values.bags,
      cursor: values.cursor,
    }
  }

  deserialize(content) {
    this.equipped = content.equipped || {}
    this.bags = content.bags || []
    this.cursor = content.cursor || null
    this.updateStore()
  }

  updateStore() {
    const content = {
      bags: this.bags,
      equipped: this.equipped,
      cursor: this.cursor,
    }
    this.store.set(content)
  }

  reset() {
    this.equipped = {}
    this.bags = []
    this.updateStore()
  }

  setBagSlot(index, item) {
    AssertValidSlotIndex(index)
    this.bags[index] = item
    this.updateStore()
  }

  setEquippedSlot(slotName, item) {
    AssertValidSlotName(slotName)
    AssertValidItem(item)
    this.equipped[slotName] = item
    this.updateStore()
  }
  
  clearEquippedSlot(slotName) {
    AssertValidSlotName(slotName)
    this.equipped[slotName] = null
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
    AssertValidSlotName(slotName)
    AssertValidItem(item)

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
    AssertValidItem(item)
    this.cursor = item
    this.updateStore()
  }

  // returns whether the item was successfully picked up or not
  pickup(item) {
    AssertValidItem(item)

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
    AssertValidItem(item)
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
    AssertValidItem(item)
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
    AssertValidSlotIndex(index)

    const bagItem = this.bags[index]
    const cursorItem = this.cursor

    if (bagItem == null && this.cursor == null) {
      return null
    }

    this.setBagSlot(index, cursorItem)
    this.setCursor(bagItem)
  }

  clickEquippedSlot(slotName) {
    AssertValidSlotName(slotName)

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
      this.clearEquippedSlot(slotName)
    }
  }
}

