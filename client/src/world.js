import { Container, BlurFilter, Rectangle, Graphics, Sprite, Text } from 'pixi.js'
import LevelSprite from './sprites/level-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import screenSizeStore from './stores/screen-size-store.js'
import PlayerSprite from './sprites/player-sprite.js'
import Pather from '#shared/pather.js'
import GroundItemSprite from './sprites/ground-item-sprite.js'

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

    this.pather = new Pather(levelConfig)

    // add another level sprite slightly scaled up for parallax effect
    this.levelSpriteParallax = new LevelSprite(levelConfig, PARALLAX_SCALE, false, true)
    // this.levelSpriteParallax.tileContainer.alpha = 0.25
    this.levelSpriteParallax.mask = null
    this.levelSpriteParallax.zIndex = 4 // players are at 3, so parallax seems to be above them
    // TODO: render player labels separate from the player sprites
    // so we see them above the parallax (and anything else)

    this.addChild(this.levelSpriteParallax)

    this.mask = this.createLightRadiusMask()

    this.onItemClick = onItemClick

    playerSpriteStore.subscribe(players => {
      // remove any players that are no longer in the store
      this.children
        .filter(child => child instanceof PlayerSprite)
        .forEach(child => {
          if (!players.includes(child)) {
            this.removePlayer(child)
          }
        })

      // add any players that are in the store but not yet rendered
      players.forEach(player => {
        if (!this.children.includes(player)) {
          this.addPlayer(player)
        }
      })
    })
  }

  setGroundItems(groundItems) {
    // remove any items that are no longer there
    this.groundItemsContainer.children.forEach(groundItemSprite => {
      const groundItem = groundItems.find(groundItem => groundItem.item.id === groundItemSprite.id)
      if (!groundItem) {
        this.unrenderItem(groundItemSprite.id)
      }
    })

    // add any items that are not yet rendered
    groundItems.forEach(groundItem => {
      if (!this.groundItemsContainer.children.find(sprite => sprite.id === groundItem.item.id)) {
        this.renderItem(groundItem)
      }
    })
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

  onTick(time) {
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
    this.levelSpriteParallax.onTick(screenWidth, screenHeight)
    this.levelSpriteParallax.x = -localPlayer.x * (PARALLAX_SCALE - 1)
    this.levelSpriteParallax.y = -localPlayer.y * (PARALLAX_SCALE - 1)

    // update the rendered level
    this.levelSprite.onTick(screenWidth, screenHeight)
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
    this.groundItemsContainer.children.forEach(groundItemSprite => {
      if (groundItemSprite.id === id) {
        groundItemSprite.destroy()
        this.groundItemsContainer.removeChild(groundItemSprite)
      }
    })
  }
}

export default World
