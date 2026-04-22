/**
 * 知识点标记路由
 * 创作者在视频中标记知识点，用户可以查看和快速跳转
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../models');

/**
 * 获取视频的所有知识点
 */
router.get('/video/:videoId', async (req, res) => {
  try {
    const db = await getDb();
    const { videoId } = req.params;

    const video = await db.oneOrNone(
      'SELECT id, status FROM videos WHERE id = $1',
      [videoId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const knowledgePoints = await db.any(`
      SELECT kp.*, u.nickname as creator_name
      FROM knowledge_points kp
      LEFT JOIN users u ON kp.creator_id = u.id
      WHERE kp.video_id = $1
      ORDER BY kp.timestamp_sec ASC
    `, [videoId]);

    res.json({
      success: true,
      data: knowledgePoints
    });
  } catch (error) {
    console.error('获取知识点错误:', error);
    res.status(500).json({ success: false, message: '获取知识点失败' });
  }
});

/**
 * 获取单个知识点详情
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const knowledgePoint = await db.oneOrNone(`
      SELECT kp.*, u.nickname as creator_name, 
             v.title as video_title, v.duration as video_duration
      FROM knowledge_points kp
      LEFT JOIN users u ON kp.creator_id = u.id
      LEFT JOIN videos v ON kp.video_id = v.id
      WHERE kp.id = $1
    `, [id]);

    if (!knowledgePoint) {
      return res.status(404).json({ success: false, message: '知识点不存在' });
    }

    res.json({
      success: true,
      data: knowledgePoint
    });
  } catch (error) {
    console.error('获取知识点详情错误:', error);
    res.status(500).json({ success: false, message: '获取知识点详情失败' });
  }
});

/**
 * 创建知识点
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const {
      video_id,
      title,
      description = '',
      timestamp_sec,
      importance = 'normal',
      tags = []
    } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '知识点标题不能为空' });
    }

    if (timestamp_sec === undefined || timestamp_sec === null) {
      return res.status(400).json({ success: false, message: '请指定时间点' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title, creator_id FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    if (!['critical', 'important', 'normal', 'optional'].includes(importance)) {
      return res.status(400).json({ success: false, message: '无效的重要性等级' });
    }

    const knowledgePoint = await db.one(`
      INSERT INTO knowledge_points (
        video_id, creator_id, title, description, 
        timestamp_sec, importance, tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      video_id,
      userId,
      title.trim(),
      description.trim(),
      parseInt(timestamp_sec, 10),
      importance,
      tags
    ]);

    res.status(201).json({
      success: true,
      data: knowledgePoint,
      message: '知识点创建成功'
    });
  } catch (error) {
    console.error('创建知识点错误:', error);
    res.status(500).json({ success: false, message: '创建知识点失败' });
  }
});

/**
 * 批量创建知识点
 */
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const { video_id, points = [] } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ success: false, message: '知识点列表不能为空' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const validImportance = ['critical', 'important', 'normal', 'optional'];
    const createdPoints = [];

    for (const point of points) {
      if (!point.title || !point.title.trim()) continue;
      if (point.timestamp_sec === undefined || point.timestamp_sec === null) continue;

      const importance = validImportance.includes(point.importance) ? point.importance : 'normal';

      const knowledgePoint = await db.one(`
        INSERT INTO knowledge_points (
          video_id, creator_id, title, description, 
          timestamp_sec, importance, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        video_id,
        userId,
        point.title.trim(),
        (point.description || '').trim(),
        parseInt(point.timestamp_sec, 10),
        importance,
        point.tags || []
      ]);

      createdPoints.push(knowledgePoint);
    }

    res.status(201).json({
      success: true,
      data: createdPoints,
      message: `成功创建 ${createdPoints.length} 个知识点`
    });
  } catch (error) {
    console.error('批量创建知识点错误:', error);
    res.status(500).json({ success: false, message: '批量创建知识点失败' });
  }
});

/**
 * 更新知识点
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;
    
    const {
      title,
      description,
      timestamp_sec,
      importance,
      tags
    } = req.body;

    const existing = await db.oneOrNone(
      'SELECT * FROM knowledge_points WHERE id = $1 AND creator_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '知识点不存在或无权访问' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: '知识点标题不能为空' });
      }
      updates.push(`title = $${paramIndex}`);
      values.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description.trim());
      paramIndex++;
    }

    if (timestamp_sec !== undefined) {
      updates.push(`timestamp_sec = $${paramIndex}`);
      values.push(parseInt(timestamp_sec, 10));
      paramIndex++;
    }

    if (importance !== undefined) {
      const validImportance = ['critical', 'important', 'normal', 'optional'];
      if (!validImportance.includes(importance)) {
        return res.status(400).json({ success: false, message: '无效的重要性等级' });
      }
      updates.push(`importance = $${paramIndex}`);
      values.push(importance);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.json({ success: true, data: existing, message: '没有需要更新的内容' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updated = await db.one(
      `UPDATE knowledge_points SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: updated,
      message: '知识点更新成功'
    });
  } catch (error) {
    console.error('更新知识点错误:', error);
    res.status(500).json({ success: false, message: '更新知识点失败' });
  }
});

