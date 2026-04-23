/**
 * 复习提醒路由
 * 用户设置复习提醒，基于艾宾浩斯遗忘曲线
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb, getRedis } = require('../models');
const config = require('../config');

/**
 * 默认复习间隔（分钟）- 基于艾宾浩斯遗忘曲线
 */
const DEFAULT_INTERVALS = [
  5 * 60,
  30 * 60,
  12 * 60,
  24 * 60,
  2 * 24 * 60,
  4 * 24 * 60,
  7 * 24 * 60,
  15 * 24 * 60
];

/**
 * 将数据库字段转换为前端期望的格式
 */
function formatReminder(r) {
  return {
    ...r,
    reminder_time: r.remind_at,
    reminder_note: r.notes,
    ebbinghaus_level: r.series_order,
    knowledge_point_start_sec: r.timestamp_sec,
    knowledge_point_end_sec: r.timestamp_sec ? r.timestamp_sec + 10 : null,
    video_cover_url: r.cover_url
  };
}

/**
 * 获取用户的所有复习提醒
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE rr.user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      const validStatuses = ['pending', 'sent', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        whereClause += ` AND rr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    const countResult = await db.one(
      `SELECT COUNT(*) as total FROM review_reminders rr ${whereClause}`,
      params
    );

    const reminders = await db.any(`
      SELECT rr.*, v.title as video_title, v.cover_url, v.duration,
             kp.title as knowledge_point_title, kp.timestamp_sec, 
             kp.start_time_sec as kp_start_sec, kp.end_time_sec as kp_end_sec
      FROM review_reminders rr
      LEFT JOIN videos v ON rr.video_id = v.id
      LEFT JOIN knowledge_points kp ON rr.knowledge_point_id = kp.id
      ${whereClause}
      ORDER BY rr.remind_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit, 10), offset]);

    const formattedReminders = reminders.map(r => ({
      ...formatReminder(r),
      knowledge_point_start_sec: r.kp_start_sec !== null ? r.kp_start_sec : r.timestamp_sec,
      knowledge_point_end_sec: r.kp_end_sec !== null ? r.kp_end_sec : (r.timestamp_sec ? r.timestamp_sec + 10 : null)
    }));

    res.json({
      success: true,
      data: {
        list: formattedReminders,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(countResult.total),
          total_pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取复习提醒错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(200).json({
        success: true,
        data: {
          list: [],
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total: 0,
            total_pages: 0
          }
        }
      });
    }
    res.status(500).json({ success: false, message: '获取复习提醒失败' });
  }
});

/**
 * 获取今日待提醒
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;

    const reminders = await db.any(`
      SELECT rr.*, v.title as video_title, v.cover_url, v.duration,
             kp.title as knowledge_point_title, kp.timestamp_sec,
             kp.start_time_sec as kp_start_sec, kp.end_time_sec as kp_end_sec
      FROM review_reminders rr
      LEFT JOIN videos v ON rr.video_id = v.id
      LEFT JOIN knowledge_points kp ON rr.knowledge_point_id = kp.id
      WHERE rr.user_id = $1 
        AND rr.status = 'pending'
        AND rr.remind_at >= NOW()
        AND rr.remind_at <= NOW() + INTERVAL '1 day'
      ORDER BY rr.remind_at ASC
    `, [userId]);

    const formattedReminders = reminders.map(r => ({
      ...formatReminder(r),
      knowledge_point_start_sec: r.kp_start_sec !== null ? r.kp_start_sec : r.timestamp_sec,
      knowledge_point_end_sec: r.kp_end_sec !== null ? r.kp_end_sec : (r.timestamp_sec ? r.timestamp_sec + 10 : null)
    }));

    res.json({
      success: true,
      data: formattedReminders
    });
  } catch (error) {
    console.error('获取今日提醒错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    res.status(500).json({ success: false, message: '获取今日提醒失败' });
  }
});

/**
 * 创建复习提醒
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const {
      video_id,
      knowledge_point_id,
      remind_at,
      interval_minutes,
      interval_type = 'custom',
      notes = '',
      is_series = false,
      series_interval_minutes = []
    } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    if (knowledge_point_id) {
      const kp = await db.oneOrNone(
        'SELECT id FROM knowledge_points WHERE id = $1 AND video_id = $2',
        [knowledge_point_id, video_id]
      );
      if (!kp) {
        return res.status(404).json({ success: false, message: '知识点不存在' });
      }
    }

    if (is_series && Array.isArray(series_interval_minutes) && series_interval_minutes.length > 0) {
      const createdReminders = [];
      let baseTime = remind_at ? new Date(remind_at) : new Date();

      for (let i = 0; i < series_interval_minutes.length; i++) {
        const remindTime = new Date(baseTime.getTime() + series_interval_minutes[i] * 60 * 1000);
        
        const reminder = await db.one(`
          INSERT INTO review_reminders (
            user_id, video_id, knowledge_point_id, remind_at,
            interval_minutes, interval_type, notes, status,
            series_order, is_series, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING *
        `, [
          userId,
          video_id,
          knowledge_point_id || null,
          remindTime,
          series_interval_minutes[i],
          i === 0 ? 'series_first' : 'series_next',
          notes,
          'pending',
          i + 1,
          true
        ]);
        
        createdReminders.push(formatReminder(reminder));
      }

      return res.status(201).json({
        success: true,
        data: createdReminders,
        message: `成功创建 ${createdReminders.length} 个复习提醒`
      });
    }

    let finalRemindAt;
    if (remind_at) {
      finalRemindAt = new Date(remind_at);
    } else if (interval_minutes) {
      finalRemindAt = new Date(Date.now() + interval_minutes * 60 * 1000);
    } else {
      finalRemindAt = new Date(Date.now() + DEFAULT_INTERVALS[0] * 60 * 1000);
    }

    const reminder = await db.one(`
      INSERT INTO review_reminders (
        user_id, video_id, knowledge_point_id, remind_at,
        interval_minutes, interval_type, notes, status,
        is_series, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      userId,
      video_id,
      knowledge_point_id || null,
      finalRemindAt,
      interval_minutes || DEFAULT_INTERVALS[0],
      interval_type,
      notes,
      'pending',
      false
    ]);

    res.status(201).json({
      success: true,
      data: formatReminder(reminder),
      message: '复习提醒创建成功'
    });
  } catch (error) {
    console.error('创建复习提醒错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(500).json({ 
        success: false, 
        message: '数据库表不存在，请先执行数据库迁移' 
      });
    }
    res.status(500).json({ success: false, message: '创建复习提醒失败' });
  }
});

/**
 * 基于艾宾浩斯遗忘曲线创建复习提醒系列
 */
