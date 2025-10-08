import createStore from '#shared/stores/create-store.js'

const isValidGroundItem = item =>
  typeof item === 'object' &&
  item != null &&
  item.item != null &&
  item.position != null &&
  item.position.x != null &&
  item.position.y != null

export default createStore(
  [],
  value => Array.isArray(value) && value.every(item => isValidGroundItem(item))
)
