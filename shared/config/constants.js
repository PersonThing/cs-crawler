import createStore from '../stores/create-store.js'

const DEBUG = createStore(true, value => typeof value === 'boolean')

const ART_SCALE = 1.5
const BAG_SLOTS = 60
const BLOCK_SIZE = 32
const MINIMAP_HEIGHT = 200
const MINIMAP_SCALE = 0.15
const MINIMAP_WIDTH = 300

const HUD_BORDER_COLOR = 0x555555
const HUD_FILL_COLOR = 0x333333
const HUD_PLAYERS_WIDTH = 200

const LOCAL_PLAYER_COLOR = 0x00aaff
const OTHER_PLAYER_COLOR = 0x00ff00

export {
  DEBUG,
  ART_SCALE,
  BAG_SLOTS,
  BLOCK_SIZE,
  MINIMAP_HEIGHT,
  MINIMAP_SCALE,
  MINIMAP_WIDTH,
  HUD_BORDER_COLOR,
  HUD_FILL_COLOR,
  HUD_PLAYERS_WIDTH,
  LOCAL_PLAYER_COLOR,
  OTHER_PLAYER_COLOR,
}
