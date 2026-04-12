import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RoadmapDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoadmapDetail();
  }, [id]);

  const fetchRoadmapDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/roadmaps/${id}`);
      setRoadmap(response.data.data);
    } catch (err) {
      console.error('Failed to fetch roadmap detail', err);
      setError('无法获取路线图详情，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="loading-spinner"></div><span>加载中...</span></div>;
  if (error) return <div className="page" style={{padding: '40px', color: 'var(--danger)', textAlign: 'center'}}>{error}</div>;
  if (!roadmap) return null;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0' }}>←</button>
        <div>
            <h1 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--dark)' }}>{roadmap.title}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{roadmap.description}</p>
        </div>
      </div>
        
      <div className="card" style={{ marginBottom: '24px', padding: '24px', background: 'var(--gradient)', color: 'var(--bg-white)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', fontSize: '16px' }}>学习进度</span>
          <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '12px' }}>{roadmap.progress}% ({roadmap.completed_count}/{roadmap.total_count})</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${roadmap.progress}%`, height: '100%', backgroundColor: 'var(--bg-white)', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '4px' }}></div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--dark)', fontWeight: '600' }}>课程列表</h3>
        <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>按顺序学习效果更好哦</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }}>
        {roadmap.videos && roadmap.videos.map((video, index) => {
          const isCompleted = parseFloat(video.user_progress) > 90;
          const isNext = !isCompleted && (index === 0 || parseFloat(roadmap.videos[index-1].user_progress) > 90);
          
          return (
            <Link to={`/video/${video.id}`} key={video.id} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="card" style={{
                display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '12px', border: isNext ? '2px solid var(--primary-light)' : '1px solid var(--border)', 
                background: isNext ? 'var(--bg-white)' : (isCompleted ? '#f9fcff' : 'var(--bg-white)'),
                transition: 'all 0.2s', transform: 'translateZ(0)'
              }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: isCompleted ? 'var(--success)' : (isNext ? 'var(--primary)' : 'var(--bg-primary)'),
                  color: isCompleted || isNext ? 'var(--bg-white)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px', fontWeight: 'bold', flexShrink: 0
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--dark)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      进度: <span style={{ color: isCompleted ? 'var(--success)' : 'inherit', fontWeight: isCompleted ? '600' : 'normal' }}>{Math.min(100, Math.round(parseFloat(video.user_progress)))}%</span>
                    </span>
                    {video.duration > 0 && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>时长: {Math.floor(video.duration/60)}分{video.duration%60}秒</span>}
                  </div>
                </div>
                <div style={{ color: isNext ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: isNext ? '600' : 'normal', paddingLeft: '12px', whiteSpace: 'nowrap' }}>
                  {isCompleted ? '复习' : (isNext ? '开始学习' : '去学习')} ›
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  );
};

export default RoadmapDetail;
