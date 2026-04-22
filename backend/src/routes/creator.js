const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { getDb, getRedis } = require('../models');
const config = require('../config');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
const videoUploadDir = path.join(uploadDir, 'videos');
const coverUploadDir = path.join(uploadDir, 'covers');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(videoUploadDir)) fs.mkdirSync(videoUploadDir, { recursive: true });
if (!fs.existsSync(coverUploadDir)) fs.mkdirSync(coverUploadDir, { recursive: true });

// 视频上传配置
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 封面图上传配置
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coverUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const videoFilter = (req, file, cb) => {
  const allowedTypes = /mp4|webm|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype.toLowerCase());
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('只支持 MP4, WebM, MOV, AVI, MKV 格式的视频文件'));
  }
};

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype.toLowerCase());
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('只支持 JPEG, PNG, GIF, WebP 格式的图片文件'));
  }
};

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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

    const countResult = await db.query(`
      SELECT COUNT(*) FROM videos v ${whereClause}
    `, params);

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

// 上传视频文件
router.post('/videos/upload', authMiddleware, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择视频文件' });
    }

    const db = await getDb();
    const userId = req.user.user_id;
    const { originalname, filename, size } = req.file;
    
    const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
    const videoUrl = `${baseUrl}/uploads/videos/${filename}`;

    const result = await db.one(`
      INSERT INTO videos (
        title, description, video_url, cover_url, 
        creator_id, tags, duration, status, 
        processing_status, original_file_name,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      originalname.replace(/\.[^/.]+$/, ''),
      '',
      videoUrl,
      '',
      userId,
      [],
      0,
      'draft',
      'processing',
      originalname
    ]);

    res.json({
      success: true,
      data: {
        video_id: result.id,
        video_url: videoUrl,
        file_name: originalname,
        file_size: size,
        status: 'processing',
        message: '视频上传成功，正在处理中...'
      }
    });

    simulateVideoProcessing(result.id, filename);
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

// 上传封面图
router.post('/videos/cover', authMiddleware, uploadCover.single('cover'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择封面图片' });
    }

    const { filename } = req.file;
    const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
    const coverUrl = `${baseUrl}/uploads/covers/${filename}`;

    res.json({
      success: true,
      data: {
        cover_url: coverUrl
      }
    });
  } catch (error) {
    console.error('Error uploading cover:', error);
    res.status(500).json({ success: false, message: error.message || '封面上传失败' });
  }
});

// 创建/更新视频信息
router.post('/videos', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const { video_id, title, description, category_id, tags, cover_url, status } = req.body;

    if (!video_id && !title) {
      return res.status(400).json({ success: false, message: '视频ID或标题不能为空' });
    }

    let result;

    if (video_id) {
      const existing = await db.oneOrNone(
        'SELECT * FROM videos WHERE id = $1 AND creator_id = $2',
        [video_id, userId]
      );

      if (!existing) {
        return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
      }

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        values.push(title);
        paramIndex++;
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(description);
        paramIndex++;
      }
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramIndex}`);
        values.push(category_id);
        paramIndex++;
      }
      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex}`);
        values.push(tags);
        paramIndex++;
      }
      if (cover_url !== undefined) {
        updates.push(`cover_url = $${paramIndex}`);
        values.push(cover_url);
        paramIndex++;
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(video_id);

      result = await db.one(`
        UPDATE videos SET ${updates.join(', ')} 
        WHERE id = $${paramIndex} RETURNING *
      `, values);
    } else {
      result = await db.one(`
        INSERT INTO videos (
          title, description, cover_url, category_id, 
          creator_id, tags, status, video_url,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
        title,
        description || '',
        cover_url || '',
        category_id || null,
        userId,
        tags || [],
        'draft',
        ''
      ]);
    }

    res.json({
      success: true,
      data: result,
      message: video_id ? '视频信息已更新' : '视频草稿已创建'
    });
  } catch (error) {
    console.error('Error saving video:', error);
    res.status(500).json({ success: false, message: error.message || '保存失败' });
  }
});

// 删除视频
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
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    await db.none('DELETE FROM videos WHERE id = $1', [videoId]);

    res.json({
      success: true,
      message: '视频已删除'
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

// 发布视频
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
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    if (!existing.video_url) {
      return res.status(400).json({ success: false, message: '请先上传视频文件' });
    }

    if (!existing.title) {
      return res.status(400).json({ success: false, message: '请填写视频标题' });
    }

    const result = await db.one(`
      UPDATE videos SET status = 'published', updated_at = NOW() 
      WHERE id = $1 RETURNING *
    `, [videoId]);

    res.json({
      success: true,
      data: result,
      message: '视频已发布'
    });
  } catch (error) {
    console.error('Error publishing video:', error);
    res.status(500).json({ success: false, message: error.message || '发布失败' });
  }
});

// 获取视频处理进度
router.get('/videos/:id/progress', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const video = await db.oneOrNone(
      'SELECT processing_status, processing_progress FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }

    res.json({
      success: true,
      data: {
        status: video.processing_status,
        progress: video.processing_progress
      }
    });
  } catch (error) {
    console.error('Error getting video progress:', error);
    res.status(500).json({ success: false, message: '获取进度失败' });
  }
});

// 获取视频的字幕列表
router.get('/videos/:id/subtitles', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const video = await db.oneOrNone(
      'SELECT id FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    const subtitles = await db.any(
      'SELECT * FROM subtitles WHERE video_id = $1 ORDER BY language',
      [videoId]
    );

    res.json({
      success: true,
      data: subtitles
    });
  } catch (error) {
    console.error('Error getting subtitles:', error);
    res.status(500).json({ success: false, message: '获取字幕失败' });
  }
});

