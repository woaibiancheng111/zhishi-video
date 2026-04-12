const fs = require('fs');
const path = require('path');

const usersJsPath = path.join(__dirname, 'backend/src/routes/users.js');
let usersCode = fs.readFileSync(usersJsPath, 'utf-8');

const additionalRoutes = `
/**
 * POST /api/v1/users/check-in
 * 用户打卡，更新连续打卡天数和积分
 */
router.post('/check-in', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = req.app.locals.db || require('../models').getDb();

    // 获取用户统计数据
    let stats = await db.oneOrNone('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
    if (!stats) {
      stats = await db.one(
        'INSERT INTO user_statistics (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const lastCheckIn = stats.last_check_in_date 
      ? new Date(stats.last_check_in_date).toISOString().split('T')[0]
      : null;

    let continuousDays = stats.continuous_days || 0;
    let checkInCount = stats.check_in_count || 0;
    let totalPoints = stats.total_points || 0;

    if (lastCheckIn === today) {
      return res.json({ success: false, message: '今天已打卡，请明天再来' });
    }

    if (lastCheckIn) {
      const lastDate = new Date(lastCheckIn);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      continuousDays = diffDays === 1 ? continuousDays + 1 : 1;
    } else {
      continuousDays = 1;
    }

    checkInCount += 1;
    totalPoints += 10;

    await db.none(
      \`UPDATE user_statistics 
       SET check_in_count = $1, continuous_days = $2, last_check_in_date = $3, total_points = $4, updated_at = NOW()
       WHERE user_id = $5\`,
      [checkInCount, continuousDays, today, totalPoints, userId]
    );

    if (continuousDays === 7) {
      const badge = await db.oneOrNone("SELECT id FROM badges WHERE name = '连续打卡7天' LIMIT 1");
      if (badge) {
        const hasBadge = await db.oneOrNone('SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2', [userId, badge.id]);
        if (!hasBadge) await db.none('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badge.id]);
      }
    }

    res.json({
      success: true,
      message: '打卡成功',
      data: { check_in_count: checkInCount, continuous_days: continuousDays, total_points: totalPoints, badge_unlocked: continuousDays === 7 ? '连续打卡7天' : null }
    });
  } catch (error) {
    console.error('[打卡错误]', error);
    res.status(500).json({ success: false, message: '打卡失败' });
  }
});

/**
 * GET /api/v1/users/achievements
 * 获取用户成就与统计信息
 */
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const db = req.app.locals.db || require('../models').getDb();

    const stats = await db.oneOrNone('SELECT * FROM user_statistics WHERE user_id = $1', [userId]) || {};
    const badges = await db.any(
      \`SELECT b.id, b.name, b.description, b.icon_url, b.category, ub.earned_at
       FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC\`, [userId]
    );

    const allBadges = await db.any('SELECT id, name, description, icon_url, category FROM badges ORDER BY sort_order');

    const badgeProgress = allBadges.map(badge => {
      const earned = badges.some(b => b.id === badge.id);
      let progress = 0;
      if (badge.name === '连续打卡7天') progress = Math.min((stats.continuous_days || 0) / 7 * 100, 100);
      else progress = earned ? 100 : 0; // Simplified
      return { ...badge, earned, progress: Math.floor(progress) };
    });

    res.json({
      success: true,
      data: { statistics: stats, badges: { earned_count: badges.length, earned: badges, all_progress: badgeProgress } }
    });
  } catch (error) {
    console.error('[获取成就错误]', error);
    res.status(500).json({ success: false, message: '获取信息失败' });
  }
});

module.exports = router;
`;

usersCode = usersCode.replace('module.exports = router;', additionalRoutes);
fs.writeFileSync(usersJsPath, usersCode);
console.log('Patched users.js');
