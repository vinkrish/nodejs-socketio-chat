var mongoose = require('mongoose')
var Schema = mongoose.Schema

var messageModel = new Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  msg: String,
  sentOn: { type: Date, default: Date.now },
  receivedOn: { type: Date },
  readOn: { type: Date }
})

module.exports = mongoose.model('Message', messageModel)
