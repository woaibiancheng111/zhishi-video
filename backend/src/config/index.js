/**
 * 配置管理模块
 * 从环境变量读取配置
 */
require('dotenv').config();

const config = {
  // 服务端口
  port: parseInt(process.env.PORT, 10) || 3000,

  // 数据库连接
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:zhishi2026@localhost:5432/zhishi',

  // Redis 连接
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT 密钥
  jwtSecret: process.env.JWT_SECRET || 'zhishi-jwt-secret-2026',

  // JWT 过期时间
  jwtExpiresIn: '7d',

  // AI 服务地址
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // 分页默认配置
  defaultPageSize: 20,
  maxPageSize: 50,
};

module.exports = config;
