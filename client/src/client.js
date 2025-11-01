import { Application } from 'pixi.js'
import { CLIENT_FPS, LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants.js'
import { initDevtools } from '@pixi/devtools'
import { level1 } from '#shared/wfc-level-definitions.js'
import { Textures } from '#shared/config/textures.js'
import clientPrediction from './client-prediction.js'
import generateLevel from '#shared/level-builder.js'
import Hud from './sprites/hud/hud.js'
import Pather from '#shared/pather.js'
import PlayerSprite from './sprites/player-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import PlayerState from '#shared/state/player-state.js'
import preloadTextures from './preload-textures.js'
import socket from './socket.js'
import soundManager from './sound-manager.js'
import World from './world.js'

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

const init = async (levelConfig, localPlayerState, groundItems) => {
  // remove existing data if already initialized (reconnect)
  if (initialized) {
    console.log('re-initializing client, clearing existing data')
    hud.destroy()
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    playerSpriteStore.set([])
  }

  pather = new Pather(levelConfig)

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
  world.setGroundItems(groundItems)

  // Initialize debug visualization for client prediction
  clientPrediction.initDebug(world)

  // create local player
  createPlayer(localPlayerState, LOCAL_PLAYER_COLOR, true)

  // create hud (and controls)
  hud = new Hud(app, world, levelConfig)
  app.stage.addChild(hud)

  // Client-side game loop - server has authority, but client predicts and corrects
  app.ticker.maxFPS = CLIENT_FPS
  app.ticker.add(time => {
    world.tick(time)
    hud.tick(time)

    const playerSprites = playerSpriteStore.get()
    const players = playerSprites.map(p => {
      p.state.isLocalPlayer = p.isLocalPlayer
      return p.state
    })

    // apply server state to player states
    // this will also reconcile any client prediction errors
    applyLastServerState(players)

    // run client prediction for another frame
    clientPrediction.tick(time.deltaMS, players)

    // update rendered sprites from state
    for (const sprite of playerSprites) {
      sprite.updateFromState()
    }
  })

  initialized = true
}

// server may request level if it's the first player to connect (only client can create levels for now)
socket.on('requestLevel', async () => {
  const level = await generateLevel(level1)
  socket.emit('setLevel', level)
})

// server will send the level and local player data when it's ready to initialize the client
socket.on('init', async ({ level, player, groundItems }) => {
  await Promise.all([soundManager.preloadSounds(), preloadTextures()])
  init(level, player, groundItems)
})

socket.on('serverState', state => {
  if (!initialized) {
    return
  }
  lastServerState = state
})

let lastAppliedGroundItemSequence = null

function applyLastServerState(players) {
  if (lastServerState == null) return

  // update groundItems if the sequence changed and payload was sent
  if (lastServerState.groundItemsSequence !== lastAppliedGroundItemSequence && lastServerState.groundItems != null) {
    world.setGroundItems(lastServerState.groundItems)
    lastAppliedGroundItemSequence = lastServerState.groundItemsSequence
    console.log('applying ground items update from server, sequence:', lastAppliedGroundItemSequence, lastServerState.groundItems.length)
  }

  // Update projectiles
  if (lastServerState.projectiles) {
    world.setProjectiles(lastServerState.projectiles)
  }

  // Update turrets
  if (lastServerState.turrets) {
    world.setTurrets(lastServerState.turrets)
  }

  // Update pets
  if (lastServerState.pets) {
    world.setPets(lastServerState.pets)
  }

  // Update enemies
  if (lastServerState.enemies) {
    world.setEnemies(lastServerState.enemies)
  }

  // add any new players that weren't in store
  for (const [playerId, playerState] of Object.entries(lastServerState.players)) {
    if (!players.find(p => p.playerId === playerId)) {
      console.log('creating new player from server', players.length, playerState)
      createPlayer(playerState, OTHER_PLAYER_COLOR, false)
    }
  }

  // update or remove players as needed
  for (const player of players) {
    const pid = player.playerId
    const serverPlayerState = lastServerState.players[pid]
    if (serverPlayerState == null) {
      // remove disconnected player
      console.log('removing disconnected player', pid, player.username)
      clientPrediction.removePlayer(pid)
      playerSpriteStore.remove(pid)
    } else {
      // set non-position fields that server might have changed directly from server state
      player.label = player.username = serverPlayerState.username
      player.setInventory(serverPlayerState.inventory) // has to deserialize and re-compute stats after setting
      player.abilityCooldowns = serverPlayerState.abilityCooldowns || {}
      player.currentHealth = serverPlayerState.currentHealth
      player.maxHealth = serverPlayerState.maxHealth

      // reconcile position with server state
      clientPrediction.reconcileWithServer(player, serverPlayerState, lastServerState.serverTimestamp)

      // just update player directly from server
      // player.deserialize(serverPlayerState)
    }
  }

  playerSpriteStore.triggerSubscribers() // force trigger player sprite store subscribers when server state is applied (for HUD updates)
  lastServerState = null // clear lastServerState so we don't keep applying same state over and over
}
