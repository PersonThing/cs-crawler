import createStore from './create-store.js'

// create a store that persists itself to local storage

export default function createPersistedStore(key, initialValue) {
  const store = createStore(initialValue)

  // on server, just use plain store, local storage not necessary
  // we could consider persisting to db or json file here instead
  if (typeof localStorage === 'undefined') {
    return store;
  }
  
  // load from local storage
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      store.set(JSON.parse(saved))
    } catch (e) {
      console.warn('failed to parse persisted store', key, e)
    }
  }

  // save to local storage on changes
  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value))
  })

  return store
}
