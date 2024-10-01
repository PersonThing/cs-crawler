import { Application, Assets } from 'pixi.js'
import { io } from 'socket.io-client'
import Player from '../../shared/player'
import PlayerControls from './player-controls'

// Generate or retrieve a unique identifier for the player
// const playerId = localStorage.getItem('playerId') || generateUniqueId()
// localStorage.setItem('playerId', playerId)
const playerId = generateUniqueId()

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

const playerTexture = await Assets.load('https://pixijs.com/assets/bunny.png')
const remotePlayers = {}
let localPlayer = null

const createLocalPlayer = (playerData) => {
  if (localPlayer != null) {
    localPlayer.removeFromStage(app.stage)
  }

  localPlayer = new Player(socket.id, playerData.color, playerTexture, true)
  localPlayer.setPosition(playerData.x, playerData.y)
  new PlayerControls(localPlayer, app, socket)
  app.stage.addChild(localPlayer.spriteContainer)
}

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
  // log list of player ids
  console.log('Players:', Object.keys(state.players).length)

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

const createRemotePlayer = (id, player) => {
  const remotePlayer = new Player(id, player.color, playerTexture)
  remotePlayer.setPosition(player.x, player.y)
  remotePlayer.spriteContainer.tint = player.color
  remotePlayers[id] = remotePlayer
  app.stage.addChild(remotePlayer.spriteContainer)
}

const removeRemotePlayer = (id) => {
  remotePlayers[id].removeFromStage(app.stage)
  delete remotePlayers[id]
}
