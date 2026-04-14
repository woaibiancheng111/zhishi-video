/**
 * History - 学习历史页
 * 展示用户最近观看过的视频及学习进度
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLearningHistory } from '../services/api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const fetchHistory = async (pageNum) => {
    if (pageNum === 1) {
      setLoading(true);
      setError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await getLearningHistory(pageNum);
      if (res.success && res.data) {
        if (pageNum === 1) {
          setHistory(res.data.list || []);
        } else {
          setHistory((prev) => [...prev, ...(res.data.list || [])]);
        }
        setTotal(res.data.pagination?.total || 0);
        setHasMore(pageNum < (res.data.pagination?.total_pages || 1));
      }
    } catch (err) {
      console.error('获取学习历史失败:', err);
      if (pageNum === 1) {
        setError('获取学习历史失败，请稍后重试');
        setHistory([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-kicker">Learning archive</div>
          <h1>学习历史</h1>
          <p>把未完成的内容优先继续，把看过的内容重新转成真正掌握的知识。</p>
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : error && history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">{error}</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={() => {
              setPage(1);
              fetchHistory(1);
            }}
          >
            重试
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">还没有学习记录</div>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            开始学习
          </button>
        </div>
      ) : (
        <>
          <div className="page-summary-bar">
            <span>共学习了 <strong>{total}</strong> 个视频</span>
            <span>优先展示未学完内容</span>
          </div>

          <div className="history-list">
            {[...history].sort((a, b) => {
              const progressA = a.total_duration > 0
                ? Math.min(Math.round((a.watched_duration / a.total_duration) * 100), 100)
                : Math.min(Math.round(a.progress || 0), 100);
              const progressB = b.total_duration > 0
                ? Math.min(Math.round((b.watched_duration / b.total_duration) * 100), 100)
                : Math.min(Math.round(b.progress || 0), 100);

              const unfinishedA = progressA > 0 && progressA < 100 ? 1 : 0;
              const unfinishedB = progressB > 0 && progressB < 100 ? 1 : 0;
              if (unfinishedA !== unfinishedB) return unfinishedB - unfinishedA;
              return new Date(b.watched_at) - new Date(a.watched_at);
            }).map((item) => {
              const progressPct = item.total_duration > 0
                ? Math.min(Math.round((item.watched_duration / item.total_duration) * 100), 100)
                : Math.min(Math.round(item.progress || 0), 100);

              return (
                <div
                  key={item.video_id}
                  className="history-item"
                  onClick={() => navigate(`/video/${item.video_id}`)}
                >
                  <div className="history-cover-wrap">
                    <img
                      className="history-cover"
                      src={
                        item.cover_url ||
                        `https://via.placeholder.com/140x79/00B4D8/FFFFFF?text=${encodeURIComponent(
                          (item.title || '').slice(0, 4)
                        )}`
                      }
                      alt={item.title}
                      loading="lazy"
                    />
                    {item.total_duration > 0 && (
                      <span className="related-duration">
                        {formatDuration(item.total_duration)}
                      </span>
                    )}
                    {/* Progress bar overlay */}
                    {progressPct > 0 && (
                      <div className="history-progress-bar">
                        <div
                          className="history-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="history-info">
                    <h3 className="history-title">{item.title}</h3>
                    <div className="history-meta">
                      <span className="video-card-category">{item.category_name || '未分类'}</span>
                    </div>
                    <div className="history-footer">
                      <span className="history-progress-text">
                        {progressPct > 0 ? `已看 ${progressPct}%` : '未开始'}
                      </span>
                      <span className="note-date">{formatDate(item.watched_at)}</span>
                    </div>
                    <div style={{ marginTop: 10, color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
                      {progressPct > 0 && progressPct < 100 ? '继续观看 →' : '重新学习 →'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ width: '100%', marginTop: 12 }}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          )}

          {!hasMore && history.length > 0 && (
            <div className="load-more">已经到底了</div>
          )}
        </>
      )}
    </div>
  );
}

export default History;
