import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: 'info',
  ...(config.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});
