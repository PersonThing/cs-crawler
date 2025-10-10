import Sequelize from 'sequelize'

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './server/cs-crawler-db.sqlite',
  logging: false, // disable logging for performance
  // logging: msg => console.log('[sequelize]', msg),
})

const Player = sequelize.define('Player', {
  playerId: {
    type: Sequelize.STRING,
    unique: true,
  },
  username: Sequelize.STRING,
  data: Sequelize.JSON, // Store player state as JSON
})
await sequelize.sync() // Ensure the database tables are created

const db = {
  async getPlayerAsync(playerId) {
    return await Player.findOne({ where: { playerId } })
  },

  async savePlayerAsync(playerId, playerState) {
    const [player, created] = await Player.findOrCreate({
      where: { playerId },
      defaults: {
        username: playerState.username,
        data: playerState,
      },
    })
    if (!created) {
      player.username = playerState.username
      player.data = playerState
      await player.save()
    }
    return player
  }
}


export default db