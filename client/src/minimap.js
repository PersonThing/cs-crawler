import * as PIXI from 'pixi.js'
import { GrayscaleFilter } from 'pixi-filters/grayscale'
import LevelSprite from './level-sprite'

class Minimap extends PIXI.Sprite {
  constructor(level) {
    super()

    this.level = level
    this.mapScale = 0.3
    this.remotePlayerMarkers = {}

    this.x = 0
    this.y = 0
    this.anchor.set(0.5)
    
    this.map = new LevelSprite(this.level, this.mapScale, false, [
      new GrayscaleFilter(),
    ])
    this.map.sortableChildren = true
    this.map.tileContainer.alpha = 0.5
    this.addChild(this.map)

    this.mask = new PIXI.Graphics().rect(0, 0, 200, 200).fill(0xff0000)
    this.mask.x = -100
    this.mask.y = -100
    this.addChild(this.mask)
    this.map.mask = this.mask
  }

  onTick(localPlayer, remotePlayers, screenWidth, screenHeight) {
    // this.x = screenWidth / 2
    // this.y = screenHeight / 2
    this.x = screenWidth - 100
    this.y = 100

    if (localPlayer != null) {
      // update map
      this.map.onTick(localPlayer, screenWidth, screenHeight)

      // update local player dot
      if (!this.localPlayerMarker) {
        this.localPlayerMarker = this.makePlayerMarker('You', 0xffffff)
      }
      this.localPlayerMarker.x = localPlayer.x * this.mapScale
      this.localPlayerMarker.y = localPlayer.y * this.mapScale

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
