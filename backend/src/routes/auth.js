/**
 * 认证路由
 * 登录、注册、更新用户画像
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../models');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/v1/auth/login
 * 手机号登录（MVP阶段验证码固定为1234）
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    // 参数校验
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '手机号和验证码不能为空'
      });
    }

    // 手机号格式校验
    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    // MVP阶段验证码固定为1234
    if (code !== '1234') {
      return res.status(400).json({
        success: false,
        message: '验证码错误'
      });
    }

    const db = getDb();

    // 查找或创建用户
    let user = await db.oneOrNone(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (!user) {
      // 自动注册新用户
      user = await db.one(
        `INSERT INTO users (phone, nickname, avatar_url, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [
          phone,
          `用户${phone.slice(-4)}`,
          `https://api.dicebear.com/7.x/initials/svg?seed=${phone}`
        ]
      );
    }

    // 生成 JWT token
    const token = jwt.sign(
      { user_id: user.id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          career_direction: user.career_direction,
          skill_tags: user.skill_tags,
          is_new_user: !user.career_direction
        }
      }
    });
  } catch (error) {
    console.error('[登录错误]', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

/**
 * POST /api/v1/auth/register
 * 注册新用户
 */
router.post('/register', async (req, res) => {
  try {
    const { phone, nickname, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '手机号和验证码不能为空'
      });
    }

    if (code !== '1234') {
      return res.status(400).json({
        success: false,
        message: '验证码错误'
      });
    }

    const db = getDb();

    // 检查手机号是否已注册
    const existing = await db.oneOrNone(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: '该手机号已注册'
      });
    }

    // 创建用户
    const user = await db.one(
      `INSERT INTO users (phone, nickname, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [
        phone,
        nickname || `用户${phone.slice(-4)}`,
        `https://api.dicebear.com/7.x/initials/svg?seed=${phone}`
      ]
    );

    // 生成 JWT token
    const token = jwt.sign(
      { user_id: user.id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar_url: user.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('[注册错误]', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

/**
 * POST /api/v1/auth/profile
 * 更新用户画像（职业方向、技能标签）
 */
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    const { career_direction, skill_tags } = req.body;
    const userId = req.user.user_id;

    if (!career_direction) {
      return res.status(400).json({
        success: false,
        message: '请选择职业方向'
      });
    }

    const db = getDb();

    const user = await db.one(
      `UPDATE users
       SET career_direction = $1, skill_tags = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [career_direction, skill_tags || [], userId]
    );

    res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        career_direction: user.career_direction,
        skill_tags: user.skill_tags
      }
    });
  } catch (error) {
    console.error('[更新画像错误]', error);
    res.status(500).json({
      success: false,
      message: '更新用户画像失败'
    });
  }
});

module.exports = router;
