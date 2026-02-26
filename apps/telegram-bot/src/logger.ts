import * as pino from 'pino';
import { config } from './config.js';

const logger = pino.default({
  level: 'info',
  ...(config.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

export { logger };
