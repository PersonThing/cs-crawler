class Block {
  constructor(props) {
    this.x = props.x
    this.y = props.y
    this.canWalk = props.canWalk || false
    this.canSeeThrough = props.canSeeThrough || false
    this.canShootThrough = props.canShootThrough || false
    this.texture = props.texture || null
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