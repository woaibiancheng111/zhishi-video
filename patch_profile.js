const fs = require('fs');

let profileJs = fs.readFileSync('frontend/src/pages/Profile.jsx', 'utf-8');

// Step 1: Add imports
if (!profileJs.includes('getAchievements')) {
  profileJs = profileJs.replace(
    /import { getUserProfile.*} from '\.\.\/services\/api';/,
    "import { getUserProfile, checkIn, getAchievements } from '../services/api';"
  );

  // Step 2: Add state vars
  profileJs = profileJs.replace(
    'const [loading, setLoading] = useState(true);',
    `const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState(null);
  const [checkingIn, setCheckInLoading] = useState(false);`
  );

  // Step 3: Fetch achievements
  profileJs = profileJs.replace(
    'const profileRes = await getUserProfile();',
    `const profileRes = await getUserProfile();
        try {
          const achiveRes = await getAchievements();
          if (achiveRes.success) setAchievements(achiveRes.data);
        } catch(e) { console.error('Failed to get achievements', e); }`
  );

  // Step 4: Add CheckIn Handler function
  profileJs = profileJs.replace(
    'const handleLogout = () => {',
    `const handleCheckIn = async () => {
    if (checkingIn) return;
    setCheckInLoading(true);
    try {
      const res = await checkIn();
      if (res.success) {
        alert(res.message + (res.data.badge_unlocked ? ' \\n🎉 解锁新徽章: ' + res.data.badge_unlocked : ''));
        // Refresh
        const achiveRes = await getAchievements();
        if (achiveRes.success) setAchievements(achiveRes.data);
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('打卡失败，请重试');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleLogout = () => {`
  );

  // Step 5: Replace rendering component
  // Find where profile-stats ends
  const gamificationHtml = `
      {/* 游戏化 - 徽章与打卡系统 */}
      { achievements && (
        <div className="gamification-section">
          {/* 打卡奖励区 */}
          <div className="checkin-row">
            <div className="streak-info">
              <h3>🔥 连续打卡 {achievements.statistics?.continuous_days || 0} 天</h3>
              <p>我的积分: {achievements.statistics?.total_points || 0} pt</p>
            </div>
            <button 
              className="btn-checkin" 
              onClick={handleCheckIn} 
              disabled={checkingIn}
            >
              {checkingIn ? '...' : (achievements.statistics?.last_check_in_date === new Date().toISOString().split('T')[0] ? '已打卡' : '立即打卡')}
            </button>
          </div>

          {/* 徽章展示壁橱 */}
          <div className="badges-showcase">
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>荣誉徽章 ({achievements.badges?.earned_count || 0}/{achievements.badges?.all_progress?.length || 0})</h3>
            <div className="badges-grid">
              { achievements.badges?.all_progress?.map(badge => (
                <div key={badge.id} className={\`badge-card \${badge.earned ? '' : 'locked'}\`}>
                  <img src={badge.icon_url || \`https://api.dicebear.com/7.x/icons/svg?seed=\${badge.id}\`} alt={badge.name} className="badge-icon" />
                  <p className="badge-name">{badge.name}</p>
                  {!badge.earned && (
                    <div className="badge-progress">
                      <div className="badge-progress-fill" style={{ width: \`\${badge.progress}%\` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  `;

  // We'll inject right after the profile-stats mapping
  profileJs = profileJs.replace(
    /<\/div>\s*<\/div>\s*<div className="profile-menu">/,
    `    </div>
        </div>
${gamificationHtml}
      <div className="profile-menu">`
  );

  fs.writeFileSync('frontend/src/pages/Profile.jsx', profileJs);
  console.log('Patched Profile.jsx');
}