// 生成自动字幕
router.post('/videos/:id/subtitles/generate', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;
    const { language = 'zh-CN' } = req.body;

    const video = await db.oneOrNone(
      'SELECT * FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    const existing = await db.oneOrNone(
      'SELECT * FROM subtitles WHERE video_id = $1 AND language = $2',
      [videoId, language]
    );

    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: '字幕已存在'
      });
    }

    const sampleSubtitles = generateSampleSubtitles(video.duration || 180, video.title);

    const result = await db.one(`
      INSERT INTO subtitles (video_id, language, content, is_auto_generated, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      RETURNING *
    `, [videoId, language, JSON.stringify(sampleSubtitles)]);

    res.json({
      success: true,
      data: result,
      message: '自动字幕生成成功'
    });
  } catch (error) {
    console.error('Error generating subtitles:', error);
    res.status(500).json({ success: false, message: error.message || '生成字幕失败' });
  }
});

// 更新字幕
router.put('/videos/:id/subtitles/:language', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;
    const language = req.params.language;
    const { content } = req.body;

    const video = await db.oneOrNone(
      'SELECT id FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    const result = await db.oneOrNone(`
      UPDATE subtitles SET content = $1, updated_at = NOW() 
      WHERE video_id = $2 AND language = $3
      RETURNING *
    `, [content, videoId, language]);

    if (!result) {
      return res.status(404).json({ success: false, message: '字幕不存在' });
    }

    res.json({
      success: true,
      data: result,
      message: '字幕已更新'
    });
  } catch (error) {
    console.error('Error updating subtitles:', error);
    res.status(500).json({ success: false, message: error.message || '更新字幕失败' });
  }
});

// 获取视频的知识点标记
router.get('/videos/:id/knowledge-points', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;

    const video = await db.oneOrNone(
      'SELECT id FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    const points = await db.any(
      'SELECT * FROM knowledge_points WHERE video_id = $1 ORDER BY start_time_sec',
      [videoId]
    );

    res.json({
      success: true,
      data: points
    });
  } catch (error) {
    console.error('Error getting knowledge points:', error);
    res.status(500).json({ success: false, message: '获取知识点失败' });
  }
});

// 创建/更新知识点标记
router.post('/videos/:id/knowledge-points', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;
    const { id, title, description, start_time_sec, end_time_sec, tags } = req.body;

    const video = await db.oneOrNone(
      'SELECT id FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    let result;

    if (id) {
      result = await db.oneOrNone(`
        UPDATE knowledge_points SET 
          title = $1, description = $2, start_time_sec = $3, 
          end_time_sec = $4, tags = $5, updated_at = NOW()
        WHERE id = $6 AND video_id = $7
        RETURNING *
      `, [title, description, start_time_sec, end_time_sec, tags || [], id, videoId]);

      if (!result) {
        return res.status(404).json({ success: false, message: '知识点不存在' });
      }
    } else {
      result = await db.one(`
        INSERT INTO knowledge_points (
          video_id, title, description, start_time_sec, end_time_sec, tags,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [videoId, title, description || '', start_time_sec || 0, end_time_sec || 0, tags || []]);
    }

    res.json({
      success: true,
      data: result,
      message: id ? '知识点已更新' : '知识点已创建'
    });
  } catch (error) {
    console.error('Error saving knowledge point:', error);
    res.status(500).json({ success: false, message: error.message || '保存失败' });
  }
});

// 删除知识点标记
router.delete('/videos/:id/knowledge-points/:pointId', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.user_id;
    const videoId = req.params.id;
    const pointId = req.params.pointId;

    const video = await db.oneOrNone(
      'SELECT id FROM videos WHERE id = $1 AND creator_id = $2',
      [videoId, userId]
    );

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在或无权操作' });
    }

    await db.none('DELETE FROM knowledge_points WHERE id = $1 AND video_id = $2', [pointId, videoId]);

    res.json({
      success: true,
      message: '知识点已删除'
    });
  } catch (error) {
    console.error('Error deleting knowledge point:', error);
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

// 模拟视频处理
function simulateVideoProcessing(videoId, filename) {
  const dbPromise = getDb();
  
  let progress = 0;
  const interval = setInterval(async () => {
    progress += 10;
    try {
      const db = await dbPromise;
      await db.none(`
        UPDATE videos SET processing_progress = $1, updated_at = NOW() 
        WHERE id = $2
      `, [progress, videoId]);

      if (progress >= 100) {
        clearInterval(interval);
        await db.none(`
          UPDATE videos SET 
            processing_status = 'completed', 
            processing_progress = 100,
            duration = $1,
            updated_at = NOW() 
          WHERE id = $2
        `, [Math.floor(Math.random() * 300) + 60, videoId]);
      }
    } catch (error) {
      console.error('Error updating video processing:', error);
      clearInterval(interval);
    }
  }, 500);
}

// 生成示例字幕
function generateSampleSubtitles(duration, title) {
  const subtitles = [];
  const segmentCount = Math.min(Math.ceil(duration / 30), 10);
  
  for (let i = 0; i < segmentCount; i++) {
    const startTime = i * 30;
    const endTime = Math.min((i + 1) * 30, duration);
    
    const sampleTexts = [
      `欢迎观看《${title}》`,
      '本节主要讲解核心概念和基础原理',
      '接下来我们通过实际案例来加深理解',
      '这里需要特别注意几个关键点',
      '总结一下，本节的主要内容包括',
      '下面我们来做一个简单的练习',
      '常见的错误和解决方案',
      '最佳实践和性能优化建议',
      '扩展阅读和参考资料',
      '感谢观看，下节再见'
    ];
    
    subtitles.push({
      id: i + 1,
      start_time: startTime,
      end_time: endTime,
      text: sampleTexts[i % sampleTexts.length]
    });
  }
  
  return subtitles;
}

module.exports = router;
