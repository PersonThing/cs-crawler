import { Application } from 'pixi.js'
import { generateSampleLevel } from '../../shared/level-builder.js'
import { io } from 'socket.io-client'
import { Textures, preloadTextures } from '../../shared/textures.js'
import Player from '../../shared/player'
import PlayerControls from './player-controls'

const playerId = localStorage.getItem('playerId') || 'player-' + Math.random().toString(36).substr(2, 9)
localStorage.setItem('playerId', playerId)

// Create socket connection
const socket = io(`http://${window.location.hostname}:3000`, {
  query: { playerId }, // Send playerId as a query parameter, no validation for now
})

// Create pixi.js app
const app = new Application()
await app.init({ background: '#666666', resizeTo: window })
document.body.appendChild(app.canvas)

const remotePlayers = {}
let localPlayer = null

const init = async () => {
  // Load the level
  const level = generateSampleLevel(app.stage)

  // Client-side game loop - server has authority, but client predicts and corrects
  app.ticker.add((time) => {
    if (localPlayer) {
      localPlayer.onTick(time.deltaMS)
      // pass screen size to level so we know how many tiles around the current tile to render
      level.onTick(time.deltaMS, localPlayer, app.screen.width, app.screen.height)
    }
    Object.values(remotePlayers).forEach((player) => {
      player.onTick(time.deltaMS)
    })

    // shift the stage to keep player centered
    if (localPlayer) {
      app.stage.x = -localPlayer.x + app.screen.width / 2
      app.stage.y = -localPlayer.y + app.screen.height / 2
    }
  })

  // receive state updates from server @ 30fps
  // server is authoritative, if there is one
  socket.on('updateState', (state) => {
    // remove any remote players that aren't in server
    Object.keys(remotePlayers).forEach((id) => {
      if (!state.players[id]) {
        removeRemotePlayer(id)
      }
    })

    // add or update remote players
    Object.entries(state.players).forEach(([id, player]) => {
      if (id === socket.id) return // local player
      if (!remotePlayers[id]) {
        createRemotePlayer(id, player)
      } else {
        remotePlayers[id].syncWithServer(player)
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

const createPlayer = (id, playerData) => {
  const player = new Player(id, playerData.name, Textures.PlayerBase, app.stage)
  player.setPosition(playerData.x, playerData.y)
  player.setRotation(playerData.rotation)
  player.setTarget(playerData.targetX, playerData.targetY)
  return player
}

const createRemotePlayer = (id, playerData) => {
  const remotePlayer = createPlayer(id, playerData)
  remotePlayers[id] = remotePlayer
}

const removeRemotePlayer = (id) => {
  remotePlayers[id].onDestroy()
  delete remotePlayers[id]
}

const createLocalPlayer = (playerData) => {
  if (localPlayer != null) {
    localPlayer.onDestroy()
  }

  playerData.name = `${playerData.name} (You)`
  localPlayer = createPlayer(socket.id, playerData)
  new PlayerControls(localPlayer, app, socket)
}

preloadTextures().then(init)