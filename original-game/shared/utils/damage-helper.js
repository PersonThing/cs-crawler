/**
 * Damage helper utility for area-of-effect damage calculations
 * Supports line, cone, and radius damage patterns
 */

/**
 * Calculate if a point is within a cone from the source toward a click target
 * @param {Object} source - Source position {x, y}
 * @param {Object} clickTarget - Click target position {x, y} to determine cone direction
 * @param {Object} enemy - Enemy position {x, y} to check if it's in the cone
 * @param {number} range - Maximum range of the cone
 * @param {number} angle - Cone angle in radians (total angle, not half-angle)
 * @returns {boolean} - True if enemy is within the cone
 */
function isInCone(source, clickTarget, enemy, range, angle) {
  const enemyDx = enemy.x - source.x
  const enemyDy = enemy.y - source.y
  const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy)

  // Check if enemy is within range
  if (enemyDistance > range) {
    return false
  }

  // Calculate angle from source to click target (attack direction)
  const clickDx = clickTarget.x - source.x
  const clickDy = clickTarget.y - source.y
  const attackAngle = Math.atan2(clickDy, clickDx)

  // Calculate angle from source to enemy
  const enemyAngle = Math.atan2(enemyDy, enemyDx)

  // Calculate angle difference
  let angleDiff = enemyAngle - attackAngle

  // Normalize angle difference to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

  // Check if enemy is within cone angle
  return Math.abs(angleDiff) <= angle / 2
}

/**
 * Calculate if a point is within a line from the source toward a click target
 * @param {Object} source - Source position {x, y}
 * @param {Object} clickTarget - Click target position {x, y} to determine line direction
 * @param {Object} enemy - Enemy position {x, y} to check if it's in the line
 * @param {number} range - Maximum range of the line
 * @param {number} width - Width of the line
 * @returns {boolean} - True if enemy is within the line
 */
function isInLine(source, clickTarget, enemy, range, width) {
  const enemyDx = enemy.x - source.x
  const enemyDy = enemy.y - source.y
  const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy)

  // Check if enemy is within range
  if (enemyDistance > range) {
    return false
  }

  // Calculate direction vector from source to click t  arget
  const clickDx = clickTarget.x - source.x
  const clickDy = clickTarget.y - source.y
  const clickDistance = Math.sqrt(clickDx * clickDx + clickDy * clickDy)

  // Normalize direction vector
  const dirX = clickDx / clickDistance
  const dirY = clickDy / clickDistance

  // Project enemy vector onto direction vector
  const projection = enemyDx * dirX + enemyDy * dirY

  // Check if projection is positive (in front of source)
  if (projection < 0) {
    return false
  }

  // Calculate perpendicular distance from line
  const perpDistance = Math.abs(enemyDx * -dirY + enemyDy * dirX)

  // Check if enemy is within line width
  return perpDistance <= width / 2
}

/**
 * Calculate if a point is within a radius from the source
 * @param {Object} source - Source position {x, y}
 * @param {Object} target - Target position {x, y}
 * @param {number} radius - Radius of the area
 * @returns {boolean} - True if target is within the radius
 */
function isInRadius(source, target, radius) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  return distance <= radius
}

/**
 * Apply damage to targets in a specific area pattern
 * @param {Object} source - Source entity with position and rotation
 * @param {Array} enemies - Array of potential target entities
 * @param {number} damage - Damage amount to apply
 * @param {string} pattern - Damage pattern: 'cone', 'line', or 'radius'
 * @param {Object} options - Pattern-specific options
 *   - For cone: {range, angle}
 *   - For line: {range, width}
 *   - For radius: {radius}
 * @returns {Object} - Object containing damaged targets and effect data
 */
function applyAreaDamage(source, target, enemies, damage, pattern, options) {
  const damagedTargets = []

  for (const enemy of enemies) {
    if (!enemy.isAlive || !enemy.isAlive()) {
      continue
    }

    let inArea = false

    switch (pattern) {
      case 'cone':
        inArea = isInCone(source, target, enemy, options.range, options.angle)
        break
      case 'line':
        inArea = isInLine(source, target, enemy, options.range, options.width)
        break
      case 'radius':
        inArea = isInRadius(source, enemy, options.radius)
        break
      default:
        console.warn(`Unknown damage pattern: ${pattern}`)
        continue
    }

    if (inArea) {
      if (enemy.takeDamage) {
        enemy.takeDamage(damage, source)
        damagedTargets.push(enemy)
      }
    }
  }

  // Return both damage results and effect data for client visualization
  return {
    damagedTargets,
    effectData: {
      source: { x: source.x, y: source.y },
      target: { x: target.x, y: target.y },
      pattern,
      options,
    },
  }
}

export { isInCone, isInLine, isInRadius, applyAreaDamage }
