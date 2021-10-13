module.exports = {
  rethinkdb: {
    host: process.env.RETHINKDB_HOST || 'localhost',
    port: process.env.RETHINKDB_PORT || 28015,
    username: process.env.RETHINKDB_USERNAME || 'admin',
    password: process.env.RETHINKDB_PASSWORD || '',
    db: process.env.RETHINKDB_NAME || 'test'
  },
  express: {
    port: process.env.PORT || 3000
  }
}
