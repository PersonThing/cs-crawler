import { getRandomColor } from '../../shared/utils.js'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import Player from '../../shared/player.js'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    // make it allow requests from anywhere
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true, // If you need to allow cookies or HTTP authentication
  },
})

// Serve static files from the client dist directory
app.use(express.static('../client/dist'))

const players = {} // Object to store player information

io.on('connection', (socket) => {
  const playerId = socket.handshake.query.playerId
  console.log('Player connected: ' + playerId)

  // create a new player state (later we'll store these somewhere)
  const x = 50 * (Object.keys(players).length+1)
  const y = 50
  const playerState = {
    color: getRandomColor(),
    x,
    y,
    targetX: x,
    targetY: y
  }

  // Create a new player when they connect
  // set x position from the size of the players object
  players[socket.id] = new Player(socket.id, playerState.color, null)
  players[socket.id].setPosition(playerState.x, playerState.y)
  players[socket.id].setTarget(playerState.x, playerState.y)

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

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id)
    delete players[socket.id]
    io.emit('playerDisconnected', socket.id) // Notify others
  })
})

// game loop @ 30fps
// server tracks state and updates @ 30fps
// client has its own game loop and just syncs with server when it receives state, overwriting anything the client has done
const fps = 10
const deltaMS = 1000/fps
setInterval(() => {
  for (const id in players) {
    const player = players[id]
    player.onTick(deltaMS)
  }
  io.emit('updateState', {
    players
  })
}, deltaMS)

// Start the server
const PORT = process.env.PORT || 3000
// listen on PORT on any IP address
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
