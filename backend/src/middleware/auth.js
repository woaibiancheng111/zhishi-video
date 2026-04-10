/**
 * JWT 认证中间件
 * 从 Authorization header 提取 Bearer token 并验证
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT 认证中间件
 * 验证 token 并将 user_id 挂载到 req.user
 */
const authMiddleware = (req, res, next) => {
  try {
    // 获取 Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    // 提取 Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误'
      });
    }

    const token = parts[1];

    // 验证 token
    const decoded = jwt.verify(token, config.jwtSecret);

    // 将用户信息挂载到 req.user
    req.user = {
      user_id: decoded.user_id,
      phone: decoded.phone
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      });
    }
    return res.status(401).json({
      success: false,
      message: '认证令牌无效'
    });
  }
};

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，否则不拦截
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = {
        user_id: decoded.user_id,
        phone: decoded.phone
      };
    }
    next();
  } catch (error) {
    // token 无效时忽略，当作未登录处理
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
