import { Sprite, Text } from 'pixi.js'

class Player {
  constructor(id, color, texture, isLocalPlayer) {
    this.id = id
    this.color = color
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    this.maxSpeed = 100
    this.texture = texture
    this.isLocalPlayer = isLocalPlayer

    // server won't have texture
    // client will have texture, create a sprite to represent the player / will keep sprite in sync with player values
    if (texture) {
      this.spriteContainer = new Sprite()
      this.spriteContainer.tint = color
      this.spriteContainer.anchor.set(0.5)

      this.spriteGraphic = new Sprite(texture)
      this.spriteGraphic.anchor.set(0.5)
      this.spriteContainer.addChild(this.spriteGraphic)

      this.spriteLabel = new Text({
        text: this.isLocalPlayer ? 'You' : this.id,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          align: 'center',
        }
      })
      this.spriteLabel.anchor.set(0.5, 2.5)
      this.spriteContainer.addChild(this.spriteLabel)
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
    if (this.spriteContainer) {
      this.spriteContainer.x = this.x
      this.spriteContainer.y = this.y
      this.spriteGraphic.rotation = this.rotation
    }
  }

  setColor(color) {
    this.color = color
    if (this.spriteContainer) {
      this.spriteContainer.tint = color
    }
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
    if (this.spriteContainer) {
      this.spriteContainer.x = x
      this.spriteContainer.y = y
    }
  }

  setTarget(x, y) {
    this.targetX = x
    this.targetY = y
  }

  syncWithServer(playerData) {
    this.setPosition(playerData.x, playerData.y)
    this.setTarget(playerData.targetX, playerData.targetY)
    if (this.spriteGraphic) {
      this.spriteGraphic.rotation = playerData.rotation
    }
  }

  removeFromStage(stage) {
    if (this.spriteContainer) {
      stage.removeChild(this.spriteContainer)
    }
  }
}

export default Player
