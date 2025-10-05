import {
  Sprite,
  Container,
  Graphics,
  Text,
  ParticleContainer,
  Particle,
  Texture,
  Rectangle,
} from 'pixi.js'
import { ART_SCALE, DEBUG } from './constants.js'
import { Textures } from '../client/src/textures.js'
import InventorySlot from './inventory-slot.js'

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
    this.attackTarget = null
    this.tempTarget = null

    this.pather = pather
    this.showPaths = true

    this.equipped = {}

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

    // add a particle effect to trail behind
    // this.particleContainer = new ParticleContainer({
    //   dynamicProperties: {
    //     position: true, // Allow dynamic position changes (default)
    //     scale: true, // Static scale for extra performance
    //     rotation: true, // Static rotation
    //     color: false, // Static color
    //     boundsArea: new Rectangle(0, 0, 500, 500),
    //   },
    // })
    // this.addChildAt(this.particleContainer, 0)

    // // draw a few particles to start
    // const texture = Texture.from(Textures.particle.blaze)
    // for (let i = 0; i < 3; i++) {
    //   let particle = new Particle({
    //     texture,
    //     x: Math.random() * 10 * i,
    //     y: Math.random() * 10 * i,
    //     alpha: 0.2,
    //   })
    //   this.particleContainer.addParticle(particle)
    // }

    // add a shadow below
    this.shadowSprite = Sprite.from(this.entityTexture)
    this.shadowSprite.anchor.set(0.5, 0.4)
    this.shadowSprite.alpha = 0.25
    this.shadowSprite.scale.x = ART_SCALE * 1.5
    this.shadowSprite.scale.y = ART_SCALE * 1.5
    this.shadowSprite.tint = 0x000000
    this.addChildAt(this.shadowSprite, 0)
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
    if (this.attacking) {
      this.rotateToward(this.attackTarget)

      // if enough time has passed, animate attack again
      if (this.lastAttackTime == null || deltaMs - this.lastAttackTime > 200) {
        // console.log('animate an attack', deltaMs)
        // const mainHandEquipped = this.equipped[InventorySlot.MainHand.name]
        // const offhandEquipped = this.equipped[InventorySlot.OffHand.name]

        // if (mainHandEquipped != null && mainHandEquipped.itemType.bothHands === true) {
        //   // 2h weapon in main hand, animate that
        //   this.animateAttack(InventorySlot.MainHand.name, mainHandEquipped.attackingTexture)
        // } else {
        //   // animate both hands
        //   if (mainHandEquipped != null) {
        //     this.animateAttack(InventorySlot.MainHand.name, mainHandEquipped.attackingTexture)
        //   }
        //   if (offhandEquipped != null) {
        //     this.animateAttack(InventorySlot.OffHand.name, offhandEquipped.attackingTexture)
        //   }
        // }
        this.lastAttackTime = deltaMs
      }
      // console.log(deltaMs)
    }
  }

  animateAttack(slotName, attackingTexture) {
    if (this.equippedSpriteContainer == null) return
    const sprite = this.equippedSpriteContainer.children.find(s => {
      // find the sprite by matching texture
      return s.attackingTexture === attackingTexture || s.texture === Textures.item.weapon.hand
    })
    // set sprite texture to the attackingTexture for 100 ms, then back to normal
    if (sprite != null && attackingTexture != null && sprite.texture !== attackingTexture) {
      const originalTexture = sprite.texture
      sprite.texture = attackingTexture
      setTimeout(() => {
        sprite.texture = originalTexture
      }, 100)
    }
  }

  moveTowardTarget(deltaMs) {
    if (this.tempTarget == null && this.path.length) {
      console.log('moving to next path point')
      this.targetNextPathPoint()
    }

    if (this.world) {
      if (DEBUG.get()) {
        this.drawPathLine()
      } else {
        this.clearPathLine()
      }
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
      (this.target != null && target.x === this.target.x && target.y === this.target.y)
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

  stopMoving() {
    // TODO: this doesn't work, something else is setting target after we clear it
    this.target = null
    this.tempTarget = null
    this.path = []
  }

  startAttacking(targetPoint) {
    this.attacking = true
    this.attackTarget = targetPoint
    this.stopMoving()
  }

  stopAttacking() {
    this.attacking = false
    this.attackTarget = null
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
      if (DEBUG.get()) {
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
      this.clearPathLine()
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
          color: this.color,
          alpha: i == 0 ? 0.5 : 0.3,
        })
        .circle(p.x, p.y, 5)
        .fill(this.color)
      lastPoint = p
    })
  }

  clearPathLine() {
    if (this.pathLine != null) {
      this.pathLine.clear()
    }
  }

  setEquipped(equipped) {
    this.equipped = equipped

    // this is only relevant for rendering, can skip on server
    if (!this.world) return

    if (this.equippedSpriteContainer != null) {
      this.equippedSpriteContainer.destroy()
      this.entitySprite.removeChild(this.equippedSpriteContainer)
    }

    this.equippedSpriteContainer = new Container()
    this.entitySprite.addChild(this.equippedSpriteContainer)

    Object.keys(equipped)
      .filter(
        slotName =>
          equipped[slotName] != null &&
          equipped[slotName].equippedTexture != null &&
          !slotName.includes('Bonus')
      )
      .forEach(slotName => {
        const item = equipped[slotName]
        if (item != null) {
          this.attachItemSprite(item.equippedTexture, slotName)
        }
      })

    // if no mainhand equipped, render a hand
    if (equipped[InventorySlot.MainHand.name] == null) {
      this.attachItemSprite(Textures.item.weapon.hand, InventorySlot.MainHand.name)
    }

    // if no offhand equipped, and no 2h mainhand equipped, render a hand
    if (
      equipped[InventorySlot.OffHand.name] == null &&
      equipped[InventorySlot.MainHand.name]?.itemType.bothHands != true
    ) {
      this.attachItemSprite(Textures.item.weapon.hand, InventorySlot.OffHand.name)
    }
  }

  attachItemSprite(texture, slotName) {
    const sprite = Sprite.from(texture)
    sprite.anchor.set(0.5)
    this.equippedSpriteContainer.addChild(sprite)

    // flip the sprite if offhand
    if (slotName === InventorySlot.OffHand.name) {
      sprite.scale.x = -1
    }
  }
}

export default LivingEntity
