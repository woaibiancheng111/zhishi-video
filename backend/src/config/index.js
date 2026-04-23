/**
 * 配置管理模块
 * 从环境变量读取配置
 */
require('dotenv').config();
const path = require('path');

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

  // 文件上传配置
  upload: {
    // 上传目录
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads'),
    // 最大文件大小：500MB
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 500 * 1024 * 1024,
    // 允许的视频格式
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    // 允许的图片格式
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },

  // 复习提醒配置
  reminder: {
    // 默认复习间隔（分钟）
    intervals: [1 * 60, 24 * 60, 48 * 60, 7 * 24 * 60],
  },
};

module.exports = config;
