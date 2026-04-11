/**
 * Comments - 视频评论区组件
 * 显示评论列表，支持发表和删除评论
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComments, postComment, deleteComment } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString('zh-CN');
}

function Comments({ videoId }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setComments([]);
    setPage(1);
    setHasMore(true);
    fetchComments(1);
  }, [videoId]);

  const fetchComments = async (pageNum) => {
    setLoading(true);
    try {
      const res = await getComments(videoId, pageNum, 20);
      if (res.success && res.data) {
        if (pageNum === 1) {
          setComments(res.data.list || []);
        } else {
          setComments((prev) => [...prev, ...(res.data.list || [])]);
        }
        setTotal(res.data.pagination?.total || 0);
        setHasMore(pageNum < (res.data.pagination?.total_pages || 1));
      }
    } catch (err) {
      console.error('获取评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!inputValue.trim()) return;

    setSubmitting(true);
    try {
      const res = await postComment(videoId, inputValue.trim());
      if (res.success && res.data) {
        setComments((prev) => [res.data, ...prev]);
        setTotal((t) => t + 1);
        setInputValue('');
      }
    } catch (err) {
      console.error('发表评论失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((t) => Math.max(t - 1, 0));
    } catch (err) {
      console.error('删除评论失败:', err);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage);
  };

  return (
    <div className="comments-section">
      <h3 className="comments-title">评论 {total > 0 ? `(${total})` : ''}</h3>

      {/* 评论输入框 */}
      <div className="comment-input-row">
        <div className="comment-avatar comment-avatar-sm">
          {user?.nickname?.slice(0, 1) || 'U'}
        </div>
        <div className="comment-input-wrap">
          <textarea
            className="comment-textarea"
            placeholder={isAuthenticated ? '分享你的想法...' : '登录后发表评论'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            maxLength={500}
            rows={2}
            onFocus={() => !isAuthenticated && navigate('/login')}
          />
          <div className="comment-input-footer">
            <span className="comment-char-count">{inputValue.length}/500</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={!inputValue.trim() || submitting}
            >
              {submitting ? '发送中...' : '发表'}
            </button>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      {loading && comments.length === 0 ? (
        <div className="loading" style={{ padding: '20px 0' }}>
          <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
          <span style={{ fontSize: 13 }}>加载评论...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          <span>暂无评论，来抢沙发吧 🛋️</span>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {comment.nickname?.slice(0, 1) || 'U'}
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-nickname">{comment.nickname || '匿名用户'}</span>
                  <span className="comment-time">{formatTime(comment.created_at)}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
                {user && String(user.id) === String(comment.user_id) && (
                  <button
                    className="comment-delete-btn"
                    onClick={() => handleDelete(comment.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
              {loading ? '加载中...' : '加载更多评论'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;
