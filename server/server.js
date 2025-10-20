import { Abilities, useAbility } from '#shared/config/abilities/abilities.js'
import { generateRandomItem } from '#shared/config/items.js'
import { Server } from 'socket.io'
import { SERVER_FPS } from '#shared/config/constants.js'
import db from './db.js'
import express from 'express'
import GroundItem from '#shared/config/ground-item.js'
import http from 'http'
import levelManager from './level-manager.js'
import PlayerState from '#shared/state/player-state.js'
import { getActiveProjectiles, updateProjectiles, getActiveTurrets, updateTurrets, getTurretCount } from '#shared/config/abilities/ability-helpers.js'

const SERVER_TICK_RATE = 1000 / SERVER_FPS
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
      player.tick(time, groundItems)
      if (groundItems.length !== len) {
        groundItemsChanged()
      }
      const serializedPlayer = player.serialize()
      connectedPlayers[playerId] = serializedPlayer

      // if player inventory, username, or action bar config changed, save to db
      const actionBarConfigChanged = JSON.stringify(player.actionBarConfig) !== JSON.stringify(player.lastSavedActionBarConfig)
      if (
        player.lastSavedInventorySequence !== serializedPlayer.inventory.sequence ||
        player.username !== player.lastSavedUsername ||
        actionBarConfigChanged
      ) {
        // intentionally not awaiting, we don't care if it fails, it'll try again on next tick
        db.savePlayerAsync(player)
        player.lastSavedActionBarConfig = JSON.parse(JSON.stringify(player.actionBarConfig)) // deep copy
      }
    }
  }

  // Update projectiles
  updateProjectiles(
    deltaMS,
    Object.values(players).filter(p => p && p.isConnected),
    levelManager.getPather()
  )

  // Update turrets
  updateTurrets(
    deltaMS,
    Object.values(players).filter(p => p && p.isConnected)
  )

  // Update turret counts for all players
  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected) {
      // Update turret counts for each ability
      for (const slotConfig of player.actionBarConfig) {
        if (slotConfig.abilityId && slotConfig.modifiers.includes('Turret')) {
          const count = getTurretCount(playerId, slotConfig.abilityId)
          player.updateTurretCount(slotConfig.abilityId, count)
        }
      }
    }
  }

  // if player died, move respawn them at start
  for (const playerId in players) {
    const player = players[playerId]
    if (player.isConnected && player.currentHealth <= 0) {
      respawnPlayerAtStart(player)
    }
  }

  const state = {
    players: connectedPlayers,
    groundItemsSequence,
    serverTimestamp: now,
    projectiles: getActiveProjectiles(),
    turrets: getActiveTurrets(),
  }

  // set groundItems in the state only if:
  // - items have changed
  // - or we're on a frame less than 1s since the last change
  // so if a client misses an update, they get it in one of the following frames at least
  // clients will keep the last known state and only update when sequence changes and items are sent
  if (now - (groundItemsChangedAt || 0) < 1000) {
    state.groundItems = groundItems
  }

  io.emit('serverState', state)
}
setInterval(tick, SERVER_TICK_RATE)

function dropToGround(position, item) {
  groundItems.push(
    new GroundItem(
      item,
      levelManager.getPather().getBestAvailableItemPosition(
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

function respawnPlayerAtStart(player) {
  player.currentHealth = player.maxHealth
  player.setPosition(levelManager.getLevel().start.x, levelManager.getLevel().start.y)
  player.setTarget(null)
  console.log(`Player ${player.username} respawned at start`)
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
      player = new PlayerState({ playerId, pather: levelManager.getPather(), username })
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
        player.setPosition(levelManager.getLevel().start.x, levelManager.getLevel().start.y)
      }

      // if player is in a non-walkable position, move them to level start
      if (!levelManager.getPather().isWalkableAt(player.x, player.y)) {
        console.log(`Player ${username} is in non-walkable position (${player.x}, ${player.y}), moving to start`)
        player.setPosition(levelManager.getLevel().start.x, levelManager.getLevel().start.y)
        player.setTarget(null)
      }

      // set to players cache
      players[playerId] = player
    }

    if (player.currentHealth === 0) {
      respawnPlayerAtStart(player)
    }

    socket.emit('init', {
      level: levelManager.getLevel(),
      player: player.serialize(),
      groundItems: groundItems,
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
    if (levelManager.hasLevel()) {
      await initThisPlayerAsync()
    } else {
      // otherwise, we have to request a level from client
      // Use the queue system to prevent race conditions
      levelManager.requestLevelGeneration(playerId, socket, initThisPlayerAsync)
    }
  }

  // create a level, or ask the client to create it
  // ** uses client to do so since we need client-side canvas (for now)
  socket.on('setLevel', async levelConfig => {
    await levelManager.onLevelGenerated(levelConfig, playerId)
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

    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
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

  socket.on('updateActionBarConfig', actionBarConfig => {
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

    // Check if ability is on cooldown
    if (player.isAbilityOnCooldown(abilityId)) {
      player.getAbilityCooldownRemaining(abilityId)
      return
    }

    // Execute ability
    useAbility(abilityId, player, target, modifiers)

    // Set ability cooldown
    if (ability.cooldown) {
      player.setAbilityCooldown(abilityId, ability.cooldown(player, modifiers))
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
    while (player.inventory.pickup(generateRandomItem())) { }
  })

  // temp: empty player inventory
  socket.on('resetInventory', () => {
    if (!player?.isConnected) {
      return
    }

    console.log('resetting inventory for player', player.username)

    player.inventory.bags = []
    player.inventory.updateSequence()
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

  //temp: debug teleport
  socket.on('debugTeleport', position => {
    if (!player?.isConnected) {
      return
    }
    
    if (!levelManager.getPather().isWalkableAt(position.x, position.y)) {
      console.log(`Cannot teleport player ${player.username} to non-walkable position (${position.x}, ${position.y})`)
      return
    }

    player.setPosition(position.x, position.y)
    player.setTarget(null)
    console.log(`Player ${player.username} teleported to (${position.x}, ${position.y})`)
  })

  // Remove player on disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + playerId, socket.id)
    if (player) {
      // Mark player as disconnected but keep their data
      player.isConnected = false
    }

    // Clean up level generation state
    levelManager.onPlayerDisconnected(playerId)

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
