module.exports = {
  rethinkdb: {
    host: process.env.RETHINKDB_HOST || '127.0.0.1',
    port: process.env.RETHINKDB_PORT || 28015,
    username: process.env.RETHINKDB_USERNAME || 'admin',
    password: process.env.RETHINKDB_PASSWORD || '',
    db: process.env.RETHINKDB_NAME || 'chat'
  },
  express: {
    port: process.env.PORT || 3000
  }
}
