const messageController = function (rethinkdb) {
  const getAll = (req, res, next) => {
    rethinkdb.table('messages')
      .orderBy({ index: 'ts' })
      .filter(rethinkdb.row('senderId').eq(req.userId).or(rethinkdb.row('receiverId').eq(req.userId)))
      .run(req.app._rdbConn, function (err, cursor) {
        if (err) return next(err)
        cursor.toArray(function (err, result) {
          if (err) return next(err)
          res.status(200).send({ data: result })
        })
      })
  }

  return {
    getAll
  }
}

module.exports = messageController
