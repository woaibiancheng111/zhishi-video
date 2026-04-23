/**
 * 字幕路由
 * 字幕CRUD、字幕文件上传、自动字幕生成
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { uploadSubtitle } = require('../middleware/upload');
const { getDb } = require('../models');
const path = require('path');
const fs = require('fs');

/**
 * 将数据库字段转换为前端期望的格式
 */
function formatSubtitleItem(item) {
  return {
    ...item,
    start_time_sec: item.start_time,
    end_time_sec: item.end_time
  };
}

/**
 * 解析VTT格式字幕
 */
function parseVTT(content) {
  const lines = content.split('\n');
  const subtitles = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line === 'WEBVTT' || line === '') {
      i++;
      continue;
    }
    
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const startTime = parseTimeToSeconds(startStr);
      const endTime = parseTimeToSeconds(endStr);
      
      let text = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        text += (text ? ' ' : '') + lines[i].trim();
        i++;
      }
      
      if (text) {
        subtitles.push({
          start_time: startTime,
          end_time: endTime,
          text: text
        });
      }
    }
    i++;
  }
  
  return subtitles;
}

/**
 * 解析SRT格式字幕
 */
function parseSRT(content) {
  const blocks = content.trim().split(/\n\n+/);
  const subtitles = [];
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    const timeLine = lines[1];
    if (!timeLine || !timeLine.includes('-->')) continue;
    
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const startTime = parseSRTTimeToSeconds(startStr);
    const endTime = parseSRTTimeToSeconds(endStr);
    
    const text = lines.slice(2).join(' ').trim();
    
    if (text) {
      subtitles.push({
        start_time: startTime,
        end_time: endTime,
        text: text
      });
    }
  }
  
  return subtitles;
}

/**
 * 解析时间格式为秒数 (VTT格式: 00:00:00.000 或 00:00.000)
 */
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds = parseInt(parts[0], 10) * 3600 + 
              parseInt(parts[1], 10) * 60 + 
              parseFloat(parts[2].replace(',', '.'));
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + 
              parseFloat(parts[1].replace(',', '.'));
  }
  
  return Math.round(seconds * 1000) / 1000;
}

/**
 * 解析SRT时间格式为秒数 (SRT格式: 00:00:00,000)
 */
function parseSRTTimeToSeconds(timeStr) {
  return parseTimeToSeconds(timeStr.replace(',', '.'));
}

/**
 * 获取视频的所有字幕（含子标题）
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

    const subtitles = await db.any(`
      SELECT s.*, u.nickname as creator_name
      FROM subtitles s
      LEFT JOIN users u ON s.creator_id = u.id
      WHERE s.video_id = $1
      ORDER BY s.created_at ASC
    `, [videoId]);

    const result = [];
    for (const subtitle of subtitles) {
      const items = await db.any(`
        SELECT * FROM subtitle_items 
        WHERE subtitle_id = $1 
        ORDER BY start_time ASC
      `, [subtitle.id]);
      
      result.push({
        ...subtitle,
        is_auto: subtitle.source === 'auto',
        language_display: subtitle.language_name || subtitle.language,
        items: items.map(formatSubtitleItem)
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取字幕错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    res.status(500).json({ success: false, message: '获取字幕失败' });
  }
});

/**
 * 获取单个字幕详情
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const subtitle = await db.oneOrNone(`
      SELECT s.*, u.nickname as creator_name
      FROM subtitles s
      LEFT JOIN users u ON s.creator_id = u.id
      WHERE s.id = $1
    `, [id]);

    if (!subtitle) {
      return res.status(404).json({ success: false, message: '字幕不存在' });
    }

    const items = await db.any(`
      SELECT * FROM subtitle_items 
      WHERE subtitle_id = $1 
      ORDER BY start_time ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...subtitle,
        is_auto: subtitle.source === 'auto',
        language_display: subtitle.language_name || subtitle.language,
        items: items.map(formatSubtitleItem)
      }
    });
  } catch (error) {
    console.error('获取字幕详情错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }
    res.status(500).json({ success: false, message: '获取字幕详情失败' });
  }
});

/**
 * 上传字幕文件
 */
