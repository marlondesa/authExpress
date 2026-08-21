import { Request, Response, NextFunction } from 'express';
import * as winston from 'winston';

// Configura logger único para a aplicação
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // Opcional: gravar em arquivo
    // new winston.transports.File({ filename: 'logs/app.log' })
  ],
});

// Middleware que registra requisições HTTP
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
};

// Middleware de erro que registra stack trace
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });
  next(err);
};
