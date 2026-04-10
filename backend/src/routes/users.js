/**
 * 用户路由
 * 用户信息查询和更新
 */
const express = require('express');
const { getDb } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有用户接口都需要登录
router.use(authMiddleware);

/**
 * GET /api/v1/users/me
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = getDb();

    const user = await db.one(
      'SELECT id, phone, nickname, avatar_url, career_direction, skill_tags, bio, created_at FROM users WHERE id = $1',
      [userId]
    );

    // 获取学习统计
    const stats = await db.one(
      `SELECT
        COUNT(DISTINCT CASE WHEN behavior_type = 'play' THEN video_id END) as watched_count,
        COUNT(DISTINCT CASE WHEN behavior_type = 'like' THEN video_id END) as liked_count,
        COUNT(DISTINCT id) as total_behaviors
       FROM user_behaviors
       WHERE user_id = $1`,
      [userId]
    );

    // 获取收藏数
    const favCount = await db.one(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          watched_count: parseInt(stats.watched_count) || 0,
          liked_count: parseInt(stats.liked_count) || 0,
          favorites_count: parseInt(favCount.total) || 0
        }
      }
    });
  } catch (error) {
    console.error('[获取用户信息错误]', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

/**
 * PUT /api/v1/users/me
 * 更新用户信息
 * 请求体: { nickname?, avatar_url?, bio?, career_direction?, skill_tags? }
 */
router.put('/me', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { nickname, avatar_url, bio, career_direction, skill_tags } = req.body;
    const db = getDb();

    // 构建更新字段
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex}`);
      params.push(nickname);
      paramIndex++;
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      params.push(avatar_url);
      paramIndex++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      params.push(bio);
      paramIndex++;
    }
    if (career_direction !== undefined) {
      updates.push(`career_direction = $${paramIndex}`);
      params.push(career_direction);
      paramIndex++;
    }
    if (skill_tags !== undefined) {
      updates.push(`skill_tags = $${paramIndex}`);
      params.push(skill_tags);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const user = await db.one(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, phone, nickname, avatar_url, career_direction, skill_tags, bio, updated_at`,
      params
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[更新用户信息错误]', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
});

module.exports = router;
