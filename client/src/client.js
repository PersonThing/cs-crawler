import { Application, Assets } from 'pixi.js'
import { io } from 'socket.io-client'
import Player from '../../shared/player'
import PlayerControls from './player-controls'
import { generateSampleLevel } from '../../shared/level-builder.js'

// Generate or retrieve a unique identifier for the player
const playerId = localStorage.getItem('playerId') || generateUniqueId()
localStorage.setItem('playerId', playerId)

// Function to generate a unique identifier
function generateUniqueId() {
  return 'player-' + Math.random().toString(36).substr(2, 9)
}

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
  // Render the level
  const level = generateSampleLevel()
  level.render(app.stage)

  // Listen for player joining
  socket.on('playerJoined', (player) => {
    if (player.id !== socket.id && !remotePlayers[player.id]) {
      createRemotePlayer(player.id, player)
    }
  })

  // Listen for player movement
  socket.on('playerSetTarget', (player) => {
    if (remotePlayers[player.id]) {
      remotePlayers[player.id].setTarget(player.targetX, player.targetY)
    }
  })

  // Listen for player disconnect
  socket.on('playerDisconnected', (playerId) => {
    if (remotePlayers[playerId]) {
      removeRemotePlayer(playerId)
    }
  })

  // client-side game loop
  // currently server is handling 100% of game loop, physics, etc
  // we could add a client-side game loop to smooth things out, but for now not bothering
  // server side ticking
  app.ticker.add((time) => {
    if (localPlayer) {
      localPlayer.onTick(time.deltaMS)
    }

    // update positions of all players
    Object.values(remotePlayers).forEach((player) => {
      player.onTick(time.deltaMS)
    })
  })

  // receive state updates from server @ 30fps
  // server is authoritative, if there is one
  socket.on('updateState', (state) => {
    // create local player if necessary
    if (!localPlayer && state.players[socket.id]) {
      createLocalPlayer(state.players[socket.id])
    }

    // remove any remote players that aren't in server
    Object.keys(remotePlayers).forEach((id) => {
      if (!state.players[id]) {
        removeRemotePlayer(id)
      }
    })

    // add any remote players that aren't in local
    Object.entries(state.players).forEach(([id, player]) => {
      if (id !== socket.id && !remotePlayers[id]) {
        createRemotePlayer(id, player)
      }
    })

    // sync player state to server
    Object.entries(state.players).forEach(([id, player]) => {
      if (id === socket.id && localPlayer) {
        localPlayer.syncWithServer(player)
      } else if (remotePlayers[id]) {
        remotePlayers[id].syncWithServer(player)
      }
    })
  })
}

const textures = {
  playerBase: '/assets/player_base.png'
}

const createRemotePlayer = (id, playerData) => {
  const remotePlayer = new Player(id, playerData.name, textures.playerBase, app.stage)
  remotePlayer.setPosition(playerData.x, playerData.y)
  remotePlayer.setRotation(playerData.rotation)
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

  localPlayer = new Player(socket.id, playerData.name, textures.playerBase, app.stage, true)
  localPlayer.setPosition(playerData.x, playerData.y)
  localPlayer.setRotation(playerData.rotation)
  new PlayerControls(localPlayer, app, socket)
}

init()