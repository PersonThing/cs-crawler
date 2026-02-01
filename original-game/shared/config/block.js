export default class Block {
  constructor(props) {
    this.x = props.x
    this.y = props.y
    this.canWalk = props.canWalk || false
    this.canSeeThrough = props.canSeeThrough || false
    this.canShootThrough = props.canShootThrough || false
    this.textures = props.textures || null
    this.alpha = 0
  }

  setAlpha(alpha) {
    this.alpha = alpha
    this.sprite.alpha = alpha
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
