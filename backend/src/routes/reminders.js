/**
 * 复习提醒路由
 * 复习提醒和复习计划的增删改查
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../models');

router.use(authMiddleware);

/**
 * GET /api/v1/reminders
 * 获取用户的复习提醒列表
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereClause = 'WHERE r.user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (status === 'pending') {
      whereClause += ` AND r.is_sent = false AND r.reminder_time >= NOW()`;
    } else if (status === 'completed') {
      whereClause += ` AND r.is_completed = true`;
    } else if (status === 'overdue') {
      whereClause += ` AND r.is_sent = false AND r.reminder_time < NOW()`;
    }

    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM review_reminders r ${whereClause}`,
      params
    );

    const reminders = await db.any(
      `SELECT r.*, 
              v.title as video_title, v.cover_url,
              kp.title as knowledge_point_title,
              n.content as note_content
       FROM review_reminders r
       LEFT JOIN videos v ON r.video_id = v.id
       LEFT JOIN knowledge_points kp ON r.knowledge_point_id = kp.id
       LEFT JOIN notes n ON r.note_id = n.id
       ${whereClause}
       ORDER BY r.reminder_time ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        list: reminders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取复习提醒错误]', error);
    res.status(500).json({ success: false, message: '获取复习提醒失败' });
  }
});

/**
 * POST /api/v1/reminders
 * 创建复习提醒
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      video_id,
      knowledge_point_id,
      note_id,
      reminder_type = 'video',
      reminder_time,
      repeat_days
    } = req.body;
    const db = getDb();

    if (!video_id && !knowledge_point_id && !note_id) {
      return res.status(400).json({ success: false, message: '请指定要复习的内容' });
    }

    if (!reminder_time) {
      return res.status(400).json({ success: false, message: '请指定提醒时间' });
    }

    let targetVideoId = video_id;
    if (!targetVideoId && knowledge_point_id) {
      const kp = await db.oneOrNone(
        'SELECT video_id FROM knowledge_points WHERE id = $1',
        [knowledge_point_id]
      );
      targetVideoId = kp?.video_id;
    }
    if (!targetVideoId && note_id) {
      const note = await db.oneOrNone(
        'SELECT video_id FROM notes WHERE id = $1',
        [note_id]
      );
      targetVideoId = note?.video_id;
    }

    const result = await db.one(
      `INSERT INTO review_reminders (
        user_id, video_id, knowledge_point_id, note_id,
        reminder_type, reminder_time, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        targetVideoId,
        knowledge_point_id || null,
        note_id || null,
        reminder_type,
        new Date(reminder_time)
      ]
    );

    res.json({
      success: true,
      data: result,
      message: '复习提醒已创建'
    });
  } catch (error) {
    console.error('[创建复习提醒错误]', error);
    res.status(500).json({ success: false, message: '创建复习提醒失败' });
  }
});

/**
 * PUT /api/v1/reminders/:id
 * 更新复习提醒
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { reminder_time, is_completed } = req.body;
    const db = getDb();

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '复习提醒不存在' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (reminder_time !== undefined) {
      updates.push(`reminder_time = $${paramIndex}`);
      values.push(new Date(reminder_time));
      paramIndex++;
    }

    if (is_completed !== undefined) {
      updates.push(`is_completed = $${paramIndex}`);
      values.push(is_completed);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(userId);

    const result = await db.one(
      `UPDATE review_reminders SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result,
      message: '复习提醒已更新'
    });
  } catch (error) {
    console.error('[更新复习提醒错误]', error);
    res.status(500).json({ success: false, message: '更新复习提醒失败' });
  }
});

/**
 * DELETE /api/v1/reminders/:id
 * 删除复习提醒
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '复习提醒不存在' });
    }

    await db.none(
      'DELETE FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true, message: '复习提醒已删除' });
  } catch (error) {
    console.error('[删除复习提醒错误]', error);
    res.status(500).json({ success: false, message: '删除复习提醒失败' });
  }
});

/**
 * GET /api/v1/reminders/schedules
 * 获取复习计划（基于艾宾浩斯遗忘曲线）
 */
