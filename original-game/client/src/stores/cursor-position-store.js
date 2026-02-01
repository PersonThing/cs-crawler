import createStore from '#shared/stores/create-store.js'

export default createStore(
  {
    x: 0,
    y: 0,
  },
  value => value && typeof value.x === 'number' && typeof value.y === 'number'
)
