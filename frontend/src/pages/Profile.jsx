/**
 * Profile - 个人中心
 * 用户信息卡片、学习统计数据、设置入口
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, checkIn, getAchievements } from '../services/api';

function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState(null);
  const [checkingIn, setCheckInLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getUserProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        updateUser(res.data);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn) return;
    setCheckInLoading(true);
    try {
      const res = await checkIn();
      if (res.success) {
        alert(res.message + (res.data.badge_unlocked ? ' \n🎉 解锁新徽章: ' + res.data.badge_unlocked : ''));
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayUser = profile || user;

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="profile-page-shell">
      {/* 用户信息头部 */}
      <div className="profile-header">
        <div className="profile-avatar">
          {displayUser?.nickname?.slice(0, 1) || 'U'}
        </div>
        <div className="profile-name">{displayUser?.nickname || '未设置昵称'}</div>
        <div className="profile-career">
          {displayUser?.career_direction || '未设置职业方向'}
        </div>
        {displayUser?.skill_tags && displayUser.skill_tags.length > 0 && (
          <div className="profile-skill-tags">
            {displayUser.skill_tags.map((tag, index) => (
              <span
                key={index}
                className="profile-skill-tag"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 学习统计 */}
      <div className="profile-stats">
        <div className="stat-item">
          <div className="stat-value">{profile?.stats?.watched_count || 0}</div>
          <div className="stat-label">观看视频</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{profile?.stats?.liked_count || 0}</div>
          <div className="stat-label">点赞视频</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{profile?.stats?.favorites_count || 0}</div>
          <div className="stat-label">收藏视频</div>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="profile-menu">
        <div className="profile-menu-item profile-menu-item-highlight" onClick={() => navigate('/creator')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">🎥</span>
            <span className="profile-menu-text profile-menu-text-highlight">创作者中心</span>
          </div>
          <span className="profile-menu-arrow profile-menu-arrow-highlight">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/favorites')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">📑</span>
            <span className="profile-menu-text">我的收藏</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/notes')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">📝</span>
            <span className="profile-menu-text">学习笔记</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/reminders')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">🔔</span>
            <span className="profile-menu-text">复习提醒</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/history')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">📚</span>
            <span className="profile-menu-text">学习历史</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/category')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">📂</span>
            <span className="profile-menu-text">分类浏览</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/search')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">🔍</span>
            <span className="profile-menu-text">搜索视频</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/settings')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">⚙️</span>
            <span className="profile-menu-text">设置</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/feedback')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">💬</span>
            <span className="profile-menu-text">意见反馈</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={() => navigate('/about')}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">ℹ️</span>
            <span className="profile-menu-text">关于知视</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={handleLogout}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">🚪</span>
            <span className="profile-menu-text text-danger">退出登录</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>
      </div>

      {/* 版本信息 */}
      <div className="profile-version">
        知视 v1.0.0
      </div>
    </div>
  );
}

export default Profile;
