class ExplorationState {
  constructor() {
    // Store exploration state as a 2D array of exploration levels
    // 0 = unexplored, 1 = partially explored, 2 = fully explored
    this.explorationGrid = new Map()
    this.gridSize = 50 // Size of each exploration cell in pixels
  }

  getExplorationKey(x, y) {
    const gridX = Math.floor(x / this.gridSize)
    const gridY = Math.floor(y / this.gridSize)
    return `${gridX},${gridY}`
  }

  updateExploration(playerX, playerY, fullRevealDistance = 200, partialRevealDistance = 400) {
    // Calculate the range of grid cells to update
    const minX = playerX - partialRevealDistance
    const maxX = playerX + partialRevealDistance
    const minY = playerY - partialRevealDistance
    const maxY = playerY + partialRevealDistance

    const minGridX = Math.floor(minX / this.gridSize)
    const maxGridX = Math.floor(maxX / this.gridSize)
    const minGridY = Math.floor(minY / this.gridSize)
    const maxGridY = Math.floor(maxY / this.gridSize)

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
        const cellCenterX = gridX * this.gridSize + this.gridSize / 2
        const cellCenterY = gridY * this.gridSize + this.gridSize / 2

        const distance = Math.sqrt((cellCenterX - playerX) ** 2 + (cellCenterY - playerY) ** 2)

        const key = `${gridX},${gridY}`
        const currentLevel = this.explorationGrid.get(key) || 0

        if (distance < fullRevealDistance) {
          this.explorationGrid.set(key, 2) // Fully explored
        } else if (distance < partialRevealDistance && currentLevel < 1) {
          this.explorationGrid.set(key, 1) // Partially explored
        }
      }
    }
  }

  getExplorationLevel(x, y) {
    const key = this.getExplorationKey(x, y)
    return this.explorationGrid.get(key) || 0
  }

  isAreaExplored(x, y, minLevel = 1) {
    return this.getExplorationLevel(x, y) >= minLevel
  }

  isAreaFullyExplored(x, y) {
    return this.getExplorationLevel(x, y) >= 2
  }

  canPathTo(x, y) {
    // Only allow pathing to areas that have been at least partially explored
    return this.isAreaExplored(x, y, 1)
  }

  // Get alpha value for rendering based on exploration level
  getAlphaForPosition(x, y) {
    const level = this.getExplorationLevel(x, y)
    switch (level) {
      case 0:
        return 0.1 // Unexplored - barely visible
      case 1:
        return 0.5 // Partially explored
      case 2:
        return 1.0 // Fully explored
      default:
        return 0.1
    }
  }

  // Serialize exploration state for saving/loading
  serialize() {
    return {
      gridSize: this.gridSize,
      explorationData: Array.from(this.explorationGrid.entries()),
    }
  }

  // Deserialize exploration state
  deserialize(data) {
    if (data) {
      this.gridSize = data.gridSize || 50
      this.explorationGrid = new Map(data.explorationData || [])
    }
  }

  // Clear all exploration data
  reset() {
    this.explorationGrid.clear()
  }
}

// Create a singleton instance
const explorationState = new ExplorationState()

export default explorationState
