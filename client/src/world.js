import { Container, BlurFilter, Graphics, Sprite, Rectangle } from 'pixi.js'
import LevelSprite from './sprites/level-sprite.js'
import playerSpriteStore from './stores/player-sprite-store.js'
import screenSizeStore from './stores/screen-size-store.js'
import PlayerSprite from './sprites/player-sprite.js'
import Pather from '#shared/pather.js'
import GroundItemSprite from './sprites/ground-item-sprite.js'
import TurretSprite from './sprites/turret-sprite.js'
import PetSprite from './sprites/pet-sprite.js'
import EnemySprite from './sprites/enemy-sprite.js'
import ProjectileSprite from './sprites/projectile-sprite.js'
import AreaDamageEffectSprite from './sprites/area-damage-effect-sprite.js'
import soundManager from './sound-manager.js'
import { Sounds } from '#shared/config/sounds.js'
import DamageType from '#shared/config/abilities/damage-type.js'

const PARALLAX_SCALE = 1.1

class World extends Container {
  constructor(app, levelConfig, onItemClick) {
    super()

    this.app = app
    this.levelConfig = levelConfig

    this.levelSprite = new LevelSprite(levelConfig, 1, false)
    this.addChild(this.levelSprite)

    this.groundItemsContainer = new Container()
    this.addChild(this.groundItemsContainer)

    this.projectilesContainer = new Container()
    this.addChild(this.projectilesContainer)

    this.turretsContainer = new Container()
    this.addChild(this.turretsContainer)

    this.petsContainer = new Container()
    this.addChild(this.petsContainer)

    this.enemiesContainer = new Container()
    this.addChild(this.enemiesContainer)

    this.effectsContainer = new Container()
    this.addChild(this.effectsContainer)

    this.pather = new Pather(levelConfig)

    // add another level sprite slightly scaled up for parallax effect
    this.levelSpriteParallax = new LevelSprite(levelConfig, PARALLAX_SCALE, false, true)
    this.levelSpriteParallax.mask = null
    this.levelSpriteParallax.zIndex = 4 // players are at 3, so parallax seems to be above them

    this.addChild(this.levelSpriteParallax)

    this.createLightRadiusMask()

    this.onItemClick = onItemClick

    playerSpriteStore.subscribe(players => {
      // remove any players that are no longer in the store
      const playerSprites = this.children.filter(child => child instanceof PlayerSprite)
      for (const child of playerSprites) {
        if (!players.includes(child)) {
          this.removePlayer(child)
        }
      }

      // add any players that are in the store but not yet rendered
      for (const player of players) {
        if (!this.children.includes(player)) {
          this.addPlayer(player)
        }
      }
    })
  }

  setGroundItems(groundItems) {
    // remove any items that are no longer there
    for (const id of this.groundItemsContainer.children.map(sprite => sprite.id)) {
      const groundItem = groundItems.find(groundItem => groundItem.item.id === id)
      if (!groundItem) {
        this.unrenderItem(id)
      }
    }

    // add any items that are not yet rendered
    for (const groundItem of groundItems) {
      if (!this.groundItemsContainer.children.find(sprite => sprite.id === groundItem.item.id)) {
        this.renderItem(groundItem)
        soundManager.play(Sounds.item.ItemDrop, { start: 0.1, end: 0.3, volume: 0.5 })
      }
    }
  }

