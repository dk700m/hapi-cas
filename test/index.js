'use strict'

const path = require('path')
const pino = require('pino')
const log = pino({prettyPrint: true, level: 'trace'})
const casServer = require(path.join(__dirname, 'lib', 'casServer'))

const hapi = require('hapi')
const server = new hapi.Server()
server.connection({
  host: 'localhost',
  address: '127.0.0.1',
  port: 8080
})

server.register(
  {
    register: require('hapi-easy-session'),
    options: {
      cookie: {
        isSecure: false
      }
    }
  },
  function (err) { if (err) { throw err } }
)

server.register(require(path.join(__dirname, '..', 'plugin')), (err) => {
  if (err) return err
  const options = {
    casServerUrl: 'http://127.0.0.1:9000',
    localAppUrl: 'http://127.0.0.1:8080',
    endPointPath: '/casHandler',
    saveRawCAS: true,
    logger: log
  }
  server.auth.strategy('casauth', 'cas', options)
})

setImmediate(() => {
  server.route({
    method: 'GET',
    path: '/foo',
    handler: function (request, reply) {
      return reply(request.session)
    },
    config: {
      auth: {
        strategy: 'casauth'
      }
    }
  })
})

function testServerCB () {
  console.log('test server started')
  const request = require('request')
  request(
    {
      url: 'http://127.0.0.1:8080/foo',
      jar: true
    },
    function (error, response, body) {
      if (error) return error
      casServer.stop(function () {
        console.log('cas server stopped')
      })
      server.stop(function () {
        console.log('test server stopped')
        const assert = require('assert')
        const json = JSON.parse(body)
        assert.equal(json.username, 'foouser')
        assert.equal(json.rawCas['user_uuid'], '1234567-ghsld')
        console.log('test is successful')
      })
    }
  )
}

casServer.start(function () {
  console.log('cas server started')
  server.start(testServerCB)
})
