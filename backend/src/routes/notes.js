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

/**
 * 格式化时间戳
 */
function formatTimestamp(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 生成Markdown格式笔记
 */
function generateMarkdown(notes) {
  const notesByVideo = {};
  
  notes.forEach(note => {
    const videoId = note.video_id;
    if (!notesByVideo[videoId]) {
      notesByVideo[videoId] = {
        video_title: note.video_title || '未命名视频',
        cover_url: note.cover_url,
        notes: []
      };
    }
    notesByVideo[videoId].notes.push(note);
  });

  let markdown = `# 知视学习笔记导出\n\n`;
  markdown += `> 导出时间: ${formatDate(new Date().toISOString())}\n\n`;
  markdown += `---\n\n`;

  Object.keys(notesByVideo).forEach((videoId, index) => {
    const video = notesByVideo[videoId];
    markdown += `## ${index + 1}. ${video.video_title}\n\n`;
    
    video.notes
      .sort((a, b) => (a.timestamp_sec || 0) - (b.timestamp_sec || 0))
      .forEach((note, noteIndex) => {
        const timestamp = note.timestamp_sec > 0 ? `⏱ ${formatTimestamp(note.timestamp_sec)}` : '';
        const updateTime = formatDate(note.updated_at);
        
        markdown += `### 笔记 ${noteIndex + 1}\n\n`;
        if (timestamp) {
          markdown += `**时间点**: ${timestamp}\n\n`;
        }
        markdown += `**更新时间**: ${updateTime}\n\n`;
        markdown += `${note.content}\n\n`;
        markdown += `---\n\n`;
      });
  });

  return markdown;
}

/**
 * 生成纯文本格式笔记
 */
function generateText(notes) {
  const notesByVideo = {};
  
  notes.forEach(note => {
    const videoId = note.video_id;
    if (!notesByVideo[videoId]) {
      notesByVideo[videoId] = {
        video_title: note.video_title || '未命名视频',
        notes: []
      };
    }
    notesByVideo[videoId].notes.push(note);
  });

  let text = `知视学习笔记导出\n`;
  text += `================\n\n`;
  text += `导出时间: ${formatDate(new Date().toISOString())}\n\n`;
  text += `================================\n\n`;

  Object.keys(notesByVideo).forEach((videoId, index) => {
    const video = notesByVideo[videoId];
    text += `${index + 1}. ${video.video_title}\n`;
    text += `${'-'.repeat(50)}\n\n`;
    
    video.notes
      .sort((a, b) => (a.timestamp_sec || 0) - (b.timestamp_sec || 0))
      .forEach((note, noteIndex) => {
        const timestamp = note.timestamp_sec > 0 ? `[${formatTimestamp(note.timestamp_sec)}]` : '';
        const updateTime = formatDate(note.updated_at);
        
        text += `【笔记 ${noteIndex + 1}】${timestamp}\n`;
        text += `更新时间: ${updateTime}\n`;
        text += `${note.content}\n\n`;
        text += `${'-'.repeat(30)}\n\n`;
      });
  });

  return text;
}

/**
 * POST /api/v1/notes/export/markdown
 * 导出笔记为Markdown格式
 */
router.post('/export/markdown', notesWriteLimiter, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { note_ids } = req.body;
    const db = getDb();

    let notes;
    if (note_ids && Array.isArray(note_ids) && note_ids.length > 0) {
      const placeholders = note_ids.map((_, i) => `$${i + 2}`).join(',');
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1 AND n.id IN (${placeholders})
        ORDER BY n.updated_at DESC
      `, [userId, ...note_ids]);
    } else {
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1
        ORDER BY n.updated_at DESC
      `, [userId]);
    }

    const markdown = generateMarkdown(notes);
    const filename = `知视笔记_${new Date().toISOString().slice(0, 10)}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.send(markdown);
  } catch (error) {
    console.error('[导出Markdown错误]', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * POST /api/v1/notes/export/json
 * 导出笔记为JSON格式
 */
router.post('/export/json', notesWriteLimiter, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { note_ids } = req.body;
    const db = getDb();

    let notes;
    if (note_ids && Array.isArray(note_ids) && note_ids.length > 0) {
      const placeholders = note_ids.map((_, i) => `$${i + 2}`).join(',');
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1 AND n.id IN (${placeholders})
        ORDER BY n.updated_at DESC
      `, [userId, ...note_ids]);
    } else {
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1
        ORDER BY n.updated_at DESC
      `, [userId]);
    }

    const exportData = {
      export_time: new Date().toISOString(),
      platform: '知视-职场知识短视频',
      total_notes: notes.length,
      notes: notes.map(n => ({
        id: n.id,
        content: n.content,
        timestamp_sec: n.timestamp_sec,
        timestamp_formatted: formatTimestamp(n.timestamp_sec),
        created_at: n.created_at,
        updated_at: n.updated_at,
        video: {
          id: n.video_id,
          title: n.video_title,
          cover_url: n.cover_url
        }
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('[导出JSON错误]', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * POST /api/v1/notes/export/txt
 * 导出笔记为纯文本格式
 */
router.post('/export/txt', notesWriteLimiter, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { note_ids } = req.body;
    const db = getDb();

    let notes;
    if (note_ids && Array.isArray(note_ids) && note_ids.length > 0) {
      const placeholders = note_ids.map((_, i) => `$${i + 2}`).join(',');
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1 AND n.id IN (${placeholders})
        ORDER BY n.updated_at DESC
      `, [userId, ...note_ids]);
    } else {
      notes = await db.any(`
        SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
               v.id as video_id, v.title as video_title, v.cover_url
        FROM notes n
        JOIN videos v ON n.video_id = v.id
        WHERE n.user_id = $1
        ORDER BY n.updated_at DESC
      `, [userId]);
    }

    const text = generateText(notes);
    const filename = `知视笔记_${new Date().toISOString().slice(0, 10)}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.send(text);
  } catch (error) {
    console.error('[导出TXT错误]', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * GET /api/v1/notes/:id/export/:format
 * 导出单条笔记
 */
router.get('/:id/export/:format', async (req, res) => {
  try {
    const { id, format } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    const note = await db.oneOrNone(`
      SELECT n.id, n.content, n.timestamp_sec, n.created_at, n.updated_at,
             v.id as video_id, v.title as video_title, v.cover_url
      FROM notes n
      JOIN videos v ON n.video_id = v.id
      WHERE n.id = $1 AND n.user_id = $2
    `, [id, userId]);

    if (!note) {
      return res.status(404).json({ success: false, message: '笔记不存在或无权访问' });
    }

    const notes = [note];

    if (format === 'markdown' || format === 'md') {
      const markdown = generateMarkdown(notes);
      const filename = `知视笔记_${note.id}_${new Date().toISOString().slice(0, 10)}.md`;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
      res.send(markdown);
    } else if (format === 'txt' || format === 'text') {
      const text = generateText(notes);
      const filename = `知视笔记_${note.id}_${new Date().toISOString().slice(0, 10)}.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
      res.send(text);
    } else {
      const exportData = {
        export_time: new Date().toISOString(),
        platform: '知视-职场知识短视频',
        note: {
          id: note.id,
          content: note.content,
          timestamp_sec: note.timestamp_sec,
          timestamp_formatted: formatTimestamp(note.timestamp_sec),
          created_at: note.created_at,
          updated_at: note.updated_at,
          video: {
            id: note.video_id,
            title: note.video_title,
            cover_url: note.cover_url
          }
        }
      };
      res.json({ success: true, data: exportData });
    }
  } catch (error) {
    console.error('[导出单条笔记错误]', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

module.exports = router;
