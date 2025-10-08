import LivingEntitySprite from './living-entity-sprite.js'

class PlayerSprite extends LivingEntitySprite {
  constructor(playerState, texture, world, pather, color) {
    super(playerState, texture, world, pather, color)
    this.state.label = playerState.username
  }

  updateFromState() {
    this.state.label = this.state.username
    super.updateFromState()
  }

  setTargetItem(itemWrapper) {
    this.state.targetItem = itemWrapper
  }
}

export default PlayerSprite