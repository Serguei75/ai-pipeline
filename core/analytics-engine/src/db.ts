import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const db = new PrismaClient({
  log: [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
})

db.$on('error', (e) => logger.error({ msg: e.message }, 'Prisma error'))
db.$on('warn', (e) => logger.warn({ msg: e.message }, 'Prisma warning'))

export { db }
