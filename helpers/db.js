const mongoose = require('mongoose')

const logger = require('./log')

mongoose.connect(process.env.MONGO_SRV, {
  useNewUrlParser: true
})
const connection = mongoose.connection
connection.once('open', () => {
  logger.log('connected to MongoDB successfully')
})

const addressModel = mongoose.model('addresses', {
  address: { type: String },
  label: { type: String },
  channel: { type: Number }
})

module.exports = {
  addressModel
}
