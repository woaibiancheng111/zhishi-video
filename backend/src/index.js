/**
 * 知视后端服务入口
 * Express 服务，连接 PostgreSQL 和 Redis
 */
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initDb } = require('./models');

// 导入路由
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const feedRoutes = require('./routes/feed');
const searchRoutes = require('./routes/search');
const favoriteRoutes = require('./routes/favorites');
const userRoutes = require('./routes/users');

const app = express();
const PORT = config.port;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zhishi-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 注册路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/users', userRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[错误]', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// 启动服务
async function start() {
  try {
    // 初始化数据库连接
    const db = await initDb();
    console.log('PostgreSQL 数据库连接成功');

    app.listen(PORT, () => {
      console.log(`知视后端服务已启动，端口: ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

start();
