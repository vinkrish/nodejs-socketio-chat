const tagsController = function (rethinkdb) {
  const create = function (req, res, next) {
    const tags = req.body
    rethinkdb.table('tags').insert(tags, { returnChanges: true })
      .run(req.app._rdbConn, function (err, result) {
        if (err) return next(err)
        res.status(200).send({ data: result.changes[0].new_val })
      })
  }

  const getAll = function (req, res, next) {
    rethinkdb.table('tags')
      .run(req.app._rdbConn, function (err, cursor) {
        if (err) return next(err)
        cursor.toArray(function (err, result) {
          if (err) return next(err)
          res.status(200).send({ data: result })
        })
      })
  }

  const getOne = function (req, res, next) {
    const tagId = req.params.id
    rethinkdb.table('tags').get(tagId)
      .run(req.app._rdbConn, function (err, result) {
        if (err) return next(err)
        res.status(200).send({ data: result })
      })
  }

  const update = function (req, res, next) {
    const tagId = req.params.id
    rethinkdb.table('tags').get(tagId)
      .update(req.body)
      .run(req.app._rdbConn, function (err, result) {
        if (err) return next(err)
        res.status(200).send({ data: result })
      })
  }

  const remove = function (req, res, next) {
    const tagId = req.params.id
    rethinkdb.table('tags').get(tagId).delete()
      .run(req.app._rdbConn, function (err, result) {
        if (err) return next(err)
        res.status(204).send()
      })
  }

  return {
    create, getOne, getAll, update, remove
  }
}

module.exports = tagsController
