/**
 * Player - 视频播放页
 * HTML5 video 播放器
 * 视频信息、操作按钮、知识卡片弹窗
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoDetail, toggleLike, reportPlay, addFavorite, getFeed } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import KnowledgeCard from '../components/KnowledgeCard';
import Comments from '../components/Comments';
import NotesModal from '../components/NotesModal';

function formatCount(count) {
  if (!count) return '0';
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const total = Number(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  const [showNotes, setShowNotes] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [playReported, setPlayReported] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    fetchVideoDetail();
    fetchRelatedVideos();
  }, [id]);

  const fetchVideoDetail = async () => {
    setLoading(true);
    setPlayReported(false);
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

  const fetchRelatedVideos = async () => {
    setRelatedLoading(true);
    try {
      const res = await getFeed(0);
      if (res.success && res.data?.list) {
        const list = res.data.list
          .filter((item) => String(item.id) !== String(id))
          .slice(0, 8);
        setRelatedVideos(list);
      }
    } catch (err) {
      console.error('获取相关推荐失败:', err);
    } finally {
      setRelatedLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await toggleLike(id);
      if (res.success) {
        setLiked(res.data.liked);
        setLikeCount((prev) => (res.data.liked ? prev + 1 : Math.max(prev - 1, 0)));
      }
    } catch (err) {
      console.error('点赞失败:', err);
      alert(err?.message || '点赞失败，请重新登录后重试');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (favorited) {
        setFavorited(false);
      } else {
        const res = await addFavorite(parseInt(id, 10));
        if (res.success) {
          setFavorited(true);
        }
      }
    } catch (err) {
      console.error('收藏操作失败:', err);
      alert(err?.message || '收藏失败，请重新登录后重试');
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setCurrentTimestamp(Math.floor(currentTime));

    if (!isAuthenticated || playReported) return;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (currentTime > 10 || progress > 50) {
      setPlayReported(true);
      reportPlay(parseInt(id, 10), Math.floor(currentTime), progress).catch(() => {});
    }
  };

  const handleVideoEnd = () => {
    if (!isAuthenticated) return;
    reportPlay(parseInt(id, 10), video?.duration || 0, 100).catch(() => {});
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: video.title, url: window.location.href });
      return;
    }

    navigator.clipboard?.writeText(window.location.href);
    alert('链接已复制');
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
      <div className="player-page">
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-text">视频不存在或已被删除</div>
          <button className="btn btn-primary btn-sm player-back-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-page">
      <div className="player-shell">
        <div className="player-main">
          <section className="player-primary">
            <div className="video-player-panel">
              <div className="video-player-wrapper">
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  playsInline
                  poster={video.cover_url}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                  className="player-video"
                />
              </div>

              <div className="video-info">
                <h1>{video.title}</h1>

                <div className="player-topline">
                  <div className="video-meta player-meta-main">
                    <span>{formatCount(video.play_count)}次播放</span>
                    <span>{formatCount(likeCount)}次点赞</span>
                    <span>{video.category_name || '未分类'}</span>
                  </div>

                  <div className="video-actions player-actions-inline">
                    <button className={`video-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      {liked ? '已赞' : '点赞'}
                    </button>

                    <button className={`video-action-btn ${favorited ? 'active' : ''}`} onClick={handleFavorite}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {favorited ? '已收藏' : '收藏'}
                    </button>

                    <button className="video-action-btn" onClick={() => setShowCard(true)}>
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
                        if (!isAuthenticated) { navigate('/login'); return; }
                        setShowNotes(true);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      笔记
                    </button>

                    <button className="video-action-btn" onClick={handleShare}>
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

                <div className="video-creator player-channel-row">
                  <div className="video-creator-avatar">
                    {video.creator?.nickname?.slice(0, 1) || 'U'}
                  </div>
                  <div className="player-channel-main">
                    <div className="video-creator-name">{video.creator?.nickname || '匿名创作者'}</div>
                    <div className="player-channel-sub">知识领域创作者</div>
                  </div>
                  <button
                    className="player-channel-btn"
                    onClick={() => alert('关注功能开发中，敬请期待')}
                  >
                    关注
                  </button>
                </div>

                <div className="video-description player-desc-box">{video.description}</div>

                {video.tags && video.tags.length > 0 && (
                  <div className="video-tags player-tags-wrap">
                    {video.tags.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* 评论区 */}
                <Comments videoId={parseInt(id, 10)} />
                </div>
              </div>
          </section>

          <aside className="player-side">
            <div className="player-side-card">
              <h3 className="player-side-title">接下来播放</h3>
              {relatedLoading ? (
                <div className="player-side-empty">加载中...</div>
              ) : relatedVideos.length === 0 ? (
                <div className="player-side-empty">暂无更多推荐</div>
              ) : (
                <div className="related-list">
                  {relatedVideos.map((item) => (
                    <button
                      key={item.id}
                      className="related-item"
                      onClick={() => navigate(`/video/${item.id}`)}
                    >
                      <div className="related-cover-wrap">
                        <img
                          className="related-cover"
                          src={item.cover_url || `https://via.placeholder.com/320x180/00B4D8/FFFFFF?text=${encodeURIComponent(item.title?.slice(0, 6) || '视频')}`}
                          alt={item.title}
                          loading="lazy"
                        />
                        <span className="related-duration">{formatDuration(item.duration)}</span>
                      </div>
                      <div className="related-content">
                        <div className="related-title">{item.title}</div>
                        <div className="related-meta">
                          <span>{item.category_name || '未分类'}</span>
                          <span>{formatCount(item.play_count)}播放</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <KnowledgeCard
        videoId={parseInt(id, 10)}
        visible={showCard}
        onClose={() => setShowCard(false)}
      />

      <NotesModal
        videoId={parseInt(id, 10)}
        visible={showNotes}
        onClose={() => setShowNotes(false)}
        currentTimestamp={currentTimestamp}
      />
    </div>
  );
}

export default Player;
