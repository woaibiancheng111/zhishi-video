/**
 * Home - 首页推荐Feed
 * 上下滑动浏览视频卡片列表
 * 下拉刷新、上拉加载更多
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import { getFeed, getNotes, getLearningHistory, getFavorites } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [learningSnapshot, setLearningSnapshot] = useState({
    latestHistory: null,
    latestNote: null,
    favoritesCount: 0
  });
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // 加载推荐Feed
  const fetchFeed = useCallback(async (currentCursor = 0) => {
    try {
      if (currentCursor === 0) {
        setError('');
      }
      const res = await getFeed(currentCursor);
      if (res.success && res.data) {
        if (currentCursor === 0) {
          setVideos(res.data.list || []);
        } else {
          setVideos((prev) => [...prev, ...(res.data.list || [])]);
        }
        setCursor(res.data.pagination?.cursor);
        setHasMore(res.data.pagination?.has_more || false);
      }
    } catch (err) {
      console.error('获取推荐Feed失败:', err);
      if (currentCursor === 0) {
        setError('获取推荐内容失败，请稍后重试');
        setVideos([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    setLoading(true);
    fetchFeed(0);
  }, [fetchFeed]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLearningSnapshot({ latestHistory: null, latestNote: null, favoritesCount: 0 });
      return;
    }

    fetchLearningSnapshot();
  }, [isAuthenticated]);

  const fetchLearningSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const [historyRes, notesRes, favoritesRes] = await Promise.all([
        getLearningHistory(1, 1),
        getNotes(undefined, 1, 1),
        getFavorites()
      ]);

      setLearningSnapshot({
        latestHistory: historyRes.success ? historyRes.data?.list?.[0] || null : null,
        latestNote: notesRes.success ? notesRes.data?.list?.[0] || null : null,
        favoritesCount: favoritesRes.success ? (favoritesRes.data?.items?.length || 0) : 0
      });
    } catch (err) {
      console.error('获取学习快照失败:', err);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true);
    setCursor(null);
    setHasMore(true);
    fetchFeed(0);
  };

  // 加载更多
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFeed(cursor || 0);
  };

  // 滚动加载更多
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cursor, hasMore, loadingMore]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>知视</h1>
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载推荐内容...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div className="page-header-main">
            <div className="page-kicker">Daily feed</div>
            <h1>推荐</h1>
            <p>为你精选更适合当前职业方向的学习内容，让每次打开都有明确的下一步。</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-outline btn-sm" onClick={handleRefresh}>
              刷新推荐
            </button>
          </div>
        </div>
        {refreshing && (
          <div className="pull-refresh">刷新中...</div>
        )}
      </div>

      {isAuthenticated && (
        <div className="card glass-card home-hero-card">
          <div className="panel-header home-hero-heading">
            <div>
              <div className="hero-chip">Today&apos;s focus</div>
              <div className="home-hero-title">今日学习</div>
              <div className="home-hero-copy">从你上次停下来的地方继续，把灵感、笔记和收藏重新串起来。</div>
            </div>
          </div>

          {snapshotLoading ? (
            <div className="modal-muted-copy">正在整理你的学习进度...</div>
          ) : (
            <div className="home-hero-grid">
              <button
                className="related-item"
                onClick={() => learningSnapshot.latestHistory ? navigate(`/video/${learningSnapshot.latestHistory.video_id}`) : navigate('/history')}
              >
                <div className="related-content" style={{ width: '100%' }}>
                  <div className="related-title">继续上次学习</div>
                  <div className="related-meta">
                    <span>{learningSnapshot.latestHistory?.title || '去历史页看看最近学到哪里了'}</span>
                  </div>
                  <div className="action-link">回到最近进度 →</div>
                </div>
              </button>

              <button
                className="related-item"
                onClick={() => learningSnapshot.latestNote ? navigate(`/video/${learningSnapshot.latestNote.video_id}${learningSnapshot.latestNote.timestamp_sec > 0 ? `?t=${learningSnapshot.latestNote.timestamp_sec}` : ''}`) : navigate('/notes')}
              >
                <div className="related-content" style={{ width: '100%' }}>
                  <div className="related-title">复习最近笔记</div>
                  <div className="related-meta">
                    <span>{learningSnapshot.latestNote?.video_title || '还没有笔记，去记录第一条学习收获'}</span>
                  </div>
                  <div className="action-link">打开高亮片段 →</div>
                </div>
              </button>

              <button className="related-item" onClick={() => navigate('/favorites')}>
                <div className="related-content" style={{ width: '100%' }}>
                  <div className="related-title">打开收藏夹</div>
                  <div className="related-meta">
                    <span>当前已有 {learningSnapshot.favoritesCount} 条收藏内容可复习</span>
                  </div>
                  <div className="action-link">查看稍后复习清单 →</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="home-feed-intro">
        <div className="home-feed-intro-copy">本次推荐会结合你的职业方向与最近学习内容动态更新。</div>
        {videos.length > 0 && <div className="metric-chip">共 {videos.length} 条推荐</div>}
      </div>

      {error && videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">{error}</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={handleRefresh}
          >
            重试
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-text">暂无推荐内容，下拉刷新试试</div>
          <button
            className="btn btn-outline btn-sm section-action"
            onClick={handleRefresh}
          >
            刷新
          </button>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {loadingMore && (
            <div className="loading inline-loading">
              <div className="loading-spinner"></div>
              <span>加载更多...</span>
            </div>
          )}

          {!hasMore && videos.length > 0 && (
            <div className="load-more">已经到底了</div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
