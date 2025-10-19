import { Container, BlurFilter, Rectangle, Graphics, Sprite, Text } from 'pixi.js'
import LevelSprite from './sprites/level-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import screenSizeStore from './stores/screen-size-store.js'
import PlayerSprite from './sprites/player-sprite.js'
import Pather from '#shared/pather.js'
import GroundItemSprite from './sprites/ground-item-sprite.js'
import soundManager from './sound-manager.js'
import { Sounds } from '#shared/config/sounds.js'
import { ART_SCALE } from '#shared/config/constants.js'

const PARALLAX_SCALE = 1.1

class World extends Container {
  constructor(app, levelConfig, onItemClick) {
    super()

    this.app = app
    this.levelConfig = levelConfig

    this.levelSprite = new LevelSprite(levelConfig, 1, false)
    this.addChild(this.levelSprite)

    this.groundItemsContainer = new Container()
    this.addChild(this.groundItemsContainer)

    this.projectilesContainer = new Container()
    this.addChild(this.projectilesContainer)

    this.turretsContainer = new Container()
    this.addChild(this.turretsContainer)

    this.pather = new Pather(levelConfig)

    // add another level sprite slightly scaled up for parallax effect
    this.levelSpriteParallax = new LevelSprite(levelConfig, PARALLAX_SCALE, false, true)
    this.levelSpriteParallax.mask = null
    this.levelSpriteParallax.zIndex = 4 // players are at 3, so parallax seems to be above them

    this.addChild(this.levelSpriteParallax)

    this.mask = this.createLightRadiusMask()

    this.onItemClick = onItemClick

    playerSpriteStore.subscribe(players => {
      // remove any players that are no longer in the store
      const playerSprites = this.children.filter(child => child instanceof PlayerSprite)
      for (const child of playerSprites) {
        if (!players.includes(child)) {
          this.removePlayer(child)
        }
      }

      // add any players that are in the store but not yet rendered
      for (const player of players) {
        if (!this.children.includes(player)) {
          this.addPlayer(player)
        }
      }
    })
  }

  setGroundItems(groundItems) {
    // remove any items that are no longer there
    for (const id of this.groundItemsContainer.children.map(sprite => sprite.id)) {
      const groundItem = groundItems.find(groundItem => groundItem.item.id === id)
      if (!groundItem) {
        this.unrenderItem(id)
      }
    }

    // add any items that are not yet rendered
    for (const groundItem of groundItems) {
      if (!this.groundItemsContainer.children.find(sprite => sprite.id === groundItem.item.id)) {
        this.renderItem(groundItem)
        soundManager.play(Sounds.item.ItemDrop, { start: 0.1, end: 0.3, volume: 0.5 })
      }
    }
  }

  setProjectiles(projectiles) {
    // Remove any projectiles that are no longer active
    for (const child of [...this.projectilesContainer.children]) {
      const projectile = projectiles.find(p => p.id === child.projectileId)
      if (!projectile) {
        this.projectilesContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update projectiles
    for (const projectile of projectiles) {
      let sprite = this.projectilesContainer.children.find(child => child.projectileId === projectile.id)
      
      if (!sprite) {
        // Create new projectile sprite
        sprite = Sprite.from(projectile.texture)
        sprite.anchor.set(0.5)
        sprite.scale.set(ART_SCALE)
        sprite.projectileId = projectile.id
        sprite.zIndex = 2 // Between ground items (1) and players (3)
        this.projectilesContainer.addChild(sprite)
      }
      
      // Update position and rotation
      sprite.x = projectile.x
      sprite.y = projectile.y
      sprite.rotation = projectile.rotation
    }
  }

  setTurrets(turrets) {
    // Remove any turrets that are no longer active
    for (const child of [...this.turretsContainer.children]) {
      const turret = turrets.find(t => t.id === child.turretId)
      if (!turret) {
        this.turretsContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update turrets
    for (const turret of turrets) {
      let sprite = this.turretsContainer.children.find(child => child.turretId === turret.id)
      
      if (!sprite) {
        // Create new turret sprite
        sprite = Sprite.from(turret.texture)
        sprite.anchor.set(0.5)
        sprite.scale.set(ART_SCALE)
        sprite.turretId = turret.id
        sprite.zIndex = 2.5 // Between projectiles (2) and players (3)
        this.turretsContainer.addChild(sprite)
      }
      
      // Update position
      sprite.x = turret.x
      sprite.y = turret.y
    }
  }

  createLightRadiusMask() {
    const radius = 600
    const blurSize = 200
    let circle = new Graphics().circle(radius + blurSize, radius + blurSize, radius).fill(0xff0000)
    circle.alpha = 1

    const blurFilter = new BlurFilter()
    blurFilter.strength = blurSize
    blurFilter.quality = 3
    circle.filters = [blurFilter]

    const bounds = new Rectangle(0, 0, (radius + blurSize) * 2, (radius + blurSize) * 2)
    const texture = this.app.renderer.generateTexture({
      target: circle,
      resolution: 1,
      frame: bounds,
    })
    const focus = Sprite.from(texture)
    focus.anchor.set(0.5)
    this.addChild(focus)
    return focus
  }

  tick(time) {
    const { width: screenWidth, height: screenHeight } = screenSizeStore.get()
    const localPlayer = playerSpriteStore.getLocalPlayer()
    if (localPlayer == null) return

    // center view on local player
    // move map around the player centered in the middle of the screen
    this.x = -localPlayer.x + screenWidth / 2
    this.y = -localPlayer.y + screenHeight / 2
    this.mask.x = localPlayer.x
    this.mask.y = localPlayer.y

    // update the parallax level - it needs to offset by the difference in level size and parallax size
    this.levelSpriteParallax.tick(screenWidth, screenHeight)
    this.levelSpriteParallax.x = -localPlayer.x * (PARALLAX_SCALE - 1)
    this.levelSpriteParallax.y = -localPlayer.y * (PARALLAX_SCALE - 1)

    // update the rendered level
    this.levelSprite.tick(screenWidth, screenHeight)
  }

  addPlayer(player) {
    player.zIndex = 3
    this.addChild(player)
  }

  removePlayer(player) {
    player.destroy()
    this.removeChild(player)
  }

  renderItem(groundItem) {
    if (groundItem.item == null) {
      console.error('Cannot render item with no item data', groundItem)
      return
    }

    if (groundItem.position == null) {
      console.error('Cannot render item with no position', groundItem)
      return
    }

    const groundItemSprite = new GroundItemSprite(groundItem)
    this.groundItemsContainer.addChild(groundItemSprite)
    groundItemSprite.on('pointerdown', () => {
      const localPlayer = playerSpriteStore.getLocalPlayer()
      if (localPlayer == null) {
        console.error('No local player to pick up item')
      }

      this.onItemClick({
        item: groundItem.item,
        position: groundItem.position,
      })
    })
  }

  unrenderItem(id) {
    const groundItemSprite = this.groundItemsContainer.children.find(sprite => sprite.id === id)
    if (groundItemSprite) {
      groundItemSprite.destroy()
      this.groundItemsContainer.removeChild(groundItemSprite)
    }
  }
}

export default World
