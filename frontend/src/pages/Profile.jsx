/**
 * Profile - 个人中心
 * 用户信息卡片、学习统计数据、设置入口
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile } from '../services/api';

function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 }}>
            {displayUser.skill_tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff'
                }}
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

        <div className="profile-menu-item">
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">⚙️</span>
            <span className="profile-menu-text">设置</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item">
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">💬</span>
            <span className="profile-menu-text">意见反馈</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item">
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">ℹ️</span>
            <span className="profile-menu-text">关于知视</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>

        <div className="profile-menu-item" onClick={handleLogout}>
          <div className="profile-menu-item-left">
            <span className="profile-menu-icon">🚪</span>
            <span className="profile-menu-text" style={{ color: '#EF4444' }}>退出登录</span>
          </div>
          <span className="profile-menu-arrow">›</span>
        </div>
      </div>

      {/* 版本信息 */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0 80px',
        fontSize: 12,
        color: '#CBD5E1'
      }}>
        知视 v1.0.0
      </div>
    </div>
  );
}

export default Profile;
