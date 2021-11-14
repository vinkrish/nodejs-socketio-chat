const express = require('express')
const cors = require('cors')
const rethinkdb = require('rethinkdb')
const path = require('path')
const dotenv = require('dotenv')
const async = require('async')
const bcrypt = require('bcryptjs')

dotenv.config()

const app = express()

let rdbConn = null
// Load config for RethinkDB and express
const config = require(path.join(__dirname, '/config.js'))

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.set('view engine', 'html')
const port = process.env.PORT || 8000

const server = require('http').createServer(app)
const io = require('socket.io')(server, { cors: { origin: '*' } })

const authRouter = require('./Routes/authRoutes')(rethinkdb)
app.use('/api/auth', authRouter)
const messageRouter = require('./Routes/messageRoutes')(rethinkdb)
app.use('/api/message', messageRouter)
const tagsRouter = require('./Routes/tagsRoutes')(rethinkdb)
app.use('/api/tags', tagsRouter)

// Generic error handling middleware.
app.use(handleError)

// React app
app.use(express.static(path.join(__dirname, 'react-app')))
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'react-app', 'index.html'))
})

io.on('connection', (socket) => {
  socket.on('join', function (data) {
    socket.join(data.id)
  })
  socket.on('sendMessage', (message) => {
    rethinkdb.table('messages')
      .insert(Object.assign(message, { ts: Date.now() }))
      .run(rdbConn, function (err, res) {
        if (err) throw err
        io.sockets.in(message.receiverId).emit('new_msg', { msg: Object.assign(message, { id: res.generated_keys[0] }) })
        io.sockets.in(message.senderId).emit('new_msg', { msg: Object.assign(message, { id: res.generated_keys[0] }) })
      })
  })
  socket.on('messageReceived', (message) => {
    const receivedOn = Date.now()
    const updatedMessage = Object.assign(message, { receivedOn: receivedOn })
    rethinkdb.table('messages').get(message.id)
      .update({ receivedOn: receivedOn })
      .run(rdbConn, function (err, res) {
        if (err) throw err
        io.sockets.in(message.senderId).emit('message_received_ack', { msg: updatedMessage })
      })
  })
  socket.on('messageRead', (message) => {
    const readOn = Date.now()
    const updatedMessage = Object.assign(message, { readOn: readOn })
    rethinkdb.table('messages').get(message.id)
      .update({ readOn: readOn })
      .run(rdbConn, function (err, res) {
        if (err) throw err
        io.sockets.in(message.senderId).emit('message_read_ack', { msg: updatedMessage })
      })
  })
  socket.on('typing', (data) => {
    io.sockets.in(data.receiverId).emit('typing_display', { typing: true, senderId: data.senderId })
  })
})

/*
 * Generic error handling middleware.
 * Send back a 500 page and log the error to the console.
 */
function handleError (err, req, res, next) {
  console.error(err.stack)
  res.status(500).json({ err: err.message })
}

function startExpress (connection) {
  rdbConn = connection
  app._rdbConn = connection
  server.listen(port)
  console.log('Listening on port ' + config.express.port)
}

/*
 * Connect to rethinkdb, create the needed tables/indexes and then start express.
 * Create tables/indexes then start express
 */
async.waterfall([
  function connect (callback) {
    rethinkdb.connect(config.rethinkdb, callback)
  },
  function createDatabase (connection, callback) {
    rethinkdb.dbList().contains(config.rethinkdb.db).do(function (containsDb) {
      return rethinkdb.branch(
        containsDb,
        { created: 0 },
        rethinkdb.dbCreate(config.rethinkdb.db)
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function createUsersTable (connection, callback) {
    rethinkdb.tableList().contains('users').do(function (containsTable) {
      return rethinkdb.branch(
        containsTable,
        { created: 0 },
        rethinkdb.tableCreate('users')
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function createExpertsTable (connection, callback) {
    rethinkdb.tableList().contains('experts').do(function (containsTable) {
      return rethinkdb.branch(
        containsTable,
        { created: 0 },
        rethinkdb.tableCreate('experts')
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function insertAliceUser (connection, callback) {
    const account = {
      firstName: 'Alice',
      lastName: '',
      email: 'alice@gmail.com',
      password: bcrypt.hashSync(process.env.ALICE_PASSWORD, 8)
    }
    rethinkdb.table('experts').filter(rethinkdb.row('firstName').eq('Alice'))
      .run(connection, function (err, cursor) {
        if (err) callback(err, connection)
        cursor.toArray(function (err, result) {
          if (err) console.log('Error when creating Alice user!')
          if (result.length === 0) {
            rethinkdb.table('experts').insert(account)
              .run(connection, function (err) {
                callback(err, connection)
              })
          } else callback(err, connection)
        })
      })
  },
  function createTagsTable (connection, callback) {
    rethinkdb.tableList().contains('tags').do(function (containsTable) {
      return rethinkdb.branch(
        containsTable,
        { created: 0 },
        rethinkdb.tableCreate('tags')
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function createMessagesTable (connection, callback) {
    rethinkdb.tableList().contains('messages').do(function (containsTable) {
      return rethinkdb.branch(
        containsTable,
        { created: 0 },
        rethinkdb.tableCreate('messages')
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function createIndex (connection, callback) {
    rethinkdb.table('messages').indexList().contains('ts').do(function (hasIndex) {
      return rethinkdb.branch(
        hasIndex,
        { created: 0 },
        rethinkdb.table('messages').indexCreate('ts')
      )
    }).run(connection, function (err) {
      callback(err, connection)
    })
  },
  function waitForIndex (connection, callback) {
    rethinkdb.table('messages').indexWait('ts').run(connection, function (err, result) {
      callback(err, connection)
    })
  }
], function (err, connection) {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  startExpress(connection)
})

module.exports = app
