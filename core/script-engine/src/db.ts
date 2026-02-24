import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  })

  client.$on('error', (e) => {
    logger.error({ err: e }, 'Prisma error')
  })

  client.$on('warn', (e) => {
    logger.warn({ warn: e }, 'Prisma warning')
  })

  return client
}

export const db: PrismaClient = global.__prisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = db
}

export const connectDb = async (): Promise<void> => {
  await db.$connect()
  logger.info('Database connected')
}

export const disconnectDb = async (): Promise<void> => {
  await db.$disconnect()
  logger.info('Database disconnected')
}
