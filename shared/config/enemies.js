import EnemyState, { EnemyTypes } from '../state/enemy-state.js'

// Global enemies array - managed by server
let enemies = []
let enemyIdCounter = 0

// Helper function to create enemies
function createEnemy(enemyType, x, y, pather) {
  if (!EnemyTypes[enemyType]) {
    console.warn(`Unknown enemy type: ${enemyType}`)
    return null
  }

  const enemyId = `enemy_${enemyType}_${++enemyIdCounter}`
  const enemy = new EnemyState({
    id: enemyId,
    enemyType,
    x,
    y,
    pather,
  })

  enemies.push(enemy)
  console.log(`Created ${enemy.label} at (${x}, ${y})`)
  return enemy
}

// Helper function to update all enemies
function updateEnemies(deltaMS, players = [], effectDataCallback = null) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    // Only tick enemies within 1000px of any player
    let shouldTick = false
    for (const player of players) {
      const dx = enemy.x - player.x
      const dy = enemy.y - player.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= 1000) {
        shouldTick = true
        break
      }
    }

    if (shouldTick) {
      const shouldContinue = enemy.tick(deltaMS, players, enemies, effectDataCallback)
      if (!shouldContinue) {
        enemies.splice(i, 1)
      }
    }
  }
}

// Helper function to get all active enemies (for sending to clients)
function getActiveEnemies() {
  return enemies.filter(e => e.isAlive()).map(e => e.serialize())
}

// Helper function to get raw enemy objects (for server-side logic)
function getEnemyObjects() {
  return enemies.filter(e => e.isAlive())
}

// Helper function to get enemy count
function getEnemyCount() {
  return enemies.filter(e => e.isAlive()).length
}

// Helper function to clear all enemies (for level resets)
function clearEnemies() {
  enemies.length = 0
  enemyIdCounter = 0
}

// Helper function to get enemy by ID
function getEnemyById(id) {
  return enemies.find(e => e.id === id)
}

export { createEnemy, updateEnemies, getActiveEnemies, getEnemyObjects, getEnemyCount, clearEnemies, getEnemyById, EnemyTypes }
