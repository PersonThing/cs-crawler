import { ItemQualityColors } from '../../shared/item-quality.js'
import { Container, Graphics, Text, Sprite } from 'pixi.js'
import altKeyStore from './alt-key-store.js'

const PADDING = 5

class GroundItem extends Container {
  constructor(itemWrapper) {
    super()

    this.x = itemWrapper.position.x
    this.y = itemWrapper.position.y

    const color = ItemQualityColors[itemWrapper.item.itemQuality]

    // draw a background behind the item colored by item quality
    const spriteBg = new Graphics().circle(0, 0, 15).fill(color)

    spriteBg.alpha = 0.25
    spriteBg.scale.y = 0.5
    spriteBg.y = 10

    this.addChild(spriteBg)

    // texture sprite
    const sprite = Sprite.from(itemWrapper.item.inventoryTexture)
    sprite.anchor.set(0.5)
    sprite.x = 0
    sprite.y = 0
    sprite.rotation = Math.random() * Math.PI * 2 // rotate item to a random angle in radians
    itemWrapper.sprite = sprite
    this.addChild(sprite)

    // text label
    const textBg = new Graphics()
    this.addChild(textBg)
    const text = new Text({
      text: `  ${itemWrapper.item.name}  `,
      style: {
        fill: color,
        fontSize: 14,
        fontWeight: 'bold',
        dropShadow: true,
        dropShadowDistance: 1,
      },
    })
    text.x = -text.width / 2
    text.y = -25
    text.visible = false
    this.addChild(text)

    textBg.rect(0, 0, text.width + PADDING * 2, text.height + PADDING * 2).fill(0x000000)
    textBg.x = text.x - PADDING
    textBg.y = text.y - PADDING
    textBg.visible = false


    let hovering = false
    spriteBg.alpha = 0.5
    this.on('pointerover', () => {
      hovering = true
      text.visible = textBg.visible = altKeyStore.get() || hovering
      spriteBg.alpha = 1
      this.zIndex = 1
    })

    this.on('pointerout', () => {
      hovering = false
      text.visible = textBg.visible = altKeyStore.get() || hovering
      spriteBg.alpha = 0.5
      this.zIndex = 0
    })
    this.eventMode = 'static'

    this.unsubscribeAltKey = altKeyStore.subscribe(alt => {
      text.visible = textBg.visible = alt || hovering
      text.eventMode = textBg.eventMode = alt ? 'static' : 'none'
    })
  }

  destroy() {
    super.destroy()

    if (this.unsubscribeAltKey) {
      this.unsubscribeAltKey()
    }
  }
}

export default GroundItem
