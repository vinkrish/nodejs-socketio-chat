var messageController = function (Message, io) {
  var post = function (req, res) {
    var message = new Message(req.body)
    message.save(function (err) {
      if (err) return res.status(500).send('Message failed!.')
      io.sockets.in('req.body.receiverId').emit('new_msg', { msg: req.body })
      res.status(201).send(message)
    })
  }

  var getAll = function (req, res) {
    var query = {
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    }
    Message.find(query, function (err, messages) {
      if (err) res.status(500).send(err)
      res.json({ data: messages })
    })
  }

  var get = function (req, res) {
    var query = {
      $or: [
        { $and: [{ senderId: req.query.senderId }, { receiverId: req.query.receiverId }] },
        { $and: [{ senderId: req.query.receiverId }, { receiverId: req.query.senderId }] }
      ]
    }
    Message.find(query, function (err, messages) {
      if (err) res.status(500).send(err)
      res.json({ data: messages })
    })
  }

  var updateReceivedOn = function (req, res) {
    Message.update(
      { _id: { $in: req.body.messageIds } },
      { receivedOn: new Date() },
      function (err, message) {
        if (err) { res.status(500).send(err) }
        io.sockets.in('req.body.receiverId').emit('receivedOn', { msg: req.body.messageIds })
        res.json({ data: message })
      }
    )
  }

  var updateReadOn = function (req, res) {
    Message.update(
      { _id: { $in: req.body.messageIds } },
      { readOn: new Date() },
      function (err, message) {
        if (err) { res.status(500).send(err) }
        io.sockets.in('req.body.receiverId').emit('readOn', { msg: req.body.messageIds })
        res.json({ data: message })
      }
    )
  }

  return {
    post, get, getAll, updateReceivedOn, updateReadOn
  }
}

module.exports = messageController
