/**
 * 评论路由
 * 视频评论的增删查
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 发表评论限流：每IP每15分钟最多30条
const commentPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '评论过于频繁，请稍后再试' }
});

/**
 * GET /api/v1/comments/:videoId
 * 获取视频评论列表
 */
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    const countResult = await db.one(
      'SELECT COUNT(*) as total FROM comments WHERE video_id = $1',
      [videoId]
    );

    const comments = await db.any(
      `SELECT c.id, c.content, c.like_count, c.created_at,
              u.id as user_id, u.nickname, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.video_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [videoId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        list: comments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取评论错误]', error);
    res.status(500).json({ success: false, message: '获取评论失败' });
  }
});

/**
 * POST /api/v1/comments/:videoId
 * 发表评论
 */
router.post('/:videoId', commentPostLimiter, authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user.user_id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({ success: false, message: '评论内容不能超过500字' });
    }

    const db = getDb();

    const video = await db.oneOrNone('SELECT id FROM videos WHERE id = $1', [videoId]);
    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const comment = await db.one(
      `INSERT INTO comments (video_id, user_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, content, like_count, created_at`,
      [videoId, userId, content.trim()]
    );

    const user = await db.one('SELECT id, nickname, avatar_url FROM users WHERE id = $1', [userId]);

    res.status(201).json({
      success: true,
      data: { ...comment, user_id: user.id, nickname: user.nickname, avatar_url: user.avatar_url }
    });
  } catch (error) {
    console.error('[发表评论错误]', error);
    res.status(500).json({ success: false, message: '发表评论失败' });
  }
});

/**
 * DELETE /api/v1/comments/:id
 * 删除评论（仅本人）
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    const comment = await db.oneOrNone(
      'SELECT id, user_id FROM comments WHERE id = $1',
      [id]
    );

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权删除该评论' });
    }

    await db.none('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[删除评论错误]', error);
    res.status(500).json({ success: false, message: '删除评论失败' });
  }
});

module.exports = router;
