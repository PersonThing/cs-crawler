import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import Pather from '../../shared/pather.js'
import Player from '../../shared/player.js'

// import { players, enemies, groundItems } from '../../shared/game-state.js'

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

// Load the level and pather
let level = null
let pather = null

io.on('connection', socket => {
  const playerId = socket.handshake.query.playerId
  let player = players[playerId]

  // broadcast new player to all other players
  socket.on('createPlayer', () => {
    player = players[playerId]
    if (player) {
      // Player reconnecting - update their socketId and mark as connected
      player.socketId = socket.id
      player.isConnected = true
    } else {
      // New player - create from scratch
      const label = playerId
      console.log('Creating player: ' + playerId, socket.id)
      player = new Player(socket.id, label, playerId, pather)
      player.setPosition(level.start.x, level.start.y)
      player.isConnected = true
      players[playerId] = player
    }
    socket.broadcast.emit('playerJoined', player.serialize())
  })

  // create a level, or ask the client to create it
  // ** uses client to do so since we need client-side canvas (for now)
  socket.on('setLevel', levelConfig => {
    level = levelConfig
    pather = new Pather(level)
    io.emit('setLevel', level)
  })
  if (level == null) {
    socket.emit('requestLevel')
  } else {
    socket.emit('setLevel', level)
  }

  // Handle player movement
  socket.on('setTarget', target => {
    if (player && player.isConnected) {
      player.setTarget(target)
    }
  })

  // temp: naively allow client to set entire inventory contents
  socket.on('inventoryChanged', content => {
    if (player && player.isConnected) {
      player.inventory.deserialize(content)
    }
    io.emit('playerInventoryChanged', {
      playerId,
      content,
    })
  })

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + playerId, socket.id)
    if (player) {
      // Mark player as disconnected but keep their data
      player.isConnected = false
      player.socketId = null
    }
    // Notify others using the playerId for consistency
    io.emit('playerDisconnected', playerId)
  })
})

// game loop
// client has its own game loop
// server is authoritative, sending state to overwrite client
const fps = 30
const deltaMS = 1000 / fps
setInterval(() => {
  // Only update connected players
  const connectedPlayersData = {}

  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected) {
      player.onTick(deltaMS)
      connectedPlayersData[playerId] = player.serialize()
    }
  }

  io.emit('updateState', {
    players: connectedPlayersData,
  })
}, deltaMS)

// Start the server
const PORT = process.env.PORT || 3000
// listen on PORT on any IP address
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
