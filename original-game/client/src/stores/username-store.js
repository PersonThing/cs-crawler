import createPersistedStore from '#shared/stores/create-persisted-store.js'

const usernameStore = createPersistedStore('username', 'Anonymous', value => typeof value === 'string' && value.length <= 20)

export default usernameStore
