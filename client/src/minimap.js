import { MINIMAP_SCALE, MINIMAP_WIDTH, MINIMAP_HEIGHT, HUD_BORDER_COLOR, HUD_FILL_COLOR } from '../../shared/constants.js'
import { Sprite, Container, Graphics, Text } from 'pixi.js'
import LevelSprite from './level-sprite'
import screenSizeStore from './screen-size-store.js'
import localPlayerStore from '../../shared/state/local-player.js'

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

    // draw a border around minimap
    const border = new Graphics()
      .roundRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT, 6)
      .fill(HUD_FILL_COLOR)
      .stroke({
        color: HUD_BORDER_COLOR,
        width: 4,
      })
    border.alpha = 0.5
    border.x = -MINIMAP_WIDTH / 2
    border.y = -MINIMAP_HEIGHT / 2
    this.addChild(border)
  }

  // bug with zoom in / out breaking the map.. not sure why
  zoomIn() {
    this.mapScale = Math.min(this.mapScale + 0.05, 2)
    this.createLevelSprite()
  }

  zoomOut() {
    this.mapScale = Math.max(this.mapScale - 0.05, 0.1)
    this.createLevelSprite()
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
  }

  onTick(remotePlayers) {
    const localPlayer = localPlayerStore.get()

    if (localPlayer != null) {
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
      this.map.onTick(maxMapWidth, maxMapHeight)

      // update local player dot
      if (!this.localPlayerMarker) {
        this.localPlayerMarker = this.makePlayerMarker('You', 0x00aaff)
      }
      this.localPlayerMarker.x = localPlayer.x * this.mapScale
      this.localPlayerMarker.y = localPlayer.y * this.mapScale
      this.localPlayerMarker.visible = !this.centered

      // center map on player
      this.map.x = -this.localPlayerMarker.x + this.width / 2
      this.map.y = -this.localPlayerMarker.y + this.height / 2

      // update remote player dots
      if (remotePlayers != null) {
        Object.entries(remotePlayers).forEach(([id, player]) => {
          if (!this.remotePlayerMarkers[id]) {
            this.remotePlayerMarkers[id] = this.makePlayerMarker(player.label, 0x00ff00)
          }
          this.remotePlayerMarkers[id].x = player.x * this.mapScale
          this.remotePlayerMarkers[id].y = player.y * this.mapScale
        })
        Object.keys(this.remotePlayerMarkers)
          .filter(id => !remotePlayers[id])
          .forEach(id => {
            this.map.removeChild(this.remotePlayerMarkers[id])
            delete this.remotePlayerMarkers[id]
          })
      }
    }
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
