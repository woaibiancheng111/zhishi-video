import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0', marginRight: '15px' }}>←</button>
        <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--dark)' }}>系统设置</h2>
      </div>

      <div className="card" style={{ padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: 'var(--dark)' }}>推送通知</span>
          <input type="checkbox" checked={pushEnabled} onChange={() => setPushEnabled(!pushEnabled)} style={{ transform: 'scale(1.2)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '15px', color: 'var(--dark)' }}>仅Wi-Fi下播放和下载</span>
          <input type="checkbox" checked={wifiOnly} onChange={() => setWifiOnly(!wifiOnly)} style={{ transform: 'scale(1.2)' }} />
        </div>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <button className="btn" onClick={() => alert('清除缓存成功！释放了12.5MB空间。')} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '15px', color: 'var(--danger)' }}>
          清除缓存
        </button>
      </div>
      <div style={{ marginTop: '16px' }}>
        <button className="btn" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '15px', color: 'var(--text-secondary)' }}>
          退出登录
        </button>
      </div>
    </div>
  );
}

export default Settings;
