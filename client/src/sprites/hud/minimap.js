import { MINIMAP_SCALE, MINIMAP_WIDTH, MINIMAP_HEIGHT, HUD_BORDER_COLOR, HUD_FILL_COLOR } from '#shared/config/constants.js'
import { Sprite, Container, Graphics, Text } from 'pixi.js'
import LevelSprite from '../level-sprite.js'
import screenSizeStore from '../../stores/screen-size-store.js'
import playerSpriteStore from '../../stores/player-sprite-store.js'

class Minimap extends Sprite {
  constructor(level, centered) {
    super()

    this.level = level

    this.mapScale = MINIMAP_SCALE
    this.remotePlayerMarkers = {}

    this.x = 0
    this.y = 0
    this.anchor.set(0.5)

    this.createLevelSprite()

    this.mapMask = new Graphics().rect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT).fill(0xff0000)
    this.mapMask.x = -MINIMAP_WIDTH / 2
    this.mapMask.y = -MINIMAP_HEIGHT / 2
    this.mapMask.visible = false
    this.addChild(this.mapMask)
    this.map.mask = this.mapMask
    this.setCentered(centered)
  }

  zoomIn() {
    this.mapScale = Math.min(this.mapScale + 0.05, 2)
    this.map.setScale(this.mapScale)
  }

  zoomOut() {
    this.mapScale = Math.max(this.mapScale - 0.05, 0.1)
    this.map.setScale(this.mapScale)
  }

  createLevelSprite() {
    if (this.map != null) {
      this.removeChild(this.map)
      this.localPlayerMarker = null
      this.remotePlayerMarkers = {}
      this.map.destroy()
    }
    this.map = new LevelSprite(this.level, this.mapScale, true)
    this.map.sortableChildren = true
    this.addChild(this.map)
    this.setCentered(this.centered) // re-apply centered state to set mask and alpha
  }

  toggleCentered() {
    this.setCentered(!this.centered)
  }

  setCentered(isCentered) {
    this.centered = isCentered
    this.map.mask = this.centered ? null : this.mapMask
    if (this.mapMask) this.mapMask.visible = !this.centered
    this.map.tileContainer.alpha = this.centered ? 0.25 : 0.5

    this.removeBorder()
    if (!this.centered) {
      this.drawBorder()
    }
  }

  drawBorder() {
    this.border = new Graphics().rect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT).fill(HUD_FILL_COLOR).stroke({
      color: HUD_BORDER_COLOR,
      width: 4,
    })
    this.border.alpha = 0.5
    this.border.x = -MINIMAP_WIDTH / 2
    this.border.y = -MINIMAP_HEIGHT / 2
    this.addChild(this.border)
  }

  removeBorder() {
    if (this.border) {
      this.removeChild(this.border)
      this.border.destroy()
      this.border = null
    }
  }

  tick() {
    const localPlayer = playerSpriteStore.getLocalPlayer()
    if (localPlayer == null) return

    // update map
    const { width, height } = screenSizeStore.get()
    if (this.centered) {
      this.x = width / 2
      this.y = height / 2
    } else {
      this.x = width - MINIMAP_WIDTH / 2
      this.y = MINIMAP_HEIGHT / 2
    }
    const maxMapWidth = this.centered ? width : MINIMAP_WIDTH
    const maxMapHeight = this.centered ? height : MINIMAP_HEIGHT
    this.map.tick(maxMapWidth, maxMapHeight)

    // update local player dot
    if (!this.localPlayerMarker) {
      this.localPlayerMarker = this.makePlayerMarker('You', 0x00aaff, localPlayer.x, localPlayer.y)
    }
    this.localPlayerMarker.x = localPlayer.x * this.mapScale
    this.localPlayerMarker.y = localPlayer.y * this.mapScale
    this.localPlayerMarker.visible = !this.centered

    // center map on player
    this.map.x = -this.localPlayerMarker.x + this.width / 2
    this.map.y = -this.localPlayerMarker.y + this.height / 2

    // update other player dots
    const connectedPlayerStates = playerSpriteStore
      .get()
      .filter(p => !p.isLocalPlayer)
      .map(p => p.state)

    // add / update dots for connected players
    if (connectedPlayerStates.length) {
      connectedPlayerStates.forEach(player => {
        if (!this.remotePlayerMarkers[player.playerId]) {
          this.remotePlayerMarkers[player.playerId] = this.makePlayerMarker(player.username, 0x00ff00)
        }
        this.remotePlayerMarkers[player.playerId].x = player.x * this.mapScale
        this.remotePlayerMarkers[player.playerId].y = player.y * this.mapScale
      })
    }

    // remove dots for disconnected players
    const connectedPlayerIds = connectedPlayerStates.map(p => p.playerId)
    Object.keys(this.remotePlayerMarkers)
      .filter(id => !connectedPlayerIds.includes(id))
      .forEach(id => {
        console.log('removing player in minimap', id)
        this.map.removeChild(this.remotePlayerMarkers[id])
        delete this.remotePlayerMarkers[id]
      })
  }

  makePlayerMarker(name, color) {
    const container = new Container()
    container.zIndex = 10

    const dot = new Graphics().circle(0, 0, 3).fill(color)
    container.addChild(dot)

    const text = new Text({
      text: name,
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: color,
        align: 'center',
        dropShadow: true,
        dropShadowDistance: 1,
        dropShadowBlur: 1,
        dropShadowAlpha: 1,
      },
    })
    text.anchor.set(0.5, 1.5)
    container.addChild(text)

    this.map.addChild(container)
    return container
  }
}

export default Minimap
