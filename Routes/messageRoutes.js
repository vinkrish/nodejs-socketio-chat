const express = require('express')

const routes = function (Message, io) {
  const messageRouter = express.Router()

  const verifyToken = require('./verifyToken')

  const messageController = require('../Controllers/messageController')(Message, io)

  messageRouter.route('/')
    .post(verifyToken, messageController.post)
    .get(verifyToken, messageController.getAll)

  messageRouter.route('/receivedOn')
    .put(verifyToken, messageController.updateReceivedOn)
  messageRouter.route('/readOn')
    .put(verifyToken, messageController.updateReadOn)

  return messageRouter
}

module.exports = routes
