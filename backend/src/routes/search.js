/**
 * 搜索路由
 * 视频搜索和搜索建议
 */
const express = require('express');
const { getDb, getRedis } = require('../models');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/v1/search?q=xxx&limit=20
 * 搜索视频
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const keyword = q.trim();
    const offset = (page - 1) * limit;
    const db = getDb();

    // 记录搜索词到 Redis（用于热门搜索统计）
    try {
      const redis = getRedis();
      if (redis) {
        await redis.zincrby('search:hot_keywords', 1, keyword);
      }
    } catch (redisError) {
      console.log('[Redis写入搜索词失败]', redisError.message);
    }

    // PostgreSQL LIKE 查询
    const searchPattern = `%${keyword}%`;
    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM videos v
       WHERE v.status = 'published'
       AND (v.title ILIKE $1 OR v.description ILIKE $1 OR v.tags::text ILIKE $1)`,
      [searchPattern]
    );

    const videos = await db.any(
      `SELECT v.*, c.name as category_name
       FROM videos v
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.status = 'published'
       AND (v.title ILIKE $1 OR v.description ILIKE $1 OR v.tags::text ILIKE $1)
       ORDER BY v.play_count DESC
       LIMIT $2 OFFSET $3`,
      [searchPattern, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        keyword,
        list: videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[搜索错误]', error);
    res.status(500).json({
      success: false,
      message: '搜索失败'
    });
  }
});

/**
 * GET /api/v1/search/suggest?q=xxx
 * 搜索建议
 */
router.get('/suggest', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      // 返回热门搜索词
      return getHotKeywords(req, res);
    }

    const keyword = q.trim();
    const db = getDb();

    // 从数据库中搜索匹配的视频标题
    const suggestions = await db.any(
      `SELECT DISTINCT title FROM videos
       WHERE status = 'published' AND title ILIKE $1
       ORDER BY play_count DESC
       LIMIT 8`,
      [`%${keyword}%`]
    );

    res.json({
      success: true,
      data: suggestions.map(s => s.title)
    });
  } catch (error) {
    console.error('[搜索建议错误]', error);
    res.status(500).json({
      success: false,
      message: '获取搜索建议失败'
    });
  }
});

/**
 * 获取热门搜索词
 */
async function getHotKeywords(req, res) {
  try {
    const redis = getRedis();
    let hotKeywords = [];

    if (redis) {
      // 从 Redis 获取热门搜索词
      const result = await redis.zrevrange('search:hot_keywords', 0, 9, 'WITHSCORES');
      hotKeywords = result.filter((_, i) => i % 2 === 0);
    }

    // 如果 Redis 没有数据，返回默认热门词
    if (hotKeywords.length === 0) {
      hotKeywords = [
        '产品经理入门',
        '数据分析',
        '用户运营',
        'Python教程',
        'UI设计',
        '项目管理',
        'SQL查询',
        '需求分析'
      ];
    }

    res.json({
      success: true,
      data: hotKeywords
    });
  } catch (error) {
    res.json({
      success: true,
      data: ['产品经理入门', '数据分析', '用户运营', 'Python教程', 'UI设计']
    });
  }
}

module.exports = router;
