import winston from 'winston';
import * as path from "path";
import electron from "electron";

const logPath = path.join(electron.app.getPath('userData'), 'logs');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'nomad-ui.electron' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({
      filename: `${logPath}/error.log`,
      level: 'error',
      maxsize: 2e+6,
      maxFiles: 1,
    }),
    new winston.transports.File({
      filename: `${logPath}/combined.log`,
      maxsize: 2e+6,
      maxFiles: 1,
    })
  ],
});

const ddrpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'ddrp' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({
      filename: `${logPath}/ddrp-error.log`,
      level: 'error',
      maxsize: 2e+6,
      maxFiles: 1,
    }),
    new winston.transports.File({
      filename: `${logPath}/ddrp-combined.log`,
      maxsize: 2e+6,
      maxFiles: 1,
    })
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
  ddrpLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
export const loggers = {
  ddrp: ddrpLogger,
};