router.post('/ebbinghaus', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const {
      video_id,
      knowledge_point_id,
      start_time,
      notes = ''
    } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const intervals = config.reminder?.intervals || DEFAULT_INTERVALS;
    const baseTime = start_time ? new Date(start_time) : new Date();
    const createdReminders = [];

    for (let i = 0; i < intervals.length; i++) {
      const remindTime = new Date(baseTime.getTime() + intervals[i] * 60 * 1000);
      
      const reminder = await db.one(`
        INSERT INTO review_reminders (
          user_id, video_id, knowledge_point_id, remind_at,
          interval_minutes, interval_type, notes, status,
          series_order, is_series, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        userId,
        video_id,
        knowledge_point_id || null,
        remindTime,
        intervals[i],
        'ebbinghaus',
        notes,
        'pending',
        i + 1,
        true
      ]);
      
      createdReminders.push(formatReminder(reminder));
    }

    res.status(201).json({
      success: true,
      data: {
        reminders: createdReminders,
        intervals: intervals,
        description: '基于艾宾浩斯遗忘曲线创建的复习提醒系列'
      },
      message: `成功创建 ${createdReminders.length} 个复习提醒`
    });
  } catch (error) {
    console.error('创建艾宾浩斯提醒错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(500).json({ 
        success: false, 
        message: '数据库表不存在，请先执行数据库迁移' 
      });
    }
    res.status(500).json({ success: false, message: '创建复习提醒失败' });
  }
});

/**
 * 更新复习提醒
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;
    
    const {
      remind_at,
      notes,
      status
    } = req.body;

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '提醒不存在或无权访问' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (remind_at !== undefined) {
      updates.push(`remind_at = $${paramIndex}`);
      values.push(new Date(remind_at));
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'sent', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: '无效的状态' });
      }
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.json({ success: true, data: formatReminder(existing), message: '没有需要更新的内容' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updated = await db.one(
      `UPDATE review_reminders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: formatReminder(updated),
      message: '复习提醒更新成功'
    });
  } catch (error) {
    console.error('更新复习提醒错误:', error);
    res.status(500).json({ success: false, message: '更新复习提醒失败' });
  }
});

/**
 * 标记提醒为已完成
 */
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '提醒不存在或无权访问' });
    }

    const updated = await db.one(`
      UPDATE review_reminders SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, ['completed', id, userId]);

    res.json({
      success: true,
      data: formatReminder(updated),
      message: '已标记为完成复习'
    });
  } catch (error) {
    console.error('完成提醒错误:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

/**
 * 取消复习提醒
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '提醒不存在或无权访问' });
    }

    const updated = await db.one(`
      UPDATE review_reminders SET status = $1, cancelled_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, ['cancelled', id, userId]);

    res.json({
      success: true,
      data: formatReminder(updated),
      message: '已取消复习提醒'
    });
  } catch (error) {
    console.error('取消提醒错误:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

/**
 * 删除复习提醒
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;

    const existing = await db.oneOrNone(
      'SELECT * FROM review_reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '提醒不存在或无权访问' });
    }

    await db.none('DELETE FROM review_reminders WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({
      success: true,
      message: '复习提醒删除成功'
    });
  } catch (error) {
    console.error('删除提醒错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 获取艾宾浩斯复习间隔配置
 */
router.get('/config/intervals', authMiddleware, async (req, res) => {
  const intervals = config.reminder?.intervals || DEFAULT_INTERVALS;
  
  const formattedIntervals = intervals.map((minutes, index) => {
    let label = '';
    if (minutes < 60) {
      label = `${minutes}分钟后`;
    } else if (minutes < 1440) {
      label = `${Math.floor(minutes / 60)}小时后`;
    } else {
      label = `${Math.floor(minutes / 1440)}天后`;
    }
    return {
      order: index + 1,
      minutes,
      label
    };
  });

  res.json({
    success: true,
    data: formattedIntervals
  });
});

module.exports = router;
