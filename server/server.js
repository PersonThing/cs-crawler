import { generateRandomItem } from '#shared/config/items.js'
import { Server } from 'socket.io'
import express from 'express'
import http from 'http'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'
import GroundItem from '#shared/config/ground-item.js'
import { Abilities } from '#shared/config/abilities.js'
import db from './db.js'

const FPS = 20 // server runs slower, client runs at higher framerate and reconciles with server
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

const players = {} // player cache - also stored in db
let groundItems = [] // ground item cache - not stored in db until picked up (game servers will be temporary state only)
let groundItemsSequence = 0 // incremented each time ground items change, so clients can track changes
let groundItemsChangedAt = null

// level and pather set when first player connects and creates or loads a level
let level = null
let pather = null

// Game loop
let lastUpdate = Date.now()
function tick() {
  const now = Date.now()
  const deltaMS = now - lastUpdate // Time elapsed since last tick
  lastUpdate = now
  const time = { deltaMS }

  // Update and send state for all connected players
  const connectedPlayers = {}
  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected) {
      const len = groundItems.length
      player.onTick(time, groundItems)
      if (groundItems.length !== len) {
        groundItemsChanged()
      }
      const serializedPlayer = player.serialize()
      connectedPlayers[playerId] = serializedPlayer

      // if player inventory, username, or action bar config changed, save to db
      const actionBarConfigChanged = JSON.stringify(player.actionBarConfig) !== JSON.stringify(player.lastSavedActionBarConfig)
      if (player.lastSavedInventorySequence !== serializedPlayer.inventory.sequence || 
          player.username !== player.lastSavedUsername || 
          actionBarConfigChanged) {
        // intentionally not awaiting, we don't care if it fails, it'll try again on next tick
        db.savePlayerAsync(player)
        player.lastSavedActionBarConfig = JSON.parse(JSON.stringify(player.actionBarConfig)) // deep copy
      }
    }
  }

  const state = {
    players: connectedPlayers,
    groundItemsSequence,
    serverTimestamp: now,
  }

  // set groundItems in the state only if:
  // - items have changed
  // - or we're on a frame less than 1s since the last change
  // so if a client misses an update, they get it in one of the following frames at least
  // clients will keep the last known state and only update when sequence changes and items are sent
  if (now - (groundItemsChangedAt || 0) < 1000) {
    state.groundItems = groundItems
    console.log('sending ground items update to clients, sequence:', groundItemsSequence)
  }

  io.emit('serverState', state)
}
setInterval(tick, SERVER_TICK_RATE)

function dropToGround(position, item) {
  groundItems.push(
    new GroundItem(
      item,
      pather.getBestAvailableItemPosition(
        {
          x: position.x,
          y: position.y,
        },
        groundItems
      )
    )
  )
  groundItemsChanged()
}

function groundItemsChanged() {
  groundItemsSequence++
  groundItemsChangedAt = Date.now()
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
      // not found in players cache, create a new player
      player = new PlayerState({ playerId, pather, username })
      player.isConnected = true

      // exists in db?
      let dbPlayer = await db.getPlayerAsync(playerId)
      if (dbPlayer) {
        // set state from db
        player.deserialize(dbPlayer.data)
        console.log('Player found in db, loading ' + playerId, username)
      } else {
        // save to db
        await db.savePlayerAsync(player, player.serialize())
        console.log('Player not found in db, created new record ' + playerId, username)
      }

      // if player is at 0,0, reset to level start
      if (player.x === 0 && player.y === 0) {
        player.setPosition(level.start.x, level.start.y)
      }

      // set to players cache
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
  socket.on('setTarget', (data) => {
    if (!player?.isConnected) {
      return
    }
    
    let target, inputSequence
    target = data.target
    inputSequence = data.inputSequence
    
    // Update the last processed input sequence
    if (inputSequence && inputSequence > player.lastProcessedInputSequence) {
      player.lastProcessedInputSequence = inputSequence
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

  socket.on('updateActionBarConfig', (actionBarConfig) => {
    if (!player?.isConnected) {
      return
    }
    player.actionBarConfig = [...actionBarConfig]
  })

  socket.on('useAbility', ({ abilityId, target, modifiers }) => {
    if (!player?.isConnected) {
      return
    }
    
    const ability = Abilities[abilityId]
    if (!ability) {
      console.log('Unknown ability:', abilityId)
      return
    }
    
    // Validate that player has ability unlocked
    if (!player.hasAbilityUnlocked(abilityId)) {
      console.log(`Player ${player.label} attempted to use locked ability: ${ability.name}`)
      return
    }
    
    // TODO: Check cooldowns, mana costs, etc.
    // TODO: Validate target position is reasonable
    
    console.log(`Player ${player.label} using ability: ${ability.name} at`, target, 'with modifiers:', modifiers)
    
    // Execute ability on server
    if (ability.onUse) {
      ability.onUse(player, target, modifiers)
    }
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
    dropToGround({ x: player.x, y: player.y }, generateRandomItem())
    console.log('generated ground item, # items:', groundItems.length)
  })

  // temp: clear all ground items
  socket.on('clearGroundItems', () => {
    if (!player?.isConnected) {
      return
    }
    groundItems = []
    groundItemsChanged()
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
      db.savePlayerAsync(player)
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
