import { Container, BlurFilter, Rectangle, Graphics, Sprite, Text } from 'pixi.js'
import LevelSprite from './sprites/level-sprite.js'
import GroundItem from './sprites/ground-item-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import groundItemsStore from '../../shared/stores/ground-items-store.js'
import screenSizeStore from './stores/screen-size-store.js'
import PlayerSprite from './sprites/player-sprite.js'
import Pather from '#shared/pather.js'

const PARALLAX_SCALE = 1.1

class World extends Container {
  constructor(app, levelConfig) {
    super()

    this.app = app
    this.levelConfig = levelConfig

    this.levelSprite = new LevelSprite(levelConfig, 1, false)
    this.addChild(this.levelSprite)

    this.itemsContainer = new Container()
    this.addChild(this.itemsContainer)

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

    groundItemsStore.subscribe(items => {
      // remove any items that are no longer in the store
      this.itemsContainer.children.forEach(child => {
        const itemWrapper = items.find(i => i.id === child.id)
        if (!itemWrapper) {
          this.unrenderItem(child.item.id)
        }
      })

      // add any items that are in the store but not yet rendered
      items.forEach(itemWrapper => {
        if (!this.itemsContainer.children.find(i => i.id === itemWrapper.id)) {
          this.renderItem(itemWrapper)
        }
      })
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
    if (localPlayer == null) return;

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

    // update players from store - players are set into store by socket listeners
    playerSpriteStore.get().forEach(player => player.onTick(time))
  }

  addPlayer(player) {
    player.zIndex = 3
    this.addChild(player)
  }

  removePlayer(player) {
    player.destroy()
    this.removeChild(player)
  }

  renderItem(itemWrapper) {
    const groundItem = new GroundItem(itemWrapper)
    this.itemsContainer.addChild(groundItem)
    groundItem.on('pointerdown', () => {
      playerSpriteStore.getLocalPlayer()?.state?.setTargetItem(itemWrapper)
    })
  }

  unrenderItem(id) {
    this.itemsContainer.children.forEach(child => {
      if (child.id === id) {
        child.destroy()
        this.itemsContainer.removeChild(child)
      }
    })
  }
}

export default World
