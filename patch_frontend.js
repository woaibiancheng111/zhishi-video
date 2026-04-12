const fs = require('fs');

// Patch App.css to add gamification styles
let css = fs.readFileSync('frontend/src/App.css', 'utf-8');
css += `
/* Gamification Styles */
.gamification-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--bg-card);
  padding: 16px;
  border-radius: var(--radius-lg);
  margin-top: 16px;
}
.checkin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(var(--primary-color-rgb), 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--primary-color-rgb), 0.2);
}
.streak-info h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; color: var(--primary-color); }
.streak-info p { font-size: 12px; color: var(--text-secondary); margin: 0; }
.btn-checkin {
  background: var(--primary-color); color: #fff; border: none; padding: 8px 16px; border-radius: var(--radius-full); font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.btn-checkin:disabled {
  background: var(--border-color); color: var(--text-secondary); cursor: not-allowed;
}
.btn-checkin:not(:disabled):hover { filter: brightness(1.1); transform: translateY(-1px); }

.badges-grid { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.badge-card {
  min-width: 100px; padding: 12px; background: var(--bg-main); border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;
}
.badge-card.locked { opacity: 0.5; filter: grayscale(1); }
.badge-icon { width: 40px; height: 40px; border-radius: 50%; background: #f0f0f0; padding: 4px; }
.badge-name { font-size: 12px; font-weight: 500; margin: 0; }
.badge-progress { width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden; }
.badge-progress-fill { height: 100%; background: var(--primary-color); transition: width 0.3s ease; }
`;
fs.writeFileSync('frontend/src/App.css', css);

// Patch api.js to add achivement routes
let apiJs = fs.readFileSync('frontend/src/services/api.js', 'utf-8');
if(!apiJs.includes('getAchievements')) {
  apiJs += `
// ============================================
// 成就与打卡 API
// ============================================

/** 每日打卡 */
export const checkIn = () =>
  api.post('/users/check-in');

/** 获取用户成就与统计 */
export const getAchievements = () =>
  api.get('/users/achievements');
`;
  fs.writeFileSync('frontend/src/services/api.js', apiJs);
}
