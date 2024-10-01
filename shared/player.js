import { Assets, Sprite, Text } from 'pixi.js'

class Player {
  constructor(id, name, texture, stage, isLocalPlayer) {
    this.id = id
    this.name = name
    this.x = 0
    this.y = 0
    this.targetX = 0
    this.targetY = 0
    this.maxSpeed = 50
    this.texture = texture
    this.stage = stage
    this.isLocalPlayer = isLocalPlayer

    // if we're on client, we have a stage and texture to render ourself
    if (this.stage && this.texture) {
      this.initSprite()
    }
  }

  async initSprite() {
    const txt = await Assets.load(this.texture)

    this.spriteContainer = new Sprite()
    this.spriteContainer.anchor.set(0.5)

    this.spriteGraphic = Sprite.from(txt)
    this.spriteGraphic.anchor.set(0.5)
    this.spriteGraphic.scale.x = 2
    this.spriteGraphic.scale.y = 2
    this.spriteContainer.addChild(this.spriteGraphic)

    this.spriteLabel = new Text({
      text: this.isLocalPlayer ? 'You' : this.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        align: 'center',
      },
    })
    this.spriteLabel.anchor.set(0.5, 2.5)
    this.spriteContainer.addChild(this.spriteLabel)
    this.stage.addChild(this.spriteContainer)
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
    }

    // if we're in the UI, update the sprite representation of the player
    if (this.spriteContainer) {
      this.spriteContainer.x = this.x
      this.spriteContainer.y = this.y
      this.setRotation(this.rotation)
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

  setRotation(rotation) {
    this.rotation = rotation
    if (this.spriteGraphic) {
      this.spriteGraphic.rotation = this.rotation + Math.PI / 2
    }
  }

  setTarget(x, y) {
    this.targetX = x
    this.targetY = y
  }

  syncWithServer(playerData) {
    this.setPosition(playerData.x, playerData.y)
    this.setTarget(playerData.targetX, playerData.targetY)
    this.setRotation(playerData.rotation)
  }

  onDestroy() {
    if (this.stage && this.spriteContainer) {
      this.stage.removeChild(this.spriteContainer)
    }
  }
}

export default Player
