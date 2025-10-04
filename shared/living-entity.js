import { Sprite, Container, Graphics, Text } from 'pixi.js'
import { ART_SCALE, DEBUG } from './constants.js'

class LivingEntity extends Container {
  constructor(label, pather, texture, world, color, maxHealth, currentHealth) {
    super()

    this.label = label
    this.x = 0
    this.y = 0
    this.maxSpeed = 500 // pixels per second
    this.world = world
    this.entityTexture = texture
    this.color = color
    this.maxHealth = maxHealth
    this.currentHealth = currentHealth

    this.path = []
    this.target = null
    this.tempTarget = null

    this.pather = pather
    this.showPaths = true

    // if we're on client, we have a stage and texture to render ourself
    if (this.world && this.entityTexture) {
      this.initSprite()
    }
  }

  initSprite() {
    this.entitySprite = Sprite.from(this.entityTexture)
    this.entitySprite.anchor.set(0.5)
    this.entitySprite.scale.x = ART_SCALE
    this.entitySprite.scale.y = ART_SCALE
    this.addChild(this.entitySprite)

    this.spriteLabel = new Text({
      text: this.label,
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
    this.addChild(this.spriteLabel)
  }

  // when state changes on the server, this is what the server will send
  serialize() {
    return {
      label: this.label,
      x: this.x,
      y: this.y,
      target: this.target,
      maxHealth: this.maxHealth,
      currentHealth: this.currentHealth,
    }
  }

  // when receiving state from the server, this is what the client will apply
  syncWithServer(data) {
    this.setLabel(data.label)
    this.setTarget(data.target)
    this.setMaxHealth(data.maxHealth)
    this.setCurrentHealth(data.currentHealth)
    
    // need to figure out a way to reconcile position without feeling choppy
    // const dx = this.x - data.x
    // const dy = this.y - data.y
    // const distance = Math.sqrt(dx * dx + dy * dy)
    // if (distance > 400) {
    //   this.setPosition(data.x, data.y)
    // }
  }

  onTick(deltaMs) {
    this.moveTowardTarget(deltaMs)
  }

  moveTowardTarget(deltaMs) {
    if (this.tempTarget == null && this.path.length) {
      this.targetNextPathPoint()
    }

    if (this.world && DEBUG) {
      this.drawPathLine()
    }

    if (this.tempTarget == null) {
      return
    }

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
    }
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
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
      return
    }

    this.target = target
    this.path = this.pather.findPath(this, target)
    this.targetNextPathPoint()
  }

  setMaxHealth(maxHealth) {
    this.maxHealth = maxHealth
    // todo redraw healthbar when there is one
  }

  setCurrentHealth(currentHealth) {
    this.currentHealth = currentHealth
    // todo redraw healthbar when there is one
  }

  setLabel(label) {
    if (this.label != 'You') {
      this.label = label
    }
    
    if (this.spriteLabel) {
      this.spriteLabel.text = this.label
      if (DEBUG) {
        this.spriteLabel.text += ` (${Math.round(this.x)}, ${Math.round(this.y)})`
      }
    }
  }

  targetNextPathPoint() {
    this.tempTarget = this.path.shift()
    if (this.tempTarget != null) {
      this.rotateToward(this.tempTarget)
    }
  }

  rotateToward({ x, y }) {
    if (this.world != null && x != null && y != null) {
      const angle = Math.atan2(y - this.y, x - this.x) + (90 * Math.PI) / 180
      this.entitySprite.rotation = angle
    }
  }

  onDestroy() {
    if (this.parent) {
      this.parent.removeChild(this)
      this.destroy()
    }
    if (this.pathLine != null) {
      this.pathLine.parent.removeChild(this.pathLine)
      this.pathLine.destroy()
    }
  }

  drawPathLine() {
    if (!this.showPaths) return

    if (this.pathLine == null) {
      this.pathLine = new Graphics()
      this.pathLine.x = 0
      this.pathLine.y = 0
      this.pathLine.zIndex = 1
      this.world.addChild(this.pathLine)
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
          width: 3,
          color: 0xffffff,
          alpha: i == 0 ? 0.5 : 0.3,
        })
        .circle(p.x, p.y, 5)
        .fill(0xffffff)
      lastPoint = p
    })
  }
}

export default LivingEntity