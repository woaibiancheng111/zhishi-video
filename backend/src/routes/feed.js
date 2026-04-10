/**
 * 推荐Feed路由
 * 基于用户画像和AI推荐的个性化Feed
 */
const express = require('express');
const { getDb, getRedis } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const config = require('../config');
const axios = require('axios');

const router = express.Router();

/**
 * GET /api/v1/feed
 * 获取推荐Feed（分页，cursor-based）
 * 查询参数: cursor, limit
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { cursor = 0, limit = 10 } = req.query;
    const db = getDb();
    const userId = req.user ? req.user.user_id : null;

    let videoIds = [];

    if (userId) {
      // 已登录用户：尝试调用AI推荐服务
      try {
        // 获取用户已观看的视频
        const watchedVideos = await db.any(
          'SELECT video_id FROM user_behaviors WHERE user_id = $1 AND behavior_type = $2 LIMIT 50',
          [userId, 'play']
        );
        const watchedIds = watchedVideos.map(v => v.video_id);

        // 获取用户画像
        const user = await db.oneOrNone(
          'SELECT career_direction, skill_tags FROM users WHERE id = $1',
          [userId]
        );

        // 调用AI推荐服务
        const aiResponse = await axios.post(
          `${config.aiServiceUrl}/api/v1/recommend`,
          {
            user_id: userId,
            watched_videos: watchedIds,
            career_direction: user ? user.career_direction : null,
            skill_tags: user ? user.skill_tags : []
          },
          { timeout: 2000 }
        );

        if (aiResponse.data && aiResponse.data.data && aiResponse.data.data.video_ids) {
          videoIds = aiResponse.data.data.video_ids;
        }
      } catch (aiError) {
        console.log('[AI推荐服务不可用，使用本地推荐]', aiError.message);
      }

      // 如果AI推荐没有返回结果，使用本地推荐逻辑
      if (videoIds.length === 0) {
        videoIds = await getLocalRecommendations(db, userId);
      }
    } else {
      // 未登录用户：返回热门视频
      videoIds = await getHotVideos(db);
    }

    // 根据 cursor 分页
    const startIdx = parseInt(cursor);
    const pagedIds = videoIds.slice(startIdx, startIdx + parseInt(limit));
    const nextCursor = startIdx + pagedIds.length < videoIds.length
      ? startIdx + pagedIds.length
      : null;

    // 查询视频详情
    let videos = [];
    if (pagedIds.length > 0) {
      videos = await db.any(
        `SELECT v.*, c.name as category_name
         FROM videos v
         LEFT JOIN categories c ON v.category_id = c.id
         WHERE v.id = ANY($1::int[])
         ORDER BY array_position($1::int[], v.id)`,
        [pagedIds]
      );

      // 查询用户点赞状态
      if (userId) {
        const likes = await db.any(
          'SELECT video_id FROM user_behaviors WHERE user_id = $1 AND behavior_type = $2 AND video_id = ANY($3::int[])',
          [userId, 'like', pagedIds]
        );
        const likedSet = new Set(likes.map(l => l.video_id));
        videos = videos.map(v => ({ ...v, is_liked: likedSet.has(v.id) }));
      }
    }

    res.json({
      success: true,
      data: {
        list: videos,
        pagination: {
          cursor: nextCursor,
          has_more: nextCursor !== null
        }
      }
    });
  } catch (error) {
    console.error('[获取Feed错误]', error);
    res.status(500).json({
      success: false,
      message: '获取推荐内容失败'
    });
  }
});

/**
 * 本地推荐逻辑
 * 基于用户职业标签匹配 + 随机热门内容混合
 */
async function getLocalRecommendations(db, userId) {
  // 获取用户画像
  const user = await db.oneOrNone(
    'SELECT career_direction, skill_tags FROM users WHERE id = $1',
    [userId]
  );

  let videoIds = [];

  if (user && user.career_direction) {
    // 基于职业方向匹配分类
    const categoryVideos = await db.any(
      `SELECT v.id FROM videos v
       JOIN categories c ON v.category_id = c.id
       WHERE v.status = 'published'
       AND (c.name ILIKE $1 OR c.name ILIKE ANY($2))
       ORDER BY v.play_count DESC
       LIMIT 15`,
      [`%${user.career_direction}%`, user.skill_tags.map(t => `%${t}%`)]
    );
    videoIds = categoryVideos.map(v => v.id);
  }

  // 补充热门视频（排除已推荐的）
  if (videoIds.length < 10) {
    const excludeIds = videoIds.length > 0 ? videoIds : [0];
    const hotVideos = await db.any(
      `SELECT v.id FROM videos v
       WHERE v.status = 'published' AND v.id != ALL($1::int[])
       ORDER BY v.play_count DESC, v.like_count DESC
       LIMIT 20`,
      [excludeIds]
    );
    videoIds = [...videoIds, ...hotVideos.map(v => v.id)];
  }

  // 打乱顺序
  videoIds.sort(() => Math.random() - 0.5);

  return videoIds.slice(0, 30);
}

/**
 * 获取热门视频（未登录用户）
 */
async function getHotVideos(db) {
  const videos = await db.any(
    `SELECT v.id FROM videos v
     WHERE v.status = 'published'
     ORDER BY v.play_count DESC, v.like_count DESC
     LIMIT 30`
  );
  return videos.map(v => v.id);
}

module.exports = router;
