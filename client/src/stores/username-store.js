import createPersistedStore from '#shared/stores/create-persisted-store'

const usernameStore = createPersistedStore('username', 'Anonymous')

export default usernameStore
