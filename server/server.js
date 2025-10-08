import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'

const FPS = 20
const SERVER_TICK_RATE = 1000 / FPS
const PORT = process.env.PORT || 3000

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
let worldItems = [] // Array to store items on the ground

// Load the level and pather
let level = null
let pather = null

let lastUpdate = Date.now();
function tick() {
  const now = Date.now();
  const deltaMS = now - lastUpdate; // Time elapsed since last tick
  lastUpdate = now;

  // Only update connected players
  const connectedPlayersData = {}

  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected) {
      player.onTick({ deltaMS })
      connectedPlayersData[playerId] = player.serialize()
    }
  }

  io.emit('serverState', {
    players: connectedPlayersData,
    worldItems: worldItems,
  })
}
setInterval(tick, SERVER_TICK_RATE)

// handle socket communication with players
io.on('connection', socket => {
  let username = socket.handshake.query.username
  const playerId = socket.handshake.query.playerId
  let player = players[playerId]

  console.log('Player connected: ' + username, playerId, Object.keys(players))

  const initThisPlayer = () => {
    console.log('Initializing player ' + username)
    if (player == null) {
      console.log('Player does not exist, creating new player for ' + username)
      player = new PlayerState({ username, playerId, pather })
      player.setPosition(level.start.x, level.start.y)
      player.isConnected = true
      players[playerId] = player
    }
    socket.emit('init', {
      level,
      player: player.serialize(),
    })
  }

  if (player) {
    // Player reconnecting
    console.log('player reconnecting', username)
    player.isConnected = true
    initThisPlayer()
  } else {
    // New player
    // if we have a level, we can init them right away
    if (level != null) {
      initThisPlayer()
    } else {
      // otherwise, we have to request a level from client
      // server.requestLevel -> client.generateLevel -> server.setLevel -> server.initThisPlayer
      // level not created yet, wait for client to create it
      socket.emit('requestLevel')
    }
  }

  // create a level, or ask the client to create it
  // ** uses client to do so since we need client-side canvas (for now)
  socket.on('setLevel', levelConfig => {
    level = levelConfig
    pather = new Pather(level)
    initThisPlayer()
  })

  socket.on('setUsername', username => {
    username = username
    console.log('username set for player ' + playerId + ': ' + username)
    if (player) {
      player.username = username
    }
  })

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
    // tell other players our inv changed
    socket.broadcast.emit('playerInventoryChanged', {
      playerId,
      content,
    })
  })

  socket.on('worldItemPlaced', itemWrapper => {
    // validate items
    if (itemWrapper.item == null || itemWrapper.position == null) {
      console.log('Invalid itemWrapper received, ignoring', itemWrapper)
      return
    }
    worldItems.push(itemWrapper)
    socket.broadcast.emit('worldItemPlaced', itemWrapper)
  })

  socket.on('requestCurrentWorldItems', () => {
    socket.emit('currentWorldItems', worldItems)
  })

  socket.on('worldItemRemoved', itemId => {
    worldItems = worldItems.filter(i => i.item.id !== itemId)
    socket.broadcast.emit('worldItemRemoved', itemId)
  })

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + playerId, socket.id)
    if (player) {
      // Mark player as disconnected but keep their data
      player.isConnected = false
    }
    // Notify others using the playerId for consistency
    socket.broadcast.emit('playerDisconnected', playerId)
  })
})


// Start the server
// listen on PORT on any IP address
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
