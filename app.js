const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config()

mongoose.set('useUnifiedTopology', true)
mongoose.set('useFindAndModify', false)

var User = require('./models/UserModel')

var Message = require('./models/messageModel')

var app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

mongoose.connect(process.env.DB_PATH,
  { useNewUrlParser: true }, () => { console.log('we are connected') }).catch(err => console.log(err))
var db = mongoose.connection

app.set('view engine', 'html')
const port = process.env.PORT || 5000

const server = require('http').createServer(app)
const io = require('socket.io')(server)

const authRouter = require('./Routes/authRoutes')(User)
app.use('/api/auth', authRouter)
const messageRouter = require('./Routes/messageRoutes')(Message, io)
app.use('/api/message', messageRouter)

/*
// React app
app.use(express.static(path.join(__dirname, 'react-app')));
app.get('/react', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'react-app', 'index.html'));
});
*/
app.get('*', (req, res) => {
  res.status(404).send('You are not allowed to be here!')
})

io.on('connection', (socket) => {
  socket.on('join', function (data) {
    socket.join(data.id)
  })
  socket.on('sendMessage', (message) => {
    Message.create(message, function (err, message) {
      if (err) io.sockets.in(message.senderId).emit('failed_msg', { msg: message })
      else {
        io.sockets.in(message.receiverId).emit('new_msg', { msg: message })
        io.sockets.in(message.senderId).emit('new_msg', { msg: message })
      }
    })
  })
  socket.on('messageReceived', (message) => {
    Message.updateOne(
      { _id: message._id },
      { receivedOn: new Date() },
      function (err, doc) {
        if (err) io.sockets.in(message.receiverId).emit('msg_received_failed', { msg: message })
        else {
          message.receivedOn = new Date()
          io.sockets.in(message.senderId).emit('message_received_ack', { msg: message })
        }
      }
    )
  })
  socket.on('messageRead', (message) => {
    Message.updateOne(
      { _id: message._id },
      { readOn: new Date() },
      function (err, doc) {
        if (err) io.sockets.in(message.receiverId).emit('msg_read_failed', { msg: message })
        else {
          message.readOn = new Date()
          io.sockets.in(message.senderId).emit('message_read_ack', { msg: message })
        }
      }
    )
  })
  socket.on('typing', (data) => {
    console.log(data)
    io.sockets.in(data.receiverId).emit('typing_display', { typing: true, senderId: data.senderId })
  })
})
server.listen(port)

module.exports = app
