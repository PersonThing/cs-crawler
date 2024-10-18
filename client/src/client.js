import { Application } from 'pixi.js'
import { generateSampleLevel } from '../../shared/level-builder.js'
import { Textures } from './textures.js'
import Hud from './hud.js'
import Minimap from './minimap.js'
import Pather from '../../shared/pather'
import Player from '../../shared/player'
import PlayerControls from './player-controls'
import preloadTextures from './preload-textures.js'
import World from '../../shared/world.js'
import socket from './socket.js'

const remotePlayers = {}
let localPlayer = null
let playerControls = null

// Create pixi.js app
const app = new Application()
await app.init({ background: 0x000000, resizeTo: window })
document.body.appendChild(app.canvas)

const levelConfig = generateSampleLevel()
const world = new World(app, levelConfig)
app.stage.addChild(world)

const pather = new Pather(levelConfig)
const minimap = new Minimap(levelConfig, false)
app.stage.addChild(minimap)

let hud
const init = async () => {
  // Client-side game loop - server has authority, but client predicts and corrects
  app.ticker.maxFPS = 120
  app.ticker.add((time) => {
    world.onTick(time, localPlayer, app.screen.width, app.screen.height)
    minimap.onTick(
      localPlayer,
      remotePlayers,
      app.screen.width,
      app.screen.height
    )
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

const createPlayer = (socketId, playerData, color = 0xffffff) => {
  const player = new Player(
    socketId,
    playerData.label,
    pather,
    Textures.player.base,
    world,
    color
  )
  player.setPosition(playerData.x, playerData.y)
  player.setTarget(playerData.target)
  world.addPlayer(player)
  return player
}

const createRemotePlayer = (socketId, playerData) => {
  const remotePlayer = createPlayer(socketId, playerData, 0x00ff00)
  remotePlayers[socketId] = remotePlayer
}

const removeRemotePlayer = (socketId) => {
  remotePlayers[socketId].onDestroy()
  world.removePlayer(remotePlayers[socketId])
  delete remotePlayers[socketId]
}

const createLocalPlayer = (playerData) => {
  if (localPlayer != null) {
    localPlayer.onDestroy()
    world.removePlayer(localPlayer)
  }

  playerData.label = `You`
  localPlayer = createPlayer(socket.id, playerData, 0xffffff)
  
  hud = new Hud(app, localPlayer, app.screen.width, app.screen.height)
  app.stage.addChild(hud)

  playerControls = new PlayerControls(
    app,
    world,
    localPlayer,
    minimap,
    hud
  )
}

preloadTextures().then(init)
