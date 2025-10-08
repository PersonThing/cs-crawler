import { initDevtools } from '@pixi/devtools'
import { Application } from 'pixi.js'
import { LOCAL_PLAYER_COLOR, OTHER_PLAYER_COLOR } from '#shared/config/constants.js'
import { Textures } from '#shared/config/textures.js'
import appStore from './stores/app-store.js'
import generateLevel from '#shared/level-builder.js'
// import generateLevel from '#shared/level-builder-wfc.js'
import Hud from './sprites/hud/hud.js'
import PlayerSprite from './sprites/player-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import groundItemsStore from '../../shared/stores/ground-items-store.js'
import preloadTextures from './preload-textures.js'
import socket from './socket.js'
import World from './world.js'
import debounce from '#shared/utils/debounce.js'
import Pather from '#shared/pather.js'
import PlayerState from '#shared/state/player-state.js'

let world = null
let app = null
let pather = null
let hud = null
let initialized = false

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

  console.log('initializing client')
  console.log('level', levelConfig)
  console.log('player', localPlayerState)

  pather = new Pather(levelConfig)

  // create pixi.js app
  app = new Application()
  appStore.set(app)
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

  // Client-side game loop - server has authority, but client predicts and corrects
  // app.ticker.maxFPS = 120
  app.ticker.add(time => {
    world.onTick(time)
    hud.onTick(time)
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

  playerSpriteStore.update(players => {
    // add any new players that weren't in store
    Object.entries(state.players).forEach(([playerId, playerState]) => {
      if (!players.find(p => p.state.playerId === playerId)) {
        // new player
        console.log('creating new player from server', players.length, playerState)
        createPlayer(playerState, OTHER_PLAYER_COLOR, false)
      }
    })

    // remove disconnected players, update still connected players
    players.forEach(p => {
      const updatedState = state.players[p.state.playerId]
      if (updatedState == null) {
        // player no longer connected to server, remove
        playerSpriteStore.remove(p.state.playerId)
      } else {
        // update existing players if found
        p.state.deserialize(updatedState)
        p.updateFromState()
      }
    })
    return players
  })

  groundItemsStore.set(state.groundItems)
})
