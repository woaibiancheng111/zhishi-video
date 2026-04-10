/**
 * 视频路由
 * 视频CRUD、分类、点赞、播放行为上报
 */
const express = require('express');
const { getDb } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/v1/videos
 * 获取视频列表（支持分页、分类筛选）
 * 查询参数: page, limit, category_id, sort(hot/new)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, sort = 'new' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereClause = 'WHERE v.status = $1';
    const params = ['published'];
    let paramIndex = 2;

    if (category_id) {
      whereClause += ` AND v.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // 排序
    let orderBy = 'v.created_at DESC';
    if (sort === 'hot') {
      orderBy = 'v.play_count DESC, v.like_count DESC';
    }

    // 查询总数
    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM videos v ${whereClause}`,
      params
    );

    // 查询视频列表
    const videos = await db.any(
      `SELECT v.*, c.name as category_name, c.icon as category_icon
       FROM videos v
       LEFT JOIN categories c ON v.category_id = c.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // 如果用户已登录，查询用户的点赞状态
    let likedVideoIds = new Set();
    if (req.user) {
      const likes = await db.any(
        'SELECT video_id FROM user_behaviors WHERE user_id = $1 AND behavior_type = $2',
        [req.user.user_id, 'like']
      );
      likedVideoIds = new Set(likes.map(l => l.video_id));
    }

    // 格式化返回数据
    const formattedVideos = videos.map(v => ({
      ...v,
      is_liked: likedVideoIds.has(v.id)
    }));

    res.json({
      success: true,
      data: {
        list: formattedVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取视频列表错误]', error);
    res.status(500).json({
      success: false,
      message: '获取视频列表失败'
    });
  }
});

/**
 * GET /api/v1/videos/:id
 * 获取视频详情
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const video = await db.oneOrNone(
      `SELECT v.*, c.name as category_name, c.icon as category_icon
       FROM videos v
       LEFT JOIN categories c ON v.category_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    // 查询创作者信息
    const creator = await db.oneOrNone(
      'SELECT id, nickname, avatar_url FROM users WHERE id = $1',
      [video.creator_id]
    );

    // 如果用户已登录，查询是否已点赞
    let isLiked = false;
    let isFavorited = false;
    if (req.user) {
      const like = await db.oneOrNone(
        'SELECT id FROM user_behaviors WHERE user_id = $1 AND video_id = $2 AND behavior_type = $3',
        [req.user.user_id, id, 'like']
      );
      isLiked = !!like;

      const fav = await db.oneOrNone(
        'SELECT id FROM favorites WHERE user_id = $1 AND video_id = $2',
        [req.user.user_id, id]
      );
      isFavorited = !!fav;
    }

    res.json({
      success: true,
      data: {
        ...video,
        creator,
        is_liked: isLiked,
        is_favorited: isFavorited
      }
    });
  } catch (error) {
    console.error('[获取视频详情错误]', error);
    res.status(500).json({
      success: false,
      message: '获取视频详情失败'
    });
  }
});

/**
 * POST /api/v1/videos/:id/like
 * 点赞/取消点赞视频
 */
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    // 检查视频是否存在
    const video = await db.oneOrNone('SELECT id FROM videos WHERE id = $1', [id]);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    // 检查是否已点赞
    const existing = await db.oneOrNone(
      'SELECT id FROM user_behaviors WHERE user_id = $1 AND video_id = $2 AND behavior_type = $3',
      [userId, id, 'like']
    );

    if (existing) {
      // 取消点赞
      await db.none('DELETE FROM user_behaviors WHERE id = $1', [existing.id]);
      await db.none('UPDATE videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [id]);

      res.json({
        success: true,
        data: { liked: false }
      });
    } else {
      // 添加点赞
      await db.none(
        'INSERT INTO user_behaviors (user_id, video_id, behavior_type, created_at) VALUES ($1, $2, $3, NOW())',
        [userId, id, 'like']
      );
      await db.none('UPDATE videos SET like_count = like_count + 1 WHERE id = $1', [id]);

      res.json({
        success: true,
        data: { liked: true }
      });
    }
  } catch (error) {
    console.error('[点赞错误]', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

/**
 * POST /api/v1/videos/:id/play
 * 上报播放行为
 */
router.post('/:id/play', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { duration = 0, progress = 0 } = req.body;
    const userId = req.user.user_id;
    const db = getDb();

    // 检查视频是否存在
    const video = await db.oneOrNone('SELECT id FROM videos WHERE id = $1', [id]);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    // 记录播放行为
    await db.none(
      `INSERT INTO user_behaviors (user_id, video_id, behavior_type, duration, progress, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, id, 'play', duration, progress]
    );

    // 更新播放次数
    await db.none('UPDATE videos SET play_count = play_count + 1 WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '播放行为已记录'
    });
  } catch (error) {
    console.error('[播放上报错误]', error);
    res.status(500).json({
      success: false,
      message: '上报失败'
    });
  }
});

/**
 * GET /api/v1/categories
 * 获取分类列表
 */
router.get('/categories/list', async (req, res) => {
  try {
    const db = getDb();

    const categories = await db.any(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM videos v WHERE v.category_id = c.id AND v.status = 'published') as video_count
       FROM categories c
       WHERE c.parent_id IS NULL
       ORDER BY c.sort_order`,
      []
    );

    // 查询子分类
    for (const cat of categories) {
      cat.children = await db.any(
        `SELECT c.*,
                (SELECT COUNT(*) FROM videos v WHERE v.category_id = c.id AND v.status = 'published') as video_count
         FROM categories c
         WHERE c.parent_id = $1
         ORDER BY c.sort_order`,
        [cat.id]
      );
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[获取分类错误]', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
});

module.exports = router;
