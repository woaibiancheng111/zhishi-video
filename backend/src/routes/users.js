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

    const user = await db.oneOrNone(
      'SELECT id, phone, nickname, avatar_url, career_direction, skill_tags, bio, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '登录状态已失效，请重新登录'
      });
    }

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
 * GET /api/v1/users/history
 * 获取用户学习历史（最近观看的视频）
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    const countResult = await db.one(
      `SELECT COUNT(DISTINCT video_id) as total FROM user_behaviors
       WHERE user_id = $1 AND behavior_type = 'play'`,
      [userId]
    );

    const history = await db.any(
      `SELECT DISTINCT ON (ub.video_id)
              ub.video_id, ub.duration as watched_duration, ub.progress,
              ub.created_at as watched_at,
              v.title, v.cover_url, v.duration as total_duration, v.category_id,
              c.name as category_name
       FROM user_behaviors ub
       JOIN videos v ON ub.video_id = v.id
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE ub.user_id = $1 AND ub.behavior_type = 'play'
       ORDER BY ub.video_id, ub.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Sort by watched_at descending after dedup
    history.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));

    res.json({
      success: true,
      data: {
        list: history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取学习历史错误]', error);
    res.status(500).json({ success: false, message: '获取学习历史失败' });
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


/**
 * POST /api/v1/users/check-in
 * 用户打卡，更新连续打卡天数和积分
 */
router.post('/check-in', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = req.app.locals.db || require('../models').getDb();

    // 获取用户统计数据
    let stats = await db.oneOrNone('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
    if (!stats) {
      stats = await db.one(
        'INSERT INTO user_statistics (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = stats.last_check_in_date 
      ? new Date(stats.last_check_in_date).toISOString().split('T')[0]
      : null;

    let continuousDays = stats.continuous_days || 0;
    let checkInCount = stats.check_in_count || 0;
    let totalPoints = stats.total_points || 0;

    if (lastCheckIn === today) {
      return res.json({ success: false, message: '今天已打卡，请明天再来' });
    }

    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      continuousDays = diffDays === 1 ? continuousDays + 1 : 1;
    } else {
      continuousDays = 1;
    }

    checkInCount += 1;
    totalPoints += 10;

    await db.none(
      `UPDATE user_statistics 
       SET check_in_count = $1, continuous_days = $2, last_check_in_date = $3, total_points = $4, updated_at = NOW()
       WHERE user_id = $5`,
      [checkInCount, continuousDays, today, totalPoints, userId]
    );

    if (continuousDays === 7) {
      const badge = await db.oneOrNone("SELECT id FROM badges WHERE name = '连续打卡7天' LIMIT 1");
      if (badge) {
        const hasBadge = await db.oneOrNone('SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2', [userId, badge.id]);
        if (!hasBadge) await db.none('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badge.id]);
      }
    }

    res.json({
      success: true,
      message: '打卡成功',
      data: { check_in_count: checkInCount, continuous_days: continuousDays, total_points: totalPoints, badge_unlocked: continuousDays === 7 ? '连续打卡7天' : null }
    });
  } catch (error) {
    console.error('[打卡错误]', error);
    res.status(500).json({ success: false, message: '打卡失败' });
  }
});

/**
 * GET /api/v1/users/achievements
 * 获取用户成就与统计信息
 */
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = req.app.locals.db || require('../models').getDb();

    const stats = await db.oneOrNone('SELECT * FROM user_statistics WHERE user_id = $1', [userId]) || {};
    const badges = await db.any(
      `SELECT b.id, b.name, b.description, b.icon_url, b.category, ub.earned_at
       FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC`, [userId]
    );

    const allBadges = await db.any('SELECT id, name, description, icon_url, category FROM badges ORDER BY sort_order');

    const badgeProgress = allBadges.map(badge => {
      const earned = badges.some(b => b.id === badge.id);
      let progress = 0;
      if (badge.name === '连续打卡7天') progress = Math.min((stats.continuous_days || 0) / 7 * 100, 100);
      else progress = earned ? 100 : 0; // Simplified
      return { ...badge, earned, progress: Math.floor(progress) };
    });

    res.json({
      success: true,
      data: { statistics: stats, badges: { earned_count: badges.length, earned: badges, all_progress: badgeProgress } }
    });
  } catch (error) {
    console.error('[获取成就错误]', error);
    res.status(500).json({ success: false, message: '获取信息失败' });
  }
});

module.exports = router;