router.get('/schedules', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDb();

    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM review_schedules 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    const schedules = await db.any(
      `SELECT rs.*,
              v.title as video_title, v.cover_url
       FROM review_schedules rs
       LEFT JOIN videos v ON rs.target_id = v.id AND rs.target_type = 'video'
       WHERE rs.user_id = $1 AND rs.is_active = true
       ORDER BY rs.next_review_at ASC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: {
        list: schedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('[获取复习计划错误]', error);
    res.status(500).json({ success: false, message: '获取复习计划失败' });
  }
});

/**
 * POST /api/v1/reminders/schedules
 * 创建复习计划（艾宾浩斯遗忘曲线）
 */
router.post('/schedules', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { target_type, target_id } = req.body;
    const db = getDb();

    if (!target_type || !target_id) {
      return res.status(400).json({ success: false, message: '请指定复习目标' });
    }

    const existing = await db.oneOrNone(
      `SELECT * FROM review_schedules 
       WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
      [userId, target_type, target_id]
    );

    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: '复习计划已存在'
      });
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);

    const result = await db.one(
      `INSERT INTO review_schedules (
        user_id, target_type, target_id, schedule_type,
        next_review_at, interval_days, ease_factor, repetitions,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, 'spaced_repetition', $4, 1, 2.50, 0, true, NOW(), NOW())
      RETURNING *`,
      [userId, target_type, target_id, nextReviewAt]
    );

    res.json({
      success: true,
      data: result,
      message: '复习计划已创建'
    });
  } catch (error) {
    console.error('[创建复习计划错误]', error);
    res.status(500).json({ success: false, message: '创建复习计划失败' });
  }
});

/**
 * POST /api/v1/reminders/schedules/:id/review
 * 完成一次复习，更新复习计划（SM-2算法）
 */
router.post('/schedules/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { quality = 4 } = req.body;
    const db = getDb();

    const schedule = await db.oneOrNone(
      'SELECT * FROM review_schedules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!schedule) {
      return res.status(404).json({ success: false, message: '复习计划不存在' });
    }

    let { interval_days, ease_factor, repetitions } = schedule;

    if (quality >= 3) {
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval_days = 1;
    }

    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval_days);

    const result = await db.one(
      `UPDATE review_schedules SET 
        interval_days = $1,
        ease_factor = $2,
        repetitions = $3,
        next_review_at = $4,
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [interval_days, ease_factor, repetitions, nextReviewAt, id, userId]
    );

    res.json({
      success: true,
      data: result,
      message: '复习进度已更新'
    });
  } catch (error) {
    console.error('[更新复习进度错误]', error);
    res.status(500).json({ success: false, message: '更新复习进度失败' });
  }
});

/**
 * DELETE /api/v1/reminders/schedules/:id
 * 取消复习计划
 */
router.delete('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    const existing = await db.oneOrNone(
      'SELECT * FROM review_schedules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '复习计划不存在' });
    }

    await db.none(
      'DELETE FROM review_schedules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true, message: '复习计划已取消' });
  } catch (error) {
    console.error('[取消复习计划错误]', error);
    res.status(500).json({ success: false, message: '取消复习计划失败' });
  }
});

/**
 * GET /api/v1/reminders/today
 * 获取今日待复习列表
 */
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = getDb();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const reminders = await db.any(
      `SELECT r.*,
              v.title as video_title, v.cover_url,
              kp.title as knowledge_point_title,
              n.content as note_content
       FROM review_reminders r
       LEFT JOIN videos v ON r.video_id = v.id
       LEFT JOIN knowledge_points kp ON r.knowledge_point_id = kp.id
       LEFT JOIN notes n ON r.note_id = n.id
       WHERE r.user_id = $1 
         AND r.reminder_time >= $2 
         AND r.reminder_time <= $3
         AND r.is_completed = false
       ORDER BY r.reminder_time ASC`,
      [userId, todayStart, todayEnd]
    );

    const schedules = await db.any(
      `SELECT rs.*,
              v.title as video_title, v.cover_url
       FROM review_schedules rs
       LEFT JOIN videos v ON rs.target_id = v.id AND rs.target_type = 'video'
       WHERE rs.user_id = $1 
         AND rs.next_review_at >= $2 
         AND rs.next_review_at <= $3
         AND rs.is_active = true
       ORDER BY rs.next_review_at ASC`,
      [userId, todayStart, todayEnd]
    );

    res.json({
      success: true,
      data: {
        reminders,
        schedules,
        total: reminders.length + schedules.length
      }
    });
  } catch (error) {
    console.error('[获取今日复习错误]', error);
    res.status(500).json({ success: false, message: '获取今日复习失败' });
  }
});

module.exports = router;
