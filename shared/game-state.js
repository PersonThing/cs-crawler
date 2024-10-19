import { createStore } from './store.js'

const createPlayerStore = () => {
  const { get, set, subscribe, update } = createStore([])
  return {
    subscribe,
    get,
    set,
    update,
    add: (player) => update((players) => [...players, player]),
    getById: (id) => get().find((player) => player.id === id),
    removeById: (id) => update((players) => players.filter((player) => player.id !== id)),
    updateById: (id, updateFn) => update((players) => players.map((player) => player.id === id ? updateFn(player) : player)),
  }
}
export const players = createPlayerStore()

const createGroundItemsStore = () => {
  const { get, set, subscribe, update } = createStore([])
  return {
    subscribe,
    get,
    set,
    update,
    add: (item) => update((items) => [...items, item]),
    remove: (item) => update((items) => items.filter((i) => i !== item)),
  }
}
export const groundItems = createGroundItemsStore()

export const enemies = createStore([])