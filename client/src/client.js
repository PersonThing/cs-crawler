import { Application, Container, Graphics, BlurFilter, Sprite, Rectangle } from 'pixi.js'
import { generateSampleLevel } from '../../shared/level-builder.js'
import { io } from 'socket.io-client'
import { Textures, preloadTextures } from '../../shared/textures.js'
import Player from '../../shared/player'
import PlayerControls from './player-controls'
import Pather from '../../shared/pather'
import Minimap from './minimap.js'
import LevelSprite from './level-sprite.js'

const centerViewOnPlayer = true
const remotePlayers = {}
let localPlayer = null
let playerControls = null

const playerId =
  localStorage.getItem('playerId') ||
  'player-' + Math.random().toString(36).substr(2, 9)
localStorage.setItem('playerId', playerId)

// Create socket connection
const socket = io(`http://${window.location.hostname}:3000`, {
  query: { playerId }, // Send playerId as a query parameter, no validation for now
})

// Create pixi.js app
const app = new Application()
await app.init({ background: '#000000', resizeTo: window })
document.body.appendChild(app.canvas)

const world = new Container()
world.levelContainer = new Container()
world.addChild(world.levelContainer)
app.stage.addChild(world)

const levelConfig = generateSampleLevel()
const levelSprite = new LevelSprite(levelConfig, 1, false)
world.addChild(levelSprite)
const pather = new Pather(levelConfig)

const minimap = new Minimap(app, levelConfig, 300, 200, 0.25)

const init = async () => {
  // light radius
  world.mask = createLightRadiusMask()

  // Client-side game loop - server has authority, but client predicts and corrects
  app.ticker.maxFPS = 120
  app.ticker.add((time) => {
    levelSprite.onTick(
      localPlayer,
      app.screen.width,
      app.screen.height
    )
    
    if (localPlayer) {
      localPlayer.onTick(time.deltaMS)
    }
    Object.values(remotePlayers).forEach((player) => {
      player.onTick(time.deltaMS)
    })

    // shift the world to keep player centered
    if (localPlayer && centerViewOnPlayer) {
      world.x = -localPlayer.x + app.screen.width / 2
      world.y = -localPlayer.y + app.screen.height / 2
      world.mask.x = localPlayer.x
      world.mask.y = localPlayer.y
    }

    // render minimap
    minimap.onTick(localPlayer, remotePlayers)
  })

  socket.on('updateState', (state) => {
    Object.keys(remotePlayers).forEach((socketId) => {
      if (!state.players[socketId]) {
        // remote players that has disconnected
        removeRemotePlayer(socketId)
      }
    })
    Object.entries(state.players).forEach(([socketId, player]) => {
      if (socketId === socket.id) {
        // local player
        if (!localPlayer) {
          createLocalPlayer(state.players[socket.id])
        } else {
          localPlayer.syncWithServer(state.players[socket.id])
        }
      } else if (!remotePlayers[socketId]) {
        // new remote player
        createRemotePlayer(socketId, player)
      } else {
        // existing remote player
        remotePlayers[socketId].syncWithServer(player)
      }
    })
  })
}

const createPlayer = (socketId, playerData) => {
  const player = new Player(
    socketId,
    playerData.name,
    pather,
    Textures.PlayerBase,
    world
  )
  player.setPosition(playerData.x, playerData.y)
  player.setTarget(playerData.target)
  return player
}

const createRemotePlayer = (socketId, playerData) => {
  const remotePlayer = createPlayer(socketId, playerData)
  remotePlayers[socketId] = remotePlayer
}

const removeRemotePlayer = (socketId) => {
  remotePlayers[socketId].onDestroy()
  delete remotePlayers[socketId]
}

const createLocalPlayer = (playerData) => {
  if (localPlayer != null) {
    localPlayer.onDestroy()
  }

  playerData.name = `${playerData.name} (You)`
  localPlayer = createPlayer(socket.id, playerData)
  playerControls = new PlayerControls(app, world, localPlayer, socket, centerViewOnPlayer)
}

const createLightRadiusMask = () => {
  const radius = 350
  const blurSize = 100
  let circle = new Graphics().circle(radius + blurSize, radius + blurSize, radius).fill(0xff0000)
  circle.alpha = 1
  const blurFilter = new BlurFilter()
  blurFilter.blur = blurSize
  circle.filters = [blurFilter]
  const bounds = new Rectangle(0, 0, (radius + blurSize) * 2, (radius + blurSize) * 2)
  const texture = app.renderer.generateTexture({
    target: circle,
    resolution: 1,
    frame: bounds
  })
  const focus = new Sprite(texture)
  focus.anchor.set(0.5, 0.5)
  world.addChild(focus)
  return focus
}

preloadTextures().then(init)
