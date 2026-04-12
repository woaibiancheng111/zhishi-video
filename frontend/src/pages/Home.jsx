/**
 * Home - 首页推荐Feed
 * 上下滑动浏览视频卡片列表
 * 下拉刷新、上拉加载更多
 */
import React, { useState, useEffect, useCallback } from 'react';
import VideoCard from '../components/VideoCard';
import { getFeed } from '../services/api';

function Home() {
  const [videos, setVideos] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载推荐Feed
  const fetchFeed = useCallback(async (currentCursor = 0) => {
    try {
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
          <div>
            <h1>推荐</h1>
            <p>为你精选更适合当前职业方向的学习内容</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleRefresh}>
            刷新推荐
          </button>
        </div>
        {refreshing && (
          <div className="pull-refresh">刷新中...</div>
        )}
      </div>

      {videos.length === 0 ? (
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
