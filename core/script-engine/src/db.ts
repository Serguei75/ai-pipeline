import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const db = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

db.$on('error', (e) => {
  logger.error({ msg: e.message, target: e.target }, 'Prisma error')
})

db.$on('warn', (e) => {
  logger.warn({ msg: e.message, target: e.target }, 'Prisma warning')
})

export { db }
