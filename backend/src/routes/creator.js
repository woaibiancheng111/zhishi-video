const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../models');

// 获取创作者数据看板统计
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const result = await db.query(`
      SELECT 
        COUNT(id) as total_videos,
        COALESCE(SUM(play_count), 0) as total_views,
        COALESCE(SUM(like_count), 0) as total_likes
      FROM videos 
      WHERE creator_id = $1
    `, [userId]);
    
    // 获取近期发布的视频数量 (最近30天)
    const recentResult = await db.query(`
      SELECT COUNT(id) as recent_videos
      FROM videos
      WHERE creator_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    `, [userId]);

    res.json({ 
      success: true, 
      data: {
        ...result[0],
        recent_videos: recentResult[0]?.recent_videos || 0
      } 
    });
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 获取创作者的视频管理列表
router.get('/videos', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT v.*, c.name as category_name 
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.creator_id = $1
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await db.query('SELECT COUNT(*) FROM videos WHERE creator_id = $1', [userId]);

    res.json({ 
      success: true, 
      data: result,
      pagination: {
        total: parseInt(countResult[0].count),
        page,
        limit,
        total_pages: Math.ceil(parseInt(countResult[0].count) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
