import { Application, Graphics, BlurFilter, Sprite, SCALE_MODES, Rectangle } from 'pixi.js'
import { generateSampleLevel } from '../../shared/level-builder.js'
import { io } from 'socket.io-client'
import { Textures, preloadTextures } from '../../shared/textures.js'
import Player from '../../shared/player'
import PlayerControls from './player-controls'
import Pather from '../../shared/pather'
import Minimap from './minimap.js'

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

const level = generateSampleLevel(app.stage)
const pather = new Pather(level)

// const minimap = new Minimap(level, app.stage)

const init = async () => {
  // light radius
  const lightRadiusMask = createLightRadius()

  // Client-side game loop - server has authority, but client predicts and corrects
  app.ticker.maxFPS = 120
  app.ticker.add((time) => {
    if (localPlayer) {
      localPlayer.onTick(time.deltaMS)

      // pass screen size to level so we know how many tiles around the current tile to render
      level.onClientTick(
        time.deltaMS,
        localPlayer,
        app.screen.width,
        app.screen.height
      )
      level.container.mask = lightRadiusMask
    }
    Object.values(remotePlayers).forEach((player) => {
      player.onTick(time.deltaMS)
    })

    // shift the stage to keep player centered
    if (localPlayer && centerViewOnPlayer) {
      app.stage.x = -localPlayer.x + app.screen.width / 2
      app.stage.y = -localPlayer.y + app.screen.height / 2

      // move our mask to player position
      lightRadiusMask.x = localPlayer.x
      lightRadiusMask.y = localPlayer.y
    }

    // render a minimap
    // minimap.onTick(localPlayer)
  })

  // receive state updates from server @ 30fps
  // server is authoritative, if there is one
  socket.on('updateState', (state) => {
    // remove any remote players that aren't in server
    Object.keys(remotePlayers).forEach((socketId) => {
      if (!state.players[socketId]) {
        removeRemotePlayer(socketId)
      }
    })

    // add or update remote players
    Object.entries(state.players).forEach(([socketId, player]) => {
      if (socketId === socket.id) return // local player
      if (!remotePlayers[socketId]) {
        createRemotePlayer(socketId, player)
      } else {
        remotePlayers[socketId].syncWithServer(player)
      }
    })

    // create or update local player
    if (state.players[socket.id]) {
      if (!localPlayer) {
        createLocalPlayer(state.players[socket.id])
      } else {
        localPlayer.syncWithServer(state.players[socket.id])
      }
    }
  })
}

const createPlayer = (socketId, playerData) => {
  const player = new Player(
    socketId,
    playerData.name,
    pather,
    Textures.PlayerBase,
    app.stage
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
  playerControls = new PlayerControls(localPlayer, app, socket, centerViewOnPlayer)
}

const createLightRadius = () => {
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
  app.stage.addChild(focus)
  return focus
}

preloadTextures().then(init)
