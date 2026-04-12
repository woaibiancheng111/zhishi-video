import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Feedback = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return alert('请输入反馈内容');
    alert('感谢您的反馈！我们会尽快处理。');
    navigate(-1);
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 8px 0 0', marginRight: '15px' }}>←</button>
        <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--dark)' }}>意见反馈</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ padding: '0' }}>
            <textarea
              rows={8}
              placeholder="请详细描述您遇到的问题或建议，我们将不断改进..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', outline: 'none', boxSizing: 'border-box', fontSize: '15px', resize: 'vertical' }}
            />
        </div>
        <button type="submit" className="btn btn-primary" style={{ padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '500' }}>
          提交反馈
        </button>
      </form>
    </div>
  );
}

export default Feedback;
