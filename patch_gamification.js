const fs = require('fs');
const path = require('path');

const seedSqlPath = path.join(__dirname, 'backend/scripts/seed.sql');
let seedSql = fs.readFileSync(seedSqlPath, 'utf-8');

seedSql = seedSql.replace(
  'DROP TABLE IF EXISTS notes CASCADE;',
  `DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS user_statistics CASCADE;
DROP TABLE IF EXISTS notes CASCADE;`
);

const newTables = `
-- ============================================
-- 用户统计表
-- ============================================
CREATE TABLE user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_count INTEGER DEFAULT 0,
    continuous_days INTEGER DEFAULT 0,
    last_check_in_date DATE,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 徽章定义表
-- ============================================
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    icon_url VARCHAR(500) DEFAULT '',
    category VARCHAR(50) DEFAULT 'achievement',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 用户徽章关系表
-- ============================================
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);
`;

const newIndexes = `
CREATE INDEX idx_user_statistics_user ON user_statistics(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_badges_category ON badges(category);
`;

if (!seedSql.includes('CREATE TABLE user_statistics')) {
  seedSql = seedSql.replace(
    '-- ============================================\n-- 插入一些模拟用户行为数据',
    newTables + '\n' + newIndexes + '\n-- ============================================\n-- 插入一些模拟用户行为数据'
  );
  
  const seedData = `
-- ============================================
-- 插入预设徽章与统计
-- ============================================
INSERT INTO badges (name, description, icon_url, category, sort_order) VALUES
('连续打卡7天', '连续7天完成每日打卡', 'https://api.dicebear.com/7.x/icons/svg?seed=streak7', 'checkin', 1),
('视频狂人', '观看超过50个视频', 'https://api.dicebear.com/7.x/icons/svg?seed=videomaniac', 'engagement', 2),
('笔记达人', '撰写超过20条学习笔记', 'https://api.dicebear.com/7.x/icons/svg?seed=notesmaster', 'learning', 3);

INSERT INTO user_statistics (user_id, check_in_count, continuous_days, last_check_in_date, total_points, level) VALUES
(1, 0, 0, NULL, 0, 1),
(2, 0, 0, NULL, 0, 1);
`;
  seedSql = seedSql + '\n' + seedData;
  fs.writeFileSync(seedSqlPath, seedSql);
  console.log('Patched seed.sql');
}
