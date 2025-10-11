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
import InventorySoundMonitor from './inventory-sound-monitor.js'
import World from './world.js'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'

let world = null
let app = null
let pather = null
let hud = null
let inventorySoundMonitor = null
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
    inventorySoundMonitor.destroy()
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    playerSpriteStore.set([])
  }

  // Initialize sound manager
  await soundManager.preloadSounds()

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

  // create local player
  createPlayer(localPlayerState, LOCAL_PLAYER_COLOR, true)

  // create hud (and controls)
  hud = new Hud(app, world, levelConfig)
  app.stage.addChild(hud)

  inventorySoundMonitor = new InventorySoundMonitor()

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

    // client tick for player sprites from store
    playerSpriteStore.get().forEach(player => player.onTick(time))
  })

  initialized = true
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

function applyServerState(state) {
  let players = playerSpriteStore.get()

  // add any new players that weren't in store
  Object.entries(state.players).forEach(([playerId, playerState]) => {
    if (!players.find(p => p.state.playerId === playerId)) {
      // new player
      console.log('creating new player from server', players.length, playerState)
      createPlayer(playerState, OTHER_PLAYER_COLOR, false)
    }
  })

  players.forEach(p => {
    const updatedState = state.players[p.state.playerId]
    if (updatedState == null) {
      // remove disconnected player
      console.log('removing disconnected player', p.state.playerId, p.state.username)
      playerSpriteStore.remove(p.state.playerId)
    } else {
      // update existing players if found
      p.state.deserialize(updatedState)
      p.updateFromState()
    }
  })

  // force trigger subscribers, since changes to object properties in array won't automatically do that
  // TODO: how can we do that better?
  playerSpriteStore.triggerSubscribers()

  // update ground items store - we should track a hash and only do it if it changes
  world.setGroundItems(state.groundItems)
}
