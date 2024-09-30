import { Application, Assets } from 'pixi.js'
import { io } from 'socket.io-client'
import Player from '../../shared/player'
import PlayerControls from './player-controls'

// Generate or retrieve a unique identifier for the player
const playerId = localStorage.getItem('playerId') || generateUniqueId()
localStorage.setItem('playerId', playerId)

// Function to generate a unique identifier
function generateUniqueId() {
  return 'player-' + Math.random().toString(36).substr(2, 9)
}

// Create socket connection
const socket = io('http://localhost:3000', {
  query: { playerId }, // Send playerId as a query parameter, no validation for now
})

// Create pixi.js app
const app = new Application()
await app.init({ background: '#1099bb', resizeTo: window })
document.body.appendChild(app.canvas)

const playerTexture = await Assets.load('https://pixijs.com/assets/bunny.png')
const remotePlayers = {}
let localPlayer = null
let playerControls = null

;(() => {
  // Listen for init event with players from server
  socket.emit('requestInit') // Request initial player data

  socket.on('init', (data) => {
    const localPlayerData = data.players[socket.id]

    // Create the local player
    localPlayer = new Player(socket.id, localPlayerData.color, playerTexture)
    localPlayer.setPosition(localPlayerData.x, localPlayerData.y)
    playerControls = new PlayerControls(localPlayer, app, socket)
    app.stage.addChild(localPlayer.sprite)

    // Create remote players
    Object.entries(remotePlayers).forEach(([id, player]) => {
      app.stage.removeChild(player.sprite)
      delete remotePlayers[id]
    })
    Object.entries(data.players).forEach(([id, player]) => {
      if (player.id !== socket.id) {
        createRemotePlayer(id, player)
      }
    })
  })

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
      app.stage.removeChild(remotePlayers[playerId].sprite)
      delete remotePlayers[playerId]
    }
  })

  socket.on('updatePlayers', (players) => {
    Object.entries(players).forEach(([id, player]) => {
      if (id === socket.id && localPlayer) {
        localPlayer.syncWithServer(player)
      } else if (remotePlayers[id]) {
        remotePlayers[id].syncWithServer(player)
      }
    })
  })

  // currently server is handling 100% of game loop, physics, etc
  // we could add a client-side game loop to smooth things out, but for now not bothering
  // server side ticking
  // app.ticker.add((time) => {
  // })
})()

const createRemotePlayer = (id, player) => {
  const remotePlayer = new Player(id, player.color, playerTexture)
  remotePlayer.setPosition(player.x, player.y)
  remotePlayer.sprite.tint = player.color
  remotePlayers[id] = remotePlayer
  app.stage.addChild(remotePlayer.sprite)
}
