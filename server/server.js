import { generateRandomItem } from '#shared/config/items.js'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'
import GroundItem from '#shared/config/ground-item.js'
import db from './db.js'

const FPS = 30
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
let groundItems = [] // Array to store items on the ground

// Load the level and pather
let level = null
let pather = null

let lastUpdate = Date.now()
async function savePlayerAsync(player, serializedPlayerData) {
  await db.savePlayerAsync(player.playerId, serializedPlayerData)
  player.lastSavedHash = serializedPlayerData.inventory.hash
  player.lastSavedUsername = player.username
  console.log('saved player', player.playerId)
}

function tick() {
  const now = Date.now()
  const deltaMS = now - lastUpdate // Time elapsed since last tick
  lastUpdate = now
  const time = { deltaMS }

  // Only send connected players
  const connectedPlayers = {}
  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected) {
      player.onTick(time, groundItems)
      const serializedPlayer = player.serialize()
      connectedPlayers[playerId] = serializedPlayer

      // if player inventory or username changed, save to db
      if (player.lastSavedHash !== serializedPlayer.inventory.hash || player.username !== player.lastSavedUsername) {
        // intentionally not awaiting, we don't care if it fails, it'll try again on next tick
        savePlayerAsync(player, serializedPlayer)
      }
    }
  }

  io.emit('serverState', {
    players: connectedPlayers,
    // TODO: maybe send ground items only when they change?
    groundItems,
  })
}
setInterval(tick, SERVER_TICK_RATE)

function dropToGround(player, item) {
  groundItems.push(
    new GroundItem(
      item,
      pather.getBestAvailableItemPosition(
        {
          x: player.x,
          y: player.y,
        },
        groundItems
      )
    )
  )
}

// handle socket communication with players
io.on('connection', async socket => {
  let username = socket.handshake.query.username
  let playerId = socket.handshake.query.playerId
  let player = players[playerId]

  console.log('Player connected: ' + username, playerId, Object.keys(players))

  const initThisPlayerAsync = async () => {
    console.log('Initializing player ' + username)
    if (player == null) {
      // check db for player first
      const dbPlayer = await db.getPlayerAsync(playerId)
      if (dbPlayer) {
        console.log('Found existing player in DB, loading ' + playerId, username)
        player = new PlayerState({ ...dbPlayer.data, pather })
        // if player at (0, 0), set to level start instead
        if (player.x === 0 && player.y === 0) {
          player.setPosition(level.start.x, level.start.y)
        }
        player.playerId = playerId // ensure playerId is correct
        player.isConnected = true
        players[playerId] = player
      } else {
        console.log('Player not found in db, creating new player for ' + playerId, username)
        const dbPlayer = await db.createPlayerAsync(playerId, { username })
        player = new PlayerState({ ...dbPlayer.data, pather })
        player.setPosition(level.start.x, level.start.y)
        player.isConnected = true
        players[playerId] = player
      }
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
    await initThisPlayerAsync()
  } else {
    // New player
    // if we have a level, we can init them right away
    if (level != null) {
      await initThisPlayerAsync()
    } else {
      // otherwise, we have to request a level from client
      // server.requestLevel -> client.generateLevel -> server.setLevel -> server.initThisPlayer
      // level not created yet, wait for client to create it
      socket.emit('requestLevel')
    }
  }

  // create a level, or ask the client to create it
  // ** uses client to do so since we need client-side canvas (for now)
  socket.on('setLevel', async levelConfig => {
    level = levelConfig
    pather = new Pather(level)
    await initThisPlayerAsync()
  })

  socket.on('setUsername', username => {
    username = username
    console.log('username set for player ' + playerId + ': ' + username)
    if (player) {
      player.username = username
      player.label = username
    }
  })

  // Handle player movement
  socket.on('setTarget', target => {
    if (!player?.isConnected) {
      return
    }
    player.setTarget(target)
  })

  socket.on('setTargetItem', groundItem => {
    if (!player?.isConnected) {
      return
    }
    player.setTargetItem(groundItem)
  })

  socket.on('dropCursorItem', () => {
    if (!player?.isConnected) {
      return
    }
    const item = player.inventory.cursor
    if (item == null) {
      return
    }
    dropToGround(player, item)
    player.inventory.clearCursor()
  })

  socket.on('inventoryBagSlotClick', (index, { ctrlKey, shiftKey, altKey, rightClick } = {}) => {
    if (!player?.isConnected) {
      return
    }

    // if right click and item exists in slot, try to equip it
    if (rightClick && !ctrlKey) {
      player.inventory.tryEquipFromBagSlot(index, shiftKey) // shift key reverses order of trying slots, to try to put in offhand first, for example
      return
    }

    // if ctrl right click and item exists in slot, drop it to ground
    if (rightClick && ctrlKey) {
      const item = player.inventory.bags[index]
      if (item != null) {
        dropToGround(player, item)
        player.inventory.clearBagSlot(index)
        return
      }
    }

    // handle normal click
    player.inventory.clickBagSlot(index)
  })

  socket.on('inventoryEquippedSlotClick', (slotName, { ctrlKey, shiftKey, altKey, rightClick } = {}) => {
    if (!player?.isConnected) {
      return
    }

    // if ctrl right click and item exists in slot, drop it to ground
    if (rightClick && ctrlKey) {
      const item = player.inventory.equipped[slotName]
      if (item != null) {
        dropToGround(player, item)
        player.inventory.clearEquippedSlot(slotName)
        return
      }
    }

    // handle normal click
    player.inventory.clickEquippedSlot(slotName)
  })

  // temp: below are temporary item methods for testing item system

  // temp: generate random item in player inventory
  socket.on('pickupRandomItem', () => {
    if (!player?.isConnected) {
      return
    }
    player.inventory.pickup(generateRandomItem())
  })

  // temp: fill player inventory with random items
  socket.on('fillInventoryWithRandomItems', () => {
    if (!player?.isConnected) {
      return
    }
    while (player.inventory.pickup(generateRandomItem())) {}
  })

  // temp: empty player inventory
  socket.on('resetInventory', () => {
    if (!player?.isConnected) {
      return
    }

    player.inventory.bags = []
  })

  // temp: generate random item on ground at player position
  socket.on('generateGroundItemsAtPlayer', () => {
    if (!player?.isConnected) {
      return
    }
    groundItems.push(
      new GroundItem(
        generateRandomItem(),
        pather.getBestAvailableItemPosition(
          {
            x: player.x,
            y: player.y,
          },
          groundItems
        )
      )
    )
    console.log('generated ground item, # items:', groundItems.length)
  })

  // temp: clear all ground items
  socket.on('clearGroundItems', () => {
    if (!player?.isConnected) {
      return
    }
    groundItems = []
    console.log('cleared ground items, # items:', groundItems.length)
  })

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + playerId, socket.id)
    if (player) {
      // Mark player as disconnected but keep their data
      player.isConnected = false
    }

    // save player to db if not null
    if (player != null) {
      savePlayerAsync(player, player.serialize())
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
