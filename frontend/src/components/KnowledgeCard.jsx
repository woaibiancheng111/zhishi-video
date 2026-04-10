/**
 * KnowledgeCard - 知识卡片弹窗组件
 * 显示摘要、关键要点列表、思维导图
 */
import React, { useState, useEffect } from 'react';
import { getKnowledgeCard } from '../services/api';

function KnowledgeCard({ videoId, visible, onClose }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && videoId) {
      fetchCard();
    }
  }, [visible, videoId]);

  const fetchCard = async () => {
    setLoading(true);
    try {
      const res = await getKnowledgeCard(videoId);
      if (res.success) {
        setCard(res.data);
      }
    } catch (err) {
      console.error('获取知识卡片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="knowledge-card-overlay" onClick={onClose}>
      <div className="knowledge-card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="knowledge-card-close" onClick={onClose}>x</button>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>正在生成知识卡片...</span>
          </div>
        ) : card ? (
          <>
            <h2>知识卡片</h2>

            {/* 摘要 */}
            <div className="knowledge-card-summary">
              {card.summary}
            </div>

            {/* 关键要点 */}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1B2838', marginBottom: 10 }}>
              关键要点
            </h3>
            <ul className="knowledge-card-points">
              {card.key_points && card.key_points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>

            {/* 思维导图 */}
            {card.mindmap && card.mindmap.branches && (
              <div className="knowledge-card-mindmap">
                <h3>{card.mindmap.center || '知识结构'}</h3>
                {card.mindmap.branches.map((branch, index) => (
                  <div key={index} className="mindmap-branch">
                    <div className="mindmap-branch-name">{branch.name}</div>
                    <div className="mindmap-branch-children">
                      {branch.children && branch.children.map((child, ci) => (
                        <span key={ci} className="mindmap-leaf">{child}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">暂无知识卡片</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeCard;
