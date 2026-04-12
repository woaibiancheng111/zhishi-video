import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreatorStudio = () => {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCreatorData();
  }, []);

  const fetchCreatorData = async () => {
    setLoading(true);
    try {
      const [statsRes, videosRes] = await Promise.all([
        api.get('/creator/stats'),
        api.get('/creator/videos')
      ]);
      setStats(statsRes.data.data);
      setVideos(videosRes.data.data || []);
    } catch (err) {
      console.error('获取创作者数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div><span>加载中...</span></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0' }}>←</button>
        <div>
            <h1 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--dark)' }}>创作者中心</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>管理您的知识内容，查看数据表现</p>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>总播放量</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'system-ui' }}>{stats.total_views || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>总获赞数</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)', fontFamily: 'system-ui' }}>{stats.total_likes || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>视频总数</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--dark)', fontFamily: 'system-ui' }}>{stats.total_videos || 0}</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>近30天发布</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'system-ui' }}>{stats.recent_videos || 0}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--dark)', fontWeight: '600' }}>内容管理</h3>
        <button onClick={() => alert('因格式转换限制，请移步至 PC Web 管理后台上传视频。')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px' }}>+ 上传视频</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
        {videos.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
            <div style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--dark)' }}>空空如也</div>
            <div>您还没有上传过视频，快去分享知识吧</div>
          </div>
        ) : (
          videos.map(video => (
            <div key={video.id} className="card" style={{ display: 'flex', padding: '16px', gap: '16px' }}>
              <img src={video.cover_url || `https://picsum.photos/seed/${video.id}/160/100`} alt="cover" style={{ width: '140px', height: '90px', objectFit: 'cover', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--dark)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</h4>
                  <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: video.status === 'published' ? '#e8f5e9' : '#fff3e0', color: video.status === 'published' ? 'var(--success)' : '#f57c00' }}>
                    {video.status === 'published' ? '已发布' : '审核中'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <span>▶ {video.play_count || 0}</span>
                    <span>♥ {video.like_count || 0}</span>
                    <span>💬 {video.comment_count || 0}</span>
                  </div>
                  <button onClick={() => {
                      const newTitle = prompt(`修改视频标题：`, video.title);
                      if (newTitle) alert(`标题已更新为: ${newTitle}\n(后端接口待开发)`);
                  }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', cursor: 'pointer', padding: '4px 8px' }}>
                    编辑
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CreatorStudio;
