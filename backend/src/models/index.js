/**
 * 数据库模型模块
 * 使用 pg-promise 初始化 PostgreSQL 连接
 * 使用 ioredis 初始化 Redis 连接
 */
const pgPromise = require('pg-promise');
const Redis = require('ioredis');
const config = require('../config');

// pg-promise 初始化配置
const pgp = pgPromise({
  // 连接错误处理
  error(err, e) {
    if (e.cn) {
      console.error('[数据库连接错误]', err.message);
    }
  }
});

// 数据库实例
let db = null;
// Redis 实例
let redis = null;

/**
 * 初始化数据库连接
 */
async function initDb() {
  try {
    db = pgp(config.databaseUrl);

    // 测试连接
    await db.any('SELECT NOW()');
    console.log('PostgreSQL 连接成功');

    // 初始化 Redis 连接
    try {
      redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 200, 2000);
          return delay;
        }
      });

      redis.on('connect', () => {
        console.log('Redis 连接成功');
      });

      redis.on('error', (err) => {
        console.error('[Redis连接错误]', err.message);
      });
    } catch (redisError) {
      console.warn('[Redis初始化警告]', redisError.message);
    }

    return db;
  } catch (error) {
    console.error('[数据库初始化失败]', error);
    throw error;
  }
}

/**
 * 获取数据库实例
 */
function getDb() {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

/**
 * 获取Redis实例
 */
function getRedis() {
  return redis;
}

module.exports = { initDb, getDb, getRedis, pgp };
