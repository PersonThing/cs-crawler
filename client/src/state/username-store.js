import createPersistedStore from "../../../shared/create-persisted-store";

const usernameStore = createPersistedStore("username", 'Dorkus');

export default usernameStore;
