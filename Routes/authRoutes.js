const express = require('express')

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const verifyToken = require('./verifyToken')

const routes = function (rethinkdb) {
  const authRouter = express.Router()

  authRouter.route('/register')
    .post((req, res, next) => {
      let tableName = 'users'
      const account = req.body
      const hashedPassword = bcrypt.hashSync(account.password, 8)
      account.password = hashedPassword
      account.createdAt = rethinkdb.now()

      if (account.expert) tableName = 'experts'
      delete account.expert

      rethinkdb.table(tableName).filter(rethinkdb.row('email').eq(req.body.email))
        .run(req.app._rdbConn, function (err, cursor) {
          if (err) res.status(500).send('Error on the server.')
          cursor.toArray(function (err, result) {
            if (err) res.status(500).send('Error on the server.')
            if (result.length > 0) return res.status(404).send('Account with this Email exist.')
            rethinkdb.table(tableName).insert(account, { returnChanges: true })
              .run(req.app._rdbConn, function (err, result) {
                if (err) {
                  return next(err)
                }
                res.status(200).send({ data: result.changes[0].new_val })
              })
          })
        })
    })

  authRouter.route('/login')
    .post((req, res, next) => {
      let tableName = 'users'
      const body = req.body
      if (body.expert) tableName = 'experts'
      rethinkdb.table(tableName).filter(rethinkdb.row('email').eq(body.email))
        .run(req.app._rdbConn, function (err, cursor) {
          if (err) return res.status(500).send('Error on the server.')
          cursor.toArray(function (err, result) {
            if (err) return res.status(500).send('Error on the server.')
            if (result.length === 0) return res.status(404).send('No user found.')
            const account = result[0]
            // check if the password is valid
            const passwordIsValid = bcrypt.compareSync(body.password, account.password)
            if (!passwordIsValid) return res.status(401).send({ auth: false, token: null })

            // if user is found and password is valid
            // create a token
            const token = jwt.sign({ id: account.id }, process.env.JWT_SECRET, {
              expiresIn: 86400 // expires in 24 hours
            })

            const obj = { id: account.id, firstName: account.firstName, lastName: account.lastName, email: account.email, token }
            if (tableName === 'experts') obj.isAdmin = true
            else obj.isAdmin = false

            res.status(200).send({ data: obj })
          })
        })
    })

  authRouter.route('/contacts')
    .get(verifyToken, function (req, res, next) {
      let tableName = 'users'
      const accountId = req.userId
      rethinkdb.table(tableName).get(accountId)
        .run(req.app._rdbConn, function (err, result) {
          if (err) return next(err)
          if (result) tableName = 'experts'
          rethinkdb.table(tableName)
            .run(req.app._rdbConn, function (err, cursor) {
              if (err) return next(err)
              cursor.toArray(function (err, result) {
                if (err) return next(err)
                res.status(200).send({ data: result })
              })
            })
        })
    })

  return authRouter
}

module.exports = routes
