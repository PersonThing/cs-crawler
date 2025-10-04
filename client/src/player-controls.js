import { generateRandomItem, generateRandomItemOfType } from '../../shared/items.js'
import throttle from '../../shared/throttle.js'
import debounce from '../../shared/debounce.js'
import socket from './socket.js'
import cursorPositionStore from './cursor-position-store.js'
import ItemType from '../../shared/item-type.js'
import playerItemTargetStore from './player-item-target-store.js'

class PlayerControls {
  constructor(app, world, player, minimap, hud) {
    this.app = app
    this.world = world
    this.player = player
    this.minimap = minimap
    this.hud = hud
    this.startListening()

    // when player inventory changes, send to server
    const debouncedSetInventory = debounce(content => {
      socket.emit('inventoryChanged', content)
    }, 100)
    this.player.inventory.store.subscribe(debouncedSetInventory)
    playerItemTargetStore.subscribe(target => {
      if (this.player) {
        this.player.setTargetItem(target)
      }
    })

    // when other player inventories change, update it
    socket.on('playerInventoryChanged', ({ playerId, content }) => {
      const px = this.world.players.find(p => p.playerId == playerId)
      if (px != null && px != this.player) {
        // hack to not update inv from server for local player since client is in charge of inv state for now
        px.inventory.deserialize(content)
        console.log('player inventory changed', playerId, content)
      }
    })
  }

  startListening() {
    let isMouseDown = false
    let isRightMouseDown = false

    this.app.canvas.addEventListener('mousedown', event => {
      if (!this.player) return

      // handle right-click for attacking
      if (event.button === 2) {
        this.player.startAttacking(cursorPositionStore.get())
        isRightMouseDown = true
        return
      }

      // if item on cursor, drop it
      if (this.player.inventory.cursor != null) {
        // stage is shifted to center the player
        // so we need to account for that offset
        const target = {
          x: this.player.x,
          y: this.player.y,
        }
        this.world.placeItem(this.player.inventory.cursor, target)
        this.player.inventory.setCursor(null)
        return
      }

      // otherwise we can move

      isMouseDown = true
      updateTargetPosition()
    })

    // Prevent context menu on right-click, it will be used for attacking
    this.app.canvas.addEventListener('contextmenu', event => {
      event.preventDefault()
      return false
    })

    this.app.canvas.addEventListener('mousemove', event => {
      const rect = this.app.canvas.getBoundingClientRect()
      cursorPositionStore.set({
        x: Math.round(event.clientX - rect.left - this.world.x),
        y: Math.round(event.clientY - rect.top - this.world.y),
      })

      if (!this.player || !isMouseDown) return

      updateTargetPosition()
    })

    this.app.ticker.add(time => {
      if (isRightMouseDown) {
        this.player.attackTarget = cursorPositionStore.get()
      } else if (isMouseDown) {
        updateTargetPosition()
      }
    })

    this.app.canvas.addEventListener('mouseup', event => {
      if (event.button === 2) {
        this.player.stopAttacking()
        isRightMouseDown = false
        return
      }
      isMouseDown = false
    })

    // add scroll listener to zoom minimap in/out
    this.app.canvas.addEventListener('wheel', event => {
      if (event.deltaY < 0) {
        this.minimap.zoomIn()
      } else {
        this.minimap.zoomOut()
      }
      event.preventDefault()
      return false
    })

    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase()
      switch (key) {
        case 'a':
          this.minimap.toggleCentered()
          event.preventDefault()
          break
        case 'b':
        case 'i':
          this.hud.toggleInventory()
          event.preventDefault()
          break
        case 'c':
          this.hud.toggleCharacterSheet()
          event.preventDefault()
          break
        case 'h':
          this.hud.toggleHelp()
          event.preventDefault()
          break
        case 'n':
          // temp: generate and pick up a random sample item
          this.player.inventory.pickup(generateRandomItem())
          break
        case 'm':
          // temp: fill inventory with random items
          while (this.player.inventory.pickup(generateRandomItem())) {}
          break
        case ',':
          // temp: reset inventory
          this.player.inventory.reset()
          break
        case 'g':
          // temp: generate a bunch of items on the ground around the player
          for (let i = 0; i < 9; i++) {
            this.world.placeItem(generateRandomItem(), this.player.position)
          }
          break
        case 'v':
          this.world.items.forEach(i => this.world.removeItem(i.item))
          break
        default:
          return // exit this handler for other keys
      }
    })

    // only pass new position to server at most every 50ms (20 times per second)
    const throttledSetTargetOnServer = throttle(target => {
      socket.emit('setTarget', target)
    }, 50)

    const updateTargetPosition = () => {
      const target = cursorPositionStore.get()
      if (isMouseDown) {
        this.player.setTarget(target)
        throttledSetTargetOnServer(target)
      }
    }
  }
}

export default PlayerControls
