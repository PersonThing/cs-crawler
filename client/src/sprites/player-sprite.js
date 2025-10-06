import LivingEntitySprite from './living-entity-sprite.js'

class PlayerSprite extends LivingEntitySprite {
  constructor(playerState, texture, world, pather, color) {
    super(playerState, texture, world, pather, color)
    this.state.label = playerState.username
  }
}

export default PlayerSprite