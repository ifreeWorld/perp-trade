/**
 * 日志工具模块
 * 使用 Winston 记录日志到文件和控制台
 */

import winston from 'winston';
import path from 'path';

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack) {
      msg += `\n${meta.stack}`;
    }
    return msg;
  })
);

// 创建日志目录
const logsDir = path.resolve(process.cwd(), 'logs');

// 创建 logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出（彩色）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),

    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'trading.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // 保留30天
    }),

    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 30,
    }),

    // 告警日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'alerts.log'),
      level: 'warn',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],
});

// 添加自定义日志级别方法
export const log = {
  info: (message: string, ...meta: any[]) => logger.info(message, ...meta),
  warn: (message: string, ...meta: any[]) => logger.warn(message, ...meta),
  error: (message: string, error?: any) => {
    if (error instanceof Error) {
      logger.error(message, { stack: error.stack, message: error.message });
    } else if (error) {
      logger.error(message, { error });
    } else {
      logger.error(message);
    }
  },
  debug: (message: string, ...meta: any[]) => logger.debug(message, ...meta),
  critical: (message: string, ...meta: any[]) => {
    logger.error(`🚨 CRITICAL: ${message}`, ...meta);
  },
};

export default log;
