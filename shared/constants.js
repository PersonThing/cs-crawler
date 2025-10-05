import createStore from "./create-store.js"

const DEBUG = createStore(true)

const ART_SCALE = 1.5
const BAG_SLOTS = 60
const BLOCK_SIZE = 32
const MINIMAP_HEIGHT = 300
const MINIMAP_SCALE = 0.15
const MINIMAP_WIDTH = 300

export {
  DEBUG,

  ART_SCALE,
  BAG_SLOTS,
  BLOCK_SIZE,
  MINIMAP_HEIGHT,
  MINIMAP_SCALE,
  MINIMAP_WIDTH,
}
