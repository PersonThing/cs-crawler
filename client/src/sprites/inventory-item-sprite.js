import { ItemQualityColors } from '#shared/config/item-quality.js'
import { Sprite, Graphics, Text, Container } from 'pixi.js'
import ItemSet from '#shared/config/items/sets.js'
import InventoryStatCalculator from '#shared/utils/inventory-stat-calculator.js'

const ATTRIBUTE_COLOR = 0xaaaaaa
const ITEM_TYPE_COLOR = 0xffffff
const TWOH_INDICATOR_COLOR = 0xffffff
const SET_TIER_DISABLED_COLOR = 0x666666
const SET_TIER_ENABLED_COLOR = ItemQualityColors.Set
const SET_TIER_DISABLED_ATTRIBUTE_COLOR = 0x666666

export default class InventoryItem extends Container {
  constructor(item, { x, y }, isDisabledOffHand, playerInventory) {
    super()

    this.item = item
    const itemQualityColor = ItemQualityColors[item.itemQuality]

    this.eventMode = 'static'

    this.x = x
    this.y = y

    const itemSprite = Sprite.from(item.inventoryTexture)
    itemSprite.x = 0
    itemSprite.y = 0
    this.addChild(itemSprite)

    if (item.itemType.bothHands) {
      const text2h = new Text({
        text: '2h',
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: TWOH_INDICATOR_COLOR,
        },
      })
      text2h.x = 2
      text2h.y = 2
      this.addChild(text2h)
    }

    if (isDisabledOffHand) {
      // grey it out a bit
      // make it slightly red ?
      itemSprite.alpha = 0.75
      itemSprite.tint = 0x666666
      return
    }

    const itemDescription = new Container()
    const itemDescriptionBg = new Graphics()

    itemDescription.addChild(itemDescriptionBg)

    // name (with set name if applicable)
    let itemNameDisplay = item.name
    if (item.setId && playerInventory) {
      const set = ItemSet[item.setId]
      if (set) {
        itemNameDisplay += ` (${set.name})`
      }
    }

    const itemNameText = new Text({
      text: itemNameDisplay,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        fill: itemQualityColor,
      },
    })
    itemDescription.addChild(itemNameText)

    // quality + type
    const itemTypeNameText = new Text({
      text: `${item.itemQuality} ${item.itemType.name}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: ITEM_TYPE_COLOR,
      },
    })
    itemTypeNameText.y = 16
    itemDescription.addChild(itemTypeNameText)

    // attributes + description
    let attributeText = Object.keys(item.attributes)
      .map(attributeName => {
        const attributeValue = item.attributes[attributeName]
        let symbol = '+'
        if (attributeValue < 0) {
          symbol = '-'
        }
        return `${symbol}${attributeValue} ${attributeName}`
      })
      .join('\n')

    if (item.description != null) {
      attributeText += `\n\n${item.description}`
    }

    const itemAttributeText = new Text({
      text: attributeText,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: ATTRIBUTE_COLOR,
      },
    })
    itemAttributeText.y = 32
    itemDescription.addChild(itemAttributeText)

    // Add set bonus information if this is a set item
    if (item.setId && playerInventory) {
      const set = ItemSet[item.setId]
      if (set) {
        // Calculate currently equipped set pieces
        const setCounts = InventoryStatCalculator.calculateSetCounts(playerInventory.equipped)
        const equippedSetPieces = setCounts[item.setId] || 0

        // Calculate starting Y position for set bonuses
        let currentY = itemAttributeText.y + itemAttributeText.height + 8

        // Get all set bonus tiers
        const setTiers = InventoryStatCalculator.getSetBonusTiers(item.setId, equippedSetPieces)

        // Add each set bonus tier
        setTiers.forEach(({ itemCount, attributes, isEarned }) => {

          // Tier header with appropriate color
          const tierHeaderText = new Text({
            text: `${itemCount} pieces:`,
            style: {
              fontFamily: 'Arial',
              fontSize: 12,
              fontWeight: 'bold',
              fill: isEarned ? SET_TIER_ENABLED_COLOR : SET_TIER_DISABLED_COLOR,
            },
          })
          tierHeaderText.y = currentY
          itemDescription.addChild(tierHeaderText)
          currentY += tierHeaderText.height

          // Bonus attributes for this tier
          const bonusAttributes = Object.keys(attributes)
            .map(attributeName => {
              const attributeValue = attributes[attributeName]
              let symbol = '+'
              if (attributeValue < 0) {
                symbol = '-'
              }
              return `  ${symbol}${attributeValue} ${attributeName}`
            })
            .join('\n')

          if (bonusAttributes) {
            const tierBonusText = new Text({
              text: bonusAttributes,
              style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: isEarned ? ATTRIBUTE_COLOR : SET_TIER_DISABLED_ATTRIBUTE_COLOR,
              },
            })
            tierBonusText.y = currentY
            itemDescription.addChild(tierBonusText)
            currentY += tierBonusText.height + 4
          }
        })
      }
    }

    // only show on mouseover
    itemDescription.visible = false
    itemDescription.eventMode = 'none'

    this.addChild(itemDescription)

    this.on('pointerover', () => {
      this.zIndex = 10 // bring above any other items
      itemDescription.visible = true
    })

    this.on('pointerout', () => {
      this.zIndex = 1 // put back to normal
      itemDescription.visible = false
    })

    // render description to left of item sprite so it's always visible at any screen size / item location
    // align tooltip bottom with item sprite bottom
    itemDescription.x = -itemDescription.width - 15
    itemDescription.y = itemSprite.height - itemDescription.height
    itemDescriptionBg
      .roundRect(-10, -10, itemDescription.width + 20, itemDescription.height + 20, 4)
      .fill(0x000000)
      .stroke({
        color: itemQualityColor,
        width: 1,
      })
  }
}
