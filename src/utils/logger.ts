import winston from 'winston';

const level = process.env.LOG_LEVEL ?? 'info';

export const Logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, module, ...rest }) => {
      const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
      const mod = module ? `[${module}] ` : '';
      return `${timestamp} ${level.toUpperCase()} ${mod}${message}${meta}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
