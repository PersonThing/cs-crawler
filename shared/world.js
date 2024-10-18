import { Container, BlurFilter, Rectangle, Graphics, Sprite, Text } from 'pixi.js'
import LevelSprite from '../client/src/level-sprite.js'
import socket from '../client/src/socket.js'
import ItemLabel from '../client/src/item-label.js'

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

    this.itemsContainer = new Container()
    this.addChild(this.itemsContainer)

    this.itemLabelsContainer = new Container()
    this.addChild(this.itemLabelsContainer)

    this.mask = this.createLightRadiusMask()

    socket.on('playerInventoryChanged', ({ playerId, content }) => {
      const player = this.players.find(p => p.playerId == playerId)
      if (player != null) {
        player.inventory.deserialize(content)
      }
      // console.log('player inventory changed', playerId, content)
    })
  }

  createLightRadiusMask() {
    const radius = 700
    const blurSize = 500
    let circle = new Graphics().circle(radius + blurSize, radius + blurSize, radius).fill(0xff0000)
    circle.alpha = 1

    const blurFilter = new BlurFilter()
    blurFilter.blur = blurSize
    blurFilter.quality = 10
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
  }

  addPlayer(player) {
    this.players.push(player)
    this.addChild(player)
  }

  removePlayer(player) {
    this.players = this.players.filter(p => p !== player)
    this.removeChild(player)
  }

  placeItem(item, position) {
    position = this.getBestAvailableItemPosition(position)

    console.log('placing item on ground', item, position)
    if (item == null) {
      throw new Error('cannot place null item')
    }
    if (position == null || position.x == null || position.y == null) {
      throw new Error('cannot place item with invalid position', position)
    }
    this.items.push({
      item,
      position,
      rendered: false,
    })
  }

  // given a position {x, y}, return the best available position to place an item
  // where there isn't already an item within 20 pixels radius
  // ideally it drops it exactly at the passed position
  // failing that, look for the nearest position, circling clockwise and outward until a good position is found
  getBestAvailableItemPosition(position) {
    if (position == null || position.x == null || position.y == null) {
      return null
    }
    const radius = 40
    const step = 10
    const maxRadius = 100
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

  removeItem(item) {
    console.log('removing item', item)
    const itemWrapper = this.items.find(itemWrapper => itemWrapper.item === item)
    if (itemWrapper == null) {
      throw new Error('cannot remove item that is not on the ground', item)
    }
    this.items = this.items.filter(i => i !== itemWrapper)
    this.itemsContainer.removeChild(itemWrapper.sprite)
  }

  renderItem(itemWrapper) {
    console.log('rendering item to ground', itemWrapper.item, itemWrapper.position)
    itemWrapper.sprite = new ItemLabel(itemWrapper)
    this.itemsContainer.addChild(itemWrapper.sprite)
    // todo: when they click the label, pick it up
  }
}

export default World
