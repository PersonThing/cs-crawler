import { createStore } from './create-store.js'

const { subscribe, set } = createStore({
  equipped: {},
  bags: [],
})

// only player-inventory.js should use writable
export const writable = { subscribe, set }

// others should use readonly
export const readonly = { subscribe }