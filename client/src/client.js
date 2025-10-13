import { initDevtools } from '@pixi/devtools'
import { Application } from 'pixi.js'
import { LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants.js'
import { Textures } from '#shared/config/textures.js'
import generateLevel from '#shared/level-builder.js'
// import generateLevel from '#shared/level-builder-wfc.js'
import Hud from './sprites/hud/hud.js'
import PlayerSprite from './sprites/player-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import preloadTextures from './preload-textures.js'
import socket from './socket.js'
import soundManager from './sound-manager.js'
import World from './world.js'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'
import clientPrediction from './client-prediction.js'

let world = null
let app = null
let pather = null
let hud = null
let initialized = false
let lastServerState = null

// listen for player add/remove/updates
const createPlayer = (serializedPlayerState, color, isLocalPlayer) => {
  const playerState = new PlayerState({ ...serializedPlayerState, pather })
  const player = new PlayerSprite(playerState, Textures.player.base, world, pather, color)
  player.isLocalPlayer = isLocalPlayer
  playerSpriteStore.add(player)
  return player
}

const init = async (levelConfig, localPlayerState) => {
  // remove existing data if already initialized (reconnect)
  if (initialized) {
    console.log('re-initializing client, clearing existing data')
    hud.destroy()
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    playerSpriteStore.set([])
  }

  // Initialize sound manager
  await soundManager.preloadSounds()

  pather = new Pather(levelConfig)

  clientPrediction.setPather(pather)

  // create pixi.js app
  app = new Application()
  await app.init({ background: 0x000000, resizeTo: window })
  document.body.appendChild(app.canvas)
  initDevtools({ app })

  // create world
  world = new World(app, levelConfig, groundItem => {
    socket.emit('setTargetItem', groundItem)
  })
  app.stage.addChild(world)

  // Initialize debug visualization for client prediction
  clientPrediction.initDebug(app, world)

  // create local player
  createPlayer(localPlayerState, LOCAL_PLAYER_COLOR, true)

  // Initialize client prediction for local player
  clientPrediction.setPlayer(localPlayerState, true)

  // create hud (and controls)
  hud = new Hud(app, world, levelConfig)
  app.stage.addChild(hud)

  // Client-side game loop - server has authority, but client predicts and corrects
  // app.ticker.maxFPS = 120
  app.ticker.add(time => {
    // apply last server state
    if (lastServerState != null) {
      applyServerState(lastServerState)
      lastServerState = null
    }

    world.onTick(time)
    hud.onTick(time)
    updatePlayersFromPrediction()
  })

  initialized = true
}

// Update all players' visual positions from client prediction every frame (60+ fps)
function updatePlayersFromPrediction() {
  const players = playerSpriteStore.get()
  for (const player of players) {
    const playerId = player.state.playerId
    const predictedState = clientPrediction.getPredictedStateForPlayer(playerId)
    if (predictedState) {
      // Update player's state with predicted position
      player.state.x = predictedState.x
      player.state.y = predictedState.y
      player.state.rotation = predictedState.rotation

      // Update visual representation
      player.updateFromState()
    }
  }
}

// server may request level if it's the first player to connect (only client can create levels for now)
socket.on('requestLevel', () => {
  socket.emit('setLevel', generateLevel())
})

// server will send the level and local player data when it's ready to initialize the client
socket.on('init', async ({ level, player }) => {
  await preloadTextures()
  init(level, player)
})

socket.on('serverState', state => {
  if (!initialized) {
    return
  }
  lastServerState = state
})

let lastAppliedGroundItemSequence = null
function applyServerState(serverState) {
  // update ground items if the sequence changed and server sent them (server only sends every few ticks or when changed)
  if (serverState.groundItemsSequence !== lastAppliedGroundItemSequence && serverState.groundItems != null) {
    world.setGroundItems(serverState.groundItems)
    lastAppliedGroundItemSequence = serverState.groundItemsSequence
    console.log('applying ground items update from server, sequence:', lastAppliedGroundItemSequence, serverState.groundItems.length)
  }

  // update players
  let players = playerSpriteStore.get()

  // add any new players that weren't in store
  Object.entries(serverState.players).forEach(([playerId, playerState]) => {
    if (!players.find(p => p.state.playerId === playerId)) {
      console.log('creating new player from server', players.length, playerState)
      createPlayer(playerState, OTHER_PLAYER_COLOR, false)
      clientPrediction.setPlayer(playerState, false)
    }
  })

  players.forEach(p => {
    const playerServerState = serverState.players[p.state.playerId]
    if (playerServerState == null) {
      // remove disconnected player
      console.log('removing disconnected player', p.state.playerId, p.state.username)
      clientPrediction.removePlayer(p.state.playerId)
      playerSpriteStore.remove(p.state.playerId)
    } else {
      // Handle client prediction update (unified method for all players)
      if (serverState.serverTimestamp) {
        // Unified reconciliation - automatically handles local vs remote differences
        clientPrediction.reconcilePlayerWithServer(p.state.playerId, playerServerState, serverState.serverTimestamp)
      }

      // Update non-position state from server (inventory, abilities, etc.) - same for all players
      // Position is handled by updatePlayersFromPrediction() every frame
      const currentPos = { x: p.state.x, y: p.state.y, rotation: p.state.rotation }
      p.state.deserialize(playerServerState)
      p.state.x = currentPos.x
      p.state.y = currentPos.y
      p.state.rotation = currentPos.rotation
    }
  }) // force trigger subscribers, since changes to object properties in array won't automatically do that
  // TODO: how can we do that better?
  playerSpriteStore.triggerSubscribers()
}
