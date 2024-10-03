import { Sprite, Text } from 'pixi.js'

class Block {
  constructor(props) {
    this.x = props.x
    this.y = props.y
    this.canWalk = props.canWalk || false
    this.canSeeThrough = props.canSeeThrough || false
    this.canShootThrough = props.canShootThrough || false
    this.texture = props.texture || null
    this.alpha = 0//1
  }

  setAlpha(alpha) {
    this.alpha = alpha
    this.sprite.alpha = alpha
  }

  render(container, x, y) {
    this.sprite = Sprite.from(this.texture)
    this.sprite.x = x
    this.sprite.y = y
    this.sprite.alpha = this.alpha
    container.addChild(this.sprite)
  }

  onLoad() {
    // placeholder
  }

  onUnload() {
    // placeholder
  }

  onEnter() {
    // placeholder
  }

  onLeave() {
    // placeholder
  }
}

export default Block