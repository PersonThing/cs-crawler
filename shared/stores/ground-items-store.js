import createStore from '#shared/stores/create-store.js'

const { subscribe, set, get, update } = createStore([], value => Array.isArray(value))

const getBestAvailableItemPosition = position => {
  // given a position {x, y}, return the best available position to place an item
  // where there isn't already an item within 20 pixels radius
  // ideally it drops it exactly at the passed position
  // failing that, look for the nearest position, circling clockwise and outward until a good position is found
  if (position == null || position.x == null || position.y == null) {
    return null
  }
  const items = get()
  const radius = 30
  const step = 4
  const maxRadius = 200
  const maxSteps = maxRadius / step
  let bestPosition = position
  let bestDistance = 0
  let bestPositionFound = false
  for (let r = 0; r < maxSteps; r++) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const x = position.x + Math.cos(a) * r * step
      const y = position.y + Math.sin(a) * r * step
      const distance = Math.sqrt((x - position.x) ** 2 + (y - position.y) ** 2)
      if (distance < bestDistance) {
        continue
      }
      if (
        items.some(item => {
          const dx = item.position.x - x
          const dy = item.position.y - y
          return Math.sqrt(dx ** 2 + dy ** 2) < radius
        })
      ) {
        continue
      }
      bestPosition = { x, y }
      bestDistance = distance
      bestPositionFound = true
    }
    if (bestPositionFound) {
      break
    }
  }
  return bestPosition
}

const add = itemWrapper => {
  return update(items => {
    if (!items.find(i => i.item.id === itemWrapper.item.id)) {
      items.push(itemWrapper)
    }
    return items
  })
}

const store = {
  subscribe,
  set,
  get,
  update,

  // placeholders - client defines these to notify server of changes
  onSuccessfulAdd: () => {},
  onSuccessfulRemove: () => {},

  add: (itemWrapper, notifyServer = true) => {
    itemWrapper.position = getBestAvailableItemPosition(itemWrapper.position)
    const result = add(itemWrapper)
    if (result && notifyServer) {
      store.onSuccessfulAdd(itemWrapper)
    }
    return result
  },
  remove: (itemId, notifyServer = true) => {
    const result = update(items => items.filter(i => i.item.id !== itemId))
    if (result && notifyServer) {
      store.onSuccessfulRemove(itemId)
    }
    return result
  },
}

export default store