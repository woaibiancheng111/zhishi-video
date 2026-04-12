/**
 * 收藏路由
 * 收藏夹管理、添加/取消收藏
 */
const express = require('express');
const { getDb } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

async function ensureUserExists(db, userId, res) {
  const user = await db.oneOrNone('SELECT id FROM users WHERE id = $1', [userId]);
  if (!user) {
    res.status(401).json({
      success: false,
      message: '登录状态已失效，请重新登录'
    });
    return false;
  }
  return true;
}

// 所有收藏接口都需要登录
router.use(authMiddleware);

/**
 * GET /api/v1/favorites
 * 获取收藏列表
 * 查询参数: folder_id
 */
router.get('/', async (req, res) => {
  try {
    const { folder_id } = req.query;
    const userId = req.user.user_id;
    const db = getDb();

    if (!(await ensureUserExists(db, userId, res))) {
      return;
    }

    // 获取收藏夹列表
    const folders = await db.any(
      'SELECT * FROM favorite_folders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // 获取收藏的视频
    let query = `
      SELECT f.id as favorite_id, f.folder_id, f.created_at as favorited_at,
             v.*, c.name as category_name
      FROM favorites f
      JOIN videos v ON f.video_id = v.id
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE f.user_id = $1
    `;
    const params = [userId];

    if (folder_id) {
      query += ' AND f.folder_id = $2';
      params.push(folder_id);
    }

    query += ' ORDER BY f.created_at DESC';

    const favorites = await db.any(query, params);

    res.json({
      success: true,
      data: {
        folders,
        items: favorites
      }
    });
  } catch (error) {
    console.error('[获取收藏列表错误]', error);
    res.status(500).json({
      success: false,
      message: '获取收藏列表失败'
    });
  }
});

/**
 * POST /api/v1/favorites
 * 添加收藏
 * 请求体: { video_id, folder_id? }
 */
router.post('/', async (req, res) => {
  try {
    const { video_id, folder_id } = req.body;
    const userId = req.user.user_id;
    const db = getDb();

    if (!(await ensureUserExists(db, userId, res))) {
      return;
    }

    if (!video_id) {
      return res.status(400).json({
        success: false,
        message: '视频ID不能为空'
      });
    }

    // 检查视频是否存在
    const video = await db.oneOrNone('SELECT id FROM videos WHERE id = $1', [video_id]);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频不存在'
      });
    }

    // 检查是否已收藏
    const existing = await db.oneOrNone(
      'SELECT id FROM favorites WHERE user_id = $1 AND video_id = $2',
      [userId, video_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: '已收藏该视频'
      });
    }

    // 如果没有指定收藏夹，使用默认收藏夹
    let targetFolderId = folder_id;
    if (!targetFolderId) {
      const defaultFolder = await db.oneOrNone(
        'SELECT id FROM favorite_folders WHERE user_id = $1 AND name = $2',
        [userId, '默认收藏']
      );
      if (defaultFolder) {
        targetFolderId = defaultFolder.id;
      } else {
        // 自动创建默认收藏夹
        const newFolder = await db.one(
          'INSERT INTO favorite_folders (user_id, name, created_at) VALUES ($1, $2, NOW()) RETURNING id',
          [userId, '默认收藏']
        );
        targetFolderId = newFolder.id;
      }
    }

    // 添加收藏
    const favorite = await db.one(
      'INSERT INTO favorites (user_id, video_id, folder_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, video_id, targetFolderId]
    );

    res.status(201).json({
      success: true,
      data: favorite
    });
  } catch (error) {
    console.error('[添加收藏错误]', error);
    res.status(500).json({
      success: false,
      message: '添加收藏失败'
    });
  }
});

/**
 * DELETE /api/v1/favorites/:id
 * 取消收藏
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const db = getDb();

    if (!(await ensureUserExists(db, userId, res))) {
      return;
    }

    // 检查收藏是否存在
    const favorite = await db.oneOrNone(
      'SELECT id FROM favorites WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: '收藏不存在'
      });
    }

    await db.none('DELETE FROM favorites WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '已取消收藏'
    });
  } catch (error) {
    console.error('[取消收藏错误]', error);
    res.status(500).json({
      success: false,
      message: '取消收藏失败'
    });
  }
});

/**
 * POST /api/v1/favorites/folders
 * 创建收藏夹
 * 请求体: { name, description? }
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.user_id;
    const db = getDb();

    if (!(await ensureUserExists(db, userId, res))) {
      return;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '收藏夹名称不能为空'
      });
    }

    // 检查收藏夹名称是否已存在
    const existing = await db.oneOrNone(
      'SELECT id FROM favorite_folders WHERE user_id = $1 AND name = $2',
      [userId, name]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: '收藏夹名称已存在'
      });
    }

    const folder = await db.one(
      'INSERT INTO favorite_folders (user_id, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, name, description || '']
    );

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('[创建收藏夹错误]', error);
    res.status(500).json({
      success: false,
      message: '创建收藏夹失败'
    });
  }
});

module.exports = router;
