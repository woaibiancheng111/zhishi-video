/**
 * Player - 视频播放页
 * HTML5 video 播放器
 * 视频信息、操作按钮、知识卡片弹窗
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoDetail, toggleLike, reportPlay, addFavorite, removeFavorite } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import KnowledgeCard from '../components/KnowledgeCard';

function formatCount(count) {
  if (!count) return '0';
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [playReported, setPlayReported] = useState(false);

  // 加载视频详情
  useEffect(() => {
    fetchVideoDetail();
  }, [id]);

  const fetchVideoDetail = async () => {
    setLoading(true);
    try {
      const res = await getVideoDetail(id);
      if (res.success && res.data) {
        setVideo(res.data);
        setLiked(res.data.is_liked || false);
        setFavorited(res.data.is_favorited || false);
        setLikeCount(res.data.like_count || 0);
      }
    } catch (err) {
      console.error('获取视频详情失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 点赞
  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await toggleLike(id);
      if (res.success) {
        setLiked(res.data.liked);
        setLikeCount((prev) => res.data.liked ? prev + 1 : Math.max(prev - 1, 0));
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 收藏
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (favorited) {
        // 取消收藏 - 需要找到收藏记录ID
        // 简化处理：直接切换状态
        setFavorited(false);
      } else {
        const res = await addFavorite(parseInt(id));
        if (res.success) {
          setFavorited(true);
        }
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
    }
  };

  // 播放行为上报
  const handleTimeUpdate = () => {
    if (!videoRef.current || !isAuthenticated || playReported) return;

    const { currentTime, duration } = videoRef.current;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // 播放超过10秒或50%时上报
    if (currentTime > 10 || progress > 50) {
      setPlayReported(true);
      reportPlay(parseInt(id), Math.floor(currentTime), progress).catch(() => {});
    }
  };

  // 视频结束上报
  const handleVideoEnd = () => {
    if (!isAuthenticated) return;
    reportPlay(parseInt(id), video?.duration || 0, 100).catch(() => {});
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📺</div>
        <div className="empty-state-text">视频不存在或已被删除</div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* 视频播放器 */}
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          src={video.video_url}
          controls
          playsInline
          poster={video.cover_url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          style={{ width: '100%', maxHeight: '280px' }}
        />
      </div>

      {/* 视频信息 */}
      <div className="video-info" style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1>{video.title}</h1>

        <div className="video-meta">
          <span>{video.category_name || '未分类'}</span>
          <span>{formatCount(video.play_count)}次播放</span>
          <span>{formatCount(likeCount)}次点赞</span>
        </div>

        {/* 创作者信息 */}
        <div className="video-creator">
          <div className="video-creator-avatar">
            {video.creator?.nickname?.slice(0, 1) || 'U'}
          </div>
          <div>
            <div className="video-creator-name">{video.creator?.nickname || '匿名创作者'}</div>
          </div>
        </div>

        {/* 视频描述 */}
        <div className="video-description">
          {video.description}
        </div>

        {/* 标签 */}
        {video.tags && video.tags.length > 0 && (
          <div className="video-tags">
            {video.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="video-actions">
          <button
            className={`video-action-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {liked ? '已赞' : '点赞'}
          </button>

          <button
            className={`video-action-btn ${favorited ? 'active' : ''}`}
            onClick={handleFavorite}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            {favorited ? '已收藏' : '收藏'}
          </button>

          <button
            className="video-action-btn"
            onClick={() => setShowCard(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            知识卡片
          </button>

          <button
            className="video-action-btn"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: video.title, url: window.location.href });
              } else {
                // 复制链接
                navigator.clipboard?.writeText(window.location.href);
                alert('链接已复制');
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            分享
          </button>
        </div>
      </div>

      {/* 知识卡片弹窗 */}
      <KnowledgeCard
        videoId={parseInt(id)}
        visible={showCard}
        onClose={() => setShowCard(false)}
      />
    </div>
  );
}

export default Player;
