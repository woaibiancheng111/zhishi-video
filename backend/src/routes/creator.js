const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadVideo, uploadCover, uploadVideoAndCover } = require('../middleware/upload');
const { getDb } = require('../models');
const config = require('../config');
const path = require('path');

/**
 * 获取创作者数据看板统计
 */
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

/**
 * 获取创作者的视频管理列表
 */
router.get('/videos', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClause = 'WHERE v.creator_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT v.*, c.name as category_name 
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await db.query(
      `SELECT COUNT(*) FROM videos v ${whereClause}`,
      params
    );

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

/**
 * 获取单个视频详情（用于编辑）
 */
router.get('/videos/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const video = await db.oneOrNone(`
      SELECT v.*, c.name as category_name 
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.id = $1 AND v.creator_id = $2
    `, [videoId, userId]);

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权访问' });
    }

    const subtitles = await db.any(`
      SELECT * FROM subtitles WHERE video_id = $1 ORDER BY created_at ASC
    `, [videoId]);

    const knowledgePoints = await db.any(`
      SELECT * FROM knowledge_points WHERE video_id = $1 ORDER BY timestamp_sec ASC
    `, [videoId]);

    res.json({ 
      success: true, 
      data: {
        ...video,
        subtitles,
        knowledge_points: knowledgePoints
      }
    });
  } catch (error) {
    console.error('Error fetching video detail:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 上传视频（仅视频文件）
 */
router.post('/upload/video', authMiddleware, (req, res) => {
  uploadVideo(req, res, async (err) => {
    if (err) {
      console.error('视频上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '视频上传失败' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的视频文件' 
      });
    }

    try {
      const db = await getDb();
      const userId = req.user.user_id;
      
      const videoUrl = `/uploads/videos/${req.file.filename}`;
      
      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          original_name: req.file.originalname,
          url: videoUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        message: '视频上传成功'
      });
    } catch (error) {
      console.error('保存视频信息错误:', error);
      res.status(500).json({ success: false, message: '保存视频信息失败' });
    }
  });
});

/**
 * 上传封面图片
 */
router.post('/upload/cover', authMiddleware, (req, res) => {
  uploadCover(req, res, async (err) => {
    if (err) {
      console.error('封面上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '封面上传失败' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的封面图片' 
      });
    }

    try {
      const coverUrl = `/uploads/covers/${req.file.filename}`;
      
      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          original_name: req.file.originalname,
          url: coverUrl,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        message: '封面上传成功'
      });
    } catch (error) {
      console.error('保存封面信息错误:', error);
      res.status(500).json({ success: false, message: '保存封面信息失败' });
    }
  });
});

/**
 * 创建视频（保存视频信息到数据库）
 */
router.post('/videos', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const {
      title,
      description = '',
      video_url,
      cover_url = '',
      category_id,
      tags = [],
      duration = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '视频标题不能为空' });
    }

    if (!video_url) {
      return res.status(400).json({ success: false, message: '请先上传视频文件' });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({ success: false, message: '视频标题不能超过200字' });
    }

    if (description.length > 2000) {
      return res.status(400).json({ success: false, message: '视频描述不能超过2000字' });
    }

    const video = await db.one(`
      INSERT INTO videos (
        title, description, video_url, cover_url, category_id, 
        creator_id, tags, duration, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      title.trim(),
      description.trim(),
      video_url,
      cover_url,
      category_id || null,
      userId,
      tags,
      duration,
      'draft'
    ]);

    res.status(201).json({
      success: true,
      data: video,
      message: '视频创建成功'
    });
  } catch (error) {
    console.error('创建视频错误:', error);
    res.status(500).json({ success: false, message: '创建视频失败' });
  }
});

/**
 * 更新视频信息
 */
router.put('/videos/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;
    
    const {
      title,
      description,
      cover_url,
      category_id,
      tags,
      duration,
      status
    } = req.body;

    const existing = await db.oneOrNone(
      'SELECT * FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '视频不存在或无权访问' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: '视频标题不能为空' });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({ success: false, message: '视频标题不能超过200字' });
      }
      updates.push(`title = $${paramIndex}`);
      values.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      if (description.length > 2000) {
        return res.status(400).json({ success: false, message: '视频描述不能超过2000字' });
      }
      updates.push(`description = $${paramIndex}`);
      values.push(description.trim());
      paramIndex++;
    }

    if (cover_url !== undefined) {
      updates.push(`cover_url = $${paramIndex}`);
      values.push(cover_url);
      paramIndex++;
    }

    if (category_id !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      values.push(category_id || null);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }

    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex}`);
      values.push(parseInt(duration, 10) || 0);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: '无效的视频状态' });
      }
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.json({ success: true, data: existing, message: '没有需要更新的内容' });
    }

    updates.push(`updated_at = NOW()`);

    values.push(videoId);

    const updated = await db.one(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: updated,
      message: '视频更新成功'
    });
  } catch (error) {
    console.error('更新视频错误:', error);
    res.status(500).json({ success: false, message: '更新视频失败' });
  }
});

/**
 * 发布视频
 */
router.post('/videos/:id/publish', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const existing = await db.oneOrNone(
      'SELECT * FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '视频不存在或无权访问' });
    }

    if (!existing.video_url) {
      return res.status(400).json({ success: false, message: '请先上传视频文件' });
    }

    if (!existing.title || !existing.title.trim()) {
      return res.status(400).json({ success: false, message: '请先填写视频标题' });
    }

    const updated = await db.one(`
      UPDATE videos SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND creator_id = $3 
      RETURNING *
    `, ['published', videoId, userId]);

    res.json({
      success: true,
      data: updated,
      message: '视频发布成功'
    });
  } catch (error) {
    console.error('发布视频错误:', error);
    res.status(500).json({ success: false, message: '发布视频失败' });
  }
});

/**
 * 删除视频
 */
router.delete('/videos/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const existing = await db.oneOrNone(
      'SELECT * FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '视频不存在或无权访问' });
    }

    await db.none('DELETE FROM subtitles WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM knowledge_points WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM notes WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM comments WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM user_behaviors WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM favorites WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM knowledge_cards WHERE video_id = $1', [videoId]);
    await db.none('DELETE FROM review_reminders WHERE video_id = $1', [videoId]);

    await db.none('DELETE FROM videos WHERE id = $1 AND creator_id = $2', [videoId, userId]);

    res.json({
      success: true,
      message: '视频删除成功'
    });
  } catch (error) {
    console.error('删除视频错误:', error);
    res.status(500).json({ success: false, message: '删除视频失败' });
  }
});

module.exports = router;
