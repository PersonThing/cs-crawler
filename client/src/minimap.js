import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { GrayscaleFilter } from 'pixi-filters/grayscale'
import LevelSprite from './level-sprite'

class Minimap {
  constructor(app, level, width, height, scale) {
    this.level = level
    this.app = app
    this.width = width
    this.height = height
    this.scale = scale
    this.remotePlayerMarkers = {}

    this.container = new Container()
    this.mask = new Graphics()
    this.mask.rect(0, 0, this.width, this.height)
    this.mask.fill(0xff0000)
    this.container.addChild(this.mask)
    this.map = new LevelSprite(this.level, this.scale, false, [
      new GrayscaleFilter(),
    ])
    this.container.addChild(this.map)
    this.container.mask = this.mask
    this.map.sortableChildren = true
    this.map.alpha = 0.5
    app.stage.addChild(this.container)
  }

  onTick(localPlayer, remotePlayers) {
    this.container.x = this.app.screen.width - this.width
    this.container.y = 0

    if (localPlayer != null) {
      // update map
      this.map.onTick(localPlayer, this.width, this.height)

      // update local player dot
      if (!this.localPlayerMarker) {
        this.localPlayerMarker = this.makePlayerMarker('You', 0xffffff)
      }
      this.localPlayerMarker.x = localPlayer.x * this.scale
      this.localPlayerMarker.y = localPlayer.y * this.scale

      // center map on player
      this.map.x = -this.localPlayerMarker.x + this.width / 2
      this.map.y = -this.localPlayerMarker.y + this.height / 2

      // update remote player dots
      if (remotePlayers != null) {
        Object.entries(remotePlayers).forEach(([id, player]) => {
          if (!this.remotePlayerMarkers[id]) {
            this.remotePlayerMarkers[id] = this.makePlayerMarker(player.name, 0x00ff00)
          }
          this.remotePlayerMarkers[id].x = player.x * this.scale
          this.remotePlayerMarkers[id].y = player.y * this.scale
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
    const container = new Container()
    container.zIndex = 10
    
    const dot = new Graphics().circle(0, 0, 5).fill(color)
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
