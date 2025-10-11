import Sequelize from 'sequelize'

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './server/cs-crawler-db.sqlite',
  logging: false, // disable logging for performance
  // logging: msg => console.log('[sequelize]', msg),
})

const DB = {
  Player: sequelize.define('Player', {
    playerId: {
      type: Sequelize.STRING,
      unique: true,
    },
    username: Sequelize.STRING,
    data: Sequelize.JSON, // Store player state as JSON
  }),
}
await sequelize.sync() // Ensure the database tables are created

const db = {
  async getPlayerAsync(playerId) {
    return await DB.Player.findOne({ where: { playerId } })
  },

  async savePlayerAsync(player) {
    const state = player.serialize()
    const [dbPlayer, created] = await DB.Player.findOrCreate({
      where: { playerId: player.playerId },
      defaults: {
        username: state.username,
        data: state,
      },
    })
    if (!created) {
      dbPlayer.username = state.username
      dbPlayer.data = state
      await dbPlayer.save()
    }
    player.lastSavedHash = state.inventory.hash
    player.lastSavedUsername = state.username
    return dbPlayer
  },
}

export default db
