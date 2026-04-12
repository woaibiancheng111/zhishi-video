/**
 * KnowledgeCard - 知识卡片弹窗组件
 * 显示摘要、关键要点列表、思维导图
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKnowledgeCard, addFavorite } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function KnowledgeCard({ videoId, visible, onClose, onOpenNotes }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

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

  const handleCopy = async () => {
    if (!card) return;

    const text = [
      card.summary,
      ...(card.key_points || []).map((point, index) => `${index + 1}. ${point}`)
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      alert('复制失败，请稍后重试');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      const res = await addFavorite(videoId);
      if (res.success) {
        alert('已加入收藏，稍后可以去收藏夹复习');
      }
    } catch (err) {
      alert(err?.message || '加入收藏失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNotes = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    onClose();
    onOpenNotes?.();
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
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              把这条视频的重点快速提炼出来，方便收藏、复习和继续记笔记。
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                {copied ? '已复制要点' : '复制要点'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleFavorite} disabled={saving}>
                {saving ? '保存中...' : '加入收藏'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleOpenNotes}>
                去记笔记
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/notes')}>
                我的笔记
              </button>
            </div>

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
