import React from 'react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0', marginRight: '15px' }}>←</button>
        <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--dark)' }}>关于知视</h2>
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0 60px 0' }}>
        <div style={{ width: '90px', height: '90px', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '44px', lineHeight: '90px', borderRadius: '24px', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(0,120,255,0.25)', fontWeight: 'bold' }}>视</div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '24px', color: 'var(--dark)' }}>知视短视频</h3>
        <p style={{ color: 'var(--text-light)', fontSize: '14px', fontFamily: 'monospace' }}>v1.0.0 (Release)</p>
      </div>

      <div className="card" style={{ padding: '0 20px' }}>
        <div onClick={() => alert('已是最新版本')} style={{ padding: '18px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--dark)', fontSize: '15px' }}>
          <span>检查更新</span>
          <span style={{ color: 'var(--text-light)' }}>›</span>
        </div>
        <div onClick={() => alert('用户协议加载中...')} style={{ padding: '18px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--dark)', fontSize: '15px' }}>
          <span>用户协议</span>
          <span style={{ color: 'var(--text-light)' }}>›</span>
        </div>
        <div onClick={() => alert('隐私政策加载中...')} style={{ padding: '18px 0', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--dark)', fontSize: '15px' }}>
          <span>隐私政策</span>
          <span style={{ color: 'var(--text-light)' }}>›</span>
        </div>
      </div>
      
      <div style={{ marginTop: 'auto', textAlign: 'center', padding: '40px 0 20px', fontSize: '12px', color: 'var(--text-light)' }}>
        © 2024 知视技术团队 版权所有
      </div>
    </div>
  );
}

export default About;
