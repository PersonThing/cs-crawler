import { Container, BlurFilter, Rectangle, Graphics, Sprite, Text } from 'pixi.js'
import LevelSprite from '../client/src/level-sprite.js'
import GroundItem from '../client/src/ground-item.js'
import playerItemTargetStore from '../client/src/player-item-target-store.js'
import socket from '../client/src/socket.js'

const PARALLAX_SCALE = 1.1

class World extends Container {
  constructor(app, levelConfig) {
    super()

    this.app = app

    this.players = []
    this.enemies = []
    this.items = [] // items on the ground

    this.levelConfig = levelConfig

    this.levelContainer = new Container()
    this.addChild(this.levelContainer)

    this.levelSprite = new LevelSprite(levelConfig, 1, false)
    this.addChild(this.levelSprite)

    // add another level sprite slightly scaled up for parallax effect
    this.levelSpriteParallax = new LevelSprite(levelConfig, PARALLAX_SCALE, false, true)
    // this.levelSpriteParallax.tileContainer.alpha = 0.25
    this.levelSpriteParallax.mask = null

    this.addChild(this.levelSpriteParallax)

    this.itemsContainer = new Container()
    this.addChild(this.itemsContainer)

    this.mask = this.createLightRadiusMask()
    
    // listen to item changes from server
    socket.on('worldItemPlaced', itemWrapper => {
      console.log('world item placed from server', itemWrapper.item?.id)
      if (!this.items.find(i => i.item.id === itemWrapper.item.id)) {
        this.placeItem(itemWrapper.item, itemWrapper.position, false)
      }
    })

    socket.on('worldItemRemoved', itemId => {
      console.log('world item removed from server', itemId)
      const itemWrapper = this.items.find(i => i.item.id === itemId)
      if (itemWrapper) {
        this.removeItem(itemWrapper.item, false)
      }
    })
  }

  createLightRadiusMask() {
    const radius = 600
    const blurSize = 200
    let circle = new Graphics().circle(radius + blurSize, radius + blurSize, radius).fill(0xff0000)
    circle.alpha = 1

    const blurFilter = new BlurFilter()
    blurFilter.blur = blurSize
    blurFilter.quality = 3
    circle.filters = [blurFilter]

    const bounds = new Rectangle(0, 0, (radius + blurSize) * 2, (radius + blurSize) * 2)
    const texture = this.app.renderer.generateTexture({
      target: circle,
      resolution: 1,
      frame: bounds,
    })
    const focus = new Sprite(texture)
    focus.anchor.set(0.5)
    this.addChild(focus)
    return focus
  }

  onTick(time, localPlayer, screenWidth, screenHeight) {
    // center view on local player
    if (localPlayer) {
      this.x = -localPlayer.x + screenWidth / 2
      this.y = -localPlayer.y + screenHeight / 2
      this.mask.x = localPlayer.x
      this.mask.y = localPlayer.y
    }

    // update the rendered level
    this.levelSprite.onTick(localPlayer, screenWidth, screenHeight)

    // update the parallax level + center it on player
    this.levelSpriteParallax.onTick(localPlayer, screenWidth, screenHeight)
    this.levelSpriteParallax.x = this.x * (PARALLAX_SCALE - 1) - 90
    this.levelSpriteParallax.y = this.y * (PARALLAX_SCALE - 1) - 70

    // update players
    this.players.forEach(player => {
      player.onTick(time.deltaMS)
    })

    // update enemies
    this.enemies.forEach(enemy => {
      enemy.onTick(time.deltaMS)
    })

    // render any items that aren't already rendered
    this.items.forEach(itemWrapper => {
      if (!itemWrapper.sprite) {
        this.renderItem(itemWrapper)
      }
    })

    // unrender any items that are no longer in the items store
    this.itemsContainer.children.forEach(sprite => {
      const itemWrapper = this.items.find(i => i.sprite === sprite)
      if (!itemWrapper) {
        this.itemsContainer.removeChild(sprite)
      }
    })
  }

  addPlayer(player) {
    this.players.push(player)
    this.addChild(player)
  }

  removePlayer(player) {
    this.players = this.players.filter(p => p !== player)
    this.removeChild(player)
  }

  placeItem(item, position, sendToServer = true) {
    position = this.getBestAvailableItemPosition(position)

    console.log('placing item on ground', item, position)
    if (item == null) {
      throw new Error('cannot place null item')
    }
    if (position == null || position.x == null || position.y == null) {
      throw new Error('cannot place item with invalid position', position)
    }
    const itemWrapper = {
      item,
      position,
      rendered: false,
    }
    this.items.push(itemWrapper)
    if (sendToServer) {
      console.log('placing item on server', itemWrapper.item?.id)
      socket.emit('worldItemPlaced', itemWrapper)
    }
  }

  // given a position {x, y}, return the best available position to place an item
  // where there isn't already an item within 20 pixels radius
  // ideally it drops it exactly at the passed position
  // failing that, look for the nearest position, circling clockwise and outward until a good position is found
  getBestAvailableItemPosition(position) {
    if (position == null || position.x == null || position.y == null) {
      return null
    }
    const radius = 30
    const step = 4
    const maxRadius = 200
    const maxSteps = maxRadius / step
    let bestPosition = position
    let bestDistance = 0
    let bestPositionFound = false
    for (let r = 0; r < maxSteps; r++) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const x = position.x + Math.cos(a) * r * step
        const y = position.y + Math.sin(a) * r * step
        const distance = Math.sqrt((x - position.x) ** 2 + (y - position.y) ** 2)
        if (distance < bestDistance) {
          continue
        }
        if (
          this.items.some(item => {
            const dx = item.position.x - x
            const dy = item.position.y - y
            return Math.sqrt(dx ** 2 + dy ** 2) < radius
          })
        ) {
          continue
        }
        bestPosition = { x, y }
        bestDistance = distance
        bestPositionFound = true
      }
      if (bestPositionFound) {
        break
      }
    }
    return bestPosition
  }

  removeItem(item, sendToServer = true) {
    console.log('removing item', item)
    const itemWrapper = this.items.find(itemWrapper => itemWrapper.item === item)
    if (itemWrapper == null) {
      throw new Error('cannot remove item that is not on the ground', item)
    }
    this.items = this.items.filter(i => i !== itemWrapper)
    this.itemsContainer.removeChild(itemWrapper.sprite)
    if (sendToServer) {
      console.log('removing item from server', itemWrapper.item?.id)
      socket.emit('worldItemRemoved', itemWrapper.item.id)
    }
  }

  renderItem(itemWrapper) {
    itemWrapper.sprite = new GroundItem(itemWrapper)
    this.itemsContainer.addChild(itemWrapper.sprite)
    itemWrapper.sprite.on('pointerdown', () => {
      playerItemTargetStore.set(itemWrapper)
    })
  }
}

export default World
