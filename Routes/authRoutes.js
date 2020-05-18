const express = require('express')

var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')
const verifyToken = require('./verifyToken')

var routes = function (User) {
  var authRouter = express.Router()

  authRouter.route('/register')
    .post(function (req, res) {
      var hashedPassword = bcrypt.hashSync(req.body.password, 8)

      User.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hashedPassword
      }, function (err, user) {
        if (err) return res.status(500).send('There was a problem registering the user.')
        res.status(200).send({ data: 'User created successfully!' })
      })
    })

  authRouter.route('/login')
    .post(function (req, res) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (err) return res.status(500).send('Error on the server.')
        if (!user) return res.status(404).send('No user found.')

        // check if the password is valid
        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password)
        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null })

        // if user is found and password is valid
        // create a token
        var token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: 86400 // expires in 24 hours
        })

        var obj = { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, token }
        res.status(200).send({ data: obj })
      })
    })

  authRouter.route('/users')
    .get(verifyToken, function (req, res) {
      User.find({ _id: { $ne: req.userId } }, function (err, users) {
        if (err) res.status(500).send(err)
        res.json({ data: users })
      })
    })

  return authRouter
}

module.exports = routes
