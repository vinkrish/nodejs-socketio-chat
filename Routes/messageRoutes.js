const express = require('express')

const routes = function (rethinkdb, io) {
  const messageRouter = express.Router()

  const verifyToken = require('./verifyToken')

  const messageController = require('../Controllers/messageController')(rethinkdb)

  messageRouter.route('/')
    .get(verifyToken, messageController.getAll)

  return messageRouter
}

module.exports = routes
