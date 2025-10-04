import { Application } from 'pixi.js'
import { Textures } from './textures.js'
import Hud from './hud.js'
import Minimap from './minimap.js'
import Pather from '../../shared/pather.js'
import Player from '../../shared/player.js'
import PlayerControls from './player-controls.js'
import preloadTextures from './preload-textures.js'
import World from '../../shared/world.js'
import socket from './socket.js'
import generateLevel from '../../shared/level-builder-wfc.js'
import generateSampleLevel from '../../shared/level-builder.js'

const init = async levelConfig => {
  const createPlayer = (socketId, label, playerData, color = 0xffffff) => {
    const player = new Player(
      socketId,
      label,
      playerData.playerId,
      pather,
      Textures.player.base,
      world,
      color
    )
    player.setPosition(playerData.x, playerData.y)
    player.setTarget(playerData.target)
    world.addPlayer(player)
    return player
  }

  const createRemotePlayer = (socketId, playerData) => {
    const remotePlayer = createPlayer(socketId, playerData.playerId, playerData, 0x00ff00)
    remotePlayers[socketId] = remotePlayer
  }

  const removeRemotePlayer = socketId => {
    remotePlayers[socketId].onDestroy()
    world.removePlayer(remotePlayers[socketId])
    delete remotePlayers[socketId]
  }

  const createLocalPlayer = playerData => {
    if (localPlayer != null) {
      localPlayer.onDestroy()
      world.removePlayer(localPlayer)
    }

    localPlayer = createPlayer(socket.id, 'You', playerData, 0xffffff)

    hud = new Hud(app, localPlayer, app.screen.width, app.screen.height)
    app.stage.addChild(hud)

    playerControls = new PlayerControls(app, world, localPlayer, minimap, hud)
  }

  const remotePlayers = {}
  let localPlayer = null
  let playerControls = null

  // Create pixi.js app
  const app = new Application()
  await app.init({ background: 0x000000, resizeTo: window })
  document.body.appendChild(app.canvas)

  const world = new World(app, levelConfig)
  app.stage.addChild(world)

  const pather = new Pather(levelConfig)
  const minimap = new Minimap(levelConfig, false)
  app.stage.addChild(minimap)

  let hud

  // Client-side game loop - server has authority, but client predicts and corrects
  // app.ticker.maxFPS = 120
  app.ticker.add(time => {
    world.onTick(time, localPlayer, app.screen.width, app.screen.height)
    minimap.onTick(localPlayer, remotePlayers, app.screen.width, app.screen.height)
  })

  socket.on('updateState', state => {
    Object.keys(remotePlayers).forEach(playerId => {
      if (!state.players[playerId]) {
        // remote players that has disconnected
        removeRemotePlayer(playerId)
      }
    })
    Object.entries(state.players).forEach(([playerId, player]) => {
      if (player.socketId === socket.id) {
        // local player
        if (!localPlayer) {
          console.log('creating local player', player)
          createLocalPlayer(player)
        } else {
          localPlayer.syncWithServer(player)
        }
      } else if (!remotePlayers[playerId]) {
        // new remote player
        createRemotePlayer(playerId, player)
      } else {
        // existing remote player
        remotePlayers[playerId].syncWithServer(player)
      }
    })
  })
}

socket.on('setLevel', async levelConfig => {
  console.log('set level called')
  await preloadTextures()
  init(levelConfig)
  socket.emit('createPlayer')
})

socket.on('requestLevel', () => {
  const level = generateSampleLevel()
  console.log('server requested level, created: ', level)
  socket.emit('setLevel', level)
})
