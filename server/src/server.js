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

// store player state in memory
const playerStates = {}

// Load the level and pather
let level = null
let pather = null
// new Pather(level)

io.on('connection', (socket) => {
  const playerId = socket.handshake.query.playerId
  console.log('Player connected: ' + playerId, socket.id)

  // create a level (uses first client to do so since we need client-side canvas (for now))
  if (level == null) {
    console.log('requesting level')
    socket.emit('requestCreateLevel')
  }
  socket.on('setLevel', (levelConfig) => {
    console.log('setLevel', levelConfig)
    level = levelConfig
    pather = new Pather(level)
    io.emit('setLevel', level)
  })

  socket.on('createPlayer', () => {
    // try to get playerState from memory, or create new one
    let playerState = playerStates[playerId]
    if (playerState == null) {
      playerState = {
        x: level.start.x,
        y: level.start.y,
        target: null,
      }
    }
    // Create a new player when they connect
    // set x position from the size of the players object
    players[socket.id] = new Player(socket.id, playerId, pather)
    players[socket.id].setPosition(playerState.x, playerState.y)
    players[socket.id].setTarget(playerState.target)

    // Broadcast new player to all other players
    socket.broadcast.emit('playerJoined', players[socket.id].serialize())
  })
  
  // Handle player movement
  socket.on('setTarget', (target) => {
    if (players[socket.id]) {
      players[socket.id].setTarget(target)
    }
  })

  // temp: naively allow client to set entire inventory contents
  socket.on('inventoryChanged', (content) => {
    if (players[socket.id]) {
      players[socket.id].inventory.deserialize(content)
    }
    io.emit('playerInventoryChanged', {
      playerId,
      content,
    })
  })

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + playerId, socket.id)

    // update player state in playerStates before removing them
    const player = players[socket.id]
    if (player != null) {
      playerStates[playerId] = {
        x: player.x,
        y: player.y,
        target: player.target,
      }
      
      delete players[socket.id]
    }
    io.emit('playerDisconnected', socket.id) // Notify others
  })
})

// game loop
// client has its own game loop
// server is authoritative, sending state to overwrite client
const fps = 30
const deltaMS = 1000 / fps
setInterval(() => {
  for (const id in players) {
    const player = players[id]
    player.onTick(deltaMS)
  }
  // convert players map to map of sync properties
  const playerData = Object.fromEntries(
    Object.entries(players).map(([id, player]) => [id, player.serialize()])
  )

  io.emit('updateState', {
    players: playerData,
  })
}, deltaMS)

// Start the server
const PORT = process.env.PORT || 3000
// listen on PORT on any IP address
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
