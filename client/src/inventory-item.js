import { ItemQualityColors } from '../../shared/item-quality.js'
import { Sprite, Graphics, Text, Container } from 'pixi.js'

export default class InventoryItem extends Container {
  constructor(item, { x, y }, isDisabledOffHand) {
    super()

    this.eventMode = 'static'

    const itemSprite = Sprite.from(item.inventoryTexture)
    itemSprite.x = x
    itemSprite.y = y
    if (item.itemType.bothHands) {
      const text2h = new Text({
        text: '2h',
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0xffffff,
        },
      })
      text2h.x = 2
      itemSprite.addChild(text2h)
    }
    this.addChild(itemSprite)

    if (!isDisabledOffHand) {
      const itemDescription = new Container()
      const itemDescriptionBg = new Graphics()
      itemDescription.addChild(itemDescriptionBg)

      // name
      const itemNameText = new Text({
        text: `${item.name}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          fontWeight: 'bold',
          fill: ItemQualityColors[item.itemQuality],
        },
      })
      itemDescription.addChild(itemNameText)

      // quality + type
      const itemTypeNameText = new Text({
        text: `${item.itemQuality} ${item.itemType.name}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
        },
      })
      itemTypeNameText.y = 16
      itemDescription.addChild(itemTypeNameText)

      // attributes + description
      const itemAttributeText = new Text({
        text: Object.keys(item.attributes)
          .map(attributeName => {
            const attributeValue = item.attributes[attributeName]
            let symbol = '+'
            if (attributeValue < 0) {
              symbol = '-'
            }
            return `${symbol}${attributeValue} ${attributeName}`
          })
          .join('\n'),
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0x999999,
        },
      })
      if (item.description != null) {
        itemAttributeText.text += `\n\n${item.description}`
      }
      itemAttributeText.y = 32
      itemDescription.addChild(itemAttributeText)

      // only show on mouseover
      itemDescription.visible = false
      itemDescription.eventMode = 'none'
      itemSprite.eventMode = 'static'
      itemSprite.addChild(itemDescription)
      itemSprite.on('pointerover', () => {
        itemDescription.visible = true
      })
      itemSprite.on('pointerout', () => {
        itemDescription.visible = false
      })

      // draw a background and set y based on height of the description container
      itemDescription.x = -itemDescription.width
      itemDescription.y = -itemDescription.height
      itemDescriptionBg
        .roundRect(-10, -10, itemDescription.width + 20, itemDescription.height + 20, 4)
        .fill(0x000000)
    } else {
      // grey it out a bit
      // make it slightly red ?
      itemSprite.alpha = 0.75
      itemSprite.tint = 0x666666
    }
  }
}
