/**
 * Search - 搜索页
 * 搜索框 + 热门搜索词
 * 搜索结果列表
 */
import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import VideoCard from '../components/VideoCard';
import { searchVideos, getHotKeywords } from '../services/api';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // 加载热门搜索词
  useEffect(() => {
    fetchHotKeywords();
  }, []);

  const fetchHotKeywords = async () => {
    try {
      const res = await getHotKeywords();
      if (res.success && res.data) {
        setHotKeywords(res.data);
      }
    } catch (err) {
      // 使用默认热门词
      setHotKeywords(['产品经理入门', '数据分析', '用户运营', 'Python教程', 'UI设计', 'SQL查询', '项目管理', 'React Hooks']);
    }
  };

  // 执行搜索
  const handleSearch = async (keyword) => {
    setQuery(keyword);
    setSearched(true);
    setPage(1);
    setResults([]);
    setError('');
    setLoading(true);
    setLoadingMore(false);

    try {
      const res = await searchVideos(keyword, 20, 1);
      if (res.success && res.data) {
        setResults(res.data.list || []);
        setTotal(res.data.pagination?.total || 0);
        setHasMore(res.data.pagination?.page < res.data.pagination?.total_pages);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setError('搜索失败，请稍后重试');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载更多
  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const res = await searchVideos(query, 20, nextPage);
      if (res.success && res.data) {
        setResults((prev) => [...prev, ...(res.data.list || [])]);
        setPage(nextPage);
        setHasMore(res.data.pagination?.page < res.data.pagination?.total_pages);
      }
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 滚动加载
  useEffect(() => {
    if (!searched || !hasMore) return;

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
  }, [searched, hasMore, page, query, loadingMore, loading]);

  return (
    <div className="page">
      <div className="page-header">
        <SearchBar onSearch={handleSearch} placeholder="搜索知识视频..." autoFocus />
      </div>

      {/* 搜索结果 */}
      {searched ? (
        <div>
          {loading && results.length === 0 ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <span>搜索中...</span>
            </div>
          ) : error && results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <div className="empty-state-text">{error}</div>
              <button className="btn btn-outline btn-sm section-action" onClick={() => handleSearch(query)}>
                重试
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">
                未找到与「{query}」相关的视频
              </div>
            </div>
          ) : (
            <>
              <div className="search-results-header">
                <span>找到 <strong>{total}</strong> 个与 <span className="search-keyword">「{query}」</span> 相关的结果</span>
                <span>持续为你推荐相关主题</span>
              </div>
              <div className="video-grid">
                {results.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>

              {loadingMore && (
                <div className="loading" style={{ padding: 20 }}>
                  <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                  <span style={{ fontSize: 13 }}>加载更多...</span>
                </div>
              )}

              {!hasMore && results.length > 0 && (
                <div className="load-more">已经到底了</div>
              )}
            </>
          )}
        </div>
      ) : (
        /* 热门搜索 */
        <div className="hot-search">
          <h3>热门搜索</h3>
          <div className="hot-search-tags">
            {hotKeywords.map((keyword, index) => (
              <button
                key={index}
                className="hot-search-tag"
                onClick={() => handleSearch(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;
