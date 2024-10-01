import { Sprite, Text } from 'pixi.js'

class Player {
  constructor(id, color, texture) {
    this.id = id
    this.color = color
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    this.maxSpeed = 100
    this.texture = texture

    // server won't have texture
    // client will have texture, create a sprite to represent the player / will keep sprite in sync with player values
    if (texture) {
      this.sprite = new Sprite(texture)
      this.sprite.tint = color
      this.sprite.anchor.set(0.5)

      // attach a name label above the texture
      this.nameLabel = new Text({
        text: `Player ${this.id}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          align: 'center',
        }
      })
    }
  }

  onTick(deltaMs) {
    // Update position based on target
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > 1) {
      // compute move distance based on max speed and delta time
      const deltaTime = deltaMs / 100
      const moveDistance = Math.min(distance, this.maxSpeed * deltaTime)

      const angle = Math.atan2(dy, dx)
      this.x += Math.cos(angle) * moveDistance
      this.y += Math.sin(angle) * moveDistance
      this.rotation = angle // rotate toward target
    } else {
      this.x = this.targetX
      this.y = this.targetY
      this.rotation = 0 // clear rotation
    }

    // if we're in the UI, update the sprite representation of the player
    if (this.sprite) {
      this.sprite.x = this.x
      this.sprite.y = this.y
      this.sprite.rotation = this.rotation
    }
  }

  setColor(color) {
    this.color = color
    if (this.sprite) {
      this.sprite.tint = color
    }
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
    if (this.sprite) {
      this.sprite.x = x
      this.sprite.y = y
    }
  }

  setTarget(x, y) {
    this.targetX = x
    this.targetY = y
  }

  syncWithServer(playerData) {
    this.setPosition(playerData.x, playerData.y)
    this.setTarget(playerData.targetX, playerData.targetY)
    if (this.sprite) {
      this.sprite.rotation = playerData.rotation
    }
  }
}

export default Player