  setProjectiles(projectiles) {
    // Remove any projectiles that are no longer active
    for (const child of [...this.projectilesContainer.children]) {
      const projectile = projectiles.find(p => p.id === child.state?.id)
      if (!projectile) {
        this.projectilesContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update projectiles
    for (const projectile of projectiles) {
      let projectileSprite = this.projectilesContainer.children.find(child => child.state?.id === projectile.id)

      if (!projectileSprite) {
        // Create new projectile sprite using ProjectileSprite class
        projectileSprite = new ProjectileSprite(projectile)
        this.projectilesContainer.addChild(projectileSprite)
      } else {
        // Update existing projectile sprite
        projectileSprite.state = projectile
        projectileSprite.updateFromState()
      }
    }
  }

  setTurrets(turrets) {
    // Remove any turrets that are no longer active
    for (const child of [...this.turretsContainer.children]) {
      const turret = turrets.find(t => t.id === child.state?.id)
      if (!turret) {
        this.turretsContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update turrets
    for (const turret of turrets) {
      let turretSprite = this.turretsContainer.children.find(child => child.state?.id === turret.id)

      if (!turretSprite) {
        // Create new turret sprite using TurretSprite class
        turretSprite = new TurretSprite(turret)
        this.turretsContainer.addChild(turretSprite)
      } else {
        // Update existing turret sprite
        turretSprite.state = turret
        turretSprite.updateFromState()
      }
    }
  }

  setPets(pets) {
    // Remove any pets that are no longer active
    for (const child of [...this.petsContainer.children]) {
      const pet = pets.find(p => p.id === child.state?.id)
      if (!pet) {
        this.petsContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update pets
    for (const pet of pets) {
      let petSprite = this.petsContainer.children.find(child => child.state?.id === pet.id)

      if (!petSprite) {
        // Create new pet sprite using PetSprite class
        petSprite = new PetSprite(pet)
        this.petsContainer.addChild(petSprite)
      } else {
        // Update existing pet sprite
        petSprite.state = pet
        petSprite.updateFromState()
      }
    }
  }

  setEnemies(enemies) {
    // Remove any enemies that are no longer active
    for (const child of [...this.enemiesContainer.children]) {
      const enemy = enemies.find(e => e.id === child.state?.id)
      if (!enemy) {
        this.enemiesContainer.removeChild(child)
        child.destroy()
      }
    }

    // Add or update enemies
    for (const enemy of enemies) {
      let enemySprite = this.enemiesContainer.children.find(child => child.state?.id === enemy.id)

      if (!enemySprite) {
        // Create new enemy sprite using EnemySprite class
        enemySprite = new EnemySprite(enemy)
        this.enemiesContainer.addChild(enemySprite)
      } else {
        // Update existing enemy sprite
        enemySprite.state = enemy
        enemySprite.updateFromState()
      }
    }
  }

  addAreaDamageEffect(damageData) {
    const effectSprite = new AreaDamageEffectSprite(damageData)
    this.effectsContainer.addChild(effectSprite)
  }

  createLightRadiusMask() {
    // Create a Graphics object to draw the combined light mask
    this.lightGraphics = new Graphics()

    // Apply blur filter for soft lighting effect
    const blurFilter = new BlurFilter()
    blurFilter.strength = 100
    blurFilter.quality = 3
    this.lightGraphics.filters = [blurFilter]

    this.lastPlayerX = 0
    this.lastPlayerY = 0
    this.updateLightMask()
  }

  getProjectileLightIntensity(damageType) {
    // Return light intensity based on damage type
    switch (damageType) {
      case DamageType.Lightning:
        return 1.0
      case DamageType.Fire:
        return 0.8
      case DamageType.Cold:
        return 0.5
      case DamageType.Physical:
      case DamageType.Poison:
      default:
        return 0.25
    }
  }

  updateLightMask() {
    if (!this.lightGraphics) return

    const localPlayer = playerSpriteStore.getLocalPlayer()
    if (!localPlayer) return

    // only update every 100ms
    if (Date.now() - this.lastLightUpdate < 100) return
    this.lastLightUpdate = Date.now()

    this.lastPlayerX = localPlayer.x
    this.lastPlayerY = localPlayer.y

    // Clear previous graphics
    this.lightGraphics.clear()

    // Draw player light (larger radius)
    const playerRadius = 300
    this.lightGraphics.circle(0, 0, playerRadius).fill(0xff0000)

    const maxDistance = 1500 // Only render lights within this distance from player

    // Draw lights for each tile center (smaller radius)
    // Only render tile lights within a reasonable distance from player for performance
    // Get tile size from level sprite
    // const tileSize = this.levelSprite.tileSize

    // const tileRadius = 150

    // this.levelConfig.tileGrid.forEach((tileRow, tileY) => {
    //   tileRow.forEach((tile, tileX) => {
    //     if (!tile) return

    //     const tileCenterX = tileX * tileSize + tileSize / 2
    //     const tileCenterY = tileY * tileSize + tileSize / 2

    //     // Check distance from player
    //     const distance = Math.sqrt((tileCenterX - localPlayer.x) ** 2 + (tileCenterY - localPlayer.y) ** 2)

    //     if (distance <= maxDistance) {
    //       // Draw tile light relative to player position
    //       const relativeX = tileCenterX - localPlayer.x
    //       const relativeY = tileCenterY - localPlayer.y
    //       this.lightGraphics.circle(relativeX, relativeY, tileRadius).fill(0xff0000)
    //     }
    //   })
    // })

    // Draw lights for projectiles
    this.projectilesContainer.children.forEach(projectileSprite => {
      if (projectileSprite.state) {
        const projectileDistance = Math.sqrt(
          (projectileSprite.state.x - localPlayer.x) ** 2 + (projectileSprite.state.y - localPlayer.y) ** 2
        )

        if (projectileDistance <= maxDistance) {
          const intensity = this.getProjectileLightIntensity(projectileSprite.state.damageType)
          const projectileRadius = 200 * intensity // Base radius of 200, scaled by intensity
          
          // Draw projectile light relative to player position
          const relativeX = projectileSprite.state.x - localPlayer.x
          const relativeY = projectileSprite.state.y - localPlayer.y
          this.lightGraphics.circle(relativeX, relativeY, projectileRadius).fill(0xff0000)
        }
      }
    })

    // Draw lights for area damage effects
    this.effectsContainer.children.forEach(effectSprite => {
      if (effectSprite.state) {
        const effectDistance = Math.sqrt((effectSprite.state.x - localPlayer.x) ** 2 + (effectSprite.state.y - localPlayer.y) ** 2)

        if (effectDistance <= maxDistance) {
          const intensity = this.getProjectileLightIntensity(effectSprite.state.damageType)
          const effectRadius = effectSprite.state.radius * intensity
          // Draw effect light relative to player position
          const relativeX = effectSprite.state.x - localPlayer.x
          const relativeY = effectSprite.state.y - localPlayer.y
          this.lightGraphics.circle(relativeX, relativeY, effectRadius).fill(0xff0000)
        }
      }
    })

    // Generate texture from graphics and create sprite
    const bounds = new Rectangle(-maxDistance, -maxDistance, maxDistance * 2, maxDistance * 2)
    const texture = this.app.renderer.generateTexture({
      target: this.lightGraphics,
      resolution: 1,
      frame: bounds,
    })

    // Remove old mask sprite if it exists
    if (this.mask && this.mask.parent) {
      this.mask.parent.removeChild(this.mask)
      this.mask.destroy()
    }

    // Create new mask sprite
    this.mask = Sprite.from(texture)
    this.mask.anchor.set(0.5)
    this.addChild(this.mask)
  }

  tick() {
    const { width: screenWidth, height: screenHeight } = screenSizeStore.get()
    const localPlayer = playerSpriteStore.getLocalPlayer()
    if (localPlayer == null) return

    // center view on local player
    // move map around the player centered in the middle of the screen
    this.x = -localPlayer.x + screenWidth / 2
    this.y = -localPlayer.y + screenHeight / 2

    // Update the light mask to reflect current player position
    this.updateLightMask()

    // Position the mask at the player's location
    if (this.mask) {
      this.mask.x = localPlayer.x
      this.mask.y = localPlayer.y
    }

    // update the parallax level - it needs to offset by the difference in level size and parallax size
    this.levelSpriteParallax.tick(screenWidth, screenHeight)
    this.levelSpriteParallax.x = -localPlayer.x * (PARALLAX_SCALE - 1)
    this.levelSpriteParallax.y = -localPlayer.y * (PARALLAX_SCALE - 1)

    // update the rendered level
    this.levelSprite.tick(screenWidth, screenHeight)

    // update area damage effects
    for (const effect of [...this.effectsContainer.children]) {
      if (!effect.tick()) {
        // Effect expired, remove it
        this.effectsContainer.removeChild(effect)
        effect.destroy()
      }
    }
  }

  addPlayer(player) {
    player.zIndex = 3
    this.addChild(player)
  }

  removePlayer(player) {
    player.destroy()
    this.removeChild(player)
  }

  renderItem(groundItem) {
    if (groundItem.item == null) {
      console.error('Cannot render item with no item data', groundItem)
      return
    }

    if (groundItem.position == null) {
      console.error('Cannot render item with no position', groundItem)
      return
    }

    const groundItemSprite = new GroundItemSprite(groundItem)
    this.groundItemsContainer.addChild(groundItemSprite)
    groundItemSprite.on('pointerdown', () => {
      const localPlayer = playerSpriteStore.getLocalPlayer()
      if (localPlayer == null) {
        console.error('No local player to pick up item')
      }

      this.onItemClick({
        item: groundItem.item,
        position: groundItem.position,
      })
    })
  }

  unrenderItem(id) {
    const groundItemSprite = this.groundItemsContainer.children.find(sprite => sprite.id === id)
    if (groundItemSprite) {
      groundItemSprite.destroy()
      this.groundItemsContainer.removeChild(groundItemSprite)
    }
  }
}

export default World
