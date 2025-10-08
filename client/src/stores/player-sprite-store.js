import createStore from '#shared/stores/create-store'

const isValidPlayerSprite = item =>
  typeof item === 'object' && item != null && item.state != null && item.state.playerId != null

const { subscribe, get, update, set } = createStore(
  [],
  value => Array.isArray(value) && value.every(item => isValidPlayerSprite(item))
)

export default {
  subscribe,
  get,
  update,
  set,
  add: player => {
    update(players => {
      players.push(player)
      return players
    })
  },
  remove: playerId => {
    update(players => players.filter(p => p.state.playerId !== playerId))
  },
  getLocalPlayer: () => get().find(p => p.isLocalPlayer) || null,
}
