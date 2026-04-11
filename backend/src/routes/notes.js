/**
 * 学习笔记路由
 * 用户的学习笔记增删改查
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 笔记写操作限流：每IP每15分钟最多60次
const notesWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请稍后再试' }
});

// 所有笔记接口都需要登录
router.use(authMiddleware);

/**
 * GET /api/v1/notes
 * 获取当前用户的所有笔记（支持按视频筛选）
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { video_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereClause = 'WHERE n.user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (video_id) {
      whereClause += ` AND n.video_id = $${paramIndex}`;
      params.push(video_id);
      paramIndex++;
    }

    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM notes n ${whereClause}`,
      params
    );

    const notes = await db.any(
      `SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
              v.id as video_id, v.title as video_title, v.cover_url
       FROM notes n
       JOIN videos v ON n.video_id = v.id
       ${whereClause}
       ORDER BY n.updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        list: notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取笔记错误]', error);
    res.status(500).json({ success: false, message: '获取笔记失败' });
  }
});

/**
 * POST /api/v1/notes
 * 创建笔记
 */
router.post('/', notesWriteLimiter, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { video_id, content, timestamp_sec = 0 } = req.body;
    const db = getDb();

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '笔记内容不能为空' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: '笔记内容不能超过2000字' });
    }

    const video = await db.oneOrNone('SELECT id, title, cover_url FROM videos WHERE id = $1', [video_id]);
    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const note = await db.one(
      `INSERT INTO notes (user_id, video_id, content, timestamp_sec, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [userId, video_id, content.trim(), timestamp_sec]
    );

    res.status(201).json({
      success: true,
      data: {
        ...note,
        video_id: video.id,
        video_title: video.title,
        cover_url: video.cover_url
      }
    });
  } catch (error) {
    console.error('[创建笔记错误]', error);
    res.status(500).json({ success: false, message: '创建笔记失败' });
  }
});

/**
 * PUT /api/v1/notes/:id
 * 更新笔记
 */
router.put('/:id', notesWriteLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { content } = req.body;
    const db = getDb();

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '笔记内容不能为空' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: '笔记内容不能超过2000字' });
    }

    const existing = await db.oneOrNone(
      'SELECT id, user_id FROM notes WHERE id = $1',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权修改该笔记' });
    }

    const note = await db.one(
      `UPDATE notes SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [content.trim(), id]
    );

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('[更新笔记错误]', error);
    res.status(500).json({ success: false, message: '更新笔记失败' });
  }
});

/**
 * DELETE /api/v1/notes/:id
 * 删除笔记
 */
router.delete('/:id', notesWriteLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    const note = await db.oneOrNone(
      'SELECT id, user_id FROM notes WHERE id = $1',
      [id]
    );

    if (!note) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
    }

    if (note.user_id !== userId) {
      return res.status(403).json({ success: false, message: '无权删除该笔记' });
    }

    await db.none('DELETE FROM notes WHERE id = $1', [id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('[删除笔记错误]', error);
    res.status(500).json({ success: false, message: '删除笔记失败' });
  }
});

module.exports = router;
