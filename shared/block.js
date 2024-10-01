// blocks have properties that determine whether a player can walk on, see through, shoot through, etc
// blocks can also have interactions - on click, on enter, on leave, etc
// we will design blocks, then build up pre-built tiles that can be used to build levels

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