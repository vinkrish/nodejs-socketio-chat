const express = require('express')

const routes = function (rethinkdb) {
  const tagsRouter = express.Router()

  const verifyToken = require('./verifyToken')

  const tagsController = require('../Controllers/tagsController')(rethinkdb)

  tagsRouter.route('/')
    .post(verifyToken, tagsController.create)
    .get(verifyToken, tagsController.getAll)

  tagsRouter.route('/:id')
    .get(verifyToken, tagsController.getOne)
    .put(verifyToken, tagsController.update)
    .delete(verifyToken, tagsController.remove)

  return tagsRouter
}

module.exports = routes
