import { fileURLToPath } from 'url'
import { getRandomColor } from '../../shared/utils.js'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import path from 'path'
import Player from '../../shared/player.js'
import fs from 'fs'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Allow requests from your client
    methods: ['GET', 'POST'],
    credentials: true, // If you need to allow cookies or HTTP authentication
  },
})

// Serve static files from the client dist directory
app.use(express.static('../client/dist'))

const players = {} // Object to store player information
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const playerStatesFile = path.join(__dirname, 'player-states.json')

// load player state from JSON
let playerStates = {}
if (fs.existsSync(playerStatesFile)) {
  playerStates = JSON.parse(fs.readFileSync(playerStatesFile))
}

io.on('connection', (socket) => {
  const playerId = socket.handshake.query.playerId
  console.log('Player connected: ' + playerId)

  // retrieve or create a new player state
  let playerState = playerStates[playerId]
  if (playerState == null) {
    const x = 50 * (Object.keys(players).length+1)
    const y = 50
    playerState = {
      color: getRandomColor(),
      x,
      y,
      targetX: x,
      targetY: y
    }
  }

  // Create a new player when they connect
  // set x position from the size of the players object
  players[socket.id] = new Player(socket.id, playerState.color, null)
  players[socket.id].setPosition(playerState.x, playerState.y)
  players[socket.id].setTarget(playerState.x, playerState.y)

  // Send initial player data to the new player
  socket.on('requestInit', () => {
    socket.emit('init', { players })
  })

  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', players[socket.id])

  // Handle player movement
  socket.on('playerSetTarget', (data) => {
    if (players[socket.id]) {
      players[socket.id].targetX = data.targetX
      players[socket.id].targetY = data.targetY
      // Broadcast the updated position to all clients
      io.emit('playerSetTarget', players[socket.id])
    }
  })

  // server should be responsible for game loop
  // Update player positions at 30fps (33ms)

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id)
    const player = players[socket.id]
    playerStates[playerId] = {
      color: player.color,
      x: player.x,
      y: player.y,
      targetX: player.targetX,
      targetY: player.targetY
    }

    delete players[socket.id]
    io.emit('playerDisconnected', socket.id) // Notify others

    fs.writeFileSync(playerStatesFile, JSON.stringify(playerStates, null, 2))
  })
})


setInterval(() => {
  // get delta time
  for (const id in players) {
    const player = players[id]
    player.onTick(16)
  }
  io.emit('updatePlayers', players)
}, 16)

// Start the server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
