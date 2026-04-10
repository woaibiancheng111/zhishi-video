/**
 * Category - 分类浏览页
 * 顶部横向滚动分类标签
 * 下方视频网格列表
 */
import React, { useState, useEffect } from 'react';
import VideoCard from '../components/VideoCard';
import { getCategories, getVideos } from '../services/api';

function Category() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 加载分类列表
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('获取分类失败:', err);
    }
  };

  // 加载视频列表
  useEffect(() => {
    setPage(1);
    setVideos([]);
    setHasMore(true);
    fetchVideos(1, activeCategory);
  }, [activeCategory]);

  const fetchVideos = async (pageNum, categoryId) => {
    try {
      const params = { page: pageNum, limit: 20, sort: 'hot' };
      if (categoryId) {
        params.category_id = categoryId;
      }

      const res = await getVideos(params);
      if (res.success && res.data) {
        if (pageNum === 1) {
          setVideos(res.data.list || []);
        } else {
          setVideos((prev) => [...prev, ...(res.data.list || [])]);
        }
        const totalPages = res.data.pagination?.total_pages || 1;
        setHasMore(pageNum < totalPages);
      }
    } catch (err) {
      console.error('获取视频列表失败:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 加载更多
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchVideos(nextPage, activeCategory);
  };

  // 滚动加载
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
  }, [page, hasMore, loadingMore]);

  // 构建分类标签列表（包含"全部"和子分类）
  const allCategoryTabs = [];
  allCategoryTabs.push({ id: null, name: '全部' });
  categories.forEach((cat) => {
    allCategoryTabs.push({ id: cat.id, name: cat.name });
    if (cat.children) {
      cat.children.forEach((sub) => {
        allCategoryTabs.push({ id: sub.id, name: sub.name });
      });
    }
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>分类</h1>
      </div>

      {/* 分类标签 */}
      <div className="category-tabs">
        {allCategoryTabs.map((cat) => (
          <div
            key={cat.id || 'all'}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* 视频列表 */}
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-text">该分类暂无视频</div>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {loadingMore && (
            <div className="loading" style={{ padding: 20 }}>
              <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
              <span style={{ fontSize: 13 }}>加载更多...</span>
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

export default Category;
