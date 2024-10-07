import * as PIXI from 'pixi.js'

class Player {
  constructor(socketId, name, pather, texture, stage, color) {
    this.socketId = socketId
    this.name = name
    this.x = 0
    this.y = 0
    this.maxSpeed = 500 // pixels per second
    this.stage = stage
    this.texture = texture
    this.color = color

    this.path = []
    this.target = null
    this.tempTarget = null

    this.pather = pather
    this.showPaths = true

    this.isMoving = false

    // if we're on client, we have a stage and texture to render ourself
    if (this.stage && this.texture) {
      this.initSprite()
    }
  }

  initSprite() {
    this.spriteContainer = new PIXI.Sprite()
    this.spriteContainer.anchor.set(0.5)
    this.stage.addChild(this.spriteContainer)

    this.spriteGraphic = PIXI.Sprite.from(this.texture)
    this.spriteGraphic.anchor.set(0.5)
    this.spriteGraphic.scale.x = 2
    this.spriteGraphic.scale.y = 2
    this.spriteContainer.addChild(this.spriteGraphic)

    this.spriteLabel = new PIXI.Text({
      text: this.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: this.color,
        align: 'center',
        dropShadow: true,
        dropShadowDistance: 1,
        dropShadowBlur: 1,
        dropShadowAlpha: 1,
      },
    })
    this.spriteLabel.anchor.set(0.5, 2.5)
    this.spriteContainer.addChild(this.spriteLabel)
  }

  // when player state changes on the server, this is what the server will send
  // this is to avoid serializing a bunch of properties that aren't necessary to sync with the client
  getSyncProperties() {
    return {
      socketId: this.socketId,
      name: this.name,
      x: this.x,
      y: this.y,
      target: this.target,
    }
  }

  syncWithServer(data) {
    // currently just trusting client on player position, or it gets choppy..
    // need to figure out a way to reconcile position without feeling choppy
    // this.setPosition(data.x, data.y)

    this.setTarget(data.target)
  }

  onTick(deltaMs) {
    this.moveTowardTarget(deltaMs)
  }

  moveTowardTarget(deltaMs) {
    if (this.tempTarget == null && this.path.length) {
      this.targetNextPathPoint()
    }

    if (this.stage) {
      this.drawPathLine()
    }

    if (this.tempTarget == null) {
      return
    }

    this.setMoving(true)

    // Update position based on target
    const dx = this.tempTarget.x - this.x
    const dy = this.tempTarget.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > 1) {
      // compute move distance based on max speed (in pixels per second) and delta time
      const moveDistance = Math.min(distance, this.maxSpeed * (deltaMs / 1000))
      const angle = Math.atan2(dy, dx)
      this.x += Math.cos(angle) * moveDistance
      this.y += Math.sin(angle) * moveDistance
    } else {
      this.x = this.tempTarget.x
      this.y = this.tempTarget.y
      this.tempTarget = null
      this.setMoving(false)
    }

    // if we're in the UI, update the sprite representation of the player
    if (this.stage) {
      this.spriteContainer.x = this.x
      this.spriteContainer.y = this.y
    }
  }

  setMoving(isMoving) {
    this.isMoving = isMoving
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
    if (this.spriteContainer) {
      this.spriteContainer.x = x
      this.spriteContainer.y = y
    }
  }

  setTarget(target) {
    if (
      // target is null
      target == null ||
      // target hasn't changed
      (this.target != null &&
        target.x === this.target.x &&
        target.y === this.target.y)
    ) {
      return
    }

    // target is the same as current position
    if (target.x == this.x && target.y == this.y) {
      this.target = null
      this.setMoving(false)
      return
    }

    this.target = target
    this.path = this.pather.findPath(this, target)
    this.targetNextPathPoint()
  }

  targetNextPathPoint() {
    this.tempTarget = this.path.shift()
    if (this.tempTarget != null) {
      this.rotateToward(this.tempTarget)
    }
  }

  rotateToward({ x, y }) {
    if (this.stage != null && x != null && y != null) {
      const angle = Math.atan2(y - this.y, x - this.x) + (90 * Math.PI) / 180
      this.spriteGraphic.rotation = angle
    }
  }

  onDestroy() {
    if (this.spriteContainer) {
      this.spriteContainer.parent.removeChild(this.spriteContainer)
      this.spriteContainer.destroy()
    }
    if (this.pathLine != null) {
      this.pathLine.parent.removeChild(this.pathLine)
      this.pathLine.destroy()
    }
  }

  drawPathLine() {
    if (!this.showPaths) return

    if (this.pathLine == null) {
      this.pathLine = new PIXI.Graphics()
      this.pathLine.x = 0
      this.pathLine.y = 0
      this.pathLine.zIndex = 1
      this.stage.addChild(this.pathLine)
    } else {
      this.pathLine.clear()
    }

    if (this.tempTarget == null) return

    const linePoints = [this.tempTarget, ...this.path]
    let lastPoint = this
    linePoints.forEach((p, i) => {
      this.pathLine
        .moveTo(lastPoint.x, lastPoint.y)
        .lineTo(p.x, p.y)
        .stroke({
          width: 5,
          color: 0xffffff,
          alpha: i == 0 ? 0.5 : 0.3,
        })
        .circle(p.x, p.y, 5)
        .fill(0xffffff)
      lastPoint = p
    })
  }
}

export default Player
