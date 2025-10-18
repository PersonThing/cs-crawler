import { v8_0_0 } from 'pixi.js'
import soundManager from './sound-manager.js'
import { Sounds } from '#shared/config/sounds.js'
import playerSpriteStore from './stores/player-sprite-store.js'

class InventorySoundMonitor {
  constructor() {
    this.lastInventorySequence = null
    this.lastEquippedItems = {}
    this.lastBagItems = []
    this.lastCursor = null
    this.isInitialized = false

    // Subscribe to player changes
    this.unsubscribeFromPlayerStore = playerSpriteStore.subscribe(players => {
      const localPlayer = players.find(p => p.isLocalPlayer)
      if (localPlayer && localPlayer.state.inventory) {
        this.checkForInventoryChanges(localPlayer.state.inventory)
      }
    })
  }

  checkForInventoryChanges(inventory) {
    if (!inventory) return

    // Skip the first check to avoid playing sounds on initial load
    if (!this.isInitialized) {
      this.lastInventorySequence = inventory.sequence
      this.lastEquippedItems = { ...inventory.equipped }
      this.lastBagItems = [...inventory.bags]
      this.lastCursor = inventory.cursor
      this.isInitialized = true
      return
    }

    // Only check if inventory actually changed
    if (this.lastInventorySequence === inventory.sequence) {
      return
    }

    // Check for equipment changes
    const currentEquipped = inventory.equipped
    let itemWasEquipped = false

    Object.keys(currentEquipped).forEach(slotName => {
      const currentItem = currentEquipped[slotName]
      const previousItem = this.lastEquippedItems[slotName]

      // Check if a new item was equipped (different item ID or slot was empty before)
      if (currentItem && (!previousItem || currentItem.id !== previousItem.id)) {
        itemWasEquipped = true
      }
    })

    // Check for bag/pickup changes
    const currentBagItems = inventory.bags
    const currentCursor = inventory.cursor
    let itemWasPickedUp = false

    // Check if items were added to bags (pickup from ground or moving around)
    const currentBagItemIds = currentBagItems.filter(item => item != null).map(item => item.id)
    const lastBagItemIds = this.lastBagItems.filter(item => item != null).map(item => item.id)
    
    // Check for new items in bags (pickup or moving)
    const newItemsInBags = currentBagItemIds.filter(id => !lastBagItemIds.includes(id))
    
    // Check if cursor changed (picking up or putting down)
    const cursorChanged = (currentCursor && !this.lastCursor) || 
                         (currentCursor && this.lastCursor && currentCursor.id !== this.lastCursor.id)

    if (newItemsInBags.length > 0 || cursorChanged) {
      itemWasPickedUp = true
    }

    // Play appropriate sounds (don't play both at once)
    if (itemWasEquipped) {
      soundManager.play(Sounds.item.ItemEquip, { volume: 0.5, end: 0.2 })
    } else if (itemWasPickedUp) {
      soundManager.play(Sounds.item.ItemPickup, { start: 0.15, end: 0.3, volume: 0.5 })
    }

    // Update tracking variables
    this.lastInventorySequence = inventory.sequence
    this.lastEquippedItems = { ...currentEquipped }
    this.lastBagItems = [...currentBagItems]
    this.lastCursor = currentCursor
  }

  destroy() {
    if (this.unsubscribeFromPlayerStore) {
      this.unsubscribeFromPlayerStore()
    }
  }
}

export default InventorySoundMonitor