/**
 * 删除知识点
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;

    const existing = await db.oneOrNone(
      'SELECT * FROM knowledge_points WHERE id = $1 AND creator_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '知识点不存在或无权访问' });
    }

    await db.none('DELETE FROM knowledge_points WHERE id = $1 AND creator_id = $2', [id, userId]);

    res.json({
      success: true,
      message: '知识点删除成功'
    });
  } catch (error) {
    console.error('删除知识点错误:', error);
    res.status(500).json({ success: false, message: '删除知识点失败' });
  }
});

/**
 * 批量删除知识点
 */
router.post('/batch-delete', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请指定要删除的知识点ID' });
    }

    const cs = db.$config.pgp.helpers.ColumnSet(['id'], { table: 'knowledge_points' });
    
    const deleteConditions = ids.map((_, i) => `id = $${i + 1} AND creator_id = $${ids.length + 1}`);
    
    const result = await db.result(
      `DELETE FROM knowledge_points WHERE ${deleteConditions.join(' OR ')}`,
      [...ids, userId]
    );

    res.json({
      success: true,
      data: { deleted_count: result.rowCount },
      message: `成功删除 ${result.rowCount} 个知识点`
    });
  } catch (error) {
    console.error('批量删除知识点错误:', error);
    res.status(500).json({ success: false, message: '批量删除知识点失败' });
  }
});

/**
 * 从视频生成知识点（AI模拟）
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { video_id } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title, description, duration, tags FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const duration = video.duration || 300;
    const generatedPoints = [];
    
    const keywords = (video.tags || []).concat(
      (video.title || '').split(/[，。！？、\s]+/),
      (video.description || '').split(/[，。！？、\s]+/)
    ).filter(k => k.length > 2);

    const uniqueKeywords = [...new Set(keywords)].slice(0, 8);
    const importanceLevels = ['critical', 'important', 'normal', 'optional'];

    const interval = Math.max(20, Math.floor(duration / (uniqueKeywords.length + 2)));

    for (let i = 0; i < uniqueKeywords.length; i++) {
      const keyword = uniqueKeywords[i];
      generatedPoints.push({
        title: `知识点：${keyword}`,
        description: `这是关于"${keyword}"的知识点说明，详细内容请观看视频对应片段。`,
        timestamp_sec: Math.min(interval * (i + 1), duration - 30),
        importance: importanceLevels[i % importanceLevels.length],
        tags: [keyword]
      });
    }

    const createdPoints = [];
    for (const point of generatedPoints) {
      const knowledgePoint = await db.one(`
        INSERT INTO knowledge_points (
          video_id, creator_id, title, description, 
          timestamp_sec, importance, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [
        video_id,
        userId,
        point.title,
        point.description,
        point.timestamp_sec,
        point.importance,
        point.tags
      ]);
      createdPoints.push(knowledgePoint);
    }

    res.status(201).json({
      success: true,
      data: createdPoints,
      message: `成功生成 ${createdPoints.length} 个知识点`
    });
  } catch (error) {
    console.error('生成知识点错误:', error);
    res.status(500).json({ success: false, message: '生成知识点失败' });
  }
});

module.exports = router;
