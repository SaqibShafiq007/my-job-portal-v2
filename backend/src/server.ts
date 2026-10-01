import 'dotenv/config'
import { config } from './shared/config.js'
import { buildApp } from './app.js'
import { pool } from './shared/db.js'
import redis from './shared/redis.js'
import logger from './shared/logger.js'

const app = buildApp()

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'API server started')
})

function shutdown(signal: string) {
  logger.info(`${signal} received — starting graceful shutdown`)

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed — cleaning up')

    try {
      await pool.end()
      logger.info('DB pool closed')
    } catch (err) {
      logger.error({ err }, 'Error closing DB pool')
    }

    try {
      await redis.quit()
      logger.info('Redis connection closed')
    } catch (err) {
      logger.error({ err }, 'Error closing Redis')
    }

    logger.info('Graceful shutdown complete')
    process.exit(0)
  })

  // Force exit after 5 seconds if requests are still in flight
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — forcing exit')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))