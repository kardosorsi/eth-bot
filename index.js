require('dotenv').config()
const { Client, Intents } = require('discord.js')

const alchemy = require('./helpers/alchemy')
const logger = require('./helpers/log')

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})

client.on('ready', () => {
  logger.log(`ETH Bot logged in as ${client.user.tag}!`)
  alchemy.bulkSubscribe(client)
})

client.login(process.env.CLIENT_TOKEN)

client.on('messageCreate', async (msg) => {
  const msgContents = msg.content.split(' ')
  const prefix = msgContents[0]
  const params = msgContents.slice(1)

  switch (prefix) {
    case '!followwallet':
      alchemy.followWallet(msg.channel, params)
      break
    case '!unfollowwallet':
      alchemy.unfollowWallet(msg.channel, params)
      break
  }
})
