import ItemQuality from './item-quality.js'
import ItemSlotType from './item-slot-type.js'

export default class Item {
  constructor({ itemType, itemQuality, name, inventoryTexture, equippedTexture, attackingTexture, attributes, description }) {
    if (itemType == null) {
      throw new Error(`cannot create item, invalid itemType: ${itemType}`)
    }
    if (ItemQuality[itemQuality] == null) {
      throw new Error(`cannot create item, invalid item quality: ${itemQuality}`)
    }
    if (name == null) {
      throw new Error(`cannot create item, invalid name: ${name}`)
    }
    if (inventoryTexture == null) {
      throw new Error(`cannot create item, invalid inventory texture: ${inventoryTexture}`)
    }
    if (itemType.validSlotTypes.some(st => st === ItemSlotType.Head || st === ItemSlotType.MainHand || st === ItemSlotType.OffHand) && equippedTexture == null) {
      throw new Error(`cannot create a head, mainhand, or offhand without a valid equipped texture: ${name}, ${equippedTexture}`)
    }

    this.itemType = itemType
    this.itemQuality = itemQuality
    this.name = name
    this.inventoryTexture = inventoryTexture
    this.equippedTexture = equippedTexture
    this.attackingTexture = attackingTexture
    this.attributes = attributes
    this.description = description
  }
}