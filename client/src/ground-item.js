import { ItemQualityColors } from '../../shared/item-quality.js'
import { Container, Graphics, Text, Sprite } from 'pixi.js'

const PADDING = 3

class GroundItem extends Container {
  constructor(itemWrapper) {
    super()

    // texture sprite
    const sprite = Sprite.from(itemWrapper.item.inventoryTexture)
    sprite.anchor.set(0.5)
    sprite.x = itemWrapper.position.x
    sprite.y = itemWrapper.position.y
    sprite.rotation = Math.random() * Math.PI * 2 // rotate item to a random angle in radians
    itemWrapper.sprite = sprite
    this.addChild(sprite)
    
    // text label
    const color = ItemQualityColors[itemWrapper.item.itemQuality]
    const bg = new Graphics()
    this.addChild(bg)
    const text = new Text({
      text: `  ${itemWrapper.item.name}  `,
      style: {
        fill: color,
        fontSize: 12,
        dropShadow: true,
        dropShadowDistance: 1,
      },
    })
    text.x = itemWrapper.position.x - text.width / 2
    text.y = itemWrapper.position.y - 25
    this.addChild(text)

    bg.rect(0, 0, text.width + PADDING * 2, text.height + PADDING * 2)
      .fill(0x000000)
      .stroke(color)
    bg.x = text.x - PADDING
    bg.y = text.y - PADDING
  }
}

export default GroundItem