router.post('/upload', authMiddleware, (req, res) => {
  uploadSubtitle(req, res, async (err) => {
    if (err) {
      console.error('字幕上传错误:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '字幕上传失败' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请选择要上传的字幕文件' 
      });
    }

    try {
      const subtitleUrl = `/uploads/subtitles/${req.file.filename}`;
      
      let parsedItems = [];
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      try {
        const content = fs.readFileSync(req.file.path, 'utf-8');
        
        if (ext === '.vtt') {
          parsedItems = parseVTT(content);
        } else if (ext === '.srt') {
          parsedItems = parseSRT(content);
        } else if (ext === '.json') {
          const jsonData = JSON.parse(content);
          parsedItems = jsonData.items || jsonData.subtitles || [];
        }
      } catch (parseError) {
        console.warn('解析字幕文件失败:', parseError.message);
      }

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          original_name: req.file.originalname,
          url: subtitleUrl,
          size: req.file.size,
          ext,
          items: parsedItems.map(formatSubtitleItem)
        },
        message: '字幕上传成功'
      });
    } catch (error) {
      console.error('保存字幕信息错误:', error);
      res.status(500).json({ success: false, message: '保存字幕信息失败' });
    }
  });
});

/**
 * 创建字幕
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    
    const {
      video_id,
      language = 'zh-CN',
      language_name = '中文',
      file_url = '',
      items = [],
      source = 'manual'
    } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    const video = await db.oneOrNone(
      'SELECT id, creator_id FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const subtitle = await db.one(`
      INSERT INTO subtitles (
        video_id, creator_id, language, language_name, 
        file_url, source, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [
      video_id,
      userId,
      language,
      language_name,
      file_url,
      source,
      'active'
    ]);

    if (items && items.length > 0) {
      for (const item of items) {
        await db.none(`
          INSERT INTO subtitle_items (
            subtitle_id, start_time, end_time, text, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          subtitle.id,
          item.start_time || item.start_time_sec || 0,
          item.end_time || item.end_time_sec || 0,
          item.text || ''
        ]);
      }
    }

    const savedItems = await db.any(`
      SELECT * FROM subtitle_items WHERE subtitle_id = $1 ORDER BY start_time ASC
    `, [subtitle.id]);

    res.status(201).json({
      success: true,
      data: {
        ...subtitle,
        is_auto: subtitle.source === 'auto',
        language_display: subtitle.language_name || subtitle.language,
        items: savedItems.map(formatSubtitleItem)
      },
      message: '字幕创建成功'
    });
  } catch (error) {
    console.error('创建字幕错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(500).json({ 
        success: false, 
        message: '数据库表不存在，请先执行数据库迁移' 
      });
    }
    res.status(500).json({ success: false, message: '创建字幕失败' });
  }
});

/**
 * 更新字幕
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;
    
    const {
      language,
      language_name,
      items,
      status
    } = req.body;

    const existing = await db.oneOrNone(
      'SELECT * FROM subtitles WHERE id = $1 AND creator_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '字幕不存在或无权访问' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (language !== undefined) {
      updates.push(`language = $${paramIndex}`);
      values.push(language);
      paramIndex++;
    }

    if (language_name !== undefined) {
      updates.push(`language_name = $${paramIndex}`);
      values.push(language_name);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: '无效的字幕状态' });
      }
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    let updated;
    if (updates.length > 0) {
      values.push(id);
      updated = await db.one(
        `UPDATE subtitles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
    } else {
      updated = existing;
    }

    if (items !== undefined && items.length > 0) {
      await db.none('DELETE FROM subtitle_items WHERE subtitle_id = $1', [id]);
      
      for (const item of items) {
        await db.none(`
          INSERT INTO subtitle_items (
            subtitle_id, start_time, end_time, text, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [
          id,
          item.start_time || item.start_time_sec || 0,
          item.end_time || item.end_time_sec || 0,
          item.text || ''
        ]);
      }
    }

    const savedItems = await db.any(`
      SELECT * FROM subtitle_items WHERE subtitle_id = $1 ORDER BY start_time ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...updated,
        is_auto: updated.source === 'auto',
        language_display: updated.language_name || updated.language,
        items: savedItems.map(formatSubtitleItem)
      },
      message: '字幕更新成功'
    });
  } catch (error) {
    console.error('更新字幕错误:', error);
    res.status(500).json({ success: false, message: '更新字幕失败' });
  }
});

/**
 * 删除字幕
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { id } = req.params;

    const existing = await db.oneOrNone(
      'SELECT * FROM subtitles WHERE id = $1 AND creator_id = $2',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: '字幕不存在或无权访问' });
    }

    await db.none('DELETE FROM subtitle_items WHERE subtitle_id = $1', [id]);
    await db.none('DELETE FROM subtitles WHERE id = $1 AND creator_id = $2', [id, userId]);

    res.json({
      success: true,
      message: '字幕删除成功'
    });
  } catch (error) {
    console.error('删除字幕错误:', error);
    res.status(500).json({ success: false, message: '删除字幕失败' });
  }
});

/**
 * 生成自动字幕（模拟AI服务）
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { video_id, language = 'zh-CN' } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: '请指定视频' });
    }

    const video = await db.oneOrNone(
      'SELECT id, title, description, duration, creator_id, tags FROM videos WHERE id = $1',
      [video_id]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    const languageNames = {
      'zh-CN': '中文',
      'en': '英文',
      'ja': '日文',
      'ko': '韩文'
    };

    const duration = video.duration || 300;
    const generatedItems = [];
    
    const keywords = (video.tags || []).concat(
      (video.title || '').split(/[，。！？、\s]+/),
      (video.description || '').split(/[，。！？、\s]+/)
    ).filter(k => k.length > 1);

    const interval = Math.max(10, Math.floor(duration / Math.min(20, Math.max(5, keywords.length))));
    
    for (let i = 0; i < Math.min(20, keywords.length); i++) {
      const startTime = i * interval;
      const endTime = Math.min(startTime + interval - 2, duration);
      
      generatedItems.push({
        start_time: startTime,
        start_time_sec: startTime,
        end_time: endTime,
        end_time_sec: endTime,
        text: `这是第${i + 1}条自动生成的字幕：${keywords[i] || '视频内容摘要'}`
      });
    }

    const subtitle = await db.one(`
      INSERT INTO subtitles (
        video_id, creator_id, language, language_name, 
        source, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      video_id,
      userId,
      language,
      languageNames[language] || language,
      'auto',
      'active'
    ]);

    for (const item of generatedItems) {
      await db.none(`
        INSERT INTO subtitle_items (
          subtitle_id, start_time, end_time, text, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        subtitle.id,
        item.start_time,
        item.end_time,
        item.text
      ]);
    }

    const savedItems = await db.any(`
      SELECT * FROM subtitle_items WHERE subtitle_id = $1 ORDER BY start_time ASC
    `, [subtitle.id]);

    res.status(201).json({
      success: true,
      data: {
        ...subtitle,
        is_auto: true,
        language_display: subtitle.language_name || subtitle.language,
        items: savedItems.map(formatSubtitleItem)
      },
      message: '自动字幕生成成功'
    });
  } catch (error) {
    console.error('生成自动字幕错误:', error);
    if (error.message && error.message.includes('relation')) {
      return res.status(500).json({ 
        success: false, 
        message: '数据库表不存在，请先执行数据库迁移' 
      });
    }
    res.status(500).json({ success: false, message: '生成自动字幕失败' });
  }
});

module.exports = router;
