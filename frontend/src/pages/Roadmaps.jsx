import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Roadmaps = () => {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    setLoading(true);
    try {
      const response = await api.get('/roadmaps');
      setRoadmaps(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roadmaps', err);
      setError('无法获取学习路线图，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h1>学习路线图</h1>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>系统化学习，逐步提升您的技能，掌握核心竞争力。</p>
      </div>
      
      {loading && <div className="loading"><div className="loading-spinner"></div><span>加载中...</span></div>}
      {error && <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', paddingBottom: '30px' }}>
        {!loading && !error && roadmaps.length === 0 && <p style={{ color: 'var(--text-light)', textAlign: 'center', width: '100%', padding: '40px 0' }}>暂无相关内容。</p>}
        {roadmaps.map(rm => (
          <Link to={`/roadmaps/${rm.id}`} key={rm.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="card" style={{
              display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', transition: 'all 0.3s ease', cursor: 'pointer', border: '1px solid var(--border)'
            }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                <img src={rm.cover_url || `https://picsum.photos/seed/${rm.id}/400/225`} alt={rm.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(4px)' }}>
                  共 {rm.video_count || 0} 节课
                </div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--dark)', fontWeight: '600' }}>{rm.title}</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', flexGrow: 1 }}>{rm.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {rm.creator_name ? rm.creator_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{rm.creator_name || '知视精选'}</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>开始学习 →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Roadmaps;
