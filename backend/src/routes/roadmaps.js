const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../models');

// 获取路线图列表
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT r.*, u.nickname as creator_name, 
             (SELECT COUNT(*) FROM roadmap_items WHERE roadmap_id = r.id) as video_count
      FROM roadmaps r
      LEFT JOIN users u ON r.creator_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 获取路线图详情及用户的学习进度
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const roadmapId = req.params.id;
    const userId = req.user.user_id;

    // 取得路线图信息
    const roadmapResult = await db.query('SELECT * FROM roadmaps WHERE id = $1', [roadmapId]);
    if (roadmapResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Roadmap not found' });
    }
    const roadmap = roadmapResult[0];

    // 获取路线图包含的视频列表及进度
    const videosResult = await db.query(`
      SELECT v.*, ri.sort_order,
             CASE WHEN ub.progress IS NOT NULL THEN ub.progress ELSE 0 END as user_progress
      FROM roadmap_items ri
      JOIN videos v ON ri.video_id = v.id
      LEFT JOIN user_behaviors ub ON v.id = ub.video_id AND ub.user_id = $1 AND ub.behavior_type = 'watch'
      WHERE ri.roadmap_id = $2
      ORDER BY ri.sort_order ASC
    `, [userId, roadmapId]);

    const videos = videosResult;
    const totalVideos = videos.length;
    const completedVideos = videos.filter(v => parseFloat(v.user_progress) > 90).length;
    const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    res.json({
      success: true,
      data: {
        ...roadmap,
        videos,
        progress: overallProgress,
        completed_count: completedVideos,
        total_count: totalVideos
      }
    });

  } catch (error) {
    console.error('Error fetching roadmap details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
