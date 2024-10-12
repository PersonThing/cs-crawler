import * as PIXI from 'pixi.js'
import LevelSprite from './level-sprite'
import { MinimapScale } from '../../shared/constants.js'

class Minimap extends PIXI.Sprite {
  constructor(level, maskWidth, maskHeight, centered) {
    super()

    this.level = level
    this.maskWidth = maskWidth
    this.maskHeight = maskHeight

    this.mapScale = MinimapScale
    this.remotePlayerMarkers = {}

    this.x = 0
    this.y = 0
    this.anchor.set(0.5)

    this.map = new LevelSprite(this.level, this.mapScale, true)
    this.map.sortableChildren = true
    this.addChild(this.map)

    this.mapMask = new PIXI.Graphics()
      .rect(0, 0, maskWidth, maskHeight)
      .fill(0xff0000)
    this.mapMask.x = -maskWidth / 2
    this.mapMask.y = -maskHeight / 2
    // this.mapMask.visible = false
    this.addChild(this.mapMask)
    this.map.mask = this.mapMask
    this.setCentered(centered)
  }

  toggleCentered() {
    this.setCentered(!this.centered)
  }

  setCentered(isCentered) {
    this.centered = isCentered
    this.map.mask = this.centered ? null : this.mapMask
    this.mapMask.visible = !this.centered
    this.map.tileContainer.alpha = this.centered ? 0.25 : 0.5
  }

  onTick(localPlayer, remotePlayers, screenWidth, screenHeight) {
    if (this.centered) {
      this.x = screenWidth / 2
      this.y = screenHeight / 2
    } else {
      this.x = screenWidth - this.maskWidth / 2
      this.y = 100
    }

    if (localPlayer != null) {
      // update map
      const maxMapWidth = this.centered ? screenWidth : this.maskWidth
      const maxMapHeight = this.centered ? screenHeight : this.maskHeight
      this.map.onTick(localPlayer, maxMapWidth, maxMapHeight)

      // update local player dot
      if (!this.localPlayerMarker) {
        this.localPlayerMarker = this.makePlayerMarker('You', 0xffffff)
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
            this.remotePlayerMarkers[id] = this.makePlayerMarker(
              player.label,
              0x00ff00
            )
          }
          this.remotePlayerMarkers[id].x = player.x * this.mapScale
          this.remotePlayerMarkers[id].y = player.y * this.mapScale
        })
        Object.keys(this.remotePlayerMarkers)
          .filter((id) => !remotePlayers[id])
          .forEach((id) => {
            this.map.removeChild(this.remotePlayerMarkers[id])
            delete this.remotePlayerMarkers[id]
          })
      }
    }
  }

  makePlayerMarker(name, color) {
    const container = new PIXI.Container()
    container.zIndex = 10

    const dot = new PIXI.Graphics().circle(0, 0, 3).fill(color)
    container.addChild(dot)

    const text = new PIXI.Text({
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
