const { createAlchemyWeb3 } = require('@alch/alchemy-web3')
const web3 = createAlchemyWeb3(process.env.ALCHEMY_API_URL)
const db = require('./db')
const logger = require('./log')

const subscriptions = {}

const followWallet = async (channel, params) => {
  const address = params[0]
  const label = params[1] || ''

  if (!address) {
    channel.send('You must provide an address to follow!')
    return
  }

  try {
    const alreadyFollowed = await db.addressModel.findOne({
      address: address,
      channel: channel.id
    })
    if (alreadyFollowed?.label) {
      channel.send(`The wallet with address: ${address} already has a label!`)
      return
    }
  } catch (err) {
    logger.error(err)
  }

  try {
    performSubscribe(channel, address, label)
    await db.addressModel.findOneAndUpdate(
      { address: address, channel: channel.id },
      { label: label },
      { upsert: true }
    )

    channel.send(
      `Wallet${
        label ? ' of ' : ''
      }${label} with address: ${address} is now being followed!`
    )
  } catch (err) {
    logger.error(err)
    channel.send(
      `Sorry, following wallet${
        label ? ' of ' : ''
      }${label} with address: ${address} was not successful!`
    )
  }
}

const performSubscribe = (channel, address, label) => {
  try {
    const subscription = web3.eth
      .subscribe('alchemy_filteredNewFullPendingTransactions', {
        address: address
      })
      .on('data', (data) => {
        const addressIsSender = data.from === address
        const addressOrLabel = label || address
        const message = addressIsSender
          ? `${addressOrLabel} has sent ${data.value} ETH to ${data.to}`
          : `${addressOrLabel} has received ${data.value} ETH from ${data.from}`

        channel.send(message)
      })
    subscriptions[`${channel.id}-${address}`] = subscription
    console.log(subscriptions)
  } catch (err) {
    logger.error(err)
  }
}

const bulkSubscribe = async (client) => {
  const followedAddressDocuments = await db.addressModel.find({})
  followedAddressDocuments.forEach((entry) => {
    client.channels
      .fetch(`${entry.channel}`)
      .then((channel) => performSubscribe(channel, entry.address, entry.label))
      .catch((err) => logger.log(err))
  })
}

const unfollowWallet = async (channel, params) => {
  const queryString = params[0]

  if (!queryString) {
    channel.send('You must provide an address or label to unfollow a wallet!')
    return
  }

  try {
    let unfollowedEntry = await db.addressModel.findOneAndDelete({
      label: queryString,
      channel: channel.id
    })

    if (!unfollowedEntry) {
      unfollowedEntry = await db.addressModel.findOneAndDelete({
        address: queryString,
        channel: channel.id
      })
    }

    if (unfollowedEntry?.address) {
      const subscriptionToUnfollow =
        subscriptions[`${channel.id}-${unfollowedEntry.address}`]
      subscriptionToUnfollow && subscriptionToUnfollow.unsubscribe()

      channel.send(
        `Wallet${unfollowedEntry?.label ? ' of ' : ''}${
          unfollowedEntry?.label
        } with address: ${unfollowedEntry?.address} is now being unfollowed!`
      )
    }
  } catch (err) {
    logger.error(err)
    channel.send(
      `Sorry, unfollowing wallet by parameter: ${queryString} was not successful!`
    )
  }
}

module.exports = {
  followWallet,
  bulkSubscribe,
  unfollowWallet
}
